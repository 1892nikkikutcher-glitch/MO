"use client";

/** Orquesta el autoguardado de 3 niveles (React → IndexedDB → Firestore) de
 * una nota v2 concreta ya en edición — ver §7 del plan de rediseño de Notas
 * de Evolución. Regla de oro: cada cambio llega primero a IndexedDB (debounce
 * corto) antes o durante su sincronización a Firestore (debounce más largo),
 * así que perder internet nunca implica perder los últimos cambios. Quién
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
import type { ModoCaptura, NotaEvolucionV2, SeccionNota } from "@/lib/notasEvolucion";

const DEBOUNCE_LOCAL_MS = 400;
const DEBOUNCE_REMOTO_MS = 1800;

export function useAutoguardadoNota(patientId: string, citaId: string | null | undefined, notaInicial: NotaEvolucionV2) {
  const { clinicUid, crearBorradorNota, guardarBorradorNota: guardarBorradorRemoto, firmarNota: firmarNotaRemoto } =
    usePatientData();

  const [nota, setNotaState] = useState<NotaEvolucionV2>(notaInicial);
  const [seccionActiva, setSeccionActiva] = useState<SeccionNota>("como_llega");
  const [pendienteSincronizar, setPendienteSincronizar] = useState(false);
  const [hayRespaldoLocal, setHayRespaldoLocal] = useState(false);
  const [existeEnFirestore, setExisteEnFirestore] = useState(false);
  const [ultimoIntentoFallo, setUltimoIntentoFallo] = useState(false);
  const [escribiendoAhora, setEscribiendoAhora] = useState(false);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [firmando, setFirmando] = useState(false);

  const notaRef = useRef(nota);
  notaRef.current = nota;
  const seccionActivaRef = useRef(seccionActiva);
  seccionActivaRef.current = seccionActiva;
  const timerLocalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRemotoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detenidoRef = useRef(false); // true tras firmar — deja de autoguardar

  const escribirLocal = useCallback(async () => {
    if (!clinicUid || detenidoRef.current) return;
    const metadataLocal: MetadataLocalBorrador = {
      ultimaSeccionActiva: seccionActivaRef.current,
      modoCaptura: notaRef.current.modoCaptura,
      ultimoCambioLocalEn: new Date().toISOString(),
      pendienteSincronizar: true,
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

  const sincronizarRemoto = useCallback(async () => {
    if (!clinicUid || detenidoRef.current) return;
    try {
      if (!existeEnFirestore) {
        await crearBorradorNota(patientId, notaRef.current);
        setExisteEnFirestore(true);
      } else {
        await guardarBorradorRemoto(patientId, notaRef.current);
      }
      setPendienteSincronizar(false);
      setUltimoIntentoFallo(false);
    } catch (err) {
      console.error("No se pudo sincronizar el borrador de la nota", err);
      setUltimoIntentoFallo(true);
    }
  }, [clinicUid, patientId, existeEnFirestore, crearBorradorNota, guardarBorradorRemoto]);

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

  const registrarCambio = useCallback(
    (updater: (prev: NotaEvolucionV2) => NotaEvolucionV2) => {
      if (detenidoRef.current) return;
      setEscribiendoAhora(true);
      setNotaState((prev) => {
        const siguiente = { ...updater(prev), actualizadoEn: new Date().toISOString() };
        notaRef.current = siguiente;
        return siguiente;
      });

      if (timerLocalRef.current) clearTimeout(timerLocalRef.current);
      timerLocalRef.current = setTimeout(() => {
        setEscribiendoAhora(false);
        void escribirLocal();
      }, DEBOUNCE_LOCAL_MS);

      if (timerRemotoRef.current) clearTimeout(timerRemotoRef.current);
      timerRemotoRef.current = setTimeout(() => {
        void sincronizarRemoto();
      }, DEBOUNCE_REMOTO_MS);
    },
    [escribirLocal, sincronizarRemoto]
  );

  const irASeccion = useCallback((seccion: SeccionNota) => {
    seccionActivaRef.current = seccion;
    setSeccionActiva(seccion);
  }, []);

  // Flush síncrono del último cambio pendiente al desmontar (cambiar de
  // paciente, navegar a otra sección) o al ocultarse la pestaña/cerrarla —
  // el debounce por sí solo no cubre salidas más rápidas que su ventana.
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

  /** Firma la nota — solo borra el respaldo local DESPUÉS de que Firestore
   * confirma la escritura final (ver §7.8: nunca antes). Si falla, el
   * borrador sigue disponible y la nota no queda marcada como firmada. */
  const firmar = useCallback(async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    setFirmando(true);
    try {
      // Asegura que la última versión esté en Firestore antes de firmar.
      if (timerLocalRef.current) clearTimeout(timerLocalRef.current);
      if (timerRemotoRef.current) clearTimeout(timerRemotoRef.current);
      await escribirLocal();
      if (!existeEnFirestore) {
        await crearBorradorNota(patientId, notaRef.current);
        setExisteEnFirestore(true);
      } else {
        await guardarBorradorRemoto(patientId, notaRef.current);
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
  }, [clinicUid, patientId, existeEnFirestore, crearBorradorNota, guardarBorradorRemoto, firmarNotaRemoto, escribirLocal]);

  const descartar = useCallback(async () => {
    detenidoRef.current = true;
    if (timerLocalRef.current) clearTimeout(timerLocalRef.current);
    if (timerRemotoRef.current) clearTimeout(timerRemotoRef.current);
    if (clinicUid) await eliminarBorradorLocal(clinicUid, patientId, notaRef.current.id);
  }, [clinicUid, patientId]);

  return {
    nota,
    registrarCambio,
    seccionActiva,
    irASeccion,
    estadoGuardado,
    reintentarSincronizacion,
    firmar,
    firmando,
    descartar,
  };
}
