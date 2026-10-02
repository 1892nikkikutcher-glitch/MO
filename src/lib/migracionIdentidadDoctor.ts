/** Migración lazy, de una sola vez por clínica (pero segura de correr más
 * de una vez): copia la identidad de receta que antes vivía solo en
 * `PerfilDoctor` (dato único por clínica) hacia el `Recurso` (médico) que
 * le corresponda, para que `identidadDoctorDe` (patientData.ts) pueda
 * resolverla por médico seleccionado.
 *
 * Nunca escribe a `config/*` — esa colección solo admite escritura de
 * admin (firestore.rules), y esta migración debe funcionar sin importar
 * qué rol sea quien primero abra la app después del despliegue. Por eso
 * lee `perfilDoctor` pero solo escribe a `recursos` (cualquier miembro
 * activo puede escribir ahí).
 *
 * Idempotente por campo, no por bandera: nunca pisa un valor que el
 * usuario ya haya capturado a mano en el Recurso (desde Agenda o desde una
 * corrida anterior de esta misma función). Si no existe ningún Recurso
 * médico con el nombre del perfil legado, crea uno nuevo con un id FIJO
 * (no aleatorio) para que dos ejecuciones casi simultáneas converjan al
 * mismo documento en vez de duplicar — mismo criterio que ya usa
 * `aceptarInvite` con `ruid_${uid}`. */

import { collection, doc, getDoc, getDocs, setDoc, type Firestore } from "firebase/firestore";
import { elegirColorDisponible, type Recurso } from "./patientData";

const ID_RECURSO_MIGRADO = "doctor_migrado";

const CAMPOS_A_MIGRAR = [
  "cedulaProfesional",
  "especialidad",
  "correo",
  "telefono",
  "escuelaEgreso",
  "logoEscuelaUrl",
  "firmaDigitalUrl",
] as const;

type PerfilDoctorLegado = Partial<Record<(typeof CAMPOS_A_MIGRAR)[number], string>> & { nombre?: string };

export async function migrarIdentidadDoctor(
  db: Firestore,
  clinicUid: string
): Promise<{ escribio: boolean; recursoId: string | null }> {
  const perfilSnap = await getDoc(doc(db, `users/${clinicUid}/config/perfilDoctor`));
  const legado = (perfilSnap.exists() ? perfilSnap.data() : {}) as PerfilDoctorLegado;
  const nombreLegado = legado.nombre?.trim();
  if (!nombreLegado) return { escribio: false, recursoId: null };

  const recursosSnap = await getDocs(collection(db, `users/${clinicUid}/recursos`));
  const recursos = recursosSnap.docs.map((d) => ({ ...(d.data() as Recurso), id: d.id }));
  const existente = recursos.find((r) => r.tipo === "medico" && r.nombre === nombreLegado);

  const base: Recurso = existente ?? {
    id: ID_RECURSO_MIGRADO,
    nombre: nombreLegado,
    tipo: "medico",
    color: elegirColorDisponible(recursos.map((r) => r.color)),
  };

  const actualizado: Recurso = { ...base };
  let cambio = false;
  CAMPOS_A_MIGRAR.forEach((campo) => {
    if (!actualizado[campo] && legado[campo]) {
      actualizado[campo] = legado[campo];
      cambio = true;
    }
  });

  if (!cambio) return { escribio: false, recursoId: existente?.id ?? null };
  await setDoc(doc(db, `users/${clinicUid}/recursos`, actualizado.id), actualizado satisfies Recurso);
  return { escribio: true, recursoId: actualizado.id };
}
