import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/adminAuth";
import { dbAdmin } from "@/lib/firebaseAdmin";
import { politicaConservacionSchema } from "@/lib/conectaSchemas";
import { nowISO, sinIndefinidos } from "@/lib/conectaServer";
import type { PoliticaConservacion } from "@/lib/moConecta";

/** Configuración de conservación/retención (modelo de datos preparatorio,
 * sin borrado automático todavía — §7 del plan) — solo superadmin. */
export async function GET(req: NextRequest) {
  const sesion = await verificarAdmin(req);
  if (sesion instanceof NextResponse) return sesion;
  const snap = await dbAdmin.collection("configuracionConecta").doc("politicaConservacion").get();
  return NextResponse.json({ politica: snap.exists ? snap.data() : null });
}

export async function PATCH(req: NextRequest) {
  const sesion = await verificarAdmin(req);
  if (sesion instanceof NextResponse) return sesion;

  const parsed = politicaConservacionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const politica: PoliticaConservacion = sinIndefinidos({ ...parsed.data, actualizadoEl: nowISO() });
  await dbAdmin.collection("configuracionConecta").doc("politicaConservacion").set(politica, { merge: true });
  return NextResponse.json({ ok: true });
}
