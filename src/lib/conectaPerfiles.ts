/** Lógica de negocio de perfiles profesionales de MO Conecta — la invoca
 * directo el `route.ts` correspondiente (fino, solo decodifica sesión/valida
 * con Zod) y también las pruebas de integración (§8.B del plan), sin pasar
 * por HTTP. Nunca se llama desde el cliente. */

import { dbAdmin } from "./firebaseAdmin";
import {
  filtrarCamposPerfilPublico,
  perfilPublicoVacio,
  type PerfilProfesionalPrivado,
  type PerfilProfesionalPublico,
} from "./moConecta";
import { ConectaError, nowISO, sinIndefinidos } from "./conectaServer";

export async function crearPerfilProfesional(
  uid: string,
  correoSesion: string | null,
  body: Record<string, unknown>
): Promise<PerfilProfesionalPublico> {
  const publicoRef = dbAdmin.collection("perfilesProfesionalesPublicos").doc(uid);
  const existente = await publicoRef.get();
  if (existente.exists) {
    throw new ConectaError(409, "Ya existe un perfil para esta cuenta — usa editar en su lugar.");
  }

  const ahora = nowISO();
  const camposPublicos = filtrarCamposPerfilPublico(body);
  const perfilPublico: PerfilProfesionalPublico = sinIndefinidos({
    ...perfilPublicoVacio(uid, ahora),
    ...camposPublicos,
    nombreCompleto: String(body.nombreCompleto ?? ""),
  });
  const perfilPrivado: PerfilProfesionalPrivado = sinIndefinidos({
    uid,
    correo: correoSesion ?? undefined,
    cedulaProfesional: body.cedulaProfesional as string | undefined,
    cedulaEspecialidad: body.cedulaEspecialidad as string | undefined,
    telefonoProfesional: body.telefonoProfesional as string | undefined,
  });

  const batch = dbAdmin.batch();
  batch.set(publicoRef, perfilPublico);
  batch.set(dbAdmin.collection("perfilesProfesionalesPrivados").doc(uid), perfilPrivado);
  batch.set(dbAdmin.collection("perfilesProfesionalesAdmin").doc(uid), { uid });
  await batch.commit();

  return perfilPublico;
}

export async function editarPerfilProfesional(
  uid: string,
  body: Record<string, unknown>
): Promise<void> {
  const publicoRef = dbAdmin.collection("perfilesProfesionalesPublicos").doc(uid);
  const existente = await publicoRef.get();
  if (!existente.exists) {
    throw new ConectaError(404, "No existe un perfil para esta cuenta — créalo primero.");
  }

  const ahora = nowISO();
  const camposPublicos = filtrarCamposPerfilPublico(body);
  const actualizacionPublica = sinIndefinidos({ ...camposPublicos, actualizadoEl: ahora });

  const actualizacionPrivada = sinIndefinidos({
    cedulaProfesional: body.cedulaProfesional as string | undefined,
    cedulaEspecialidad: body.cedulaEspecialidad as string | undefined,
    telefonoProfesional: body.telefonoProfesional as string | undefined,
  });

  const batch = dbAdmin.batch();
  if (Object.keys(actualizacionPublica).length > 0) {
    batch.set(publicoRef, actualizacionPublica, { merge: true });
  }
  if (Object.keys(actualizacionPrivada).length > 0) {
    batch.set(dbAdmin.collection("perfilesProfesionalesPrivados").doc(uid), actualizacionPrivada, { merge: true });
  }
  await batch.commit();
}
