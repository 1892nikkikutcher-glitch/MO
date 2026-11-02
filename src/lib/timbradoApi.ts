import { auth } from "./firebase";
import type { Factura } from "./facturacion";

/** Llamadas del navegador a /api/facturacion/*: el servidor es quien habla con el PAC y quien guarda la factura. */

async function conSesion(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  return fetch(path, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token ?? ""}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
  });
}

async function leerError(res: Response, porDefecto: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return (data as { error?: string }).error || porDefecto;
}

export type EstadoPac = { disponible: boolean; ambiente: "sandbox" | "produccion" | null };

export async function estadoTimbradoApi(): Promise<EstadoPac> {
  try {
    const res = await conSesion("/api/facturacion/estado");
    if (!res.ok) return { disponible: false, ambiente: null };
    return (await res.json()) as EstadoPac;
  } catch {
    return { disponible: false, ambiente: null };
  }
}

export async function timbrarFacturaApi(datos: { clinicaId: string; facturaId: string; patientId: string; pagoIds: string[]; serie: string; folio: string; notas: string }): Promise<Factura> {
  const res = await conSesion("/api/facturacion/timbrar", { method: "POST", body: JSON.stringify(datos) });
  if (!res.ok) throw new Error(await leerError(res, "No se pudo timbrar la factura."));
  return ((await res.json()) as { factura: Factura }).factura;
}

export async function cancelarFacturaSatApi(datos: { clinicaId: string; facturaId: string; motivo: string; uuidSustitucion: string }): Promise<{ estado: "canceled" | "pending"; mensaje: string }> {
  const res = await conSesion("/api/facturacion/cancelar", { method: "POST", body: JSON.stringify(datos) });
  if (!res.ok) throw new Error(await leerError(res, "No se pudo cancelar la factura."));
  return (await res.json()) as { estado: "canceled" | "pending"; mensaje: string };
}

/** Baja el PDF o el XML de una factura timbrada y dispara la descarga en el navegador. */
export async function descargarFacturaApi(clinicaId: string, facturaId: string, formato: "pdf" | "xml", nombre: string): Promise<void> {
  const q = new URLSearchParams({ clinicaId, facturaId, formato });
  const res = await conSesion(`/api/facturacion/descargar?${q.toString()}`);
  if (!res.ok) throw new Error(await leerError(res, "No se pudo descargar el archivo."));
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre}.${formato}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
