/** Detecta errores típicos al escribir un correo (…@gmail.con, …@gmial.com,
 * …@hotmial.com) y propone la corrección. Un correo mal escrito crea una
 * cuenta que nunca podrá verificarse ("No se pudo enviar el correo de
 * verificación") y deja a la persona atorada, así que se avisa ANTES de crear
 * la cuenta. Solo sugiere: nunca bloquea (siempre existe «es correcto»). */

const DOMINIOS_COMUNES = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
  "live.com",
  "yahoo.com.mx",
  "hotmail.es",
  "outlook.es",
  "prodigy.net.mx",
];

/** Dominios reales que se parecen a uno común — nunca se "corrigen". */
const DOMINIOS_LEGITIMOS = new Set([
  ...DOMINIOS_COMUNES,
  "mail.com",
  "gmx.com",
  "aol.com",
  "msn.com",
  "me.com",
  "ymail.com",
  "zoho.com",
  "proton.me",
  "protonmail.com",
  "yahoo.es",
  "live.com.mx",
  "hotmail.com.mx",
  "outlook.com.mx",
  "att.net",
]);

/** Finales de dominio mal escritos que equivalen a ".com". ".con" y similares
 * no existen como dominio de nivel superior, así que son siempre error. */
const FINALES_MAL = [".con", ".cmo", ".ocm", ".coom", ".comm", ".vom", ".xom", ".clm", ".cim", ".copm", ".coml"];

function distancia(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + costo);
    }
  }
  return d[m][n];
}

/** Devuelve el correo corregido, o null si no hay nada que corregir. */
export function sugerirCorreo(correo: string): string | null {
  const limpio = correo.trim().toLowerCase();
  const arroba = limpio.lastIndexOf("@");
  if (arroba < 1 || arroba === limpio.length - 1) return null;
  const local = limpio.slice(0, arroba);
  const dominio = limpio.slice(arroba + 1);
  if (DOMINIOS_LEGITIMOS.has(dominio)) return null;

  const final = FINALES_MAL.find((f) => dominio.endsWith(f));
  if (final) return `${local}@${dominio.slice(0, -final.length)}.com`;

  // gmail.co / hotmail.co etc.: .co sí existe, pero casi nunca es lo que se quiso con estos.
  const base = dominio.endsWith(".co") ? dominio.slice(0, -3) : null;
  if (base && ["gmail", "hotmail", "outlook", "yahoo", "icloud"].includes(base)) return `${local}@${base}.com`;

  const parecido = DOMINIOS_COMUNES.find((c) => distancia(dominio, c) <= 2);
  return parecido ? `${local}@${parecido}` : null;
}
