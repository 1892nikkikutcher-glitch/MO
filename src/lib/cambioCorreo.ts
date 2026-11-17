/**
 * Cambio de correo de una cuenta — reglas puras, sin Firebase, para poder
 * probarlas y usarlas igual en el navegador y en el servidor.
 *
 * Hay DOS caminos para cambiar el correo con el que alguien entra a MO:
 *
 *  1. El propio usuario, desde Contraseña → "Cambiar mi correo". Pide su
 *     contraseña actual y confirma en el correo NUEVO antes de cambiar nada
 *     (Firebase `verifyBeforeUpdateEmail`). Sirve cuando todavía tiene acceso
 *     a su cuenta.
 *
 *  2. El administrador de la plataforma, desde el detalle de una clínica.
 *     Sirve cuando el usuario ya no puede entrar ni tiene acceso al correo
 *     viejo. Exige dejar por escrito cómo se verificó la identidad.
 *
 * En los dos casos el `uid` no cambia, y por eso el expediente (que vive en
 * `users/{uid}`) y las membresías de clínica (`clinicMembers`, por uid) se
 * quedan exactamente donde están. Lo único que se copia a mano es el correo
 * que MO guarda de adorno (ver `cuentaCorreo.ts`).
 */

/** Minúsculas y sin espacios: así se compara y así lo guarda Firebase Auth. */
export function normalizarCorreo(valor: string): string {
  return (valor ?? "").trim().toLowerCase();
}

/** Forma razonable de un correo — no pretende validar el estándar completo,
 * solo atrapar lo que se teclea mal (sin arroba, sin punto, con espacios). */
export function correoValido(valor: string): boolean {
  const correo = normalizarCorreo(valor);
  if (correo.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo);
}

/** Mínimo de texto para que "cómo verifiqué su identidad" diga algo de verdad
 * y no sea un "ok". Es una bitácora, no un trámite. */
export const MIN_CARACTERES_VERIFICACION = 15;

export type SolicitudCambioAdmin = {
  correoActual: string;
  correoNuevo: string;
  /** Lo que el administrador tecleó para confirmar que tiene la cuenta correcta. */
  confirmacionCorreoActual: string;
  /** Cómo se comprobó que quien pide el cambio es el dueño de la cuenta. */
  verificacion: string;
};

/** Devuelve el mensaje de error para mostrar tal cual, o `null` si todo bien. */
export function errorDeCambioAdmin(s: SolicitudCambioAdmin): string | null {
  const actual = normalizarCorreo(s.correoActual);
  const nuevo = normalizarCorreo(s.correoNuevo);
  if (!correoValido(nuevo)) return "El correo nuevo no parece válido. Revisa que tenga @ y un dominio.";
  if (nuevo === actual) return "El correo nuevo es el mismo que ya tiene la cuenta.";
  if (normalizarCorreo(s.confirmacionCorreoActual) !== actual) {
    return "Para confirmar, escribe el correo ACTUAL de la cuenta exactamente como aparece.";
  }
  if ((s.verificacion ?? "").trim().length < MIN_CARACTERES_VERIFICACION) {
    return `Anota cómo verificaste su identidad (mínimo ${MIN_CARACTERES_VERIFICACION} caracteres).`;
  }
  return null;
}

/** Contraseña aleatoria, solo para dejar INUTIL la anterior cuando el
 * administrador cambia el correo: nadie la conoce ni se muestra; la persona
 * elige la suya con el enlace que le llega al correo nuevo. */
export function contrasenaDescartable(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

/** Mensaje en español para los errores de Firebase Auth que sí puede ver el usuario. */
export function mensajeErrorCambioCorreo(codigo: string | undefined): string {
  switch (codigo) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "La contraseña no es correcta.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
    case "auth/email-already-in-use":
      return "Ese correo ya está en uso por otra cuenta.";
    case "auth/invalid-email":
      return "El correo no es válido.";
    case "auth/requires-recent-login":
      return "Por seguridad, vuelve a iniciar sesión y reintenta.";
    case "auth/operation-not-allowed":
      return "Este cambio no está habilitado todavía en la plataforma. Escríbenos y te ayudamos.";
    default:
      return "No se pudo enviar el correo de confirmación. Inténtalo de nuevo en unos minutos.";
  }
}
