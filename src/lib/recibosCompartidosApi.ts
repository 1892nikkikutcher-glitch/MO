import { auth } from "./firebase";
import type { ReciboCompartidoEntrada } from "./recibosCompartidos";

/** Pide al servidor la liga pública para descargar un recibo (solo el administrador de la clínica puede). */
export async function crearEnlaceReciboApi(recibo: ReciboCompartidoEntrada): Promise<{ enlace: string; venceEl: string }> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch("/api/recibos", {
    method: "POST",
    headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
    body: JSON.stringify(recibo),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "No se pudo crear el enlace del recibo.");
  return data as { enlace: string; venceEl: string };
}
