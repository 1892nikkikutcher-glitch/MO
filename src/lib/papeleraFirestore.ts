import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import type { FotoPaciente } from "./patientData";
import {
  analizarRutaOrigen,
  construirEntradaPapelera,
  REGISTROS_POR_LOTE,
  trocear,
  type CampoFoto,
  type EntradaPapelera,
  type UsuarioPapelera,
} from "./papelera";

/** Parte de la Papelera que sí toca Firestore (la lógica pura, probada sin
 * emulador, vive en papelera.ts). */

function usuarioActual(): UsuarioPapelera {
  const u = auth.currentUser;
  return { uid: u?.uid ?? "", email: u?.email ?? "" };
}

let ultimoAviso = 0;

/** Si el archivado falla (sin permisos, por ejemplo), Firestore revierte el
 * batch completo: el registro NO se elimina y vuelve a aparecer solo. Aquí
 * solo se explica por qué, una vez cada pocos segundos (una eliminación
 * masiva troceada en varios lotes no debe lanzar una alerta por lote). */
function avisarFalloPapelera(err: unknown) {
  console.error("No se pudo guardar en la Papelera; el registro no se eliminó", err);
  if (typeof window === "undefined") return;
  const ahora = Date.now();
  if (ahora - ultimoAviso < 5000) return;
  ultimoAviso = ahora;
  window.alert(
    "No se pudo eliminar: antes de borrar, MO guarda una copia en la Papelera y esa copia no se pudo guardar. " +
      "El registro sigue en su lugar. Revisa tu conexión o avisa al administrador."
  );
}

/** Reemplaza el `deleteDoc` de siempre: por cada registro que desaparece de
 * la lista escribe su copia en `users/{clinicUid}/papelera` Y lo borra, en el
 * MISMO batch — o pasan las dos cosas o ninguna, nunca se pierde un registro
 * por un fallo a medias. Cada llamada comparte un `loteId` (útil cuando una
 * sola acción borra cientos, como "Borrar citas"). */
export function archivarYEliminar(ruta: string, items: ({ id: string } & Record<string, unknown>)[]) {
  if (items.length === 0) return;
  const origen = analizarRutaOrigen(ruta);
  if (!origen) {
    // Ruta fuera de lo esperado (no cuelga de users/{uid}/...): no hay dónde
    // archivar. Se conserva el comportamiento de siempre en vez de dejar al
    // usuario sin poder eliminar.
    items.forEach((item) =>
      deleteDoc(doc(db, ruta, item.id)).catch((err) => console.error(`No se pudo eliminar ${ruta}/${item.id}`, err))
    );
    return;
  }

  const usuario = usuarioActual();
  const ahora = new Date();
  const lote = { id: `${ahora.getTime().toString(36)}${Math.random().toString(36).slice(2, 8)}`, tamano: items.length };
  const coleccionPapelera = collection(db, `users/${origen.clinicUid}/papelera`);

  trocear(items, REGISTROS_POR_LOTE).forEach((grupo) => {
    const batch = writeBatch(db);
    grupo.forEach((item) => {
      const construida = construirEntradaPapelera({ ruta, item, usuario, ahora, lote });
      // Sin copia no hay borrado: la ruta ya se validó arriba, así que esto
      // no ocurre, pero si ocurriera, lo seguro es dejar el registro donde está.
      if (!construida) return;
      batch.set(doc(coleccionPapelera, construida.id), construida.entrada);
      batch.delete(doc(db, ruta, item.id));
    });
    batch.commit().catch(avisarFalloPapelera);
  });
}

const camposLista: ReadonlySet<CampoFoto> = new Set(["extraorales", "intraorales"]);

/** Quita una foto del expediente SIN borrar el archivo de Storage (antes se
 * borraba para siempre): la copia del registro va a la Papelera y, en el
 * mismo batch, se quita del documento de fotos. Devuelve la promesa del
 * batch; quien llama decide si la espera. */
export function archivarYQuitarFoto(
  clinicUid: string,
  patientId: string,
  campo: CampoFoto,
  foto: FotoPaciente
): Promise<void> {
  const ruta = `users/${clinicUid}/pacientes/${patientId}/fotos`;
  const construida = construirEntradaPapelera({
    ruta,
    item: { ...foto },
    usuario: usuarioActual(),
    ahora: new Date(),
    campo,
  });
  if (!construida) return Promise.reject(new Error("Ruta de fotos inválida."));
  const batch = writeBatch(db);
  batch.set(doc(db, `users/${clinicUid}/papelera`, construida.id), construida.entrada);
  batch.update(doc(db, ruta, "datos"), { [campo]: camposLista.has(campo) ? arrayRemove(foto) : null });
  return batch.commit();
}

export type ResultadoRestauracion = { ok: true; mensaje: string } | { ok: false; mensaje: string };

/** Marca la entrada como restaurada — NO se borra: queda como historial. */
export async function marcarEntradaRestaurada(clinicUid: string, entradaId: string, email: string) {
  await updateDoc(doc(db, `users/${clinicUid}/papelera`, entradaId), {
    restauradoEl: new Date().toISOString(),
    restauradoPorEmail: email,
  });
}

/** Devuelve una foto a su lugar. Una foto de perfil o de INE solo regresa si
 * ese espacio sigue vacío (no se pisa la que se haya subido después). */
export async function restaurarFotoDePapelera(entrada: EntradaPapelera): Promise<ResultadoRestauracion> {
  const origen = analizarRutaOrigen(entrada.rutaOrigen);
  const campo = entrada.campo as CampoFoto | undefined;
  if (!origen || !campo) return { ok: false, mensaje: "Esta foto no tiene el dato de dónde estaba guardada." };
  const foto = entrada.datos as unknown as FotoPaciente;
  const ref = doc(db, entrada.rutaOrigen, "datos");
  if (camposLista.has(campo)) {
    await setDoc(ref, { [campo]: arrayUnion(foto) }, { merge: true });
    return { ok: true, mensaje: "La foto volvió al expediente del paciente." };
  }
  const snap = await getDoc(ref);
  const ocupado = snap.exists() && (snap.data() as Record<string, unknown>)[campo];
  if (ocupado) {
    return {
      ok: false,
      mensaje: "Ya hay otra foto en ese lugar. Elimina la actual primero si quieres regresar esta.",
    };
  }
  await setDoc(ref, { [campo]: foto }, { merge: true });
  return { ok: true, mensaje: "La foto volvió al expediente del paciente." };
}

/** Restauración "tal cual": escribe el documento en su ruta original, sin
 * pisar uno que ya exista con el mismo id. Sirve para todo lo que no
 * arrastra totales ni resúmenes en otras partes de la app. */
export async function restaurarDocumentoDePapelera(entrada: EntradaPapelera): Promise<ResultadoRestauracion> {
  const ref = doc(db, entrada.rutaOrigen, entrada.docId);
  const existente = await getDoc(ref);
  if (existente.exists()) {
    return {
      ok: false,
      mensaje: "Ya existe un registro con el mismo identificador en su lugar de origen; no se restauró para no pisarlo.",
    };
  }
  await setDoc(ref, entrada.datos);
  return { ok: true, mensaje: "Registro restaurado." };
}
