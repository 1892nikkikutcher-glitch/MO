import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/adminAuth";
import { dbAdmin } from "@/lib/firebaseAdmin";
import { cursoDesdeDoc, cursoParcialSchema, type CursoPlataforma } from "@/lib/cursos";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const sesion = await verificarAdmin(req);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await params;

  const parsed = cursoParcialSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos del curso inválidos.", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const ref = dbAdmin.collection("cursosPlataforma").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "No existe ese curso." }, { status: 404 });

  await ref.update(parsed.data);
  const curso: CursoPlataforma = cursoDesdeDoc(id, { ...snap.data(), ...parsed.data } as Partial<CursoPlataforma>);
  return NextResponse.json({ curso });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const sesion = await verificarAdmin(req);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await params;

  const ref = dbAdmin.collection("cursosPlataforma").doc(id);
  if (!(await ref.get()).exists) return NextResponse.json({ error: "No existe ese curso." }, { status: 404 });
  await ref.delete();
  return NextResponse.json({ ok: true });
}
