/** Quien da de alta la plataforma (el "Nombre del administrador" de Consultorio) también atiende: se registra solo
 * como médico de la Agenda para que aparezca en "Médico responsable", en las citas y en los documentos sin tener que
 * capturarlo dos veces. Solo cuando la clínica todavía no tiene ningún médico: si ya hay médicos dados de alta, el
 * administrador decide si él también atiende. */

import { collection, doc, getDocs, setDoc, type Firestore } from "firebase/firestore";
import { mismoNombre } from "./migracionIdentidadDoctor";
import { elegirColorDisponible, type Recurso } from "./patientData";

/** Id fijo: dos ejecuciones casi simultáneas convergen al mismo documento en vez de duplicar al médico. */
export const ID_MEDICO_ADMINISTRADOR = "medico_administrador";

/** ¿Hay que dar de alta al administrador como médico? Solo si tiene nombre y no existe ya ningún médico. */
export function debeCrearMedicoAdministrador(
  nombreAdministrador: string | undefined,
  recursos: Pick<Recurso, "nombre" | "tipo">[]
): boolean {
  if (!nombreAdministrador?.trim()) return false;
  if (recursos.some((r) => r.tipo === "medico")) return false;
  return !recursos.some((r) => mismoNombre(r.nombre, nombreAdministrador));
}

export async function asegurarMedicoAdministrador(
  db: Firestore,
  clinicUid: string,
  nombreAdministrador: string | undefined
): Promise<boolean> {
  const nombre = nombreAdministrador?.trim();
  if (!nombre) return false;
  // Lectura directa (no el estado del contexto, que puede estar aún vacío porque no ha terminado de cargar).
  const snap = await getDocs(collection(db, `users/${clinicUid}/recursos`));
  const recursos = snap.docs.map((d) => ({ ...(d.data() as Recurso), id: d.id }));
  if (!debeCrearMedicoAdministrador(nombre, recursos)) return false;
  const medico: Recurso = {
    id: ID_MEDICO_ADMINISTRADOR,
    nombre,
    tipo: "medico",
    color: elegirColorDisponible(recursos.map((r) => r.color)),
  };
  await setDoc(doc(db, `users/${clinicUid}/recursos`, medico.id), medico);
  return true;
}
