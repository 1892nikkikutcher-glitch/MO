"use client";

/** Orquesta el autoguardado de 3 niveles (React → IndexedDB → Firestore) de
 * una nota v2 concreta ya en edición — ver §7 del plan de rediseño de Notas
 * de Evolución (V4). Regla de oro: la protección real es la persistencia
 * local CONTINUA (inmediata para campos críticos, debounce corto para texto
 * libre) — NO un flush al salir. IndexedDB es asíncrono; ningún evento de
 * cierre de pestaña puede garantizar que una escritura en curso termine, así
 * que esos eventos son solo intentos adicionales best-effort (ver
 * RegistrarAtencionHoy.tsx), nunca la garantía principal. La detección de
 * conflictos se basa en un contador de revisión monotónico, no en
 * timestamps de reloj de cliente (ver detectarConflictoBorrador). Quién
 * decide CON QUÉ nota arrancar (una nueva vs. recuperar un borrador
 * existente) es responsabilidad de RegistrarAtencionHoy.tsx, no de este hook
 * — este hook solo sabe mantener viva y protegida la nota que ya recibió. */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import {
  eliminarBorradorLocal,
  guardarBorradorLocal,
} from "@/lib/borradorLocalNota";
import { calcularEstadoGuardado, claveLocalBorrador, type EstadoGuardado, type MetadataLocalBorrador } from "@/lib/borradorLocalNotaPuro";
import { detectarConflictoBorrador } from "@/lib/borradorLocalNotaPuro";
import { idNota, normalizarRevision, type ModoCaptura, type NotaEvolucionV2, type SeccionNota } from "@/lib/notasEvolucion";

const DEBOUNCE_LOCAL_MS = 250;
const DEBOUNCE_REMOTO_MS = 1800;

export type EstadoSincronizacionInicial = {
  existeEnFirestore: boolean;
  ultimaRevisionSincronizada: number;
};

type ResultadoIntentoSync = { estado: "ok" } | { estado: "conflicto"; remota: NotaEvolucionV2 } | { estado: "error"; error: string };
type ResultadoAccion = { ok: true } | { ok: false; error: string };

export function useAutoguardadoNota(
  patientId: string,
  citaId: string | null | undefined,
  notaInicial: NotaEvolucionV2,
  arranqueSincronizacion: EstadoSincronizacionInicial = { existeEnFirestore: false, ultimaRevisionSincronizada: 0 }
) {
  const { clinicUid, crearBorradorNota, guardarBorradorNota: guardarBorradorRemoto, firmarNota: firmarNotaRemoto, notasEvolucionPorPaciente } =
    usePatientData();

  const [nota, setNotaState] = useState<NotaEvolucionV2>(() => normalizarRevision(notaInicial));
  const [seccionActiva, setSeccionActiva] = useState<SeccionNota>("como_llega");
  const [pendienteSincronizar, setPendienteSincronizar] = useState(false);
  const [hayRespaldoLocal, setHayRespaldoLocal] = useState(false);
  const [ultimoIntentoFallo, setUltimoIntentoFallo] = useState(false);
  const [escribiendoAhora, setEscribiendoAhora] = useState(false);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [firmando, setFirmando] = useState(false);
  /** Nota remota que avanzó una revisión que este dispositivo no conoce —
   * mientras no sea null, NINGÚN intento de sincronización sobrescribe
   * Firestore (ver intentarSincronizar). Se resuelve explícitamente con
   * resolverUsarRemoto/resolverMantenerComoCopia — nunca en silencio. */
  const [conflictoRemoto, setConflictoRemoto] = useState<NotaEvolucionV2 | null>(null);

  const notaRef = useRef(nota);
  notaRef.current = nota;
  const seccionActivaRef = useRef(seccionActiva);
  seccionActivaRef.current = seccionActiva;
  const timerLocalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRemotoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detenidoRef = useRef(false); // true tras firmar — deja de autoguardar
  const existeEnFirestoreRef = useRef(arranqueSincronizacion.existeEnFirestore);
  const ultimaRevisionSincronizadaRef = useRef(arranqueSincronizacion.ultimaRevisionSincronizada);
  const conflictoRemotoRef = useRef<NotaEvolucionV2 | null>(null);

  const escribirLocal = useCallback(async () => {
    if (!clinicUid || detenidoRef.current) return;
    const metadataLocal: MetadataLocalBorrador = {
      ultimaSeccionActiva: seccionActivaRef.current,
      modoCaptura: notaRef.current.modoCaptura,
      ultimoCambioLocalEn: new Date().toISOString(),
      pendienteSincronizar: true,
      sincronizacion: {
        revisionLocal: notaRef.current.revision,
        ultimaRevisionSincronizada: ultimaRevisionSincronizadaRef.current,
      },
    };
    await guardarBorradorLocal({
      claveLocal: claveLocalBorrador(clinicUid, patientId, notaRef.current.id),
      clinicUid,
      patientId,
      notaId: notaRef.current.id,
      citaId: citaId ?? null,
      nota: notaRef.current,
      metadataLocal,
    });
    setHayRespaldoLocal(true);
    setPendienteSincronizar(true);
  }, [clinicUid, patientId, citaId]);

  /** Núcleo compartido de sincronización remota — usado por el debounce
   * automático, por "Guardar y continuar después" y por "Firmar". Antes de
   * escribir, compara la revisión que este dispositivo cree tener
   * sincronizada contra la copia de Firestore ya disponible en memoria (vía
   * el onSnapshot de PatientDataContext, sin llamada extra) — si Firestore
   * avanzó por una escritura que este dispositivo no hizo, NO sobrescribe:
   * reporta el conflicto para que quien llama decida qué hacer. */
  const intentarSincronizar = useCallback(async (): Promise<ResultadoIntentoSync> => {
    if (!clinicUid) return { estado: "error", error: "Sin clínica activa." };

    const remota = (notasEvolucionPorPaciente[patientId] ?? []).find(
      (n): n is NotaEvolucionV2 => "version" in n && n.version === 2 && n.id === notaRef.current.id
    );
    if (existeEnFirestoreRef.current && remota) {
      const remotaNormalizada = normalizarRevision(remota);
      const resultado = detectarConflictoBorrador(
        { ultimaRevisionSincronizada: ultimaRevisionSincronizadaRef.current },
        { revision: remotaNormalizada.revision }
      );
      if (resultado.hayConflicto) return { estado: "conflicto", remota: remotaNormalizada };
    }

    try {
      if (!existeEnFirestoreRef.current) {
        await crearBorradorNota(patientId, notaRef.current);
        existeEnFirestoreRef.current = true;
      } else {
        await guardarBorradorRemoto(patientId, notaRef.current);
      }
      ultimaRevisionSincronizadaRef.current = notaRef.current.revision;
      return { estado: "ok" };
    } catch (err) {
      console.error("No se pudo sincronizar el borrador de la nota", err);
      return { estado: "error", error: err instanceof Error ? err.message : "No se pudo sincronizar con el servidor." };
    }
  }, [clinicUid, patientId, crearBorradorNota, guardarBorradorRemoto, notasEvolucionPorPaciente]);

  const sincronizarRemoto = useCallback(async () => {
    if (!clinicUid || detenidoRef.current || conflictoRemotoRef.current) return;
    const resultado = await intentarSincronizar();
    if (resultado.estado === "conflicto") {
      conflictoRemotoRef.current = resultado.remota;
      setConflictoRemoto(resultado.remota);
      return;
    }
    if (resultado.estado === "ok") {
      setPendienteSincronizar(false);
      setUltimoIntentoFallo(false);
    } else {
      setUltimoIntentoFallo(true);
    }
  }, [clinicUid, intentarSincronizar]);

  // Reintenta al recuperar conexión.
  useEffect(() => {
    function marcarOnline() {
      setOnline(true);
      if (pendienteSincronizar) void sincronizarRemoto();
    }
    function marcarOffline() {
      setOnline(false);
    }
    window.addEventListener("online", marcarOnline);
    window.addEventListener("offline", marcarOffline);
    return () => {
      window.removeEventListener("online", marcarOnline);
      window.removeEventListener("offline", marcarOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendienteSincronizar]);

  /** Registra un cambio del formulario. `opts.inmediato` distingue la
   * estrategia híbrida del §7.2.1 del plan: selecciones clínicas
   * estructuradas (chips, odontograma, diagnóstico, procedimiento,
   * incidente, medicamento, pronóstico, firma) se persisten en IndexedDB de
   * inmediato, sin esperar el debounce — es el campo de mayor riesgo
   * clínico si se pierde. Texto libre sigue con debounce corto (los
   * campos de texto además fuerzan flush al perder el foco, ver
   * `flushInmediato` y su uso en onBlur de cada textarea). La sincronización
   * remota SIEMPRE sigue debounced — no tiene sentido escribir a Firestore
   * en cada selección. */
  const registrarCambio = useCallback(
    (updater: (prev: NotaEvolucionV2) => NotaEvolucionV2, opts?: { inmediato?: boolean }) => {
      if (detenidoRef.current) return;
      setEscribiendoAhora(true);
      setNotaState((prev) => {
        const siguiente = { ...updater(prev), revision: prev.revision + 1, actualizadoEn: new Date().toISOString() };
        notaRef.current = siguiente;
        return siguiente;
      });

      if (timerLocalRef.current) clearTimeout(timerLocalRef.current);
      if (opts?.inmediato) {
        setEscribiendoAhora(false);
        void escribirLocal();
      } else {
        timerLocalRef.current = setTimeout(() => {
          setEscribiendoAhora(false);
          void escribirLocal();
        }, DEBOUNCE_LOCAL_MS);
      }

      if (timerRemotoRef.current) clearTimeout(timerRemotoRef.current);
      timerRemotoRef.current = setTimeout(() => {
        void sincronizarRemoto();
      }, DEBOUNCE_REMOTO_MS);
    },
    [escribirLocal, sincronizarRemoto]
  );

  /** Fuerza la escritura local de inmediato, cancelando el debounce
   * pendiente — para usar en onBlur de campos de texto libre (§7.2.1): no
   * espera los ~250ms del debounce si el profesional ya cambió de sección o
   * de control. Best-effort adicional, no reemplaza la persistencia
   * continua de fondo. */
  const flushInmediato = useCallback(() => {
    if (timerLocalRef.current) clearTimeout(timerLocalRef.current);
    setEscribiendoAhora(false);
    void escribirLocal();
  }, [escribirLocal]);

  const irASeccion = useCallback((seccion: SeccionNota) => {
    seccionActivaRef.current = seccion;
    setSeccionActiva(seccion);
  }, []);

  // Intento adicional best-effort de escritura al desmontar (cambiar de
  // paciente, navegar a otra sección) o al ocultarse la pestaña/cerrarla —
  // reduce aún más la ventana de pérdida en el caso común, pero NO es la
  // garantía principal (esa es la persistencia continua de arriba): IndexedDB
  // es asíncrono y nada puede asegurar que esta escritura termine antes de
  // que la página se cierre de verdad.
  useEffect(() => {
    function flush() {
      if (timerLocalRef.current) {
        clearTimeout(timerLocalRef.current);
        void escribirLocal();
      }
    }
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
      flush();
      if (timerRemotoRef.current) clearTimeout(timerRemotoRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estadoGuardado: EstadoGuardado = calcularEstadoGuardado({
    escribiendoAhora,
    pendienteSincronizar,
    hayRespaldoLocal,
    online,
    ultimoIntentoSincronizacionFallo: ultimoIntentoFallo,
  });

  const reintentarSincronizacion = useCallback(() => {
    void sincronizarRemoto();
  }, [sincronizarRemoto]);

  /** Adopta la versión de Firestore — descarta el borrador local y continúa
   * editando a partir de la revisión remota. La copia local se sobreescribe
   * con la remota (nunca se pierde silenciosamente: el usuario eligió
   * explícitamente esta opción). */
  const resolverUsarRemoto = useCallback(() => {
    if (!conflictoRemoto) return;
    const remota = normalizarRevision(conflictoRemoto);
    notaRef.current = remota;
    setNotaState(remota);
    existeEnFirestoreRef.current = true;
    ultimaRevisionSincronizadaRef.current = remota.revision;
    conflictoRemotoRef.current = null;
    setConflictoRemoto(null);
    // Local y remoto quedan exactamente iguales (misma revisión) — no hay
    // nada pendiente de sincronizar tras adoptar la versión remota.
    void escribirLocal().then(() => {
      setPendienteSincronizar(false);
      setUltimoIntentoFallo(false);
    });
  }, [conflictoRemoto, escribirLocal]);

  /** Conserva el borrador local tal cual, pero como una nota v2 NUEVA
   * (id distinto) — la nota remota original con la que hubo conflicto queda
   * completamente intacta, sin sobrescribirse. */
  const resolverMantenerComoCopia = useCallback(async (): Promise<ResultadoAccion> => {
    if (!conflictoRemoto) return { ok: false, error: "No hay conflicto que resolver." };
    const idAnterior = notaRef.current.id;
    const copia: NotaEvolucionV2 = {
      ...notaRef.current,
      id: idNota("nota"),
      revision: 1,
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
    };
    try {
      await crearBorradorNota(patientId, copia);
      notaRef.current = copia;
      setNotaState(copia);
      existeEnFirestoreRef.current = true;
      ultimaRevisionSincronizadaRef.current = copia.revision;
      conflictoRemotoRef.current = null;
      setConflictoRemoto(null);
      await escribirLocal();
      setPendienteSincronizar(false);
      setUltimoIntentoFallo(false);
      if (clinicUid) await eliminarBorradorLocal(clinicUid, patientId, idAnterior);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "No se pudo guardar la copia. Intenta de nuevo." };
    }
  }, [conflictoRemoto, patientId, clinicUid, crearBorradorNota, escribirLocal]);

  /** Firma la nota — solo borra el respaldo local DESPUÉS de que Firestore
   * confirma la escritura final. Si hay un conflicto sin resolver, o falla
   * la sincronización, el borrador sigue disponible y la nota no queda
   * marcada como firmada. */
  const firmar = useCallback(async (): Promise<ResultadoAccion> => {
    setFirmando(true);
    try {
      if (timerLocalRef.current) clearTimeout(timerLocalRef.current);
      if (timerRemotoRef.current) clearTimeout(timerRemotoRef.current);
      await escribirLocal();
      if (conflictoRemotoRef.current) {
        return { ok: false, error: "Hay cambios realizados desde otra sesión sin resolver." };
      }
      const resultado = await intentarSincronizar();
      if (resultado.estado === "conflicto") {
        conflictoRemotoRef.current = resultado.remota;
        setConflictoRemoto(resultado.remota);
        return { ok: false, error: "Encontramos cambios realizados desde otra sesión. Resuélvelos para poder firmar." };
      }
      if (resultado.estado === "error") {
        return { ok: false, error: resultado.error };
      }
      await firmarNotaRemoto(patientId, notaRef.current);
      detenidoRef.current = true;
      if (clinicUid) await eliminarBorradorLocal(clinicUid, patientId, notaRef.current.id);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "No se pudo firmar la nota." };
    } finally {
      setFirmando(false);
    }
  }, [clinicUid, patientId, escribirLocal, intentarSincronizar, firmarNotaRemoto]);

  const descartar = useCallback(async () => {
    detenidoRef.current = true;
    if (timerLocalRef.current) clearTimeout(timerLocalRef.current);
    if (timerRemotoRef.current) clearTimeout(timerRemotoRef.current);
    if (clinicUid) await eliminarBorradorLocal(clinicUid, patientId, notaRef.current.id);
  }, [clinicUid, patientId]);

  /** Guarda de inmediato (sin esperar los debounces) y deja la nota como
   * borrador — para cuando el profesional quiere guardar y continuar
   * después sin completar las 6 secciones todavía. A diferencia de
   * `firmar()`, nunca exige que la nota esté completa. */
  const guardarYSalir = useCallback(async (): Promise<ResultadoAccion> => {
    if (timerLocalRef.current) clearTimeout(timerLocalRef.current);
    if (timerRemotoRef.current) clearTimeout(timerRemotoRef.current);
    await escribirLocal();
    if (conflictoRemotoRef.current) {
      return { ok: false, error: "Hay cambios de otra sesión sin resolver — tu nota quedó protegida en este dispositivo." };
    }
    const resultado = await intentarSincronizar();
    if (resultado.estado === "ok") {
      setPendienteSincronizar(false);
      setUltimoIntentoFallo(false);
      return { ok: true };
    }
    if (resultado.estado === "conflicto") {
      conflictoRemotoRef.current = resultado.remota;
      setConflictoRemoto(resultado.remota);
      return { ok: false, error: "Encontramos cambios realizados desde otra sesión — tu nota quedó protegida en este dispositivo." };
    }
    setUltimoIntentoFallo(true);
    return { ok: false, error: "No se pudo sincronizar con el servidor, pero tu nota quedó protegida en este dispositivo." };
  }, [escribirLocal, intentarSincronizar]);

  return {
    nota,
    registrarCambio,
    flushInmediato,
    seccionActiva,
    irASeccion,
    estadoGuardado,
    reintentarSincronizacion,
    firmar,
    firmando,
    descartar,
    guardarYSalir,
    conflictoRemoto,
    resolverUsarRemoto,
    resolverMantenerComoCopia,
  };
}
