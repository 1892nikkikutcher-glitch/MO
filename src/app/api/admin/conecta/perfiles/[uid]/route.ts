import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/adminAuth";
import { dbAdmin } from "@/lib/firebaseAdmin";
import { adminPerfilSchema } from "@/lib/conectaSchemas";
import { nowISO, sinIndefinidos } from "@/lib/conectaServer";

type Params = { params: Promise<{ uid: string }> };

/** Verificación de perfil profesional y notas administrativas — exclusivo
 * del superadministrador de la plataforma. `especialidadesVerificadas` NUNCA
 * lo puebla el propio odontólogo (ver §2/§3 del plan); solo esta ruta. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const sesion = await verificarAdmin(req);
  if (sesion instanceof NextResponse) return sesion;
  const { uid } = await params;

  const parsed = adminPerfilSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const publicoRef = dbAdmin.collection("perfilesProfesionalesPublicos").doc(uid);
  const publicoSnap = await publicoRef.get();
  if (!publicoSnap.exists) return NextResponse.json({ error: "No existe ese perfil." }, { status: 404 });

  const ahora = nowISO();
  if (parsed.data.accion === "verificar") {
    await publicoRef.set(
      sinIndefinidos({
        estadoVerificacion: "verificado",
        especialidadesVerificadas: parsed.data.especialidadesVerificadas ?? [],
        actualizadoEl: ahora,
      }),
      { merge: true }
    );
  } else if (parsed.data.accion === "rechazar") {
    await publicoRef.set({ estadoVerificacion: "rechazado", actualizadoEl: ahora }, { merge: true });
  } else if (parsed.data.accion === "notas") {
    await dbAdmin
      .collection("perfilesProfesionalesAdmin")
      .doc(uid)
      .set({ uid, notasAdministrativas: parsed.data.notasAdministrativas ?? "" }, { merge: true });
  }

  return NextResponse.json({ ok: true });
}
