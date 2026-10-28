/** Desde qué tipo de celular o equipo se captura algo en MO. Sirve para que, en una clínica donde varias
 * personas comparten una misma cuenta, se sepa quién hizo cada movimiento ("iPhone" = la doctora, "Xiaomi" =
 * recepción). Es una pista, no una identificación: lo confiable es que cada quien tenga su propio acceso. */

export const ETIQUETAS_DISPOSITIVO = ["iPhone", "iPad", "Xiaomi", "Android", "Computadora"] as const;
export type EtiquetaDispositivo = (typeof ETIQUETAS_DISPOSITIVO)[number];

/** Marcas de Xiaomi (incluye Redmi y POCO) o sus códigos de modelo, p. ej. "M2101K6G" o "23053RN02L".
 * Chrome en Android ya no manda el modelo en el user agent (solo "K"); viene aparte, en `modelo`. */
const PATRON_XIAOMI = /xiaomi|redmi|\bpoco\b|miui|\bmi\s?\d|\bM\d{4}[A-Z]\d[A-Z0-9]*\b|\b\d{5,6}[A-Z]{2,3}\d{0,2}[A-Z]?\b/i;

export function etiquetaDispositivo(userAgent: string, modelo = ""): EtiquetaDispositivo {
  if (/iPhone|iPod/i.test(userAgent)) return "iPhone";
  if (/iPad/i.test(userAgent)) return "iPad";
  if (/Android/i.test(userAgent)) {
    return PATRON_XIAOMI.test(`${modelo} ${userAgent.replace(/Chrome\/[\d.]+/gi, "")}`) ? "Xiaomi" : "Android";
  }
  return "Computadora";
}

let detectado: EtiquetaDispositivo | null = null;

/** Mejor esfuerzo: pide el modelo al navegador (Chrome en Android) y, si no hay, usa el user agent. */
export async function detectarDispositivo(): Promise<EtiquetaDispositivo> {
  if (detectado) return detectado;
  if (typeof navigator === "undefined") return "Computadora";
  let modelo = "";
  try {
    const datos = (navigator as Navigator & { userAgentData?: { getHighEntropyValues?: (h: string[]) => Promise<{ model?: string }> } }).userAgentData;
    modelo = (await datos?.getHighEntropyValues?.(["model"]))?.model ?? "";
  } catch {
    /* sin el modelo se queda con el user agent */
  }
  detectado = etiquetaDispositivo(navigator.userAgent, modelo);
  return detectado;
}

/** Quién usa cada tipo de equipo en esta clínica, p. ej. { iPhone: "Dra. Nicolás", Xiaomi: "Tía Claudia" }. */
export type NombresDeDispositivos = Partial<Record<EtiquetaDispositivo, string>>;
export type DispositivosConfig = { nombres: NombresDeDispositivos };
export const dispositivosConfigInicial: DispositivosConfig = { nombres: {} };
