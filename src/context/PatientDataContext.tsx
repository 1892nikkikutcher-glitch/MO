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
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  recursosIniciales,
  type Patient,
  type SavedBudget,
  type Pago,
  type Receta,
  type Recurso,
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

/** Colección de nivel superior sincronizada en tiempo real con `users/{uid}/<name>`. */
function useFirestoreList<T extends { id: string }>(uid: string, name: string, seed?: T[]) {
  const path = `users/${uid}/${name}`;
  const [items, setItemsState] = useState<T[]>([]);
  const seeded = useRef(false);

  useEffect(() => {
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
  }, [path]);

  const setItems = (updater: Updater<T[]>) => {
    setItemsState((prev) => {
      const next = resolveUpdater(updater, prev);
      syncFirestoreList(path, prev, next);
      return next;
    });
  };

  return [items, setItems] as const;
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
  cargarDatosPaciente: (patientId: string) => void;
  navegacionExpediente: NavegacionExpediente;
  irAExpediente: (patientId: string, tab?: string) => void;
  consumirNavegacionExpediente: () => void;
};

const PatientDataContext = createContext<PatientDataContextValue | null>(null);

export function PatientDataProvider({
  uid,
  onIrAPagina,
  children,
}: {
  uid: string;
  onIrAPagina?: (pageId: string) => void;
  children: ReactNode;
}) {
  const [patients, setPatients] = useFirestoreList<Patient>(uid, "pacientes");
  const [recursos, setRecursos] = useFirestoreList<Recurso>(uid, "recursos", recursosIniciales);
  const [citas, setCitas] = useFirestoreList<CitaAgenda>(uid, "citas");

  const [presupuestosPorPaciente, setPresupuestosPorPacienteState] = useState<
    Record<string, SavedBudget[]>
  >({});
  const [pagosPorPaciente, setPagosPorPacienteState] = useState<Record<string, Pago[]>>({});
  const [recetasPorPaciente, setRecetasPorPacienteState] = useState<Record<string, Receta[]>>({});
  const subs = useRef<Record<string, Unsubscribe>>({});
  const [navegacionExpediente, setNavegacionExpediente] = useState<NavegacionExpediente>(null);

  useEffect(() => {
    const map = subs.current;
    return () => {
      Object.values(map).forEach((unsub) => unsub());
    };
  }, []);

  const cargarDatosPaciente = (patientId: string) => {
    const presupuestosKey = `presupuestos:${patientId}`;
    if (!subs.current[presupuestosKey]) {
      const path = `users/${uid}/pacientes/${patientId}/presupuestos`;
      subs.current[presupuestosKey] = onSnapshot(collection(db, path), (snap) => {
        const next = snap.docs.map((d) => ({ ...(d.data() as SavedBudget), id: d.id }));
        setPresupuestosPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
      });
    }
    const pagosKey = `pagos:${patientId}`;
    if (!subs.current[pagosKey]) {
      const path = `users/${uid}/pacientes/${patientId}/pagos`;
      subs.current[pagosKey] = onSnapshot(collection(db, path), (snap) => {
        const next = snap.docs.map((d) => ({ ...(d.data() as Pago), id: d.id }));
        setPagosPorPacienteState((prev) => ({ ...prev, [patientId]: next }));
      });
    }
    const recetasKey = `recetas:${patientId}`;
    if (!subs.current[recetasKey]) {
      const path = `users/${uid}/pacientes/${patientId}/recetas`;
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
    setPatients((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, ...data } : p))
    );
  };

  const irAExpediente = (patientId: string, tab?: string) => {
    setNavegacionExpediente({ patientId, tab });
    onIrAPagina?.("pacientes");
  };

  const consumirNavegacionExpediente = () => setNavegacionExpediente(null);

  const setPresupuestosPaciente = (patientId: string, updater: Updater<SavedBudget[]>) => {
    setPresupuestosPorPacienteState((prev) => {
      const prevArr = prev[patientId] ?? [];
      const next = resolveUpdater(updater, prevArr);
      syncFirestoreList(`users/${uid}/pacientes/${patientId}/presupuestos`, prevArr, next);
      return { ...prev, [patientId]: next };
    });
  };

  const setPagosPaciente = (patientId: string, updater: Updater<Pago[]>) => {
    setPagosPorPacienteState((prev) => {
      const prevArr = prev[patientId] ?? [];
      const next = resolveUpdater(updater, prevArr);
      syncFirestoreList(`users/${uid}/pacientes/${patientId}/pagos`, prevArr, next);
      return { ...prev, [patientId]: next };
    });
  };

  const setRecetasPaciente = (patientId: string, updater: Updater<Receta[]>) => {
    setRecetasPorPacienteState((prev) => {
      const prevArr = prev[patientId] ?? [];
      const next = resolveUpdater(updater, prevArr);
      syncFirestoreList(`users/${uid}/pacientes/${patientId}/recetas`, prevArr, next);
      return { ...prev, [patientId]: next };
    });
  };

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
        cargarDatosPaciente,
        navegacionExpediente,
        irAExpediente,
        consumirNavegacionExpediente,
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
