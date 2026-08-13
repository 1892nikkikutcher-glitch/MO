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
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
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
  type LineItem,
  type Pago,
  type Receta,
  type NotaEvolucion,
  type Recurso,
  type SuscripcionPlan,
  type CitaAgenda,
  type SolicitudLaboratorio,
} from "@/lib/patientData";
import {
  metaConfigInicial,
  finanzasInicial,
  estadisticasInicial,
  fechaPagoAIso,
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
import type { PersonalAsistencia, RegistroAsistencia } from "@/lib/asistencia";
import type { Procedimiento } from "@/lib/procedimientos";
import { catalogoInicial, type MedicamentoCatalogo } from "@/lib/medicamentos";
import {
  plantillaInicial,
  respuestasVacias,
  type HistoriaClinicaTemplate,
  type RespuestasHistoriaClinica,
} from "@/lib/historiaClinica";

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
  const seeded = useRef(false);

  useEffect(() => {
    if (!clinicUid) {
      setValueState(defaultValue);
      return;
    }
    const path = `users/${clinicUid}/config`;
    seeded.current = false;
    const unsub = onSnapshot(doc(db, path, name), (snap) => {
      if (!snap.exists() && !seeded.current) {
        seeded.current = true;
        setDoc(doc(db, path, name), defaultValue).catch((err) =>
          console.error(`No se pudo inicializar ${path}/${name}`, err)
        );
        return;
      }
      if (snap.exists()) setValueState(snap.data() as T);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicUid, name]);

  const setValue = (updater: Updater<T>) => {
    if (!clinicUid) return;
    const path = `users/${clinicUid}/config`;
    setValueState((prev) => {
      const next = resolveUpdater(updater, prev);
      setDoc(doc(db, path, name), next).catch((err) =>
        console.error(`No se pudo guardar ${path}/${name}`, err)
      );
      return next;
    });
  };

  return [value, setValue] as const;
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
    setDoc(doc(db, "clinics", clinicUid), next).catch((err) =>
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
        }
      } else {
        const propia = membresias.find((m) => m.clinicId === authUid);
        if (!propia) {
          try {
            await setDoc(doc(db, "clinics", authUid), {
              ownerId: authUid,
              nombre: "",
            } satisfies ClinicInfo);
            await setDoc(doc(db, "clinicMembers", `${authUid}_${authUid}`), {
              clinicId: authUid,
              uid: authUid,
              nombre: "",
              correo: authEmail,
              role: "admin",
              status: "active",
            } satisfies ClinicMember);
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

  return { clinicUid, rol, resolved, pendingInvite, aceptarInvite, rechazarInvite };
}

export type NavegacionExpediente = { patientId: string; tab?: string } | null;

export type NavegacionNuevaCita = { patientId: string; tratamiento: string } | null;

type PatientDataContextValue = {
  clinicUid: string | null;
  userEmail: string;
  patients: Patient[];
  addPatient: (data: { name: string; phone: string; birthDate?: string }) => Patient;
  updatePatient: (patientId: string, data: Partial<Omit<Patient, "id">>) => void;
  importarPacientes: (
    nuevos: Omit<Patient, "id">[],
    onProgreso?: (hechos: number, total: number) => void
  ) => Promise<void>;
  presupuestosPorPaciente: Record<string, SavedBudget[]>;
  setPresupuestosPaciente: (patientId: string, updater: Updater<SavedBudget[]>) => void;
  pagosPorPaciente: Record<string, Pago[]>;
  setPagosPaciente: (patientId: string, updater: Updater<Pago[]>) => void;
  recetasPorPaciente: Record<string, Receta[]>;
  setRecetasPaciente: (patientId: string, updater: Updater<Receta[]>) => void;
  laboratoriosPorPaciente: Record<string, SolicitudLaboratorio[]>;
  setLaboratoriosPaciente: (patientId: string, updater: Updater<SolicitudLaboratorio[]>) => void;
  notasEvolucionPorPaciente: Record<string, NotaEvolucion[]>;
  setNotasEvolucionPaciente: (patientId: string, updater: Updater<NotaEvolucion[]>) => void;
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
  historiaClinicaTemplate: HistoriaClinicaTemplate;
  setHistoriaClinicaTemplate: (updater: Updater<HistoriaClinicaTemplate>) => void;
  historiaClinicaPorPaciente: Record<string, RespuestasHistoriaClinica>;
  setRespuestasHistoriaClinica: (
    patientId: string,
    updater: Updater<RespuestasHistoriaClinica>
  ) => void;
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
  perfilDoctor: PerfilDoctor;
  setPerfilDoctor: (updater: Updater<PerfilDoctor>) => void;
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
  irAExpediente: (patientId: string, tab?: string) => void;
  consumirNavegacionExpediente: () => void;
  navegacionNuevaCita: NavegacionNuevaCita;
  sugerirNuevaCita: (patientId: string, tratamiento: string) => void;
  consumirNavegacionNuevaCita: () => void;
  solicitudNuevaCitaBlanco: boolean;
  abrirNuevaCitaDesdeInicio: () => void;
  consumirSolicitudNuevaCitaBlanco: () => void;
  irAPagina: (pageId: string) => void;
  miRol: RolClinica | null;
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
  eliminarColaborador: (memberId: string) => Promise<void>;
  actualizarRolColaborador: (memberId: string, rol: RolClinica) => Promise<void>;
  actualizarWhatsappColaborador: (memberId: string, whatsapp: string) => Promise<void>;
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
  const { clinicUid, rol, resolved, pendingInvite, aceptarInvite, rechazarInvite } =
    useClinicResolution(uid, userEmail);
  const [clinicInfo, setClinicInfo] = useClinicInfo(clinicUid);

  const [patients, setPatients] = useFirestoreList<Patient>(clinicUid, "pacientes");
  const [recursos, setRecursos] = useFirestoreList<Recurso>(clinicUid, "recursos");
  const [citas, setCitas] = useFirestoreList<CitaAgenda>(clinicUid, "citas");
  const [gastos, setGastos] = useFirestoreList<Gasto>(clinicUid, "gastos");
  const [horario, setHorario] = useFirestoreDoc<HorarioAtencion>(clinicUid, "horario", horarioInicial);
  const [perfilDoctor, setPerfilDoctor] = useFirestoreDoc<PerfilDoctor>(
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
    Record<string, NotaEvolucion[]>
  >({});
  const [membresiasPorPaciente, setMembresiasPorPacienteState] = useState<
    Record<string, PatientMembership[]>
  >({});
  const [historiaClinicaPorPaciente, setHistoriaClinicaPorPacienteState] = useState<
    Record<string, RespuestasHistoriaClinica>
  >({});
  const subs = useRef<Record<string, Unsubscribe>>({});
  const [navegacionExpediente, setNavegacionExpediente] = useState<NavegacionExpediente>(null);
  const [navegacionNuevaCita, setNavegacionNuevaCita] = useState<NavegacionNuevaCita>(null);
  const [solicitudNuevaCitaBlanco, setSolicitudNuevaCitaBlanco] = useState(false);

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
      (snap) => setInvitacionesPendientes(snap.docs.map((d) => d.data() as ClinicInvite))
    );
    return () => {
      unsubMembers();
      unsubInvites();
    };
  }, [clinicUid, rol]);

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
    const notasEvolucionKey = `notasEvolucion:${patientId}`;
    if (!subs.current[notasEvolucionKey]) {
      const path = `users/${clinicUid}/pacientes/${patientId}/notasEvolucion`;
      subs.current[notasEvolucionKey] = onSnapshot(collection(db, path), (snap) => {
        const next = snap.docs.map((d) => ({ ...(d.data() as NotaEvolucion), id: d.id }));
        setNotasEvolucionPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
      });
    }
    const historiaKey = `historiaClinica:${patientId}`;
    if (!subs.current[historiaKey]) {
      const path = `users/${clinicUid}/pacientes/${patientId}/historiaClinica`;
      subs.current[historiaKey] = onSnapshot(doc(db, path, "respuestas"), (snap) => {
        const next = snap.exists() ? (snap.data() as RespuestasHistoriaClinica) : respuestasVacias;
        setHistoriaClinicaPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
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

  const irAExpediente = (patientId: string, tab?: string) => {
    setNavegacionExpediente({ patientId, tab });
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

  const irAPagina = (pageId: string) => onIrAPagina?.(pageId);

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
    if (deltaTotal === 0 && meses.size === 0) return;
    setEstadisticas((prevEst) => {
      const presupuestosPorMes = { ...prevEst.presupuestosPorMes };
      meses.forEach((mes) => {
        const deltaMes =
          mesesNext.filter((m) => m === mes).length - mesesPrev.filter((m) => m === mes).length;
        if (deltaMes !== 0) presupuestosPorMes[mes] = (presupuestosPorMes[mes] ?? 0) + deltaMes;
      });
      return {
        ...prevEst,
        totalPresupuestado: prevEst.totalPresupuestado + deltaTotal,
        presupuestosPorMes,
      };
    });
  };

  const setPresupuestosPaciente = (patientId: string, updater: Updater<SavedBudget[]>) => {
    if (!clinicUid) return;
    const prevArr = presupuestosPorPaciente[patientId] ?? [];
    const next = resolveUpdater(updater, prevArr);
    syncFirestoreList(`users/${clinicUid}/pacientes/${patientId}/presupuestos`, prevArr, next);
    registrarDeltaPresupuestos(prevArr, next);
    setPresupuestosPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
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
    setFinanzas((prevFin) => {
      const porFecha = { ...prevFin.porFecha };
      fechas.forEach((iso) => {
        const sumPrev = prevConIso.filter((p) => p._iso === iso).reduce((s, p) => s + p.total, 0);
        const sumNext = nextConIso.filter((p) => p._iso === iso).reduce((s, p) => s + p.total, 0);
        const delta = sumNext - sumPrev;
        if (delta !== 0) porFecha[iso] = (porFecha[iso] ?? 0) + delta;
      });
      return { porFecha };
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
  const generarPresupuestosDesdeExtras = (patientId: string, prevArr: Pago[], next: Pago[]) => {
    const prevIds = new Set(prevArr.map((p) => p.id));
    const pagosNuevos = next.filter((p) => !prevIds.has(p.id));
    let nextConLigas = next;

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

    return nextConLigas;
  };

  const setPagosPaciente = (patientId: string, updater: Updater<Pago[]>) => {
    if (!clinicUid) return;
    const prevArr = pagosPorPaciente[patientId] ?? [];
    const generado = resolveUpdater(updater, prevArr);
    const next = generarPresupuestosDesdeExtras(patientId, prevArr, generado);
    syncFirestoreList(`users/${clinicUid}/pacientes/${patientId}/pagos`, prevArr, next);
    registrarDeltaFinanzas(prevArr, next);
    const deltaCount = next.length - prevArr.length;
    if (deltaCount !== 0) {
      setEstadisticas((prevEst) => ({ ...prevEst, pagosCount: prevEst.pagosCount + deltaCount }));
    }
    setPagosPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
  };

  const setRecetasPaciente = (patientId: string, updater: Updater<Receta[]>) => {
    if (!clinicUid) return;
    setRecetasPorPacienteState((prev) => {
      const prevArr = prev[patientId] ?? [];
      const next = resolveUpdater(updater, prevArr);
      syncFirestoreList(`users/${clinicUid}/pacientes/${patientId}/recetas`, prevArr, next);
      return { ...prev, [patientId]: next };
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
    setLaboratoriosPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
  };

  const setNotasEvolucionPaciente = (patientId: string, updater: Updater<NotaEvolucion[]>) => {
    if (!clinicUid) return;
    setNotasEvolucionPorPacienteState((prev) => {
      const prevArr = prev[patientId] ?? [];
      const next = resolveUpdater(updater, prevArr);
      syncFirestoreList(`users/${clinicUid}/pacientes/${patientId}/notasEvolucion`, prevArr, next);
      return { ...prev, [patientId]: next };
    });
  };

  const setRespuestasHistoriaClinica = (
    patientId: string,
    updater: Updater<RespuestasHistoriaClinica>
  ) => {
    if (!clinicUid) return;
    const prev = historiaClinicaPorPaciente[patientId] ?? respuestasVacias;
    const next = resolveUpdater(updater, prev);
    setDoc(doc(db, `users/${clinicUid}/pacientes/${patientId}/historiaClinica`, "respuestas"), next).catch(
      (err) => console.error(`No se pudo guardar historiaClinica de ${patientId}`, err)
    );
    setHistoriaClinicaPorPacienteState((p) => ({ ...p, [patientId]: next }));
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
    await setDoc(doc(db, "clinicInvites", `${clinicUid}_${correo}`), {
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
        patients,
        addPatient,
        updatePatient,
        importarPacientes,
        presupuestosPorPaciente,
        setPresupuestosPaciente,
        pagosPorPaciente,
        setPagosPaciente,
        recetasPorPaciente,
        setRecetasPaciente,
        laboratoriosPorPaciente,
        setLaboratoriosPaciente,
        notasEvolucionPorPaciente,
        setNotasEvolucionPaciente,
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
        historiaClinicaTemplate,
        setHistoriaClinicaTemplate,
        historiaClinicaPorPaciente,
        setRespuestasHistoriaClinica,
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
        perfilDoctor,
        setPerfilDoctor,
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
        miRol: rol,
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
        eliminarColaborador,
        actualizarRolColaborador,
        actualizarWhatsappColaborador,
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
