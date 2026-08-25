import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { dbAdmin } from "@/lib/firebaseAdmin";
import { estadoTransicionSchema } from "@/lib/conectaSchemas";
import { transicionarEstadoInterconsulta } from "@/lib/conectaEstado";
import { ConectaError, nowISO } from "@/lib/conectaServer";

type Params = { params: Promise<{ id: string }> };

const EVENTO_POR_ESTADO: Record<string, string | undefined> = {
  accepted: "referral_accepted",
  rejected: "referral_rejected",
  patient_contacted: "patient_contacted",
  scheduled: "appointment_scheduled",
  in_treatment: "treatment_started",
  completed: "referral_completed",
  closed: "referral_closed",
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await params;

  const parsed = estadoTransicionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Transición inválida." }, { status: 400 });

  try {
    const resultado = await transicionarEstadoInterconsulta(sesion.uid, id, parsed.data.siguiente, parsed.data.nota);

    const tipoEvento = EVENTO_POR_ESTADO[resultado.estadoNuevo];
    if (tipoEvento) {
      await dbAdmin.collection("eventosCrecimientoConecta").add({
        tipo: tipoEvento,
        fecha: nowISO(),
        uid: sesion.uid,
        interconsultaId: id,
      });
    }

    return NextResponse.json(resultado);
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
