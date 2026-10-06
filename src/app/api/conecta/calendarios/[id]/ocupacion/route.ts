import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { ocupacionDeCalendario } from "@/lib/conectaCalendarios";
import { ConectaError } from "@/lib/conectaServer";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await params;
  const desde = req.nextUrl.searchParams.get("desde") ?? "";
  const hasta = req.nextUrl.searchParams.get("hasta") ?? "";
  try {
    return NextResponse.json(await ocupacionDeCalendario(sesion.uid, id, desde, hasta));
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
