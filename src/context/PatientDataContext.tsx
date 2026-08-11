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
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  horarioInicial,
  perfilDoctorInicial,
  recursosIniciales,
  type ClinicInfo,
  type ClinicInvite,
  type ClinicMember,
  type HorarioAtencion,
  type Patient,
  type PerfilDoctor,
  type RolClinica,
  type SavedBudget,
  type Pago,
  type Receta,
  type Recurso,
  type SuscripcionPlan,
  type CitaAgenda,
} from "@/lib/patientData";

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
      role: pendingInvite.role,
      status: "active",
    } satisfies ClinicMember);
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

type PatientDataContextValue = {
  patients: Patient[];
  addPatient: (data: { name: string; phone: string; birthDate?: string }) => Patient;
  updatePatient: (patientId: string, data: Partial<Omit<Patient, "id">>) => void;
  presupuestosPorPaciente: Record<string, SavedBudget[]>;
  setPresupuestosPaciente: (patientId: string, updater: Updater<SavedBudget[]>) => void;
  pagosPorPaciente: Record<string, Pago[]>;
  setPagosPaciente: (patientId: string, updater: Updater<Pago[]>) => void;
  recetasPorPaciente: Record<string, Receta[]>;
  setRecetasPaciente: (patientId: string, updater: Updater<Receta[]>) => void;
  recursos: Recurso[];
  setRecursos: (updater: Updater<Recurso[]>) => void;
  citas: CitaAgenda[];
  setCitas: (updater: Updater<CitaAgenda[]>) => void;
  horario: HorarioAtencion;
  setHorario: (updater: Updater<HorarioAtencion>) => void;
  perfilDoctor: PerfilDoctor;
  setPerfilDoctor: (updater: Updater<PerfilDoctor>) => void;
  suscripcion: SuscripcionPlan;
  setSuscripcion: (updater: Updater<SuscripcionPlan>) => void;
  cargarDatosPaciente: (patientId: string) => void;
  navegacionExpediente: NavegacionExpediente;
  irAExpediente: (patientId: string, tab?: string) => void;
  consumirNavegacionExpediente: () => void;
  miRol: RolClinica | null;
  puedeVerFinanzas: boolean;
  clinicInfo: ClinicInfo | null;
  setClinicInfo: (updater: Updater<ClinicInfo>) => void;
  pendingInvite: ClinicInvite | null;
  aceptarInvite: () => Promise<void>;
  rechazarInvite: () => void;
  colaboradoresActivos: ClinicMember[];
  invitacionesPendientes: ClinicInvite[];
  invitarColaborador: (data: { nombre: string; correo: string; rol: RolClinica }) => Promise<void>;
  eliminarInvitacion: (inviteId: string) => Promise<void>;
  eliminarColaborador: (memberId: string) => Promise<void>;
  actualizarRolColaborador: (memberId: string, rol: RolClinica) => Promise<void>;
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
  const [recursos, setRecursos] = useFirestoreList<Recurso>(clinicUid, "recursos", recursosIniciales);
  const [citas, setCitas] = useFirestoreList<CitaAgenda>(clinicUid, "citas");
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

  const [presupuestosPorPaciente, setPresupuestosPorPacienteState] = useState<
    Record<string, SavedBudget[]>
  >({});
  const [pagosPorPaciente, setPagosPorPacienteState] = useState<Record<string, Pago[]>>({});
  const [recetasPorPaciente, setRecetasPorPacienteState] = useState<Record<string, Receta[]>>({});
  const subs = useRef<Record<string, Unsubscribe>>({});
  const [navegacionExpediente, setNavegacionExpediente] = useState<NavegacionExpediente>(null);

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
  };

  const addPatient = (data: { name: string; phone: string; birthDate?: string }): Patient => {
    const nuevo: Patient = {
      id: `p${Date.now()}`,
      name: data.name,
      phone: data.phone,
      birthDate: data.birthDate ?? "",
    };
    setPatients((prev) => [...prev, nuevo]);
    return nuevo;
  };

  const updatePatient = (patientId: string, data: Partial<Omit<Patient, "id">>) => {
    setPatients((prev) => prev.map((p) => (p.id === patientId ? { ...p, ...data } : p)));
  };

  const irAExpediente = (patientId: string, tab?: string) => {
    setNavegacionExpediente({ patientId, tab });
    onIrAPagina?.("pacientes");
  };

  const consumirNavegacionExpediente = () => setNavegacionExpediente(null);

  const setPresupuestosPaciente = (patientId: string, updater: Updater<SavedBudget[]>) => {
    if (!clinicUid) return;
    setPresupuestosPorPacienteState((prev) => {
      const prevArr = prev[patientId] ?? [];
      const next = resolveUpdater(updater, prevArr);
      syncFirestoreList(`users/${clinicUid}/pacientes/${patientId}/presupuestos`, prevArr, next);
      return { ...prev, [patientId]: next };
    });
  };

  const setPagosPaciente = (patientId: string, updater: Updater<Pago[]>) => {
    if (!clinicUid) return;
    setPagosPorPacienteState((prev) => {
      const prevArr = prev[patientId] ?? [];
      const next = resolveUpdater(updater, prevArr);
      syncFirestoreList(`users/${clinicUid}/pacientes/${patientId}/pagos`, prevArr, next);
      return { ...prev, [patientId]: next };
    });
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

  const invitarColaborador = async (data: { nombre: string; correo: string; rol: RolClinica }) => {
    if (!clinicUid) return;
    const correo = data.correo.trim().toLowerCase();
    await setDoc(doc(db, "clinicInvites", `${clinicUid}_${correo}`), {
      clinicId: clinicUid,
      nombreClinica: clinicInfo?.nombre || perfilDoctor.nombre || "",
      email: correo,
      nombre: data.nombre.trim(),
      role: data.rol,
      status: "pending",
    } satisfies ClinicInvite);
  };

  const eliminarInvitacion = async (inviteId: string) => {
    await deleteDoc(doc(db, "clinicInvites", inviteId));
  };

  const eliminarColaborador = async (memberId: string) => {
    await deleteDoc(doc(db, "clinicMembers", memberId));
  };

  const actualizarRolColaborador = async (memberId: string, rol: RolClinica) => {
    const miembro = colaboradoresActivos.find((c) => `${c.clinicId}_${c.uid}` === memberId);
    if (!miembro) return;
    await setDoc(doc(db, "clinicMembers", memberId), { ...miembro, role: rol }, { merge: true });
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
        patients,
        addPatient,
        updatePatient,
        presupuestosPorPaciente,
        setPresupuestosPaciente,
        pagosPorPaciente,
        setPagosPaciente,
        recetasPorPaciente,
        setRecetasPaciente,
        recursos,
        setRecursos,
        citas,
        setCitas,
        horario,
        setHorario,
        perfilDoctor,
        setPerfilDoctor,
        suscripcion,
        setSuscripcion,
        cargarDatosPaciente,
        navegacionExpediente,
        irAExpediente,
        consumirNavegacionExpediente,
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
