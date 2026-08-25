"use client";

/** Contexto de MO Conecta — SOLO lecturas en tiempo real de lo que el
 * usuario ya puede ver según firestore.rules (perfil propio, directorio,
 * casos donde es participante, sus afiliaciones). Toda escritura pasa por
 * `conectaApi.ts` (rutas de servidor) — este contexto nunca llama
 * `setDoc`/`updateDoc` directo (ver §1 del plan de seguridad de MO Conecta:
 * "el cliente nunca escribe ninguna colección de MO Conecta"). */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { collection, doc, onSnapshot, query, where, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AfiliacionClinica, Interconsulta, PerfilProfesionalPrivado, PerfilProfesionalPublico } from "@/lib/moConecta";

type MoConectaContextValue = {
  uid: string;
  perfilPublico: PerfilProfesionalPublico | null;
  perfilPrivado: PerfilProfesionalPrivado | null;
  directorio: PerfilProfesionalPublico[];
  misAfiliaciones: AfiliacionClinica[];
  misCasos: Interconsulta[];
  casosEnviados: Interconsulta[];
  casosRecibidos: Interconsulta[];
  cargando: boolean;
};

const MoConectaContext = createContext<MoConectaContextValue | null>(null);

export function MoConectaProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [perfilPublico, setPerfilPublico] = useState<PerfilProfesionalPublico | null>(null);
  const [perfilPrivado, setPerfilPrivado] = useState<PerfilProfesionalPrivado | null>(null);
  const [directorio, setDirectorio] = useState<PerfilProfesionalPublico[]>([]);
  const [misAfiliaciones, setMisAfiliaciones] = useState<AfiliacionClinica[]>([]);
  const [misCasos, setMisCasos] = useState<Interconsulta[]>([]);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [cargandoCasos, setCargandoCasos] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const unsubs: Unsubscribe[] = [];

    unsubs.push(
      onSnapshot(doc(db, "perfilesProfesionalesPublicos", uid), (snap) => {
        setPerfilPublico(snap.exists() ? (snap.data() as PerfilProfesionalPublico) : null);
        setCargandoPerfil(false);
      })
    );
    unsubs.push(
      onSnapshot(doc(db, "perfilesProfesionalesPrivados", uid), (snap) => {
        setPerfilPrivado(snap.exists() ? (snap.data() as PerfilProfesionalPrivado) : null);
      })
    );
    unsubs.push(
      onSnapshot(query(collection(db, "perfilesProfesionalesPublicos"), where("activoEnDirectorio", "==", true)), (snap) => {
        setDirectorio(snap.docs.map((d) => d.data() as PerfilProfesionalPublico));
      })
    );
    unsubs.push(
      onSnapshot(query(collection(db, "afiliaciones"), where("uid", "==", uid)), (snap) => {
        setMisAfiliaciones(snap.docs.map((d) => d.data() as AfiliacionClinica));
      })
    );
    unsubs.push(
      onSnapshot(query(collection(db, "interconsultas"), where("participantesAutorizados", "array-contains", uid)), (snap) => {
        setMisCasos(snap.docs.map((d) => d.data() as Interconsulta));
        setCargandoCasos(false);
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [uid]);

  const casosEnviados = misCasos.filter((c) => c.odontologoRemitenteUid === uid);
  const casosRecibidos = misCasos.filter((c) => c.odontologoRemitenteUid !== uid);

  return (
    <MoConectaContext.Provider
      value={{
        uid,
        perfilPublico,
        perfilPrivado,
        directorio,
        misAfiliaciones,
        misCasos,
        casosEnviados,
        casosRecibidos,
        cargando: cargandoPerfil || cargandoCasos,
      }}
    >
      {children}
    </MoConectaContext.Provider>
  );
}

export function useMoConecta() {
  const ctx = useContext(MoConectaContext);
  if (!ctx) throw new Error("useMoConecta debe usarse dentro de MoConectaProvider");
  return ctx;
}
