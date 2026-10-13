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

/** Id del documento en Firestore (users/{uid}/contactosColegas/{id}): sale de la
 * identidad del contacto (correo, WhatsApp o nombre) con solo caracteres
 * seguros, así guardar al mismo colega dos veces actualiza el mismo documento. */
export function idContacto(c: { nombre?: string; correo?: string; whatsapp?: string }): string {
  return claveContacto(c).replace(/[^a-z0-9@._-]+/g, "_").slice(0, 150);
}

/** Dos capturas son el mismo colega si comparten correo o WhatsApp, o si tienen
 * el mismo nombre y a una de las dos le faltan esos datos. */
export function mismoColega(a: ContactoColega, b: ContactoColega): boolean {
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

/** Preferencias de tu agenda de colegas, guardadas en tu cuenta:
 *  - `ocultos`: colegas que quitaste (por su identidad), para que no reaparezcan
 *    desde invitaciones viejas;
 *  - `alias`: "esta persona es la misma que aquella" — junta en los paneles a quien
 *    se invitó varias veces con nombres distintos. */
export type PreferenciasContactos = {
  ocultos: string[];
  alias: Record<string, { clave: string; nombre: string }>;
};

export const SIN_PREFERENCIAS: PreferenciasContactos = { ocultos: [], alias: {} };

/** Todas las identidades por las que se puede reconocer a un contacto: su correo,
 * su WhatsApp y su nombre normalizado. */
export function clavesDeContacto(c: { nombre?: string; correo?: string; whatsapp?: string }): string[] {
  const claves: string[] = [];
  const correo = (c.correo ?? "").trim().toLowerCase();
  if (correo) claves.push(`c:${correo}`);
  const tel = telefonoLocal(c.whatsapp ?? "");
  if (tel) claves.push(`w:${tel}`);
  const nombre = normalizarNombre(c.nombre ?? "");
  if (nombre) claves.push(`n:${nombre}`);
  return claves;
}

/** Quita de la lista a los colegas que el usuario ocultó. */
export function aplicarOcultos(lista: ContactoColega[], ocultos: string[]): ContactoColega[] {
  if (ocultos.length === 0) return lista;
  const set = new Set(ocultos);
  return lista.filter((c) => !clavesDeContacto(c).some((k) => set.has(k)));
}

/** Oculta a un colega (todas sus identidades, salvo las que se indiquen conservar). */
export function ocultarContacto(prefs: PreferenciasContactos, c: ContactoColega, conservar: string[] = []): PreferenciasContactos {
  const nuevas = clavesDeContacto(c).filter((k) => !conservar.includes(k));
  return { ...prefs, ocultos: [...new Set([...prefs.ocultos, ...nuevas])] };
}

/** Si un colega vuelve a invitarse o a guardarse, deja de estar oculto. */
export function mostrarContacto(prefs: PreferenciasContactos, c: ContactoColega): PreferenciasContactos {
  const claves = new Set(clavesDeContacto(c));
  return { ...prefs, ocultos: prefs.ocultos.filter((k) => !claves.has(k)) };
}

/** "Es la misma persona": todo lo de `origen` pasa a `destino`. Devuelve las
 * preferencias nuevas y el contacto destino ya completado con los datos del origen. */
export function unirComoMismaPersona(
  prefs: PreferenciasContactos,
  origen: ContactoColega,
  destino: ContactoColega
): { prefs: PreferenciasContactos; destino: ContactoColega } {
  // Los paneles agrupan por correo (si se invitó con él) o por nombre: a eso apunta el alias.
  const correoDestino = destino.correo.trim().toLowerCase();
  const claveDestino = correoDestino ? `c:${correoDestino}` : `n:${normalizarNombre(destino.nombre)}`;
  const alias = { ...prefs.alias };
  for (const k of clavesDeContacto(origen)) {
    if (!clavesDeContacto(destino).includes(k)) alias[k] = { clave: claveDestino, nombre: destino.nombre };
  }
  const fusionado: ContactoColega = {
    nombre: destino.nombre || origen.nombre,
    whatsapp: destino.whatsapp || origen.whatsapp,
    correo: destino.correo || origen.correo,
    ultimoUso: masReciente(destino.ultimoUso, origen.ultimoUso),
  };
  const sinOrigen = ocultarContacto({ ...prefs, alias }, origen, clavesDeContacto(fusionado));
  return { prefs: mostrarContacto(sinOrigen, fusionado), destino: fusionado };
}

/** Para los paneles: la identidad "oficial" de un colega según los alias. */
export function resolverAlias(
  clave: string,
  nombre: string,
  alias: PreferenciasContactos["alias"]
): { clave: string; nombre: string } {
  const porClave = alias[clave];
  if (porClave) return porClave;
  const porNombre = alias[`n:${normalizarNombre(nombre)}`];
  return porNombre ?? { clave, nombre };
}
