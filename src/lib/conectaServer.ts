/** Utilidades compartidas por las rutas de servidor de MO Conecta —
 * checks de afiliación/rol contra `clinicMembers` (la misma colección que ya
 * usa el resto de la app, doc id `{clinicId}_{uid}`) y helpers de fecha.
 * Nunca se usa desde el cliente. */

import { dbAdmin } from "./firebaseAdmin";
import { evaluarRateLimit, type VentanaRateLimit } from "./rateLimitConecta";

export function nowISO(): string {
  return new Date().toISOString();
}

export async function esMiembroActivoDeClinica(uid: string, clinicaId: string): Promise<boolean> {
  const snap = await dbAdmin.collection("clinicMembers").doc(`${clinicaId}_${uid}`).get();
  if (!snap.exists) return false;
  return (snap.data() as { status?: string }).status === "active";
}

export async function esAdminDeClinica(uid: string, clinicaId: string): Promise<boolean> {
  const snap = await dbAdmin.collection("clinicMembers").doc(`${clinicaId}_${uid}`).get();
  if (!snap.exists) return false;
  const data = snap.data() as { status?: string; role?: string };
  return data.status === "active" && data.role === "admin";
}

/** Error de negocio con código HTTP explícito — las funciones de lógica de
 * cada ruta lo lanzan en vez de construir un NextResponse directo, así las
 * pruebas de integración (§8.B del plan) pueden llamarlas sin necesitar
 * Next.js ni inspeccionar respuestas HTTP. */
export class ConectaError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** El Admin SDK de Firestore rechaza escribir un valor `undefined` salvo que
 * el proyecto active `ignoreUndefinedProperties` (no está activado aquí) —
 * se usa para construir documentos a partir de objetos con campos opcionales
 * sin arrastrar esas llaves. */
export function sinIndefinidos<T extends Record<string, unknown>>(obj: T): T {
  const limpio = {} as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) limpio[k] = v;
  }
  return limpio as T;
}

/** Límite de tasa best-effort respaldado en Firestore (ver rateLimitConecta.ts
 * — no sustituye rate limiting real de borde/red). `clave` debe incluir el
 * nombre de la acción para no compartir ventana entre acciones distintas. */
export async function aplicarRateLimit(
  clave: string,
  limite: number,
  ventanaMinutos: number
): Promise<boolean> {
  const ref = dbAdmin.collection("rateLimitsConecta").doc(clave);
  const snap = await ref.get();
  const ventanaActual = snap.exists ? (snap.data() as VentanaRateLimit) : undefined;
  const { permitido, nuevaVentana } = evaluarRateLimit(ventanaActual, new Date(), limite, ventanaMinutos);
  await ref.set(nuevaVentana);
  return permitido;
}
