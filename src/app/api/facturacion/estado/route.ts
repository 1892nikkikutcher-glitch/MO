import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { configuracionPac } from "@/lib/facturamaServer";

/** Dice si el servidor ya tiene las credenciales del PAC, para que la pantalla muestre o no el botón de timbrar.
 * No revela ningún dato de las credenciales, solo si existen y en qué ambiente están. */
export async function GET(req: NextRequest) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  const cfg = configuracionPac();
  return NextResponse.json({ disponible: cfg !== null, ambiente: cfg?.ambiente ?? null });
}
