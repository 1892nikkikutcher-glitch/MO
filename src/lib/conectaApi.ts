"use client";

/** Cliente delgado para /api/conecta/* y /api/admin/conecta/* — mismo patrón
 * ya usado en PanelAdministrador.tsx (`llamarApi`): adjunta el ID token de
 * Firebase Auth de la sesión actual, nunca escribe Firestore directo. */

import { auth } from "./firebase";
import type { CategoriaArchivoInterconsulta, InterconsultaEstado, PrioridadInterconsulta } from "./moConecta";

/** Cuando la ruta rechaza el body por Zod, `detalles.fieldErrors` trae el
 * motivo exacto por campo (ej. `{ modalidadAtencion: ["Invalid enum value..."] }`)
 * — sin esto, el clínico solo veía "Datos de perfil inválidos." sin saber
 * cuál campo corregir ni por qué. */
function mensajeDeError(data: { error?: string; detalles?: { fieldErrors?: Record<string, string[]> } }): string {
  const base = data.error || "Ocurrió un error.";
  const fieldErrors = data.detalles?.fieldErrors;
  if (!fieldErrors) return base;
  const detalle = Object.entries(fieldErrors)
    .filter(([, mensajes]) => Array.isArray(mensajes) && mensajes.length > 0)
    .map(([campo, mensajes]) => `${campo}: ${mensajes.join(", ")}`)
    .join(" · ");
  return detalle ? `${base} (${detalle})` : base;
}

async function llamarApi(path: string, options: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token ?? ""}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(mensajeDeError(data));
  return data;
}

export function crearPerfilProfesionalApi(body: Record<string, unknown>) {
  return llamarApi("/api/conecta/perfiles", { method: "POST", body: JSON.stringify(body) });
}

export function editarPerfilProfesionalApi(uid: string, body: Record<string, unknown>) {
  return llamarApi(`/api/conecta/perfiles/${uid}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function subirEvidenciaVerificacionApi(uid: string, archivo: File) {
  const { storagePath } = await llamarApi(`/api/conecta/perfiles/${uid}/evidencia-verificacion`, {
    method: "POST",
    body: JSON.stringify({ mimeType: archivo.type }),
  });
  const contenidoBase64 = await archivoABase64(archivo);
  return llamarApi(`/api/conecta/perfiles/${uid}/evidencia-verificacion`, {
    method: "PATCH",
    body: JSON.stringify({ storagePath, mimeType: archivo.type, contenidoBase64 }),
  });
}

export function solicitarAfiliacionApi(clinicaId: string) {
  return llamarApi("/api/conecta/afiliaciones", { method: "POST", body: JSON.stringify({ clinicaId }) });
}

export function resolverAfiliacionApi(id: string, accion: "aceptar" | "rechazar" | "revocar") {
  return llamarApi(`/api/conecta/afiliaciones/${id}`, { method: "PATCH", body: JSON.stringify({ accion }) });
}

export type CrearInterconsultaBody = {
  clinicaRemitenteId: string;
  pacienteId: string;
  especialidadSolicitada: string;
  motivo: string;
  preguntaClinica: string;
  prioridad: PrioridadInterconsulta;
  antecedentesAlertas?: string;
  destinatarioUid?: string;
  destinatarioClinicaId?: string;
  informacionMinima?: string;
  consentimiento: {
    destinatarioTipo: "odontologo_registrado" | "clinica" | "invitacion";
    destinatarioId?: string;
    finalidad: string;
    informacionCompartida: string[];
  };
};

export function crearInterconsultaApi(body: CrearInterconsultaBody) {
  return llamarApi("/api/conecta/interconsultas", { method: "POST", body: JSON.stringify(body) });
}

export function transicionarEstadoApi(interconsultaId: string, siguiente: InterconsultaEstado, nota?: string) {
  return llamarApi(`/api/conecta/interconsultas/${interconsultaId}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ siguiente, nota }),
  });
}

export function crearMensajeApi(interconsultaId: string, contenido: string) {
  return llamarApi(`/api/conecta/interconsultas/${interconsultaId}/mensajes`, {
    method: "POST",
    body: JSON.stringify({ contenido }),
  });
}

export type ContrarreferenciaBody = {
  resumenAtencion: string;
  hallazgosRelevantes?: string;
  procedimientoRealizado?: string;
  estadoActual: string;
  recomendaciones?: string;
  proximaRevision?: string;
  devolverAlRemitente: boolean;
  esBorrador: boolean;
};

export function registrarContrarreferenciaApi(interconsultaId: string, body: ContrarreferenciaBody) {
  return llamarApi(`/api/conecta/interconsultas/${interconsultaId}/contrarreferencia`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function revocarAccesoApi(interconsultaId: string, uidARevocar: string, motivo?: string) {
  return llamarApi(`/api/conecta/interconsultas/${interconsultaId}/revocar-acceso`, {
    method: "POST",
    body: JSON.stringify({ uidARevocar, motivo }),
  });
}

export function resolverSolicitudAccesoApi(interconsultaId: string, solicitudId: string, accion: "aprobar" | "rechazar") {
  return llamarApi(`/api/conecta/interconsultas/${interconsultaId}/solicitudes-acceso/${solicitudId}`, {
    method: "PATCH",
    body: JSON.stringify({ accion }),
  });
}

function archivoABase64(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => {
      const resultado = lector.result as string;
      resolve(resultado.split(",")[1] ?? "");
    };
    lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
    lector.readAsDataURL(archivo);
  });
}

export async function subirArchivoInterconsultaApi(
  interconsultaId: string,
  archivo: File,
  categoriaClinica: CategoriaArchivoInterconsulta
) {
  const { storagePath, archivoId } = await llamarApi(`/api/conecta/interconsultas/${interconsultaId}/archivos`, {
    method: "POST",
    body: JSON.stringify({ mimeType: archivo.type }),
  });
  const contenidoBase64 = await archivoABase64(archivo);
  const { archivo: archivoGuardado } = await llamarApi(`/api/conecta/interconsultas/${interconsultaId}/archivos`, {
    method: "PATCH",
    body: JSON.stringify({
      archivoId,
      storagePath,
      mimeType: archivo.type,
      contenidoBase64,
      nombreOriginal: archivo.name,
      categoriaClinica,
    }),
  });
  return archivoGuardado;
}

/** Descarga un archivo de una interconsulta a través del proxy autenticado
 * (nunca una URL directa de Storage) y dispara la descarga en el navegador. */
export async function descargarArchivoInterconsultaApi(interconsultaId: string, archivoId: string, nombreSugerido: string) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`/api/conecta/interconsultas/${interconsultaId}/archivos/${archivoId}`, {
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "No se pudo descargar el archivo.");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreSugerido;
  enlace.click();
  URL.revokeObjectURL(url);
}

export type CrearInvitacionBody = {
  interconsultaId: string;
  destinatarioNombre?: string;
  destinatarioCorreo: string;
  canal: "whatsapp" | "correo" | "copiar_enlace";
};

export function crearInvitacionApi(body: CrearInvitacionBody) {
  return llamarApi("/api/conecta/invitaciones", { method: "POST", body: JSON.stringify(body) });
}

export function obtenerInvitacionPublicaApi(token: string) {
  return fetch(`/api/conecta/invitaciones/${token}`).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Invitación no encontrada.");
    return data;
  });
}

export function reclamarInvitacionApi(token: string) {
  return llamarApi(`/api/conecta/invitaciones/${token}/reclamar`, { method: "POST" });
}

export function revocarConsentimientoApi(consentimientoId: string, motivo?: string) {
  return llamarApi(`/api/conecta/consentimientos/${consentimientoId}`, { method: "POST", body: JSON.stringify({ motivo }) });
}

export function registrarEventoApi(
  tipo: "professional_profile_created" | "professional_verification_requested" | "invite_shared" | "invite_page_viewed",
  detalle: { interconsultaId?: string; invitacionId?: string; fuenteAdquisicion?: string } = {}
) {
  return llamarApi("/api/conecta/eventos", { method: "POST", body: JSON.stringify({ tipo, ...detalle }) });
}

export function adminVerificarPerfilApi(
  uid: string,
  body: { accion: "verificar" | "rechazar" | "notas"; especialidadesVerificadas?: string[]; notasAdministrativas?: string }
) {
  return llamarApi(`/api/admin/conecta/perfiles/${uid}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function adminOtorgarFundadoraApi(clinicId: string) {
  return llamarApi(`/api/admin/clinicas/${clinicId}`, { method: "PATCH", body: JSON.stringify({ accion: "otorgar-fundadora" }) });
}
