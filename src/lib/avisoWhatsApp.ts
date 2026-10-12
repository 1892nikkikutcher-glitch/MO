/** Avisos por WhatsApp de MO Conecta. MO no manda notificaciones solo: el aviso
 * se abre en WhatsApp ya escrito y la persona solo presiona enviar. Nunca lleva
 * datos del paciente. */

/** wa.me exige el número completo con código de país: con 10 dígitos locales
 * (el caso normal en México) se antepone 52. Sin número, WhatsApp abre su
 * selector de contactos. */
export function urlWhatsApp(numero: string, mensaje: string): string {
  const digitos = numero.replace(/\D/g, "");
  const completo = digitos.length === 10 ? `52${digitos}` : digitos;
  return `https://wa.me/${completo}?text=${encodeURIComponent(mensaje)}`;
}

const primerNombre = (nombre: string) =>
  nombre
    .replace(/^(dra?\.?|doctora?|lic\.?|mtra?\.?)\s+/i, "")
    .trim()
    .split(/\s+/)[0] ?? "";

export function mensajeAvisoCaso(nombreColega: string): string {
  const n = primerNombre(nombreColega);
  return (
    `Hola${n ? ` ${n}` : ""}, te envié un caso por MO Conecta. ` +
    `Entra a MO → MO Conecta → Interconsultas → Recibidos para verlo y aceptarlo.`
  );
}
