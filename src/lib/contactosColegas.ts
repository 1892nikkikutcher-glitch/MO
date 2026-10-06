/** Colegas a los que ya invitaste a MO Conecta, para no volver a capturar su
 * nombre, WhatsApp y correo en cada interconsulta. Se arma con dos fuentes:
 *  - las invitaciones que ya creaste (nombre y correo; las guarda el servidor);
 *  - tu agenda local de este dispositivo (además trae el WhatsApp, que por
 *    diseño nunca se guarda en el servidor).
 * Funciones puras salvo las dos de localStorage, que nunca lanzan. */

import { capitalizarNombre } from "./textoNombre";
import type { ResumenInvitacionDeCaso } from "./colegaDelCaso";

export type ContactoColega = { nombre: string; whatsapp: string; correo: string; ultimoUso: string };

const CLAVE_ALMACEN = "mo-conecta-contactos-v1";
const MAX_CONTACTOS = 100;

/** "Jaqueline Dlc M" -> "jaqueline dlc m"; sin acentos, mayúsculas ni signos. */
export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Últimos 10 dígitos (el número local mexicano); vacío si no hay 10. */
export function telefonoLocal(telefono: string): string {
  const digitos = telefono.replace(/\D/g, "");
  return digitos.length >= 10 ? digitos.slice(-10) : "";
}

type Identidad = { nombre?: string; correo?: string; whatsapp?: string };

/** Identidad de un contacto: el correo si lo hay; si no el WhatsApp; si no el
 * nombre normalizado. Dos capturas del mismo colega con el mismo correo o
 * número son la misma persona aunque el nombre esté escrito distinto. */
export function claveContacto(c: Identidad): string {
  const correo = (c.correo ?? "").trim().toLowerCase();
  if (correo) return `c:${correo}`;
  const tel = telefonoLocal(c.whatsapp ?? "");
  if (tel) return `w:${tel}`;
  return `n:${normalizarNombre(c.nombre ?? "")}`;
}

const masReciente = (a: string, b: string) => (a >= b ? a : b);

/** Dos capturas son el mismo colega si comparten correo o WhatsApp, o si tienen
 * el mismo nombre y a una de las dos le faltan esos datos. */
function mismoColega(a: ContactoColega, b: ContactoColega): boolean {
  const ca = a.correo.trim().toLowerCase();
  const cb = b.correo.trim().toLowerCase();
  if (ca && cb) return ca === cb;
  const ta = telefonoLocal(a.whatsapp);
  const tb = telefonoLocal(b.whatsapp);
  if (ta && tb) return ta === tb;
  const na = normalizarNombre(a.nombre);
  return !!na && na === normalizarNombre(b.nombre);
}

/** Junta contactos repetidos del mismo colega (aunque el nombre esté escrito
 * distinto) y deja el dato más reciente de cada campo. Del más reciente al más
 * antiguo. */
export function unirContactos(...listas: ContactoColega[][]): ContactoColega[] {
  const unidos: ContactoColega[] = [];
  const fusionar = (base: ContactoColega, otro: ContactoColega): ContactoColega => {
    const nuevo = otro.ultimoUso >= base.ultimoUso;
    const elegir = (a: string, b: string) => (nuevo ? b || a : a || b);
    return {
      nombre: elegir(base.nombre, otro.nombre),
      whatsapp: elegir(base.whatsapp, otro.whatsapp),
      correo: elegir(base.correo, otro.correo),
      ultimoUso: masReciente(base.ultimoUso, otro.ultimoUso),
    };
  };
  for (const c of listas.flat()) {
    if (!c.nombre.trim() && !c.correo.trim() && !telefonoLocal(c.whatsapp)) continue;
    const i = unidos.findIndex((u) => mismoColega(u, c));
    if (i >= 0) unidos[i] = fusionar(unidos[i], c);
    else unidos.push({ ...c });
  }
  return unidos
    .map((c) => ({ ...c, nombre: capitalizarNombre(c.nombre.trim()) }))
    .sort((a, b) => b.ultimoUso.localeCompare(a.ultimoUso));
}

/** Contactos que se infieren de las invitaciones ya creadas (sin WhatsApp). */
export function contactosDeInvitaciones(resumenes: ResumenInvitacionDeCaso[]): ContactoColega[] {
  return resumenes.map((r) => ({
    nombre: r.destinatarioNombre ?? "",
    correo: r.destinatarioCorreo ?? "",
    whatsapp: "",
    ultimoUso: r.creadoEl,
  }));
}

/** Agrega (o actualiza) un contacto en la lista; nunca pasa de MAX_CONTACTOS. */
export function guardarContacto(lista: ContactoColega[], nuevo: ContactoColega): ContactoColega[] {
  return unirContactos(lista, [nuevo]).slice(0, MAX_CONTACTOS);
}

export function leerContactosLocales(): ContactoColega[] {
  try {
    const crudo = window.localStorage.getItem(CLAVE_ALMACEN);
    if (!crudo) return [];
    const datos = JSON.parse(crudo);
    if (!Array.isArray(datos)) return [];
    return datos
      .filter((d) => d && typeof d.nombre === "string" && typeof d.whatsapp === "string" && typeof d.correo === "string")
      .map((d) => ({ nombre: d.nombre, whatsapp: d.whatsapp, correo: d.correo, ultimoUso: String(d.ultimoUso ?? "") }));
  } catch {
    return [];
  }
}

export function escribirContactosLocales(lista: ContactoColega[]): void {
  try {
    window.localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(lista));
  } catch {
    // Almacenamiento bloqueado (modo privado, etc.): el atajo simplemente no se recuerda.
  }
}
