import { NextRequest, NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebaseAdmin";
import { verificarSesion } from "@/lib/adminAuth";
import { cursoDesdeDoc, type CursoPlataforma } from "@/lib/cursos";

/** Catálogo de cursos que el dueño de la plataforma recomienda — lo puede
 * leer cualquier clínica con sesión. La colección no tiene regla de lectura
 * en el cliente (el comodín de firestore.rules la cierra): todo pasa por aquí. */
export async function GET(req: NextRequest) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;

  const snap = await dbAdmin.collection("cursosPlataforma").get();
  const cursos: CursoPlataforma[] = snap.docs
    .map((d) => cursoDesdeDoc(d.id, d.data() as Partial<CursoPlataforma>))
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  return NextResponse.json({ cursos });
}
