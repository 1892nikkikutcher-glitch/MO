import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/adminAuth";
import { dbAdmin } from "@/lib/firebaseAdmin";
import { cursoSchema, type CursoPlataforma } from "@/lib/cursos";

/** Alta de un curso del catálogo de la plataforma — solo el dueño (ADMIN_UID). */
export async function POST(req: NextRequest) {
  const sesion = await verificarAdmin(req);
  if (sesion instanceof NextResponse) return sesion;

  const parsed = cursoSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos del curso inválidos.", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const ref = dbAdmin.collection("cursosPlataforma").doc();
  const curso: CursoPlataforma = { id: ref.id, ...parsed.data, creadoEn: new Date().toISOString() };
  await ref.set(curso);
  return NextResponse.json({ curso });
}
