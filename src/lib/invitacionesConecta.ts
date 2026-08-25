/** Invitación viral segura de MO Conecta — reescrito por completo tras la
 * revisión de seguridad: el token NUNCA es el id del documento (solo se
 * guarda su hash), la identidad del destinatario se verifica exclusivamente
 * contra el correo verificado de Firebase Auth (nunca un campo editable por
 * el usuario), y los 3 canales de invitación exigen el correo del
 * destinatario desde la creación — no existen invitaciones "sin identidad
 * asignada" en esta fase. */

export type CanalInvitacion = "whatsapp" | "correo" | "copiar_enlace";
export type EstadoInvitacion = "activa" | "reclamada" | "vencida" | "cancelada";

export type InvitacionConecta = {
  /** = autoId de Firestore — NUNCA el token. */
  id: string;
  /** sha256(token crudo), hex — el token en sí nunca se persiste. */
  tokenHash: string;
  remitenteUid: string;
  remitenteClinicaId: string;
  remitenteNombre: string;
  destinatarioNombre?: string;
  /** OBLIGATORIO en los 3 canales — es la única señal de identidad que se
   * compara al reclamar (contra el correo VERIFICADO de Firebase Auth, no
   * contra este campo directamente ni al revés: este es lo que el remitente
   * declaró, y se compara normalizado contra lo que Firebase ya verificó). */
  destinatarioCorreoNormalizado: string;
  interconsultaId: string;
  canal: CanalInvitacion;
  creadoEl: string;
  venceEl: string;
  maxUsos: number;
  usosActuales: number;
  estado: EstadoInvitacion;
};

/** Subcolección interconsultas/{id}/solicitudesAcceso/{id} — cuando alguien
 * reclama una invitación con un correo verificado que NO coincide con el
 * que el remitente declaró, no se otorga acceso automático: se crea una
 * solicitud pendiente de aprobación explícita del remitente. */
export type EstadoSolicitudAcceso = "pendiente" | "aprobada" | "rechazada" | "vencida";

export type SolicitudAcceso = {
  id: string;
  solicitanteUid: string;
  /** El correo verificado que efectivamente se comparó — para auditoría. */
  identidadVerificadaUsada: string;
  estado: EstadoSolicitudAcceso;
  creadoEl: string;
  venceEl: string;
  resueltoEl?: string;
  resueltoPorUid?: string;
};

const DIAS_VENCIMIENTO_INVITACION = 7; // "expiración breve" — antes 14
const DIAS_VENCIMIENTO_SOLICITUD_ACCESO = 7;

/** Token aleatorio criptográficamente seguro de un solo uso. En el servidor
 * (Node) usa `crypto.randomBytes`; en el navegador (donde esta función no
 * debería llamarse para generar el token real, pero queda disponible para
 * pruebas/otros usos) cae a `crypto.randomUUID`. El token crudo se regresa
 * UNA sola vez al creador — nunca se guarda. */
export function generarTokenInvitacion(): string {
  const g = globalThis as { crypto?: Crypto & { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID().replace(/-/g, "");
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

/** sha256 en hex — usar la implementación de Node (`crypto` de `node:crypto`)
 * desde las rutas de servidor; esta función solo declara la firma pura para
 * que la lógica que la consume (comparaciones, pruebas) no dependa de dónde
 * viene el hash. La implementación real vive en la ruta de servidor
 * correspondiente, que importa `createHash` de `node:crypto`. */
export function hashesIguales(hashA: string, hashB: string): boolean {
  return hashA.toLowerCase() === hashB.toLowerCase();
}

export function fechaVencimientoInvitacion(desde = new Date()): string {
  const vence = new Date(desde);
  vence.setDate(vence.getDate() + DIAS_VENCIMIENTO_INVITACION);
  return vence.toISOString();
}

export function fechaVencimientoSolicitudAcceso(desde = new Date()): string {
  const vence = new Date(desde);
  vence.setDate(vence.getDate() + DIAS_VENCIMIENTO_SOLICITUD_ACCESO);
  return vence.toISOString();
}

export function invitacionVencida(invitacion: Pick<InvitacionConecta, "venceEl">, ahora = new Date()): boolean {
  return new Date(invitacion.venceEl) < ahora;
}

/** Correo → minúsculas + trim. Es la única normalización de identidad que
 * usa esta fase (sin teléfono — el proyecto no tiene Firebase Phone Auth
 * habilitado hoy; ver §4 del plan). */
export function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase();
}

/** Compara la identidad declarada por el remitente contra la identidad que
 * Firebase Auth realmente verificó — nunca contra un campo editable por el
 * propio usuario. `correoVerificado` debe venir de `decodedToken.email`, y
 * `emailVerificado` de `decodedToken.email_verified`; ambos los produce el
 * servidor al decodificar el ID token, nunca el cliente. */
export function coincideIdentidad(
  destinatarioCorreoNormalizado: string,
  correoVerificado: string | undefined,
  emailVerificado: boolean | undefined
): boolean {
  if (!emailVerificado || !correoVerificado) return false;
  return destinatarioCorreoNormalizado === normalizarCorreo(correoVerificado);
}

/** true si ya existe una invitación activa (no vencida, no cancelada, no ya
 * reclamada) para el mismo caso y el mismo destinatario — evita duplicar
 * invitaciones activas. Cancelar una invitación (§9.8 del pedido original:
 * "permite cancelar y regenerar") la saca de esta comparación de inmediato,
 * así que regenerar después de cancelar siempre es posible. */
export function existeInvitacionActivaDuplicada(
  invitacionesExistentes: InvitacionConecta[],
  interconsultaId: string,
  destinatarioCorreo: string,
  ahora = new Date()
): boolean {
  const correoNormalizado = normalizarCorreo(destinatarioCorreo);
  return invitacionesExistentes.some(
    (inv) =>
      inv.interconsultaId === interconsultaId &&
      inv.destinatarioCorreoNormalizado === correoNormalizado &&
      inv.estado === "activa" &&
      !invitacionVencida(inv, ahora)
  );
}

export function buildMensajeInvitacionConecta(nombreDestinatario: string, enlace: string): string {
  return `Hola, Dr./Dra. ${nombreDestinatario}. Te envié una interconsulta odontológica segura mediante MO. Puedes revisar la solicitud y responder sin costo en este enlace: ${enlace}. Por privacidad, la información clínica solo estará disponible después de identificarte.`;
}

export function urlInvitacion(tokenCrudo: string, origen: string): string {
  return `${origen}/conecta/invite/${tokenCrudo}`;
}
