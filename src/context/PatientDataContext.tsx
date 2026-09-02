"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { confirmarHorarioPuro } from "@/lib/horarioAtencion";
import {
  horarioInicial,
  perfilDoctorInicial,
  elegirColorDisponible,
  type ClinicInfo,
  type ClinicInvite,
  type ClinicMember,
  type HorarioAtencion,
  type Patient,
  type PerfilDoctor,
  type RolClinica,
  type SavedBudget,
  type EstadoPresupuesto,
  type LineItem,
  type Pago,
  type DevolucionPago,
  type Receta,
  type NotaEvolucion,
  type Recurso,
  type SuscripcionPlan,
  type CitaAgenda,
  type SolicitudLaboratorio,
  fotosVacias,
  type FotosPaciente,
} from "@/lib/patientData";
import {
  esNotaV2,
  notaEvolucionV2Inicial,
  validarNotaParaFirmar,
  type AclaracionNota,
  type DiagnosticoPaciente,
  type EncabezadoNota,
  type ModoCaptura,
  type NotaEvolucionAny,
  type NotaEvolucionV2,
} from "@/lib/notasEvolucion";
import {
  metaConfigInicial,
  finanzasInicial,
  estadisticasInicial,
  fechaPagoAIso,
  presupuestosPorEstadoInicial,
  type MetaConfig,
  type FinanzasConfig,
  type EstadisticasGlobales,
} from "@/lib/metas";
import type { Gasto } from "@/lib/gastos";
import { estadoRegulacionInicial, type EstadoRegulacionSanitaria } from "@/lib/regulacionSanitaria";
import { formatosWhatsAppInicial, type FormatosWhatsApp } from "@/lib/formatosWhatsapp";
import { calcularFechaFin, type MembershipPlan, type PatientMembership, type UsoBeneficio } from "@/lib/membresias";
import type { Lamina } from "@/lib/laminas";
import type { Deposito, ArticuloFaltante, ArticuloCaducidad } from "@/lib/depositoDental";
import type { CentroRadiodiagnostico } from "@/lib/centroRadiodiagnostico";
import type { LaboratorioDental } from "@/lib/laboratorioDental";
import type { PagoEliminado } from "@/lib/pagosEliminados";
import { saldosPendientesInicial, calcularSaldoPendiente, type SaldosPendientesConfig } from "@/lib/saldosPendientes";
import {
  completarDevolucion,
  cancelarDevolucionBorrador,
  registrarCorreccionDevolucion,
  type DevolucionInput,
} from "@/lib/devolucionesPago";
import type { EventoDevolucionLog } from "@/lib/devolucionesLog";
import { laboratoriosPendientesInicial, type LaboratoriosPendientesConfig } from "@/lib/laboratoriosPendientes";
import {
  presupuestosPendientesDetalleInicial,
  type PresupuestosPendientesDetalleConfig,
} from "@/lib/presupuestosPendientesDetalle";
import type { PresupuestoLogEntry } from "@/lib/presupuestosLog";
import type { OtLogEntry } from "@/lib/otsLog";
import type { RecetaLogEntry } from "@/lib/recetasLog";
import type { EncuestaEnviada } from "@/lib/encuestas";
import type { Pendiente } from "@/lib/pendientes";
import type { Domiciliacion } from "@/lib/domiciliacion";
import type { Promocion, Aseguradora, EmpresaRPBI, Contador } from "@/lib/catalogosVarios";
import type { PersonalAsistencia, RegistroAsistencia } from "@/lib/asistencia";
import type { Procedimiento } from "@/lib/procedimientos";
import { catalogoRecomendado } from "@/lib/catalogoRecomendado";
import { crearProcedimientoDesdeTemplate, idDesdeCodigo } from "@/lib/importarCatalogoRecomendado";
import { catalogoInicial, type MedicamentoCatalogo } from "@/lib/medicamentos";
import {
  plantillaInicial,
  respuestasVacias,
  type HistoriaClinicaTemplate,
  type RespuestasHistoriaClinica,
} from "@/lib/historiaClinica";
import type { PlanTratamientoItem, PresupuestoVinculado } from "@/lib/planTratamiento";
import { actualizarFrecuencias, vocabularioNotasInicial, type VocabularioNotas } from "@/lib/vocabularioNotas";
import type { ComparativaRehabilitacion } from "@/lib/comparativaRehabilitacion";

type Updater<T> = T | ((prev: T) => T);

function resolveUpdater<T>(updater: Updater<T>, prev: T): T {
  return typeof updater === "function" ? (updater as (prev: T) => T)(prev) : updater;
}

function syncFirestoreList<T extends { id: string }>(path: string, prev: T[], next: T[]) {
  const prevIds = new Set(prev.map((p) => p.id));
  const nextIds = new Set(next.map((n) => n.id));

  next.forEach((item) => {
    const before = prev.find((p) => p.id === item.id);
    if (!before || JSON.stringify(before) !== JSON.stringify(item)) {
      setDoc(doc(db, path, item.id), item).catch((err) =>
        console.error(`No se pudo guardar en ${path}/${item.id}`, err)
      );
    }
  });

  prevIds.forEach((id) => {
    if (!nextIds.has(id)) {
      deleteDoc(doc(db, path, id)).catch((err) =>
        console.error(`No se pudo eliminar ${path}/${id}`, err)
      );
    }
  });
}

/** Colección de nivel superior sincronizada en tiempo real con `users/{clinicUid}/<name>`. */
function useFirestoreList<T extends { id: string }>(
  clinicUid: string | null,
  name: string,
  seed?: T[]
) {
  const [items, setItemsState] = useState<T[]>([]);
  const seeded = useRef(false);

  useEffect(() => {
    if (!clinicUid) {
      setItemsState([]);
      return;
    }
    const path = `users/${clinicUid}/${name}`;
    seeded.current = false;
    const unsub = onSnapshot(collection(db, path), (snap) => {
      if (snap.empty && seed && seed.length > 0 && !seeded.current) {
        seeded.current = true;
        seed.forEach((item) => {
          setDoc(doc(db, path, item.id), item).catch((err) =>
            console.error(`No se pudo inicializar ${path}/${item.id}`, err)
          );
        });
        return;
      }
      const next = snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }));
      setItemsState(next);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicUid, name]);

  const setItems = (updater: Updater<T[]>) => {
    if (!clinicUid) return;
    const path = `users/${clinicUid}/${name}`;
    setItemsState((prev) => {
      const next = resolveUpdater(updater, prev);
      syncFirestoreList(path, prev, next);
      return next;
    });
  };

  return [items, setItems] as const;
}

/** Documento único sincronizado en tiempo real en `users/{clinicUid}/config/<name>`. */
function useFirestoreDoc<T extends object>(clinicUid: string | null, name: string, defaultValue: T) {
  const [value, setValueState] = useState<T>(defaultValue);
  const [estado, setEstado] = useState<"cargando" | "cargado" | "error">("cargando");
  const seeded = useRef(false);

  useEffect(() => {
    if (!clinicUid) {
      setValueState(defaultValue);
      setEstado("cargando");
      return;
    }
    const path = `users/${clinicUid}/config`;
    seeded.current = false;
    setEstado("cargando");
    const unsub = onSnapshot(
      doc(db, path, name),
      (snap) => {
        if (!snap.exists() && !seeded.current) {
          seeded.current = true;
          setDoc(doc(db, path, name), defaultValue).catch((err) =>
            console.error(`No se pudo inicializar ${path}/${name}`, err)
          );
          setEstado("cargado");
          return;
        }
        if (snap.exists()) setValueState(snap.data() as T);
        setEstado("cargado");
      },
      (error) => {
        console.error(`Error leyendo ${path}/${name}`, error);
        setEstado("error"); // se registra internamente, pero nunca se expone como "cargado"
      }
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicUid, name]);

  const setValue = (updater: Updater<T>) => {
    if (!clinicUid) return;
    const path = `users/${clinicUid}/config`;
    setValueState((prev) => {
      // `prev` puede ser `defaultValue` si esto se llama antes de que
      // termine de cargar la primera respuesta real de Firestore (mismo
      // riesgo que setRespuestasHistoriaClinica) — este hook respalda 14
      // documentos de config distintos (perfilDoctor, horario, metas,
      // finanzas, formatosWhatsapp...), así que `merge: true` aquí protege
      // a todos ellos a la vez contra un guardado que reemplace el
      // documento completo con datos incompletos.
      const next = resolveUpdater(updater, prev);
      setDoc(doc(db, path, name), next, { merge: true }).catch((err) =>
        console.error(`No se pudo guardar ${path}/${name}`, err)
      );
      return next;
    });
  };

  return [value, setValue, estado === "cargado"] as const;
}

/** Documento único `clinics/{clinicUid}` — nombre visible de la clínica. */
function useClinicInfo(clinicUid: string | null) {
  const [value, setValueState] = useState<ClinicInfo | null>(null);

  useEffect(() => {
    if (!clinicUid) {
      setValueState(null);
      return;
    }
    const unsub = onSnapshot(doc(db, "clinics", clinicUid), (snap) => {
      if (snap.exists()) setValueState(snap.data() as ClinicInfo);
    });
    return unsub;
  }, [clinicUid]);

  const setValue = (updater: Updater<ClinicInfo>) => {
    if (!clinicUid || !value) return;
    const next = resolveUpdater(updater, value);
    setValueState(next);
    // merge: true por consistencia con el resto de los documentos de
    // config — este ya tenía el guard `!value` que evita el caso más común
    // (guardar antes de cargar), pero mismo defensivo por si acaso.
    setDoc(doc(db, "clinics", clinicUid), next, { merge: true }).catch((err) =>
      console.error(`No se pudo guardar clinics/${clinicUid}`, err)
    );
  };

  return [value, setValue] as const;
}

/**
 * Resuelve a qué clínica pertenecen los datos que debe ver esta sesión:
 * - Si el uid tiene una membresía activa en la clínica de alguien más, usa esa.
 * - Si no, la propia cuenta ES la clínica (arquitectura original): se
 *   autocrea su documento de clínica + membresía admin la primera vez.
 * También detecta invitaciones pendientes por correo para poder unirse a otra.
 */
function useClinicResolution(authUid: string, authEmail: string) {
  const [clinicUid, setClinicUid] = useState<string | null>(null);
  const [rol, setRol] = useState<RolClinica | null>(null);
  // null = sin restricción (ve todos los recursos/calendarios, como el
  // dueño o un colaborador al que nunca se le configuró un límite).
  // Un arreglo (incluso vacío se trata como sin restricción, ver abajo)
  // limita la Agenda/citas a esos recursos únicamente.
  const [misRecursosVisibles, setMisRecursosVisibles] = useState<string[] | null>(null);
  const [pendingInvite, setPendingInvite] = useState<ClinicInvite | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setResolved(false);

    (async () => {
      let membresias: ClinicMember[] = [];
      try {
        const q = query(
          collection(db, "clinicMembers"),
          where("uid", "==", authUid),
          where("status", "==", "active")
        );
        const snap = await getDocs(q);
        membresias = snap.docs.map((d) => d.data() as ClinicMember);
      } catch (err) {
        console.error("No se pudieron leer las membresías de clínica", err);
      }

      const externa = membresias.find((m) => m.clinicId !== authUid);

      if (externa) {
        if (!cancelled) {
          setClinicUid(externa.clinicId);
          setRol(externa.role);
          setMisRecursosVisibles(
            externa.recursosVisibles && externa.recursosVisibles.length > 0 ? externa.recursosVisibles : null
          );
        }
      } else {
        const propia = membresias.find((m) => m.clinicId === authUid);
        if (!propia) {
          try {
            await setDoc(doc(db, "clinics", authUid), {
              ownerId: authUid,
              nombre: "",
              creadoEl: new Date().toISOString().slice(0, 10),
            } satisfies ClinicInfo);
            await setDoc(doc(db, "clinicMembers", `${authUid}_${authUid}`), {
              clinicId: authUid,
              uid: authUid,
              nombre: "",
              correo: authEmail,
              role: "admin",
              status: "active",
            } satisfies ClinicMember);
            // Catálogo recomendado de tratamientos — solo los 20 principales
            // (nunca los servicios complementarios), sin precios, para que
            // el odontólogo los configure a su manera. Ver
            // src/lib/catalogoRecomendado.ts.
            const ahora = new Date().toISOString();
            const batchCatalogo = writeBatch(db);
            catalogoRecomendado.forEach((plantilla) => {
              const id = idDesdeCodigo(plantilla.codigo);
              batchCatalogo.set(doc(db, `users/${authUid}/procedimientos`, id), {
                id,
                ...crearProcedimientoDesdeTemplate(plantilla, ahora),
              } satisfies Procedimiento);
            });
            await batchCatalogo.commit();
          } catch (err) {
            console.error("No se pudo crear la clínica del usuario", err);
          }
        }
        if (!cancelled) {
          setClinicUid(authUid);
          setRol("admin");
        }
      }

      if (authEmail) {
        try {
          const qInv = query(
            collection(db, "clinicInvites"),
            where("email", "==", authEmail),
            where("status", "==", "pending")
          );
          const snapInv = await getDocs(qInv);
          if (!cancelled && !snapInv.empty) {
            setPendingInvite(snapInv.docs[0].data() as ClinicInvite);
          }
        } catch (err) {
          console.error("No se pudieron leer las invitaciones pendientes", err);
        }
      }

      if (!cancelled) setResolved(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [authUid, authEmail]);

  const aceptarInvite = async () => {
    if (!pendingInvite) return;
    const memberId = `${pendingInvite.clinicId}_${authUid}`;
    await setDoc(doc(db, "clinicMembers", memberId), {
      clinicId: pendingInvite.clinicId,
      uid: authUid,
      nombre: pendingInvite.nombre,
      correo: pendingInvite.email,
      whatsapp: pendingInvite.whatsapp ?? "",
      role: pendingInvite.role,
      status: "active",
    } satisfies ClinicMember);
    // Todo colaborador que se une queda también dado de alta como recurso
    // (médico) en la Agenda, para que "el personal" y "los recursos de la
    // agenda" sean siempre la misma lista — el uid como id hace esto
    // idempotente si por alguna razón se acepta la invitación más de una vez.
    // Se consultan los colores ya usados para no repetir el de otro recurso.
    const snapRecursos = await getDocs(collection(db, `users/${pendingInvite.clinicId}/recursos`));
    const coloresEnUso = snapRecursos.docs.map((d) => (d.data() as Recurso).color);
    await setDoc(doc(db, `users/${pendingInvite.clinicId}/recursos`, `ruid_${authUid}`), {
      id: `ruid_${authUid}`,
      nombre: pendingInvite.nombre,
      color: elegirColorDisponible(coloresEnUso),
      tipo: "medico",
    } satisfies Recurso);
    await setDoc(
      doc(db, "clinicInvites", `${pendingInvite.clinicId}_${pendingInvite.email}`),
      { ...pendingInvite, status: "claimed" },
      { merge: true }
    );
    setClinicUid(pendingInvite.clinicId);
    setRol(pendingInvite.role);
    setPendingInvite(null);
  };

  const rechazarInvite = () => setPendingInvite(null);

  return { clinicUid, rol, misRecursosVisibles, resolved, pendingInvite, aceptarInvite, rechazarInvite };
}

export type NavegacionExpediente = { patientId: string; tab?: string; citaId?: string } | null;

export type NavegacionNuevaCita = { patientId: string; tratamiento: string } | null;

type PatientDataContextValue = {
  clinicUid: string | null;
  /** uid real de Firebase Auth de la sesión actual — distinto de `clinicUid`
   * cuando quien entra es un colaborador (no el dueño) de la clínica. Antes
   * no se exponía (el provider ya lo recibía como prop `uid`, pero
   * `PatientDataContextValue` nunca lo devolvía) — se usa para
   * `firmadoPorUid` al firmar una nota de evolución (ver notasEvolucion.ts). */
  miUid: string;
  userEmail: string;
  patients: Patient[];
  addPatient: (data: { name: string; phone: string; birthDate?: string }) => Patient;
  updatePatient: (patientId: string, data: Partial<Omit<Patient, "id">>) => void;
  importarPacientes: (
    nuevos: Omit<Patient, "id">[],
    onProgreso?: (hechos: number, total: number) => void
  ) => Promise<void>;
  /** Fusiona dos expedientes duplicados en uno solo — ver "Fusionar
   * Expedientes" en Pacientes. `camposPacienteResueltos`/
   * `historiaClinicaResuelta`/`fotosResueltas` ya vienen con los conflictos
   * decididos por quien llama (ver src/lib/fusionExpedientes.ts); esta
   * función solo aplica esos valores y une el resto de las colecciones.
   * Nunca borra el expediente perdedor — lo marca `fusionadoEnId` y lo
   * oculta de `patients` (ver el filtro en el valor expuesto por el
   * provider), pero su información original queda intacta. */
  fusionarPacientes: (params: {
    sobrevivienteId: string;
    perdedorId: string;
    camposPacienteResueltos: Partial<Patient>;
    historiaClinicaResuelta: RespuestasHistoriaClinica;
    fotosResueltas: FotosPaciente;
  }) => void;
  presupuestosPorPaciente: Record<string, SavedBudget[]>;
  setPresupuestosPaciente: (patientId: string, updater: Updater<SavedBudget[]>) => void;
  pagosPorPaciente: Record<string, Pago[]>;
  setPagosPaciente: (patientId: string, updater: Updater<Pago[]>) => void;
  recetasPorPaciente: Record<string, Receta[]>;
  setRecetasPaciente: (patientId: string, updater: Updater<Receta[]>) => void;
  laboratoriosPorPaciente: Record<string, SolicitudLaboratorio[]>;
  setLaboratoriosPaciente: (patientId: string, updater: Updater<SolicitudLaboratorio[]>) => void;
  /** v1 (PSOAP crudo) y v2 ("Registrar atención de hoy") conviven como
   * documentos hermanos — ver `esNotaV2` en notasEvolucion.ts para
   * distinguirlos. `setNotasEvolucionPaciente` solo escribe v1 (ver su
   * implementación) — v2 usa métodos dedicados que se agregan en la Fase 1. */
  notasEvolucionPorPaciente: Record<string, NotaEvolucionAny[]>;
  /** cargando/cargado/error por paciente, ver asegurarSuscripcionNotasPaciente. */
  estadoCargaNotasPorPaciente: Record<string, "cargando" | "cargado" | "error">;
  /** Suscribe solo las notas de evolución de un paciente (sin las otras 9
   * colecciones que abre cargarDatosPaciente) — usada por "Requieren
   * Atención" en el Dashboard. */
  cargarNotasPaciente: (patientId: string) => void;
  setNotasEvolucionPaciente: (patientId: string, updater: Updater<NotaEvolucion[]>) => void;
  /** Escrituras dedicadas de notas v2 ("Registrar atención de hoy") — NUNCA
   * usan el diff de array completo de setNotasEvolucionPaciente (ver su
   * comentario). Cada una es un setDoc/updateDoc puntual por id. */
  crearBorradorNota: (patientId: string, nota: NotaEvolucionV2) => Promise<void>;
  guardarBorradorNota: (patientId: string, nota: NotaEvolucionV2) => Promise<void>;
  marcarListaParaRevision: (patientId: string, notaId: string) => Promise<void>;
  firmarNota: (patientId: string, nota: NotaEvolucionV2) => Promise<void>;
  agregarAclaracionNota: (
    patientId: string,
    notaId: string,
    aclaracion: { motivo: string; contenido: string }
  ) => Promise<void>;
  /** Catálogo de diagnósticos por paciente (Sección 3 de "Registrar
   * atención de hoy") — reconfirmar uno existente en una nota nueva agrega
   * una entrada nueva (origen "confirmado_de_historial"), nunca reescribe
   * la vieja. */
  diagnosticosPorPaciente: Record<string, DiagnosticoPaciente[]>;
  setDiagnosticosPaciente: (patientId: string, updater: Updater<DiagnosticoPaciente[]>) => void;
  /** Plan de Tratamiento por diagnóstico del odontograma (ver
   * planTratamiento.ts) — la decisión clínica intercalada entre un
   * DiagnosticoOdontograma y un renglón de presupuesto. */
  planTratamientoPorPaciente: Record<string, PlanTratamientoItem[]>;
  setPlanTratamientoPaciente: (patientId: string, updater: Updater<PlanTratamientoItem[]>) => void;
  /** Agrega UNA cotización más a un plan ya existente sin arriesgar pisar
   * una agregada por otra pestaña/usuario mientras tanto — usa
   * arrayUnion() de Firestore (resuelto en el servidor) en vez del patrón
   * general de sincronizar la lista completa desde el estado de React. */
  vincularPresupuestoAPlan: (
    patientId: string,
    planTratamientoItemId: string,
    vinculo: PresupuestoVinculado
  ) => Promise<void>;
  /** Devoluciones de pago por paciente — ver devolucionesPago.ts. Un pago
   * nunca se edita/borra; una devolución es un movimiento nuevo vinculado. */
  devolucionesPorPaciente: Record<string, DevolucionPago[]>;
  /** Bitácora plana de auditoría (mismo patrón que pagosEliminados) —
   * nunca anidada, para poder leerla en Reportes sin recorrer expedientes. */
  devolucionesLog: EventoDevolucionLog[];
  /** Completa una devolución de forma atómica (transacción única: la
   * devolución, su resumen, el delta de corte de caja y el evento de
   * auditoría) y luego intenta reconciliar `saldosPendientes` aparte — ese
   * segundo paso puede fallar sin que la devolución deje de estar
   * completada (nunca se le pide al usuario repetir el movimiento de
   * dinero por eso). */
  registrarDevolucion: (
    devolucionId: string,
    input: DevolucionInput,
    patientName: string
  ) => Promise<{ devolucion: DevolucionPago; saldoSincronizado: boolean }>;
  /** Solo válido antes de completar — un borrador nunca movió dinero real. */
  cancelarDevolucion: (patientId: string, devolucionId: string) => Promise<void>;
  /** Anota un ajuste posterior a una devolución YA completada — nunca la
   * revierte ni cambia su estado (ver DevolucionPago.correccion). */
  corregirDevolucion: (
    patientId: string,
    devolucionId: string,
    correccion: { motivo: string; montoRegresado?: number }
  ) => Promise<void>;
  /** Vuelve a calcular saldosPendientes de un paciente desde cero (recompute
   * puro e idempotente, seguro de reintentar cualquier número de veces) —
   * expuesto para el botón "Reintentar sincronización" cuando
   * registrarDevolucion devuelve saldoSincronizado: false. */
  reconciliarSaldoPendiente: (patientId: string) => void;
  /** Adjunta la firma de recepción (ya subida a Storage) a una devolución
   * completada — no transaccional, nunca sugiere que la devolución falló. */
  agregarFirmaRecepcionDevolucion: (
    patientId: string,
    devolucionId: string,
    pagoOrigenId: string,
    path: string,
    url: string
  ) => Promise<void>;
  /** Comparativas de rehabilitación — cada una compara 2-4 presupuestos ya
   * guardados del mismo paciente (ver "Comparativa de Rehabilitación" en
   * Presupuestos). Solo referencian el id de cada presupuesto, nunca
   * copian sus datos. */
  comparativasPorPaciente: Record<string, ComparativaRehabilitacion[]>;
  setComparativasPaciente: (patientId: string, updater: Updater<ComparativaRehabilitacion[]>) => void;
  membershipPlanes: MembershipPlan[];
  setMembershipPlanes: (updater: Updater<MembershipPlan[]>) => void;
  laminas: Lamina[];
  setLaminas: (updater: Updater<Lamina[]>) => void;
  depositos: Deposito[];
  setDepositos: (updater: Updater<Deposito[]>) => void;
  articulosFaltantes: ArticuloFaltante[];
  setArticulosFaltantes: (updater: Updater<ArticuloFaltante[]>) => void;
  articulosCaducidad: ArticuloCaducidad[];
  setArticulosCaducidad: (updater: Updater<ArticuloCaducidad[]>) => void;
  centrosRadiodiagnostico: CentroRadiodiagnostico[];
  setCentrosRadiodiagnostico: (updater: Updater<CentroRadiodiagnostico[]>) => void;
  laboratoriosDentales: LaboratorioDental[];
  setLaboratoriosDentales: (updater: Updater<LaboratorioDental[]>) => void;
  pagosEliminados: PagoEliminado[];
  setPagosEliminados: (updater: Updater<PagoEliminado[]>) => void;
  saldosPendientes: SaldosPendientesConfig;
  laboratoriosPendientes: LaboratoriosPendientesConfig;
  presupuestosPendientesDetalle: PresupuestosPendientesDetalleConfig;
  presupuestosLog: PresupuestoLogEntry[];
  setPresupuestosLog: (updater: Updater<PresupuestoLogEntry[]>) => void;
  otsLog: OtLogEntry[];
  setOtsLog: (updater: Updater<OtLogEntry[]>) => void;
  recetasLog: RecetaLogEntry[];
  setRecetasLog: (updater: Updater<RecetaLogEntry[]>) => void;
  domiciliaciones: Domiciliacion[];
  setDomiciliaciones: (updater: Updater<Domiciliacion[]>) => void;
  encuestas: EncuestaEnviada[];
  setEncuestas: (updater: Updater<EncuestaEnviada[]>) => void;
  pendientes: Pendiente[];
  setPendientes: (updater: Updater<Pendiente[]>) => void;
  promociones: Promocion[];
  setPromociones: (updater: Updater<Promocion[]>) => void;
  aseguradoras: Aseguradora[];
  setAseguradoras: (updater: Updater<Aseguradora[]>) => void;
  empresasRpbi: EmpresaRPBI[];
  setEmpresasRpbi: (updater: Updater<EmpresaRPBI[]>) => void;
  contadores: Contador[];
  setContadores: (updater: Updater<Contador[]>) => void;
  membresiasPorPaciente: Record<string, PatientMembership[]>;
  activarMembresia: (
    patientId: string,
    plan: MembershipPlan,
    datosPago: { medico: string; formaPago: string; facturar: boolean }
  ) => void;
  renovarMembresia: (
    patientId: string,
    membresiaAnterior: PatientMembership,
    datosPago: { medico: string; formaPago: string; facturar: boolean }
  ) => void;
  usarBeneficio: (patientId: string, membresiaId: string, beneficioId: string, profesional: string) => void;
  cancelarMembresia: (patientId: string, membresiaId: string) => void;
  personalAsistencia: PersonalAsistencia[];
  setPersonalAsistencia: (updater: Updater<PersonalAsistencia[]>) => void;
  registrosAsistencia: RegistroAsistencia[];
  marcarAsistencia: (personalId: string, fecha: string, campo: "entrada" | "salida", hora: string | null) => void;
  marcarLlegadaCita: (citaId: string, hora: string | null) => void;
  procedimientos: Procedimiento[];
  setProcedimientos: (updater: Updater<Procedimiento[]>) => void;
  importarCatalogoProcedimientos: (nuevos: Procedimiento[]) => Promise<void>;
  historiaClinicaTemplate: HistoriaClinicaTemplate;
  setHistoriaClinicaTemplate: (updater: Updater<HistoriaClinicaTemplate>) => void;
  historiaClinicaPorPaciente: Record<string, RespuestasHistoriaClinica>;
  setRespuestasHistoriaClinica: (
    patientId: string,
    updater: Updater<RespuestasHistoriaClinica>
  ) => void;
  fotosPorPaciente: Record<string, FotosPaciente>;
  setFotosPaciente: (patientId: string, updater: Updater<FotosPaciente>) => void;
  consumirSiguienteFolioReceta: () => string;
  catalogoMedicamentos: MedicamentoCatalogo[];
  setCatalogoMedicamentos: (updater: Updater<MedicamentoCatalogo[]>) => void;
  recursos: Recurso[];
  setRecursos: (updater: Updater<Recurso[]>) => void;
  citas: CitaAgenda[];
  setCitas: (updater: Updater<CitaAgenda[]>) => void;
  gastos: Gasto[];
  setGastos: (updater: Updater<Gasto[]>) => void;
  horario: HorarioAtencion;
  setHorario: (updater: Updater<HorarioAtencion>) => void;
  /** false hasta que llega la primera respuesta real de Firestore — evita
   * que "Requiere Atención" concluya "horario sin confirmar" a partir del
   * default inicial antes de hidratar. */
  horarioCargado: boolean;
  /** Confirmación explícita del horario (no basta con editar un campo, ver
   * editarCampoHorario en horarioAtencion.ts). */
  confirmarHorario: () => void;
  vocabularioNotas: VocabularioNotas;
  /** Aprende las palabras relevantes de una nota de evolución recién
   * guardada — alimenta el autocompletado propio de Notas de Evolución
   * (ver src/lib/vocabularioNotas.ts), compartido por toda la clínica. */
  registrarPalabrasDeNota: (textoNota: string) => void;
  perfilDoctor: PerfilDoctor;
  setPerfilDoctor: (updater: Updater<PerfilDoctor>) => void;
  /** false hasta que llega la primera respuesta real de Firestore — evita
   * el falso "no tiene firma" mientras aún hidrata. */
  perfilDoctorCargado: boolean;
  suscripcion: SuscripcionPlan;
  setSuscripcion: (updater: Updater<SuscripcionPlan>) => void;
  metas: MetaConfig;
  setMetas: (updater: Updater<MetaConfig>) => void;
  finanzas: FinanzasConfig;
  estadisticas: EstadisticasGlobales;
  regulacionSanitaria: EstadoRegulacionSanitaria;
  setRegulacionSanitaria: (updater: Updater<EstadoRegulacionSanitaria>) => void;
  formatosWhatsapp: FormatosWhatsApp;
  setFormatosWhatsapp: (updater: Updater<FormatosWhatsApp>) => void;
  cargarDatosPaciente: (patientId: string) => void;
  navegacionExpediente: NavegacionExpediente;
  irAExpediente: (patientId: string, tab?: string, citaId?: string) => void;
  consumirNavegacionExpediente: () => void;
  navegacionNuevaCita: NavegacionNuevaCita;
  sugerirNuevaCita: (patientId: string, tratamiento: string) => void;
  consumirNavegacionNuevaCita: () => void;
  solicitudNuevaCitaBlanco: boolean;
  abrirNuevaCitaDesdeInicio: () => void;
  consumirSolicitudNuevaCitaBlanco: () => void;
  irAPagina: (pageId: string) => void;
  cambiosSinGuardar: string | null;
  setCambiosSinGuardar: (mensaje: string | null) => void;
  /** Contexto más específico que activePage para el Asistente flotante —
   * ej. una pestaña del Expediente ("pacientes-Pagos") — para que la ayuda
   * mostrada sea más precisa que solo el nombre de la página. Vuelve a
   * null cuando ese componente se desmonta. */
  ayudaContexto: string | null;
  setAyudaContexto: (contexto: string | null) => void;
  miRol: RolClinica | null;
  /** null = ve todos los recursos/calendarios de la Agenda. Un arreglo
   * limita qué recursos (médicos/unidades) puede ver este colaborador —
   * ver actualizarRecursosVisiblesColaborador. */
  misRecursosVisibles: string[] | null;
  actualizarRecursosVisiblesColaborador: (memberId: string, recursoIds: string[] | null) => Promise<void>;
  puedeVerFinanzas: boolean;
  clinicInfo: ClinicInfo | null;
  setClinicInfo: (updater: Updater<ClinicInfo>) => void;
  pendingInvite: ClinicInvite | null;
  aceptarInvite: () => Promise<void>;
  rechazarInvite: () => void;
  colaboradoresActivos: ClinicMember[];
  invitacionesPendientes: ClinicInvite[];
  invitarColaborador: (data: { nombre: string; correo: string; whatsapp: string; rol: RolClinica }) => Promise<void>;
  eliminarInvitacion: (inviteId: string) => Promise<void>;
  actualizarWhatsappInvitacion: (inviteId: string, whatsapp: string) => Promise<void>;
  actualizarCorreoInvitacion: (inviteId: string, correo: string) => Promise<void>;
  eliminarColaborador: (memberId: string) => Promise<void>;
  actualizarRolColaborador: (memberId: string, rol: RolClinica) => Promise<void>;
  actualizarWhatsappColaborador: (memberId: string, whatsapp: string) => Promise<void>;
  actualizarNombreColaborador: (memberId: string, nombre: string) => Promise<void>;
  actualizarCorreoColaborador: (memberId: string, correo: string) => Promise<void>;
};

const PatientDataContext = createContext<PatientDataContextValue | null>(null);

export function PatientDataProvider({
  uid,
  userEmail,
  onIrAPagina,
  children,
}: {
  uid: string;
  userEmail: string;
  onIrAPagina?: (pageId: string) => void;
  children: ReactNode;
}) {
  const { clinicUid, rol, misRecursosVisibles, resolved, pendingInvite, aceptarInvite, rechazarInvite } =
    useClinicResolution(uid, userEmail);
  const [clinicInfo, setClinicInfo] = useClinicInfo(clinicUid);

  const [patients, setPatients] = useFirestoreList<Patient>(clinicUid, "pacientes");
  const [recursos, setRecursos] = useFirestoreList<Recurso>(clinicUid, "recursos");
  const [citas, setCitas] = useFirestoreList<CitaAgenda>(clinicUid, "citas");
  const [gastos, setGastos] = useFirestoreList<Gasto>(clinicUid, "gastos");
  const [horario, setHorario, horarioCargado] = useFirestoreDoc<HorarioAtencion>(clinicUid, "horario", horarioInicial);
  const [vocabularioNotas, setVocabularioNotas] = useFirestoreDoc<VocabularioNotas>(
    clinicUid,
    "vocabularioNotas",
    vocabularioNotasInicial
  );
  const [perfilDoctor, setPerfilDoctor, perfilDoctorCargado] = useFirestoreDoc<PerfilDoctor>(
    clinicUid,
    "perfilDoctor",
    perfilDoctorInicial
  );
  const [suscripcionInicial] = useState<SuscripcionPlan>(() => ({
    planActivo: "prueba",
    pruebaIniciadaEl: new Date().toISOString().slice(0, 10),
  }));
  const [suscripcion, setSuscripcion] = useFirestoreDoc<SuscripcionPlan>(
    clinicUid,
    "suscripcion",
    suscripcionInicial
  );
  const [metas, setMetas] = useFirestoreDoc<MetaConfig>(clinicUid, "metas", metaConfigInicial);
  const [finanzas, setFinanzas] = useFirestoreDoc<FinanzasConfig>(clinicUid, "finanzas", finanzasInicial);
  const [estadisticas, setEstadisticas] = useFirestoreDoc<EstadisticasGlobales>(
    clinicUid,
    "estadisticas",
    estadisticasInicial
  );
  const [saldosPendientes, setSaldosPendientes] = useFirestoreDoc<SaldosPendientesConfig>(
    clinicUid,
    "saldosPendientes",
    saldosPendientesInicial
  );
  const [laboratoriosPendientes, setLaboratoriosPendientes] = useFirestoreDoc<LaboratoriosPendientesConfig>(
    clinicUid,
    "laboratoriosPendientes",
    laboratoriosPendientesInicial
  );
  const [presupuestosPendientesDetalle, setPresupuestosPendientesDetalle] =
    useFirestoreDoc<PresupuestosPendientesDetalleConfig>(
      clinicUid,
      "presupuestosPendientesDetalle",
      presupuestosPendientesDetalleInicial
    );
  const [regulacionSanitaria, setRegulacionSanitaria] = useFirestoreDoc<EstadoRegulacionSanitaria>(
    clinicUid,
    "regulacionSanitaria",
    estadoRegulacionInicial
  );
  const [formatosWhatsapp, setFormatosWhatsapp] = useFirestoreDoc<FormatosWhatsApp>(
    clinicUid,
    "formatosWhatsapp",
    formatosWhatsAppInicial
  );
  const [membershipPlanes, setMembershipPlanes] = useFirestoreList<MembershipPlan>(
    clinicUid,
    "membresiaPlanes"
  );
  const [laminas, setLaminas] = useFirestoreList<Lamina>(clinicUid, "laminas");
  const [depositos, setDepositos] = useFirestoreList<Deposito>(clinicUid, "depositosDentales");
  const [articulosFaltantes, setArticulosFaltantes] = useFirestoreList<ArticuloFaltante>(
    clinicUid,
    "articulosFaltantes"
  );
  const [articulosCaducidad, setArticulosCaducidad] = useFirestoreList<ArticuloCaducidad>(
    clinicUid,
    "articulosCaducidad"
  );
  const [centrosRadiodiagnostico, setCentrosRadiodiagnostico] = useFirestoreList<CentroRadiodiagnostico>(
    clinicUid,
    "centrosRadiodiagnostico"
  );
  const [laboratoriosDentales, setLaboratoriosDentales] = useFirestoreList<LaboratorioDental>(
    clinicUid,
    "laboratoriosDentales"
  );
  const [pagosEliminados, setPagosEliminados] = useFirestoreList<PagoEliminado>(
    clinicUid,
    "pagosEliminados"
  );
  const [presupuestosLog, setPresupuestosLog] = useFirestoreList<PresupuestoLogEntry>(
    clinicUid,
    "presupuestosLog"
  );
  const [otsLog, setOtsLog] = useFirestoreList<OtLogEntry>(clinicUid, "otsLog");
  const [recetasLog, setRecetasLog] = useFirestoreList<RecetaLogEntry>(clinicUid, "recetasLog");
  const [domiciliaciones, setDomiciliaciones] = useFirestoreList<Domiciliacion>(
    clinicUid,
    "domiciliaciones"
  );
  const [encuestas, setEncuestas] = useFirestoreList<EncuestaEnviada>(clinicUid, "encuestas");
  const [pendientes, setPendientes] = useFirestoreList<Pendiente>(clinicUid, "pendientes");
  const [promociones, setPromociones] = useFirestoreList<Promocion>(clinicUid, "promociones");
  const [aseguradoras, setAseguradoras] = useFirestoreList<Aseguradora>(clinicUid, "aseguradoras");
  const [empresasRpbi, setEmpresasRpbi] = useFirestoreList<EmpresaRPBI>(clinicUid, "empresasRpbi");
  const [contadores, setContadores] = useFirestoreList<Contador>(clinicUid, "contadores");
  const [personalAsistencia, setPersonalAsistencia] = useFirestoreList<PersonalAsistencia>(
    clinicUid,
    "personalAsistencia"
  );
  const [registrosAsistencia, setRegistrosAsistencia] = useFirestoreList<RegistroAsistencia>(
    clinicUid,
    "registrosAsistencia"
  );
  const [procedimientos, setProcedimientos] = useFirestoreList<Procedimiento>(clinicUid, "procedimientos");
  const [historiaClinicaTemplate, setHistoriaClinicaTemplate] = useFirestoreDoc<HistoriaClinicaTemplate>(
    clinicUid,
    "historiaClinicaTemplate",
    plantillaInicial
  );
  const [folioReceta, setFolioReceta] = useFirestoreDoc<{ siguiente: number }>(
    clinicUid,
    "folioReceta",
    { siguiente: 1 }
  );
  const consumirSiguienteFolioReceta = (): string => {
    const folio = folioReceta.siguiente;
    setFolioReceta({ siguiente: folio + 1 });
    return String(folio);
  };
  const [catalogoMedicamentos, setCatalogoMedicamentos] = useFirestoreList<MedicamentoCatalogo>(
    clinicUid,
    "medicamentos",
    catalogoInicial
  );

  const [presupuestosPorPaciente, setPresupuestosPorPacienteState] = useState<
    Record<string, SavedBudget[]>
  >({});
  const [pagosPorPaciente, setPagosPorPacienteState] = useState<Record<string, Pago[]>>({});
  const [recetasPorPaciente, setRecetasPorPacienteState] = useState<Record<string, Receta[]>>({});
  const [laboratoriosPorPaciente, setLaboratoriosPorPacienteState] = useState<
    Record<string, SolicitudLaboratorio[]>
  >({});
  const [notasEvolucionPorPaciente, setNotasEvolucionPorPacienteState] = useState<
    Record<string, NotaEvolucionAny[]>
  >({});
  /** cargando/cargado/error por paciente — para que "Requieren Atención"
   * nunca concluya "sin nota" mientras la suscripción aún no responde o
   * falló (ver asegurarSuscripcionNotasPaciente). */
  const [estadoCargaNotasPorPaciente, setEstadoCargaNotasPorPacienteState] = useState<
    Record<string, "cargando" | "cargado" | "error">
  >({});
  const [diagnosticosPorPaciente, setDiagnosticosPorPacienteState] = useState<Record<string, DiagnosticoPaciente[]>>({});
  const [planTratamientoPorPaciente, setPlanTratamientoPorPacienteState] = useState<Record<string, PlanTratamientoItem[]>>({});
  const [devolucionesPorPaciente, setDevolucionesPorPacienteState] = useState<Record<string, DevolucionPago[]>>({});
  // Escrita únicamente dentro de la transacción de completarDevolucion — no
  // necesita un setter propio del contexto, el onSnapshot ya la mantiene
  // sincronizada.
  const [devolucionesLog] = useFirestoreList<EventoDevolucionLog>(clinicUid, "devolucionesLog");
  const [comparativasPorPaciente, setComparativasPorPacienteState] = useState<
    Record<string, ComparativaRehabilitacion[]>
  >({});
  const [membresiasPorPaciente, setMembresiasPorPacienteState] = useState<
    Record<string, PatientMembership[]>
  >({});
  const [historiaClinicaPorPaciente, setHistoriaClinicaPorPacienteState] = useState<
    Record<string, RespuestasHistoriaClinica>
  >({});
  const [fotosPorPaciente, setFotosPorPacienteState] = useState<Record<string, FotosPaciente>>({});
  const subs = useRef<Record<string, Unsubscribe>>({});
  const [navegacionExpediente, setNavegacionExpediente] = useState<NavegacionExpediente>(null);
  const [navegacionNuevaCita, setNavegacionNuevaCita] = useState<NavegacionNuevaCita>(null);
  const [solicitudNuevaCitaBlanco, setSolicitudNuevaCitaBlanco] = useState(false);
  // Bandera compartida para pantallas con "Guardar" manual (Historia Clínica,
  // Datos del Paciente): mientras tenga un mensaje, se avisa antes de salir
  // por navegación dentro de la app (irAPagina) o al cerrar/recargar la
  // pestaña — para no perder información como pasó antes.
  const [cambiosSinGuardar, setCambiosSinGuardar] = useState<string | null>(null);
  const [ayudaContexto, setAyudaContexto] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!cambiosSinGuardar) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [cambiosSinGuardar]);

  const [colaboradoresActivos, setColaboradoresActivos] = useState<ClinicMember[]>([]);
  const [invitacionesPendientes, setInvitacionesPendientes] = useState<ClinicInvite[]>([]);

  useEffect(() => {
    const map = subs.current;
    return () => {
      Object.values(map).forEach((unsub) => unsub());
    };
  }, []);

  useEffect(() => {
    if (!clinicUid || rol !== "admin") {
      setColaboradoresActivos([]);
      setInvitacionesPendientes([]);
      return;
    }
    const unsubMembers = onSnapshot(
      query(collection(db, "clinicMembers"), where("clinicId", "==", clinicUid)),
      (snap) => setColaboradoresActivos(snap.docs.map((d) => d.data() as ClinicMember))
    );
    const unsubInvites = onSnapshot(
      query(
        collection(db, "clinicInvites"),
        where("clinicId", "==", clinicUid),
        where("status", "==", "pending")
      ),
      (snap) => setInvitacionesPendientes(snap.docs.map((d) => ({ ...(d.data() as ClinicInvite), id: d.id })))
    );
    return () => {
      unsubMembers();
      unsubInvites();
    };
  }, [clinicUid, rol]);

  /** Única responsable de la suscripción a notas de evolución de un
   * paciente — la llaman tanto `cargarDatosPaciente` (Expediente/Agenda,
   * junto con las otras 9 colecciones del paciente) como `cargarNotasPaciente`
   * (Dashboard, que solo necesita esta). Evita el falso negativo de tener
   * dos rutas separadas con la misma guarda `subs.current[key]`: sin
   * importar cuál de las dos se dispare primero, el estado de carga
   * (cargando/cargado/error) siempre queda seteado, nunca se abre una
   * segunda suscripción para el mismo paciente. */
  const asegurarSuscripcionNotasPaciente = (patientId: string) => {
    if (!clinicUid) return;
    const key = `notasEvolucion:${patientId}`;
    if (subs.current[key]) return;
    setEstadoCargaNotasPorPacienteState((prev) => ({ ...prev, [patientId]: "cargando" }));
    const path = `users/${clinicUid}/pacientes/${patientId}/notasEvolucion`;
    subs.current[key] = onSnapshot(
      collection(db, path),
      (snap) => {
        const next = snap.docs.map((d) => ({ ...(d.data() as NotaEvolucionAny), id: d.id }));
        setNotasEvolucionPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
        setEstadoCargaNotasPorPacienteState((prev) => ({ ...prev, [patientId]: "cargado" }));
      },
      (error) => {
        console.error(`Error cargando notas de evolución de ${patientId}`, error);
        setEstadoCargaNotasPorPacienteState((prev) => ({ ...prev, [patientId]: "error" }));
      }
    );
  };

  /** Suscribe solo las notas de evolución de un paciente — usada por el
   * Dashboard ("Requieren Atención") para no abrir las otras 9 colecciones
   * que abre `cargarDatosPaciente` y que el Dashboard nunca usa. */
  const cargarNotasPaciente = (patientId: string) => asegurarSuscripcionNotasPaciente(patientId);

  const cargarDatosPaciente = (patientId: string) => {
    if (!clinicUid) return;
    const presupuestosKey = `presupuestos:${patientId}`;
    if (!subs.current[presupuestosKey]) {
      const path = `users/${clinicUid}/pacientes/${patientId}/presupuestos`;
      subs.current[presupuestosKey] = onSnapshot(collection(db, path), (snap) => {
        const next = snap.docs.map((d) => ({ ...(d.data() as SavedBudget), id: d.id }));
        setPresupuestosPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
      });
    }
    const pagosKey = `pagos:${patientId}`;
    if (!subs.current[pagosKey]) {
      const path = `users/${clinicUid}/pacientes/${patientId}/pagos`;
      subs.current[pagosKey] = onSnapshot(collection(db, path), (snap) => {
        const next = snap.docs.map((d) => ({ ...(d.data() as Pago), id: d.id }));
        setPagosPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
      });
    }
    const recetasKey = `recetas:${patientId}`;
    if (!subs.current[recetasKey]) {
      const path = `users/${clinicUid}/pacientes/${patientId}/recetas`;
      subs.current[recetasKey] = onSnapshot(collection(db, path), (snap) => {
        const next = snap.docs.map((d) => ({ ...(d.data() as Receta), id: d.id }));
        setRecetasPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
      });
    }
    const diagnosticosKey = `diagnosticos:${patientId}`;
    if (!subs.current[diagnosticosKey]) {
      const path = `users/${clinicUid}/pacientes/${patientId}/diagnosticos`;
      subs.current[diagnosticosKey] = onSnapshot(collection(db, path), (snap) => {
        const next = snap.docs.map((d) => ({ ...(d.data() as DiagnosticoPaciente), id: d.id }));
        setDiagnosticosPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
      });
    }
    const planTratamientoKey = `planTratamiento:${patientId}`;
    if (!subs.current[planTratamientoKey]) {
      const path = `users/${clinicUid}/pacientes/${patientId}/planTratamiento`;
      subs.current[planTratamientoKey] = onSnapshot(collection(db, path), (snap) => {
        const next = snap.docs.map((d) => ({ ...(d.data() as PlanTratamientoItem), id: d.id }));
        setPlanTratamientoPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
      });
    }
    const devolucionesKey = `devoluciones:${patientId}`;
    if (!subs.current[devolucionesKey]) {
      const path = `users/${clinicUid}/pacientes/${patientId}/devoluciones`;
      subs.current[devolucionesKey] = onSnapshot(collection(db, path), (snap) => {
        const next = snap.docs.map((d) => ({ ...(d.data() as DevolucionPago), id: d.id }));
        setDevolucionesPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
      });
    }
    const comparativasKey = `comparativas:${patientId}`;
    if (!subs.current[comparativasKey]) {
      const path = `users/${clinicUid}/pacientes/${patientId}/comparativas`;
      subs.current[comparativasKey] = onSnapshot(collection(db, path), (snap) => {
        const next = snap.docs.map((d) => ({ ...(d.data() as ComparativaRehabilitacion), id: d.id }));
        setComparativasPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
      });
    }
    const laboratoriosKey = `laboratorios:${patientId}`;
    if (!subs.current[laboratoriosKey]) {
      const path = `users/${clinicUid}/pacientes/${patientId}/laboratorios`;
      subs.current[laboratoriosKey] = onSnapshot(collection(db, path), (snap) => {
        const next = snap.docs.map((d) => ({ ...(d.data() as SolicitudLaboratorio), id: d.id }));
        setLaboratoriosPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
      });
    }
    const membresiasKey = `membresias:${patientId}`;
    if (!subs.current[membresiasKey]) {
      const path = `users/${clinicUid}/pacientes/${patientId}/membresias`;
      subs.current[membresiasKey] = onSnapshot(collection(db, path), (snap) => {
        const next = snap.docs.map((d) => ({ ...(d.data() as PatientMembership), id: d.id }));
        setMembresiasPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
      });
    }
    asegurarSuscripcionNotasPaciente(patientId);
    const historiaKey = `historiaClinica:${patientId}`;
    if (!subs.current[historiaKey]) {
      const path = `users/${clinicUid}/pacientes/${patientId}/historiaClinica`;
      subs.current[historiaKey] = onSnapshot(doc(db, path, "respuestas"), (snap) => {
        const next = snap.exists() ? (snap.data() as RespuestasHistoriaClinica) : respuestasVacias;
        setHistoriaClinicaPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
      });
    }
    const fotosKey = `fotos:${patientId}`;
    if (!subs.current[fotosKey]) {
      const path = `users/${clinicUid}/pacientes/${patientId}/fotos`;
      subs.current[fotosKey] = onSnapshot(doc(db, path, "datos"), (snap) => {
        const next = snap.exists() ? (snap.data() as FotosPaciente) : fotosVacias;
        setFotosPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
      });
    }
  };

  const addPatient = (data: { name: string; phone: string; birthDate?: string }): Patient => {
    const nuevo: Patient = {
      id: `p${Date.now()}`,
      name: data.name,
      phone: data.phone,
      birthDate: data.birthDate ?? "",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setPatients((prev) => [...prev, nuevo]);
    return nuevo;
  };

  const updatePatient = (patientId: string, data: Partial<Omit<Patient, "id">>) => {
    setPatients((prev) => prev.map((p) => (p.id === patientId ? { ...p, ...data } : p)));
  };

  /** Escribe en bloques de 500 (límite de Firestore por batch) directo a
   * Firestore — la lista local se actualiza sola vía el listener ya activo. */
  const importarPacientes = async (
    nuevos: Omit<Patient, "id">[],
    onProgreso?: (hechos: number, total: number) => void
  ) => {
    if (!clinicUid) return;
    const path = `users/${clinicUid}/pacientes`;
    const tamañoLote = 450;
    let hechos = 0;
    for (let i = 0; i < nuevos.length; i += tamañoLote) {
      const lote = nuevos.slice(i, i + tamañoLote);
      const batch = writeBatch(db);
      lote.forEach((data, idx) => {
        const id = `imp${Date.now()}${i + idx}`;
        batch.set(doc(db, path, id), { id, ...data });
      });
      await batch.commit();
      hechos += lote.length;
      onProgreso?.(hechos, nuevos.length);
    }
  };

  /** Escribe con id determinista (`proc_<codigo>`) para que reimportar el
   * catálogo recomendado nunca duplique — un envío repetido sobrescribe el
   * mismo documento en vez de crear uno nuevo. La lista local se actualiza
   * sola vía el listener ya activo, igual que `importarPacientes`. */
  const importarCatalogoProcedimientos = async (nuevos: Procedimiento[]) => {
    if (!clinicUid || nuevos.length === 0) return;
    const path = `users/${clinicUid}/procedimientos`;
    const batch = writeBatch(db);
    nuevos.forEach((data) => {
      batch.set(doc(db, path, data.id), data);
    });
    await batch.commit();
  };

  const irAExpediente = (patientId: string, tab?: string, citaId?: string) => {
    if (cambiosSinGuardar && !window.confirm(`${cambiosSinGuardar} ¿Salir sin guardar?`)) return;
    setCambiosSinGuardar(null);
    setNavegacionExpediente({ patientId, tab, citaId });
    onIrAPagina?.("pacientes");
  };

  const consumirNavegacionExpediente = () => setNavegacionExpediente(null);

  const sugerirNuevaCita = (patientId: string, tratamiento: string) => {
    setNavegacionNuevaCita({ patientId, tratamiento });
    onIrAPagina?.("agenda");
  };

  const consumirNavegacionNuevaCita = () => setNavegacionNuevaCita(null);

  const abrirNuevaCitaDesdeInicio = () => {
    setSolicitudNuevaCitaBlanco(true);
    onIrAPagina?.("agenda");
  };

  const consumirSolicitudNuevaCitaBlanco = () => setSolicitudNuevaCitaBlanco(false);

  const irAPagina = (pageId: string) => {
    if (cambiosSinGuardar && !window.confirm(`${cambiosSinGuardar} ¿Salir sin guardar?`)) return;
    setCambiosSinGuardar(null);
    onIrAPagina?.(pageId);
  };

  /** Refleja en `config/estadisticas` el total presupuestado y el conteo por
   * mes (alta, edición o baja de un presupuesto) para que los KPIs "Saldo
   * Pendiente" y "Presupuestos del Mes" del Dashboard sean reales sin
   * depender de tener cada expediente de paciente cargado — mismo patrón que
   * `registrarDeltaFinanzas` usa para los pagos. */
  const registrarDeltaPresupuestos = (prevArr: SavedBudget[], next: SavedBudget[]) => {
    const deltaTotal = next.reduce((s, p) => s + p.total, 0) - prevArr.reduce((s, p) => s + p.total, 0);
    const conMes = (arr: SavedBudget[]) =>
      arr.map((p) => (fechaPagoAIso(p.fecha) ?? "").slice(0, 7)).filter(Boolean);
    const mesesPrev = conMes(prevArr);
    const mesesNext = conMes(next);
    const meses = new Set([...mesesPrev, ...mesesNext]);

    // Mismo dato que conMes pero SIN recortar a "YYYY-MM" — día completo,
    // para poder filtrar por un rango exacto (Hoy/Semana) en el Dashboard,
    // no solo por mes calendario.
    const conDiaYValor = (arr: SavedBudget[]) =>
      arr.map((p) => ({ dia: fechaPagoAIso(p.fecha) ?? "", valor: p.total })).filter((p) => p.dia);
    const diasPrev = conDiaYValor(prevArr);
    const diasNext = conDiaYValor(next);
    const dias = new Set([...diasPrev, ...diasNext].map((p) => p.dia));

    const estadoDe = (p: SavedBudget): EstadoPresupuesto => p.estado ?? "pendiente";
    const estados: EstadoPresupuesto[] = ["pendiente", "aceptado", "rechazado", "expirado"];
    const deltasPorEstado = Object.fromEntries(
      estados.map((estado) => [
        estado,
        {
          cantidad:
            next.filter((p) => estadoDe(p) === estado).length -
            prevArr.filter((p) => estadoDe(p) === estado).length,
          valor:
            next.filter((p) => estadoDe(p) === estado).reduce((s, p) => s + p.total, 0) -
            prevArr.filter((p) => estadoDe(p) === estado).reduce((s, p) => s + p.total, 0),
        },
      ])
    ) as Record<EstadoPresupuesto, { cantidad: number; valor: number }>;
    const hayDeltaEstado = estados.some(
      (e) => deltasPorEstado[e].cantidad !== 0 || deltasPorEstado[e].valor !== 0
    );

    if (deltaTotal === 0 && meses.size === 0 && !hayDeltaEstado) return;
    setEstadisticas((prevEst) => {
      const presupuestosPorMes = { ...prevEst.presupuestosPorMes };
      meses.forEach((mes) => {
        const deltaMes =
          mesesNext.filter((m) => m === mes).length - mesesPrev.filter((m) => m === mes).length;
        if (deltaMes !== 0) presupuestosPorMes[mes] = (presupuestosPorMes[mes] ?? 0) + deltaMes;
      });
      const presupuestosPorFecha = { ...(prevEst.presupuestosPorFecha ?? {}) };
      dias.forEach((dia) => {
        const cantidadPrev = diasPrev.filter((p) => p.dia === dia).length;
        const cantidadNext = diasNext.filter((p) => p.dia === dia).length;
        const valorPrevDia = diasPrev.filter((p) => p.dia === dia).reduce((s, p) => s + p.valor, 0);
        const valorNextDia = diasNext.filter((p) => p.dia === dia).reduce((s, p) => s + p.valor, 0);
        const deltaCantidad = cantidadNext - cantidadPrev;
        const deltaValor = valorNextDia - valorPrevDia;
        if (deltaCantidad !== 0 || deltaValor !== 0) {
          const actual = presupuestosPorFecha[dia] ?? { cantidad: 0, valor: 0 };
          presupuestosPorFecha[dia] = { cantidad: actual.cantidad + deltaCantidad, valor: actual.valor + deltaValor };
        }
      });
      const presupuestosPorEstadoPrev = prevEst.presupuestosPorEstado ?? presupuestosPorEstadoInicial;
      const presupuestosPorEstado = Object.fromEntries(
        estados.map((estado) => [
          estado,
          {
            cantidad: presupuestosPorEstadoPrev[estado].cantidad + deltasPorEstado[estado].cantidad,
            valor: presupuestosPorEstadoPrev[estado].valor + deltasPorEstado[estado].valor,
          },
        ])
      ) as EstadisticasGlobales["presupuestosPorEstado"];
      return {
        ...prevEst,
        totalPresupuestado: prevEst.totalPresupuestado + deltaTotal,
        presupuestosPorMes,
        presupuestosPorFecha,
        presupuestosPorEstado,
      };
    });
  };

  /** Refleja en `config/presupuestosPendientesDetalle` cada presupuesto sin
   * resolver (estado pendiente o sin marcar) con su paciente y folio, para
   * la alerta clicable "presupuestos esperan seguimiento" de Requieren
   * Atención — mismo patrón incremental que `registrarLaboratoriosPendientes`.
   * Se quita del mapa el presupuesto que se marca Aceptado/Rechazado/
   * Expirado, o que se elimina. */
  const registrarPresupuestosPendientesDetalle = (
    patientId: string,
    prevArr: SavedBudget[],
    next: SavedBudget[]
  ) => {
    const patientName = patients.find((p) => p.id === patientId)?.name ?? "";
    const prevIds = new Set(prevArr.map((p) => p.id));
    const nextIds = new Set(next.map((p) => p.id));
    const cambiaron = next.filter((p) => {
      const antes = prevArr.find((a) => a.id === p.id);
      return !antes || JSON.stringify(antes) !== JSON.stringify(p);
    });
    const eliminados = [...prevIds].filter((id) => !nextIds.has(id));
    if (cambiaron.length === 0 && eliminados.length === 0) return;
    setPresupuestosPendientesDetalle((prev) => {
      const porPresupuesto = { ...prev.porPresupuesto };
      cambiaron.forEach((p) => {
        const estado = p.estado ?? "pendiente";
        if (estado !== "pendiente") {
          delete porPresupuesto[p.id];
        } else {
          porPresupuesto[p.id] = {
            id: p.id,
            patientId,
            patientName,
            folio: p.folio,
            total: p.total,
            fecha: p.fecha,
            actualizadoEn: new Date().toISOString(),
          };
        }
      });
      eliminados.forEach((id) => delete porPresupuesto[id]);
      return { porPresupuesto };
    });
  };

  /** Refleja en `config/saldosPendientes` cuánto debe cada paciente (mismo
   * patrón incremental que el resto de los rollups) para poder listarlos en
   * Reportes → Saldos Pendientes sin tener que cargar los 1006 expedientes.
   * Se quita del mapa al paciente que ya no debe nada, para que el reporte
   * solo muestre saldos reales. */
  const registrarSaldoPendiente = (
    patientId: string,
    presupuestos: SavedBudget[],
    pagos: Pago[],
    devoluciones: DevolucionPago[] = []
  ) => {
    const { totalPresupuestado, totalPagado, saldo } = calcularSaldoPendiente(presupuestos, pagos, devoluciones);
    const patientName = patients.find((p) => p.id === patientId)?.name ?? "";
    setSaldosPendientes((prev) => {
      const porPaciente = { ...prev.porPaciente };
      if (saldo <= 0) {
        delete porPaciente[patientId];
      } else {
        porPaciente[patientId] = {
          patientId,
          patientName,
          totalPresupuestado,
          totalPagado,
          actualizadoEn: new Date().toISOString(),
        };
      }
      return { porPaciente };
    });
  };

  /** Agrega a `presupuestosLog` (Reportes → Presupuestos) cada presupuesto
   * nuevo — es una bitácora de creación, no un espejo en vivo de ediciones o
   * borrados posteriores. */
  const registrarLogPresupuestos = (patientId: string, prevArr: SavedBudget[], next: SavedBudget[]) => {
    const prevIds = new Set(prevArr.map((p) => p.id));
    const nuevos = next.filter((p) => !prevIds.has(p.id));
    if (nuevos.length === 0) return;
    const patientName = patients.find((p) => p.id === patientId)?.name ?? "";
    const entradas: PresupuestoLogEntry[] = nuevos.map((p) => ({
      id: p.id,
      patientId,
      patientName,
      folio: p.folio,
      fecha: p.fecha,
      medico: p.medico,
      total: p.total,
      procedimientos: p.items.map((i) => i.procedure),
      creadoEn: new Date().toISOString(),
    }));
    setPresupuestosLog((prev) => [...entradas, ...prev]);
  };

  /** id de LineItem -> etiqueta/folio vigentes — mismo criterio que
   * `tratamientosDeDisponibles` (note || procedure, folio del presupuesto). */
  const mapaTratamientoPorId = (presupuestos: SavedBudget[]) => {
    const mapa: Record<string, { label: string; folio: string }> = {};
    presupuestos.forEach((p) => {
      p.items.forEach((item) => {
        mapa[item.id] = { label: item.note || item.procedure, folio: p.folio };
      });
    });
    return mapa;
  };

  /** Un pago guarda una COPIA de la etiqueta/folio del tratamiento al
   * momento de crearse o reasignarse (Pagos.tsx) — si después se edita el
   * nombre/nota o el folio de ese tratamiento en Presupuestos, esa copia se
   * queda obsoleta y Pagos sigue mostrando el nombre viejo, que es
   * exactamente la confusión reportada. Aquí se refresca esa copia en
   * cuanto cambia; el monto pagado NUNCA se toca — es historial real de lo
   * cobrado, independiente de si el precio del tratamiento cambió después. */
  const sincronizarEtiquetasPagos = (patientId: string, prevPres: SavedBudget[], nextPres: SavedBudget[]) => {
    const mapaAnterior = mapaTratamientoPorId(prevPres);
    const mapaNuevo = mapaTratamientoPorId(nextPres);
    const cambios: Record<string, { label: string; folio: string }> = {};
    Object.entries(mapaNuevo).forEach(([id, actual]) => {
      const anterior = mapaAnterior[id];
      if (anterior && (anterior.label !== actual.label || anterior.folio !== actual.folio)) {
        cambios[id] = actual;
      }
    });
    if (Object.keys(cambios).length === 0) return;

    let huboCambio = false;
    const pagosActualizados = (pagosPorPaciente[patientId] ?? []).map((pago) => {
      let lineasCambiaron = false;
      const lineas = pago.lineas.map((linea) => {
        const cambio = linea.tratamientoId ? cambios[linea.tratamientoId] : undefined;
        if (!cambio) return linea;
        lineasCambiaron = true;
        return { ...linea, label: cambio.label, folio: cambio.folio };
      });
      if (!lineasCambiaron) return pago;
      huboCambio = true;
      return { ...pago, lineas };
    });

    if (huboCambio) setPagosPaciente(patientId, () => pagosActualizados);
  };

  const setPresupuestosPaciente = (patientId: string, updater: Updater<SavedBudget[]>) => {
    if (!clinicUid) return;
    const prevArr = presupuestosPorPaciente[patientId] ?? [];
    const next = resolveUpdater(updater, prevArr);
    syncFirestoreList(`users/${clinicUid}/pacientes/${patientId}/presupuestos`, prevArr, next);
    registrarDeltaPresupuestos(prevArr, next);
    registrarPresupuestosPendientesDetalle(patientId, prevArr, next);
    registrarSaldoPendiente(patientId, next, pagosPorPaciente[patientId] ?? [], devolucionesPorPaciente[patientId] ?? []);
    registrarLogPresupuestos(patientId, prevArr, next);
    setPresupuestosPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
    sincronizarEtiquetasPagos(patientId, prevArr, next);
  };

  /** Refleja en `config/finanzas` el neto por fecha (alta, edición o baja de
   * un pago) para que el KPI de Metas se calcule con ingresos reales de toda
   * la clínica, sin depender de tener cada expediente de paciente cargado. */
  const registrarDeltaFinanzas = (prevArr: Pago[], next: Pago[]) => {
    const conIso = (arr: Pago[]) =>
      arr.map((p) => ({ ...p, _iso: fechaPagoAIso(p.fecha) })).filter((p) => p._iso);
    const prevConIso = conIso(prevArr);
    const nextConIso = conIso(next);
    const fechas = new Set([...prevConIso, ...nextConIso].map((p) => p._iso as string));
    if (fechas.size === 0) return;
    const formasDePago = new Set([...prevConIso, ...nextConIso].map((p) => p.formaPago));
    setFinanzas((prevFin) => {
      const porFecha = { ...prevFin.porFecha };
      // porFechaYFormaPago no existía antes de este campo — los documentos
      // ya guardados en Firestore no lo traen hasta la primera vez que se
      // escribe aquí, así que siempre se respalda con {} en vez de asumir
      // que existe.
      const porFechaYFormaPago = { ...(prevFin.porFechaYFormaPago ?? {}) };
      const pagosCountPorFecha = { ...(prevFin.pagosCountPorFecha ?? {}) };
      fechas.forEach((iso) => {
        const sumPrev = prevConIso.filter((p) => p._iso === iso).reduce((s, p) => s + p.total, 0);
        const sumNext = nextConIso.filter((p) => p._iso === iso).reduce((s, p) => s + p.total, 0);
        const delta = sumNext - sumPrev;
        if (delta !== 0) porFecha[iso] = (porFecha[iso] ?? 0) + delta;

        const countPrev = prevConIso.filter((p) => p._iso === iso).length;
        const countNext = nextConIso.filter((p) => p._iso === iso).length;
        const deltaCount = countNext - countPrev;
        if (deltaCount !== 0) pagosCountPorFecha[iso] = (pagosCountPorFecha[iso] ?? 0) + deltaCount;

        const porForma = { ...(porFechaYFormaPago[iso] ?? {}) };
        formasDePago.forEach((forma) => {
          const sumPrevForma = prevConIso
            .filter((p) => p._iso === iso && p.formaPago === forma)
            .reduce((s, p) => s + p.total, 0);
          const sumNextForma = nextConIso
            .filter((p) => p._iso === iso && p.formaPago === forma)
            .reduce((s, p) => s + p.total, 0);
          const deltaForma = sumNextForma - sumPrevForma;
          if (deltaForma !== 0) porForma[forma] = (porForma[forma] ?? 0) + deltaForma;
        });
        porFechaYFormaPago[iso] = porForma;
      });
      // Spread de prevFin PRIMERO — nunca se debe perder un campo que otra
      // parte de la app ya haya escrito aquí (ej. devolucionesPorFecha) solo
      // porque esta función todavía no lo conocía cuando se escribió.
      return { ...prevFin, porFecha, porFechaYFormaPago, pagosCountPorFecha };
    });
  };

  /** OJO: prevArr/next y los efectos secundarios (Firestore + delta de
   * finanzas) se calculan aquí afuera, no dentro del updater de
   * setPagosPorPacienteState — en React 18 Strict Mode (solo en desarrollo)
   * los updaters funcionales se invocan dos veces, y como el delta de
   * finanzas es acumulativo (no una sobreescritura idempotente como
   * syncFirestoreList), duplicarlo inflaría el ingreso registrado. */
  /** Todo pago que llegue con líneas "extra" (sin tratamiento asociado a un
   * presupuesto existente — ej. el paciente paga su consulta antes de que
   * exista un presupuesto formal) genera automáticamente un presupuesto que
   * cubre exactamente esas líneas, y el pago se reescribe para apuntar a
   * ese presupuesto nuevo. Así el presupuesto y lo realmente cobrado nunca
   * quedan desincronizados: por defecto, todo pago se refleja en el
   * presupuesto del paciente, y no aparece como saldo pendiente. */
  /** Además de las citas ligadas, devuelve los presupuestos que acaba de
   * generar (no solo los guarda vía setPresupuestosPaciente) para que quien
   * llama pueda calcular el saldo pendiente correcto en el mismo tick, sin
   * depender de `presupuestosPorPaciente` del contexto — que en este punto
   * todavía no refleja el presupuesto recién creado. */
  const generarPresupuestosDesdeExtras = (patientId: string, prevArr: Pago[], next: Pago[]) => {
    const prevIds = new Set(prevArr.map((p) => p.id));
    const pagosNuevos = next.filter((p) => !prevIds.has(p.id));
    let nextConLigas = next;
    const presupuestosAgregados: SavedBudget[] = [];

    pagosNuevos.forEach((pago) => {
      const lineasExtra = pago.lineas.filter((l) => l.generarPresupuesto);
      if (lineasExtra.length === 0) return;

      const items: LineItem[] = lineasExtra.map((l) => ({
        id: `item-${l.id}`,
        procedure: l.label,
        price: l.monto,
        teeth: [],
        note: "",
      }));
      const total = items.reduce((sum, i) => sum + i.price, 0);
      const folio = pago.id.slice(-6);
      const nuevoPresupuesto: SavedBudget = {
        id: `pres-${pago.id}`,
        folio,
        fecha: pago.fecha,
        medico: pago.medico,
        tipoDePrecio: "Consultorio",
        especialidad: "Odontología General",
        diagnostico: "Generado automáticamente a partir de un pago sin presupuesto previo.",
        items,
        total,
      };
      setPresupuestosPaciente(patientId, (prevPres) => [nuevoPresupuesto, ...prevPres]);
      presupuestosAgregados.push(nuevoPresupuesto);

      const idPorLinea = new Map(lineasExtra.map((l, i) => [l.id, items[i].id]));
      nextConLigas = nextConLigas.map((p) =>
        p.id !== pago.id
          ? p
          : {
              ...p,
              lineas: p.lineas.map((l) =>
                idPorLinea.has(l.id) ? { ...l, tratamientoId: idPorLinea.get(l.id)!, folio } : l
              ),
            }
      );
    });

    return { nextConLigas, presupuestosAgregados };
  };

  const setPagosPaciente = (patientId: string, updater: Updater<Pago[]>) => {
    if (!clinicUid) return;
    const prevArr = pagosPorPaciente[patientId] ?? [];
    const generado = resolveUpdater(updater, prevArr);
    const { nextConLigas: next, presupuestosAgregados } = generarPresupuestosDesdeExtras(
      patientId,
      prevArr,
      generado
    );
    syncFirestoreList(`users/${clinicUid}/pacientes/${patientId}/pagos`, prevArr, next);
    registrarDeltaFinanzas(prevArr, next);
    const deltaCount = next.length - prevArr.length;
    if (deltaCount !== 0) {
      setEstadisticas((prevEst) => ({ ...prevEst, pagosCount: prevEst.pagosCount + deltaCount }));
    }
    const presupuestosActuales = [
      ...presupuestosAgregados,
      ...(presupuestosPorPaciente[patientId] ?? []),
    ];
    registrarSaldoPendiente(patientId, presupuestosActuales, next, devolucionesPorPaciente[patientId] ?? []);
    setPagosPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
  };

  /** Agrega a `recetasLog` (tabla al final de Recetas) cada receta nueva —
   * bitácora de creación, mismo patrón que `presupuestosLog`/`otsLog`. */
  const registrarLogRecetas = (patientId: string, prevArr: Receta[], next: Receta[]) => {
    const prevIds = new Set(prevArr.map((r) => r.id));
    const nuevas = next.filter((r) => !prevIds.has(r.id));
    if (nuevas.length === 0) return;
    const patientName = patients.find((p) => p.id === patientId)?.name ?? "";
    const entradas: RecetaLogEntry[] = nuevas.map((r) => ({
      id: r.id,
      patientId,
      patientName,
      folio: r.folio,
      fecha: r.fecha,
      medico: r.medico,
      medicamentos: r.medicamentos.map((m) => m.nombre),
      creadoEn: new Date().toISOString(),
    }));
    setRecetasLog((prev) => [...entradas, ...prev]);
  };

  const setRecetasPaciente = (patientId: string, updater: Updater<Receta[]>) => {
    if (!clinicUid) return;
    const prevArr = recetasPorPaciente[patientId] ?? [];
    const next = resolveUpdater(updater, prevArr);
    syncFirestoreList(`users/${clinicUid}/pacientes/${patientId}/recetas`, prevArr, next);
    registrarLogRecetas(patientId, prevArr, next);
    setRecetasPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
  };

  const setDiagnosticosPaciente = (patientId: string, updater: Updater<DiagnosticoPaciente[]>) => {
    if (!clinicUid) return;
    const prevArr = diagnosticosPorPaciente[patientId] ?? [];
    const next = resolveUpdater(updater, prevArr);
    syncFirestoreList(`users/${clinicUid}/pacientes/${patientId}/diagnosticos`, prevArr, next);
    setDiagnosticosPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
  };

  const setPlanTratamientoPaciente = (patientId: string, updater: Updater<PlanTratamientoItem[]>) => {
    if (!clinicUid) return;
    const prevArr = planTratamientoPorPaciente[patientId] ?? [];
    const next = resolveUpdater(updater, prevArr);
    syncFirestoreList(`users/${clinicUid}/pacientes/${patientId}/planTratamiento`, prevArr, next);
    setPlanTratamientoPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
  };

  /** Agrega una cotización a un plan ya existente vía arrayUnion() —
   * resuelto en el servidor, así que dos cotizaciones casi simultáneas del
   * mismo plan (dos pestañas) nunca se pisan entre sí, a diferencia del
   * patrón general de arriba (que sobrescribe la lista completa desde un
   * array de React y sí podría perder una adición concurrente). No pasa
   * por el estado local — el onSnapshot ya suscrito lo recoge solo. */
  const vincularPresupuestoAPlan = async (
    patientId: string,
    planTratamientoItemId: string,
    vinculo: PresupuestoVinculado
  ) => {
    if (!clinicUid) return;
    const ref = doc(db, `users/${clinicUid}/pacientes/${patientId}/planTratamiento/${planTratamientoItemId}`);
    await updateDoc(ref, { presupuestosVinculados: arrayUnion(vinculo) });
  };

  /** Recompute completo (no delta) de saldosPendientes de un paciente —
   * puro e idempotente, seguro de reintentar cualquier número de veces sin
   * corromper nada. Usado tanto tras registrar una devolución como por el
   * botón manual "Reintentar sincronización" si el primer intento falló. */
  const reconciliarSaldoPendiente = (patientId: string) => {
    registrarSaldoPendiente(
      patientId,
      presupuestosPorPaciente[patientId] ?? [],
      pagosPorPaciente[patientId] ?? [],
      devolucionesPorPaciente[patientId] ?? []
    );
  };

  const registrarDevolucion = async (devolucionId: string, input: DevolucionInput, patientName: string) => {
    if (!clinicUid) throw new Error("Sin clínica activa.");
    // Atómico y garantizado: si esto no lanza, el dinero ya quedó
    // registrado como devuelto — punto final. Nunca se le pide al usuario
    // repetir esta llamada por un fallo posterior de sincronización.
    const { devolucion } = await completarDevolucion(db, clinicUid, devolucionId, input, uid, patientName);
    let saldoSincronizado = true;
    try {
      // Recompute completo con la devolución ya incluida — devolucionesPorPaciente
      // todavía puede no traerla si el onSnapshot no ha llegado, así que se
      // agrega explícitamente a la lista usada para este cálculo puntual.
      const devolucionesConEsta = [
        ...(devolucionesPorPaciente[input.patientId] ?? []).filter((d) => d.id !== devolucion.id),
        devolucion,
      ];
      registrarSaldoPendiente(
        input.patientId,
        presupuestosPorPaciente[input.patientId] ?? [],
        pagosPorPaciente[input.patientId] ?? [],
        devolucionesConEsta
      );
    } catch (err) {
      console.error("No se pudo sincronizar saldosPendientes tras la devolución", err);
      saldoSincronizado = false;
    }
    return { devolucion, saldoSincronizado };
  };

  const cancelarDevolucion = async (patientId: string, devolucionId: string) => {
    if (!clinicUid) return;
    await cancelarDevolucionBorrador(db, clinicUid, patientId, devolucionId, uid);
    await setDoc(doc(db, `users/${clinicUid}/devolucionesLog/${devolucionId}-cancelada`), {
      id: `${devolucionId}-cancelada`,
      tipo: "devolucion_cancelada",
      patientId,
      patientName: patients.find((p) => p.id === patientId)?.name ?? "",
      devolucionId,
      pagoOrigenId: "",
      uid,
      creadoEn: new Date().toISOString(),
    } satisfies EventoDevolucionLog);
  };

  const corregirDevolucion = async (
    patientId: string,
    devolucionId: string,
    correccion: { motivo: string; montoRegresado?: number }
  ) => {
    if (!clinicUid) return;
    await registrarCorreccionDevolucion(db, clinicUid, patientId, devolucionId, correccion, uid);
    await setDoc(doc(db, `users/${clinicUid}/devolucionesLog/${devolucionId}-correccion`), {
      id: `${devolucionId}-correccion`,
      tipo: "devolucion_corregida",
      patientId,
      patientName: patients.find((p) => p.id === patientId)?.name ?? "",
      devolucionId,
      pagoOrigenId: "",
      motivo: correccion.motivo,
      uid,
      creadoEn: new Date().toISOString(),
    } satisfies EventoDevolucionLog);
  };

  /** Adjunta la firma de recepción ya subida a Storage a una devolución YA
   * completada — nunca transaccional, un fallo aquí no debe sugerir que la
   * devolución falló (ver ronda 2 punto 9 del plan). */
  const agregarFirmaRecepcionDevolucion = async (
    patientId: string,
    devolucionId: string,
    pagoOrigenId: string,
    path: string,
    url: string
  ) => {
    if (!clinicUid) return;
    const ref = doc(db, `users/${clinicUid}/pacientes/${patientId}/devoluciones/${devolucionId}`);
    await updateDoc(ref, { firmaRecepcionStoragePath: path, firmaRecepcionUrl: url });
    await setDoc(doc(db, `users/${clinicUid}/devolucionesLog/${devolucionId}-firma`), {
      id: `${devolucionId}-firma`,
      tipo: "firma_recepcion_agregada",
      patientId,
      patientName: patients.find((p) => p.id === patientId)?.name ?? "",
      devolucionId,
      pagoOrigenId,
      uid,
      creadoEn: new Date().toISOString(),
    } satisfies EventoDevolucionLog);
  };

  const setComparativasPaciente = (patientId: string, updater: Updater<ComparativaRehabilitacion[]>) => {
    if (!clinicUid) return;
    const prevArr = comparativasPorPaciente[patientId] ?? [];
    const next = resolveUpdater(updater, prevArr);
    syncFirestoreList(`users/${clinicUid}/pacientes/${patientId}/comparativas`, prevArr, next);
    setComparativasPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
  };

  /** Agrega a `otsLog` (Reportes → OTs) cada solicitud de laboratorio nueva
   * — bitácora de creación, mismo patrón que `presupuestosLog`. */
  const registrarLogOts = (patientId: string, prevArr: SolicitudLaboratorio[], next: SolicitudLaboratorio[]) => {
    const prevIds = new Set(prevArr.map((s) => s.id));
    const nuevas = next.filter((s) => !prevIds.has(s.id));
    if (nuevas.length === 0) return;
    const patientName = patients.find((p) => p.id === patientId)?.name ?? "";
    const entradas: OtLogEntry[] = nuevas.map((s) => ({
      id: s.id,
      patientId,
      patientName,
      tipo: s.tipo,
      laboratorio: s.laboratorio,
      trabajo: s.trabajo,
      medico: s.medico,
      fechaEnvio: s.fechaEnvio,
      costo: s.costo,
      creadoEn: new Date().toISOString(),
    }));
    setOtsLog((prev) => [...entradas, ...prev]);
  };

  /** Refleja en `config/laboratoriosPendientes` el detalle (no solo el
   * conteo) de cada solicitud sin recibir, para poder listarlas agrupadas
   * por fecha de entrega en el Dashboard sin cargar cada expediente — mismo
   * patrón incremental que `registrarSaldoPendiente`. Se quita del mapa la
   * orden que se marca "Recibido" o que se elimina. */
  const registrarLaboratoriosPendientes = (
    patientId: string,
    prevArr: SolicitudLaboratorio[],
    next: SolicitudLaboratorio[]
  ) => {
    const patientName = patients.find((p) => p.id === patientId)?.name ?? "";
    const prevIds = new Set(prevArr.map((s) => s.id));
    const nextIds = new Set(next.map((s) => s.id));
    const cambiaron = next.filter((s) => {
      const antes = prevArr.find((p) => p.id === s.id);
      return !antes || JSON.stringify(antes) !== JSON.stringify(s);
    });
    const eliminadas = [...prevIds].filter((id) => !nextIds.has(id));
    if (cambiaron.length === 0 && eliminadas.length === 0) return;
    setLaboratoriosPendientes((prev) => {
      const porOrden = { ...prev.porOrden };
      cambiaron.forEach((s) => {
        if (s.estatus === "Recibido") {
          delete porOrden[s.id];
        } else {
          porOrden[s.id] = {
            id: s.id,
            patientId,
            patientName,
            tipo: s.tipo,
            laboratorio: s.laboratorio,
            trabajo: s.trabajo,
            fechaEntrega: s.fechaEntrega,
            estatus: s.estatus,
            actualizadoEn: new Date().toISOString(),
          };
        }
      });
      eliminadas.forEach((id) => delete porOrden[id]);
      return { porOrden };
    });
  };

  const setLaboratoriosPaciente = (patientId: string, updater: Updater<SolicitudLaboratorio[]>) => {
    if (!clinicUid) return;
    const prevArr = laboratoriosPorPaciente[patientId] ?? [];
    const next = resolveUpdater(updater, prevArr);
    syncFirestoreList(`users/${clinicUid}/pacientes/${patientId}/laboratorios`, prevArr, next);
    const contarPendientes = (arr: SolicitudLaboratorio[]) =>
      arr.filter((s) => s.estatus !== "Recibido").length;
    const deltaPendientes = contarPendientes(next) - contarPendientes(prevArr);
    if (deltaPendientes !== 0) {
      setEstadisticas((prevEst) => ({
        ...prevEst,
        laboratoriosPendientesCount: prevEst.laboratoriosPendientesCount + deltaPendientes,
      }));
    }
    registrarLaboratoriosPendientes(patientId, prevArr, next);
    registrarLogOts(patientId, prevArr, next);
    setLaboratoriosPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
  };

  // Solo escribe notas v1 (PSOAP legado) — nunca debe tocar documentos v2
  // ("Registrar atención de hoy"), que viven en la misma subcolección. Por
  // eso el diff de syncFirestoreList se corre SOLO contra el subconjunto v1
  // de prev/next: si se le pasara el arreglo completo (v1+v2) filtrado a v1
  // antes de compararlo, cualquier nota v2 quedaría "faltante" del lado
  // `next` y syncFirestoreList la borraría de Firestore por diff. Filtrando
  // igual en ambos lados (prev Y next) antes de diffar, los documentos v2
  // nunca entran a la comparación — ni se escriben ni se borran.
  const setNotasEvolucionPaciente = (patientId: string, updater: Updater<NotaEvolucion[]>) => {
    if (!clinicUid) return;
    setNotasEvolucionPorPacienteState((prev) => {
      const prevAll = prev[patientId] ?? [];
      const prevV1 = prevAll.filter((n): n is NotaEvolucion => !esNotaV2(n));
      const v2Existentes = prevAll.filter(esNotaV2);
      const nextV1 = resolveUpdater(updater, prevV1);
      syncFirestoreList(`users/${clinicUid}/pacientes/${patientId}/notasEvolucion`, prevV1, nextV1);
      return { ...prev, [patientId]: [...nextV1, ...v2Existentes] };
    });
  };

  // ---- Escrituras dedicadas de notas v2 — cada una es un setDoc/updateDoc
  // puntual por id, nunca el diff de array completo de arriba (ver §2/§1.6
  // del plan de rediseño: el riesgo de borrar por diff y la incompatibilidad
  // con serverTimestamp()). El listener ya activo sobre notasEvolucion (ver
  // cargarDatosPaciente) refleja el resultado en notasEvolucionPorPaciente
  // automáticamente — no hace falta actualizar el estado local aquí. ----

  function notaEvolucionDocRef(patientId: string, notaId: string) {
    return doc(db, `users/${clinicUid}/pacientes/${patientId}/notasEvolucion`, notaId);
  }

  const guardarBorradorNota = async (patientId: string, nota: NotaEvolucionV2) => {
    if (!clinicUid) return;
    await setDoc(notaEvolucionDocRef(patientId, nota.id), nota);
  };

  // Crear y guardar son, a nivel de Firestore, la misma operación (setDoc
  // del documento completo) — se distinguen por nombre para que quien llama
  // exprese la intención (primer guardado vs. autoguardado subsecuente).
  const crearBorradorNota = guardarBorradorNota;

  const confirmarHorario = () => {
    setHorario((prev) => confirmarHorarioPuro(prev, uid, new Date().toISOString()));
  };

  const marcarListaParaRevision = async (patientId: string, notaId: string) => {
    if (!clinicUid) return;
    await updateDoc(notaEvolucionDocRef(patientId, notaId), {
      estado: "lista_revision",
      listaParaRevisionEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
    });
  };

  const firmarNota = async (patientId: string, nota: NotaEvolucionV2) => {
    if (!clinicUid) throw new Error("Sin clínica activa.");
    const validacion = validarNotaParaFirmar(nota);
    if (!validacion.valido) {
      throw new Error(validacion.errores[0] ?? "Faltan datos para poder firmar esta nota.");
    }
    const notaFirmada: NotaEvolucionV2 = {
      ...nota,
      estado: "firmada",
      firmadoPorUid: uid,
      firmadoEn: serverTimestamp(),
      actualizadoEn: new Date().toISOString(),
    };
    await setDoc(notaEvolucionDocRef(patientId, nota.id), notaFirmada);
  };

  const agregarAclaracionNota = async (
    patientId: string,
    notaId: string,
    aclaracion: { motivo: string; contenido: string }
  ) => {
    if (!clinicUid) return;
    const actual = (notasEvolucionPorPaciente[patientId] ?? []).find((n) => n.id === notaId);
    const aclaracionesPrevias = actual && esNotaV2(actual) ? actual.aclaraciones : [];
    const nueva: AclaracionNota = {
      id: `acl${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
      motivo: aclaracion.motivo,
      contenido: aclaracion.contenido,
      autorUid: uid,
      autorNombre: userEmail,
      fecha: new Date().toISOString(),
    };
    await updateDoc(notaEvolucionDocRef(patientId, notaId), {
      aclaraciones: [...aclaracionesPrevias, nueva],
      estado: "con_aclaracion",
      actualizadoEn: new Date().toISOString(),
    });
  };

  const setRespuestasHistoriaClinica = (
    patientId: string,
    updater: Updater<RespuestasHistoriaClinica>
  ) => {
    if (!clinicUid) return;
    // `prev` puede venir de `respuestasVacias` si la suscripción de este
    // paciente todavía no había resuelto cuando se llama esto (ej. el
    // doctor entró a Historia Clínica y guardó antes de que llegara la
    // primera respuesta real de Firestore) — un `setDoc` normal (sin
    // merge) en ese caso REEMPLAZA TODO el documento y borra cualquier
    // respuesta previa que no estuviera en `prev`. `merge: true` evita
    // esto: solo escribe las claves presentes en `next`, preserva el resto.
    const prev = historiaClinicaPorPaciente[patientId] ?? respuestasVacias;
    const next = resolveUpdater(updater, prev);
    setDoc(doc(db, `users/${clinicUid}/pacientes/${patientId}/historiaClinica`, "respuestas"), next, {
      merge: true,
    }).catch((err) => console.error(`No se pudo guardar historiaClinica de ${patientId}`, err));
    setHistoriaClinicaPorPacienteState((p) => ({ ...p, [patientId]: next }));
  };

  const setFotosPaciente = (patientId: string, updater: Updater<FotosPaciente>) => {
    if (!clinicUid) return;
    // Mismo riesgo que setRespuestasHistoriaClinica (ver su comentario) —
    // merge: true evita reemplazar todo el documento si `prev` viene de
    // fotosVacias por una suscripción aún no resuelta.
    const prev = fotosPorPaciente[patientId] ?? fotosVacias;
    const next = resolveUpdater(updater, prev);
    setDoc(doc(db, `users/${clinicUid}/pacientes/${patientId}/fotos`, "datos"), next, { merge: true }).catch((err) =>
      console.error(`No se pudo guardar fotos de ${patientId}`, err)
    );
    setFotosPorPacienteState((p) => ({ ...p, [patientId]: next }));
  };

  const setMembresiasPaciente = (patientId: string, updater: Updater<PatientMembership[]>) => {
    if (!clinicUid) return;
    setMembresiasPorPacienteState((prev) => {
      const prevArr = prev[patientId] ?? [];
      const next = resolveUpdater(updater, prevArr);
      syncFirestoreList(`users/${clinicUid}/pacientes/${patientId}/membresias`, prevArr, next);
      return { ...prev, [patientId]: next };
    });
  };

  /** Crea la membresía del paciente y, en el mismo movimiento, el pago que la
   * respalda (reutilizando setPagosPaciente, que ya alimenta config/finanzas
   * para que Corte Diario/Semanal/Mensual y Metas queden correctos). */
  const crearMembresiaConPago = (
    patientId: string,
    plan: MembershipPlan,
    fechaInicioISO: string,
    datosPago: { medico: string; formaPago: string; facturar: boolean }
  ) => {
    const pagoId = `${Date.now()}`;
    const fechaDisplay = new Date(`${fechaInicioISO}T00:00:00`).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    setPagosPaciente(patientId, (prev) => [
      {
        id: pagoId,
        fecha: fechaDisplay,
        medico: datosPago.medico,
        formaPago: datosPago.formaPago,
        lineas: [
          {
            id: `${pagoId}-membresia`,
            tratamientoId: null,
            folio: null,
            label: `Membresía: ${plan.nombre}`,
            monto: plan.precio,
          },
        ],
        total: plan.precio,
        facturar: datosPago.facturar,
        firma: null,
      },
      ...prev,
    ]);

    const nuevaMembresia: PatientMembership = {
      id: `mem${Date.now()}`,
      planId: plan.id,
      planNombre: plan.nombre,
      precio: plan.precio,
      fechaInicio: fechaInicioISO,
      fechaFin: calcularFechaFin(fechaInicioISO, plan.duracionTipo, plan.duracionDiasPersonalizada),
      estatus: "activa",
      beneficios: plan.beneficios,
      usos: {},
      pagoId,
    };
    setMembresiasPaciente(patientId, (prev) => [nuevaMembresia, ...prev]);
  };

  const activarMembresia = (
    patientId: string,
    plan: MembershipPlan,
    datosPago: { medico: string; formaPago: string; facturar: boolean }
  ) => {
    const hoyISO = new Date().toISOString().slice(0, 10);
    crearMembresiaConPago(patientId, plan, hoyISO, datosPago);
  };

  const renovarMembresia = (
    patientId: string,
    membresiaAnterior: PatientMembership,
    datosPago: { medico: string; formaPago: string; facturar: boolean }
  ) => {
    const hoyISO = new Date().toISOString().slice(0, 10);
    const diaSiguienteAlVencimiento = (() => {
      const d = new Date(`${membresiaAnterior.fechaFin}T00:00:00`);
      d.setDate(d.getDate() + 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    const fechaInicio = diaSiguienteAlVencimiento > hoyISO ? diaSiguienteAlVencimiento : hoyISO;
    const planActual = membershipPlanes.find((p) => p.id === membresiaAnterior.planId);
    const plan: MembershipPlan = planActual ?? {
      id: membresiaAnterior.planId,
      nombre: membresiaAnterior.planNombre,
      precio: membresiaAnterior.precio,
      duracionTipo: "anual",
      renovacionAutomatica: false,
      beneficios: membresiaAnterior.beneficios,
      exclusiones: "",
    };
    crearMembresiaConPago(patientId, plan, fechaInicio, datosPago);
  };

  const usarBeneficio = (
    patientId: string,
    membresiaId: string,
    beneficioId: string,
    profesional: string
  ) => {
    const uso: UsoBeneficio = { fecha: new Date().toISOString().slice(0, 10), profesional };
    setMembresiasPaciente(patientId, (prev) =>
      prev.map((m) =>
        m.id === membresiaId
          ? { ...m, usos: { ...m.usos, [beneficioId]: [...(m.usos[beneficioId] ?? []), uso] } }
          : m
      )
    );
  };

  const cancelarMembresia = (patientId: string, membresiaId: string) => {
    setMembresiasPaciente(patientId, (prev) =>
      prev.map((m) => (m.id === membresiaId ? { ...m, estatus: "cancelada" } : m))
    );
  };

  /** Fusiona dos expedientes duplicados — ver "Fusionar Expedientes" en
   * Pacientes y src/lib/fusionExpedientes.ts para la lógica de resolución
   * de conflictos (ya resuelta por quien llama, esta función solo aplica
   * los resultados). Reutiliza los setters existentes de cada colección en
   * vez de escribir a Firestore directo — así cada colección conserva
   * exactamente su propio comportamiento (ej. las notas v2 se guardan con
   * su escritura puntual por id, no con el diff de arreglo de las v1).
   * Nunca limpia ni borra los datos del perdedor — solo los copia hacia el
   * sobreviviente y marca al perdedor como fusionado, para poder recuperar
   * todo si algo saliera mal a medio proceso. */
  const fusionarPacientes = ({
    sobrevivienteId,
    perdedorId,
    camposPacienteResueltos,
    historiaClinicaResuelta,
    fotosResueltas,
  }: {
    sobrevivienteId: string;
    perdedorId: string;
    camposPacienteResueltos: Partial<Patient>;
    historiaClinicaResuelta: RespuestasHistoriaClinica;
    fotosResueltas: FotosPaciente;
  }) => {
    setPresupuestosPaciente(sobrevivienteId, (prev) => [...prev, ...(presupuestosPorPaciente[perdedorId] ?? [])]);
    setPagosPaciente(sobrevivienteId, (prev) => [...prev, ...(pagosPorPaciente[perdedorId] ?? [])]);
    setRecetasPaciente(sobrevivienteId, (prev) => [...prev, ...(recetasPorPaciente[perdedorId] ?? [])]);
    setLaboratoriosPaciente(sobrevivienteId, (prev) => [...prev, ...(laboratoriosPorPaciente[perdedorId] ?? [])]);
    setDiagnosticosPaciente(sobrevivienteId, (prev) => [...prev, ...(diagnosticosPorPaciente[perdedorId] ?? [])]);
    setPlanTratamientoPaciente(sobrevivienteId, (prev) => [...prev, ...(planTratamientoPorPaciente[perdedorId] ?? [])]);
    setMembresiasPaciente(sobrevivienteId, (prev) => [...prev, ...(membresiasPorPaciente[perdedorId] ?? [])]);

    // Notas de evolución: v1 y v2 conviven en el mismo arreglo pero se
    // escriben distinto — v1 vía el diff de setNotasEvolucionPaciente, v2
    // con su escritura puntual por id (guardarBorradorNota), igual que en
    // cualquier otro guardado normal de una nota v2.
    const notasPerdedor = notasEvolucionPorPaciente[perdedorId] ?? [];
    const notasV1Perdedor = notasPerdedor.filter((n): n is NotaEvolucion => !esNotaV2(n));
    const notasV2Perdedor = notasPerdedor.filter(esNotaV2);
    setNotasEvolucionPaciente(sobrevivienteId, (prev) => [...prev, ...notasV1Perdedor]);
    notasV2Perdedor.forEach((nota) => void guardarBorradorNota(sobrevivienteId, nota));

    setRespuestasHistoriaClinica(sobrevivienteId, historiaClinicaResuelta);
    setFotosPaciente(sobrevivienteId, fotosResueltas);

    setCitas((prev) => prev.map((c) => (c.patientId === perdedorId ? { ...c, patientId: sobrevivienteId } : c)));
    setPagosEliminados((prev) => prev.map((p) => (p.patientId === perdedorId ? { ...p, patientId: sobrevivienteId } : p)));
    setDomiciliaciones((prev) =>
      prev.map((d) => (d.patientId === perdedorId ? { ...d, patientId: sobrevivienteId } : d))
    );
    setEncuestas((prev) => prev.map((e) => (e.patientId === perdedorId ? { ...e, patientId: sobrevivienteId } : e)));

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === sobrevivienteId) return { ...p, ...camposPacienteResueltos };
        if (p.id === perdedorId) {
          return { ...p, fusionadoEnId: sobrevivienteId, fusionadoEn: new Date().toISOString() };
        }
        return p;
      })
    );
  };

  const marcarAsistencia = (
    personalId: string,
    fecha: string,
    campo: "entrada" | "salida",
    hora: string | null
  ) => {
    const id = `${personalId}_${fecha}`;
    setRegistrosAsistencia((prev) => {
      const existe = prev.find((r) => r.id === id);
      if (existe) return prev.map((r) => (r.id === id ? { ...r, [campo]: hora } : r));
      return [
        ...prev,
        {
          id,
          personalId,
          fecha,
          entrada: campo === "entrada" ? hora : null,
          salida: campo === "salida" ? hora : null,
        },
      ];
    });
  };

  const marcarLlegadaCita = (citaId: string, hora: string | null) => {
    setCitas((prev) => prev.map((c) => (c.id === citaId ? { ...c, horaLlegada: hora } : c)));
  };

  const invitarColaborador = async (data: {
    nombre: string;
    correo: string;
    whatsapp: string;
    rol: RolClinica;
  }) => {
    if (!clinicUid) return;
    const correo = data.correo.trim().toLowerCase();
    // Con correo: id determinístico clinicId_correo — lo que la sesión que
    // se registra con ese correo puede "reclamar" sola (ver reglas de
    // Firestore / existsClaimableInvite). Sin correo (solo WhatsApp) no hay
    // forma de detectar esa sesión automáticamente, así que se usa un id
    // aparte; agregar el correo después (actualizarCorreoInvitacion) migra
    // la invitación al id correcto para que sí se pueda reclamar.
    const inviteId = correo ? `${clinicUid}_${correo}` : `${clinicUid}_pendiente_${Date.now()}`;
    await setDoc(doc(db, "clinicInvites", inviteId), {
      clinicId: clinicUid,
      nombreClinica: clinicInfo?.nombre || perfilDoctor.nombre || "",
      email: correo,
      nombre: data.nombre.trim(),
      whatsapp: data.whatsapp.trim(),
      role: data.rol,
      status: "pending",
    } satisfies ClinicInvite);
  };

  const eliminarInvitacion = async (inviteId: string) => {
    await deleteDoc(doc(db, "clinicInvites", inviteId));
  };

  const actualizarWhatsappInvitacion = async (inviteId: string, whatsapp: string) => {
    const invite = invitacionesPendientes.find((i) => i.id === inviteId);
    if (!invite) return;
    await setDoc(doc(db, "clinicInvites", inviteId), { ...invite, whatsapp }, { merge: true });
  };

  /** Completa el correo de una invitación que se creó solo con WhatsApp. Como
   * el id del documento debe ser clinicId_correo para que esa persona pueda
   * reclamarla sola al iniciar sesión, esto migra el documento (crea uno
   * nuevo con el id correcto y borra el viejo) en vez de solo actualizar el
   * campo — de lo contrario el correo quedaría guardado pero la invitación
   * seguiría sin poder detectarse automáticamente. */
  const actualizarCorreoInvitacion = async (inviteId: string, correo: string) => {
    const invite = invitacionesPendientes.find((i) => i.id === inviteId);
    if (!invite || !clinicUid) return;
    const correoLimpio = correo.trim().toLowerCase();
    if (!correoLimpio || correoLimpio === invite.email) return;
    const nuevoId = `${clinicUid}_${correoLimpio}`;
    const { id: _id, ...datos } = invite;
    await setDoc(doc(db, "clinicInvites", nuevoId), { ...datos, email: correoLimpio });
    if (nuevoId !== inviteId) await deleteDoc(doc(db, "clinicInvites", inviteId));
  };

  const eliminarColaborador = async (memberId: string) => {
    const miembro = colaboradoresActivos.find((c) => `${c.clinicId}_${c.uid}` === memberId);
    await deleteDoc(doc(db, "clinicMembers", memberId));
    if (miembro) {
      await deleteDoc(doc(db, `users/${miembro.clinicId}/recursos`, `ruid_${miembro.uid}`)).catch(() => {
        // El colaborador pudo no tener un recurso asociado (p. ej. si se creó antes de este cambio) — no es un error.
      });
    }
  };

  const actualizarRolColaborador = async (memberId: string, rol: RolClinica) => {
    const miembro = colaboradoresActivos.find((c) => `${c.clinicId}_${c.uid}` === memberId);
    if (!miembro) return;
    await setDoc(doc(db, "clinicMembers", memberId), { ...miembro, role: rol }, { merge: true });
  };

  const actualizarWhatsappColaborador = async (memberId: string, whatsapp: string) => {
    const miembro = colaboradoresActivos.find((c) => `${c.clinicId}_${c.uid}` === memberId);
    if (!miembro) return;
    await setDoc(doc(db, "clinicMembers", memberId), { ...miembro, whatsapp }, { merge: true });
  };

  const actualizarNombreColaborador = async (memberId: string, nombre: string) => {
    const miembro = colaboradoresActivos.find((c) => `${c.clinicId}_${c.uid}` === memberId);
    if (!miembro) return;
    await setDoc(doc(db, "clinicMembers", memberId), { ...miembro, nombre }, { merge: true });
  };

  /** Solo actualiza el correo de contacto guardado en clinicMembers — no
   * cambia el correo real de inicio de sesión en Firebase Auth, que es lo
   * que de verdad determina el acceso. */
  const actualizarCorreoColaborador = async (memberId: string, correo: string) => {
    const miembro = colaboradoresActivos.find((c) => `${c.clinicId}_${c.uid}` === memberId);
    if (!miembro) return;
    await setDoc(doc(db, "clinicMembers", memberId), { ...miembro, correo }, { merge: true });
  };

  /** null o arreglo vacío = sin restricción (ve todos los calendarios). Un
   * arreglo con al menos un id limita a ese colaborador a solo esos
   * recursos — reforzado también en firestore.rules, no es solo un filtro
   * de interfaz. */
  const actualizarRecursosVisiblesColaborador = async (memberId: string, recursoIds: string[] | null) => {
    const miembro = colaboradoresActivos.find((c) => `${c.clinicId}_${c.uid}` === memberId);
    if (!miembro) return;
    await setDoc(
      doc(db, "clinicMembers", memberId),
      { ...miembro, recursosVisibles: recursoIds && recursoIds.length > 0 ? recursoIds : [] },
      { merge: true }
    );
  };

  if (!resolved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app text-ink/40">
        Cargando tu clínica…
      </div>
    );
  }

  return (
    <PatientDataContext.Provider
      value={{
        clinicUid,
        userEmail,
        // Un paciente fusionado dentro de otro (ver fusionarPacientes) nunca
        // se borra, pero tampoco debe volver a aparecer en ningún buscador o
        // listado — filtrarlo aquí, en el único punto de exposición, evita
        // tener que tocar cada componente que use `patients` uno por uno.
        patients: patients.filter((p) => !p.fusionadoEnId),
        addPatient,
        updatePatient,
        importarPacientes,
        fusionarPacientes,
        presupuestosPorPaciente,
        setPresupuestosPaciente,
        pagosPorPaciente,
        setPagosPaciente,
        recetasPorPaciente,
        setRecetasPaciente,
        laboratoriosPorPaciente,
        setLaboratoriosPaciente,
        miUid: uid,
        notasEvolucionPorPaciente,
        estadoCargaNotasPorPaciente,
        cargarNotasPaciente,
        setNotasEvolucionPaciente,
        crearBorradorNota,
        guardarBorradorNota,
        marcarListaParaRevision,
        firmarNota,
        agregarAclaracionNota,
        diagnosticosPorPaciente,
        setDiagnosticosPaciente,
        planTratamientoPorPaciente,
        setPlanTratamientoPaciente,
        vincularPresupuestoAPlan,
        devolucionesPorPaciente,
        devolucionesLog,
        registrarDevolucion,
        cancelarDevolucion,
        corregirDevolucion,
        reconciliarSaldoPendiente,
        agregarFirmaRecepcionDevolucion,
        comparativasPorPaciente,
        setComparativasPaciente,
        membershipPlanes,
        setMembershipPlanes,
        laminas,
        setLaminas,
        depositos,
        setDepositos,
        articulosFaltantes,
        setArticulosFaltantes,
        articulosCaducidad,
        setArticulosCaducidad,
        centrosRadiodiagnostico,
        setCentrosRadiodiagnostico,
        laboratoriosDentales,
        setLaboratoriosDentales,
        pagosEliminados,
        setPagosEliminados,
        saldosPendientes,
        laboratoriosPendientes,
        presupuestosPendientesDetalle,
        presupuestosLog,
        setPresupuestosLog,
        otsLog,
        setOtsLog,
        recetasLog,
        setRecetasLog,
        domiciliaciones,
        setDomiciliaciones,
        encuestas,
        setEncuestas,
        pendientes,
        setPendientes,
        promociones,
        setPromociones,
        aseguradoras,
        setAseguradoras,
        empresasRpbi,
        setEmpresasRpbi,
        contadores,
        setContadores,
        membresiasPorPaciente,
        activarMembresia,
        renovarMembresia,
        usarBeneficio,
        cancelarMembresia,
        personalAsistencia,
        setPersonalAsistencia,
        registrosAsistencia,
        marcarAsistencia,
        marcarLlegadaCita,
        procedimientos,
        setProcedimientos,
        importarCatalogoProcedimientos,
        historiaClinicaTemplate,
        setHistoriaClinicaTemplate,
        historiaClinicaPorPaciente,
        setRespuestasHistoriaClinica,
        fotosPorPaciente,
        setFotosPaciente,
        consumirSiguienteFolioReceta,
        catalogoMedicamentos,
        setCatalogoMedicamentos,
        recursos,
        setRecursos,
        citas,
        setCitas,
        gastos,
        setGastos,
        horario,
        setHorario,
        horarioCargado,
        confirmarHorario,
        vocabularioNotas,
        registrarPalabrasDeNota: (textoNota: string) =>
          setVocabularioNotas((prev) => ({ palabras: actualizarFrecuencias(prev.palabras, textoNota) })),
        perfilDoctor,
        setPerfilDoctor,
        perfilDoctorCargado,
        suscripcion,
        setSuscripcion,
        metas,
        setMetas,
        finanzas,
        estadisticas,
        regulacionSanitaria,
        setRegulacionSanitaria,
        formatosWhatsapp,
        setFormatosWhatsapp,
        cargarDatosPaciente,
        navegacionExpediente,
        irAExpediente,
        consumirNavegacionExpediente,
        navegacionNuevaCita,
        sugerirNuevaCita,
        consumirNavegacionNuevaCita,
        solicitudNuevaCitaBlanco,
        abrirNuevaCitaDesdeInicio,
        consumirSolicitudNuevaCitaBlanco,
        irAPagina,
        cambiosSinGuardar,
        setCambiosSinGuardar,
        ayudaContexto,
        setAyudaContexto,
        miRol: rol,
        misRecursosVisibles,
        actualizarRecursosVisiblesColaborador,
        puedeVerFinanzas: rol === "admin",
        clinicInfo,
        setClinicInfo,
        pendingInvite,
        aceptarInvite,
        rechazarInvite,
        colaboradoresActivos,
        invitacionesPendientes,
        invitarColaborador,
        eliminarInvitacion,
        actualizarWhatsappInvitacion,
        actualizarCorreoInvitacion,
        eliminarColaborador,
        actualizarRolColaborador,
        actualizarWhatsappColaborador,
        actualizarNombreColaborador,
        actualizarCorreoColaborador,
      }}
    >
      {children}
    </PatientDataContext.Provider>
  );
}

export function usePatientData() {
  const ctx = useContext(PatientDataContext);
  if (!ctx) throw new Error("usePatientData must be used within a PatientDataProvider");
  return ctx;
}
