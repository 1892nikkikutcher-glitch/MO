import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { perfilSchema } from "@/lib/conectaSchemas";
import { editarPerfilProfesional } from "@/lib/conectaPerfiles";
import { ConectaError } from "@/lib/conectaServer";

type Params = { params: Promise<{ uid: string }> };

/** Edita el perfil profesional propio — el parámetro `uid` de la ruta debe
 * coincidir con el uid de la sesión; nadie edita el perfil de otra persona
 * por esta vía (eso es exclusivo de /api/admin/conecta/perfiles/[uid]). */
export async function PATCH(req: NextRequest, { params }: Params) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  const { uid } = await params;
  if (uid !== sesion.uid) {
    return NextResponse.json({ error: "No autorizado para editar este perfil." }, { status: 403 });
  }

  const parsed = perfilSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de perfil inválidos.", detalles: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await editarPerfilProfesional(uid, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
