/** Puente entre el "Flujo de formatos" del expediente y la página Documentos: al tocar
 * "Generar" en un formato, se deja anotado qué paciente y qué documento abrir, y
 * Documentos lo lee al montarse (una sola vez). Vive en sessionStorage porque es solo
 * un aviso de navegación; si no hay almacenamiento, el usuario elige paciente a mano. */

const CLAVE = "mo:documento-pendiente";

export type DocumentoPendiente = { patientId: string; tipo: string };

export function guardarDocumentoPendiente(pendiente: DocumentoPendiente): void {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(pendiente));
  } catch {
    // sin almacenamiento disponible: Documentos se abre sin paciente elegido
  }
}

export function consumirDocumentoPendiente(): DocumentoPendiente | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE);
    if (!crudo) return null;
    sessionStorage.removeItem(CLAVE);
    const valor: unknown = JSON.parse(crudo);
    if (
      valor &&
      typeof valor === "object" &&
      typeof (valor as DocumentoPendiente).patientId === "string" &&
      typeof (valor as DocumentoPendiente).tipo === "string"
    ) {
      return valor as DocumentoPendiente;
    }
    return null;
  } catch {
    return null;
  }
}
