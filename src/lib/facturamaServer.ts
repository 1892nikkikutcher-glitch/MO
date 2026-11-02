import { leerRespuestaCancelacion, leerRespuestaTimbrado, mensajeErrorPac, type CfdiTimbrado, type EstadoCancelacionPac } from "./timbrado";

/** Llamadas a Facturama (PAC). SOLO servidor: usa credenciales que viven en variables de entorno de Vercel
 * (FACTURAMA_USUARIO, FACTURAMA_CONTRASENA) y nunca llegan al navegador.
 *
 * FACTURAMA_AMBIENTE: "sandbox" (pruebas, por defecto) o "produccion". FACTURAMA_URL permite apuntar a otra
 * dirección (por ejemplo un servidor de pruebas local). */

export function configuracionPac(): { usuario: string; contrasena: string; baseUrl: string; ambiente: "sandbox" | "produccion" } | null {
  const usuario = process.env.FACTURAMA_USUARIO;
  const contrasena = process.env.FACTURAMA_CONTRASENA;
  if (!usuario || !contrasena) return null;
  const ambiente = process.env.FACTURAMA_AMBIENTE === "produccion" ? "produccion" : "sandbox";
  const baseUrl = (process.env.FACTURAMA_URL || (ambiente === "produccion" ? "https://api.facturama.mx" : "https://apisandbox.facturama.mx")).replace(/\/$/, "");
  return { usuario, contrasena, baseUrl, ambiente };
}

export class ErrorPac extends Error {
  constructor(mensaje: string, readonly estado: number) {
    super(mensaje);
  }
}

async function llamar(ruta: string, init: RequestInit = {}): Promise<unknown> {
  const cfg = configuracionPac();
  if (!cfg) throw new ErrorPac("El timbrado todavía no está configurado en el servidor (faltan las credenciales del PAC).", 503);
  const res = await fetch(`${cfg.baseUrl}${ruta}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Basic ${Buffer.from(`${cfg.usuario}:${cfg.contrasena}`).toString("base64")}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
  });
  const texto = await res.text();
  let cuerpo: unknown = null;
  try {
    cuerpo = texto ? JSON.parse(texto) : null;
  } catch {
    cuerpo = null;
  }
  if (!res.ok) throw new ErrorPac(mensajeErrorPac(cuerpo, res.status), res.status);
  return cuerpo;
}

export async function timbrarCfdi(payload: Record<string, unknown>): Promise<CfdiTimbrado> {
  const r = leerRespuestaTimbrado(await llamar("/3/cfdis", { method: "POST", body: JSON.stringify(payload) }));
  if ("error" in r) throw new ErrorPac(r.error, 502);
  return r;
}

export async function cancelarCfdi(cfdiId: string, motivo: string, uuidSustitucion?: string): Promise<{ estado: EstadoCancelacionPac; mensaje: string }> {
  const q = new URLSearchParams({ type: "issued", motive: motivo });
  if (motivo === "01" && uuidSustitucion) q.set("uuidReplacement", uuidSustitucion);
  return leerRespuestaCancelacion(await llamar(`/cfdi/${encodeURIComponent(cfdiId)}?${q.toString()}`, { method: "DELETE" }));
}

/** Descarga el PDF o el XML de una factura emitida; el PAC lo entrega en Base64. */
export async function descargarCfdi(cfdiId: string, formato: "pdf" | "xml"): Promise<Buffer> {
  const r = (await llamar(`/cfdi/${formato}/issued/${encodeURIComponent(cfdiId)}`)) as { Content?: string } | null;
  if (!r?.Content) throw new ErrorPac("El PAC no devolvió el archivo.", 502);
  return Buffer.from(r.Content, "base64");
}
