import { NextRequest, NextResponse } from "next/server";
import { dbAdmin, authAdmin } from "@/lib/firebaseAdmin";
import { verificarAdmin } from "@/lib/adminAuth";
import type { ClinicInfo, ClinicMember, SuscripcionPlan, SugerenciaPlataforma, PlanId } from "@/lib/patientData";

type Params = { params: Promise<{ clinicId: string }> };

/** Vista de detalle de una clínica — información administrativa y conteos
 * de USO (números), nunca nombres, teléfonos ni diagnósticos de pacientes. */
export async function GET(req: NextRequest, { params }: Params) {
  const sesion = await verificarAdmin(req);
  if (sesion instanceof NextResponse) return sesion;
  const { clinicId } = await params;

  const clinicSnap = await dbAdmin.collection("clinics").doc(clinicId).get();
  if (!clinicSnap.exists) {
    return NextResponse.json({ error: "No existe esa clínica." }, { status: 404 });
  }
  const clinic = clinicSnap.data() as ClinicInfo;

  const [suscripcionSnap, membersSnap, sugerenciasSnap, pacientesSnap, citasSnap, recursosSnap] =
    await Promise.all([
      dbAdmin.collection("users").doc(clinicId).collection("config").doc("suscripcion").get(),
      dbAdmin.collection("clinicMembers").where("clinicId", "==", clinicId).get(),
      // Sin orderBy aquí a propósito — combinado con el where("clinicId") pediría
      // un índice compuesto en Firestore; el volumen por clínica es chico, así
      // que se ordena en memoria más abajo.
      dbAdmin.collection("sugerenciasPlataforma").where("clinicId", "==", clinicId).get(),
      dbAdmin.collection("users").doc(clinicId).collection("pacientes").count().get(),
      dbAdmin.collection("users").doc(clinicId).collection("citas").count().get(),
      dbAdmin.collection("users").doc(clinicId).collection("recursos").count().get(),
    ]);

  const mesActualISO = new Date().toISOString().slice(0, 7);
  const citasEsteMesSnap = await dbAdmin
    .collection("users")
    .doc(clinicId)
    .collection("citas")
    .where("fecha", ">=", `${mesActualISO}-01`)
    .where("fecha", "<=", `${mesActualISO}-31`)
    .count()
    .get();

  let ultimoAcceso: string | null = null;
  try {
    const userRecord = await authAdmin.getUser(clinic.ownerId);
    ultimoAcceso = userRecord.metadata.lastSignInTime ?? null;
  } catch {
    ultimoAcceso = null;
  }

  const suscripcion = (suscripcionSnap.exists ? suscripcionSnap.data() : {}) as Partial<SuscripcionPlan>;

  return NextResponse.json({
    id: clinicId,
    ...clinic,
    suscripcion: {
      planActivo: suscripcion.planActivo ?? "prueba",
      estadoSuscripcion: suscripcion.estadoSuscripcion ?? "prueba",
      origenSuscripcion: suscripcion.origenSuscripcion ?? "manual",
      stripeStatus: suscripcion.stripeStatus ?? null,
    },
    ultimoAcceso,
    miembros: membersSnap.docs.map((d) => d.data() as ClinicMember),
    sugerencias: (sugerenciasSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as SugerenciaPlataforma[]).sort(
      (a, b) => b.fecha.localeCompare(a.fecha)
    ),
    uso: {
      pacientes: pacientesSnap.data().count,
      citasTotales: citasSnap.data().count,
      citasEsteMes: citasEsteMesSnap.data().count,
      recursos: recursosSnap.data().count,
    },
  });
}

/** Acciones administrativas sobre una clínica. `suspender`/`reactivar` son
 * el mecanismo PRINCIPAL para revocar/restaurar acceso (ver DELETE abajo
 * para por qué no se usa borrar el registro con ese fin). */
export async function PATCH(req: NextRequest, { params }: Params) {
  const sesion = await verificarAdmin(req);
  if (sesion instanceof NextResponse) return sesion;
  const { clinicId } = await params;

  const body = await req.json();
  const accion = body.accion;

  if (accion === "suspender" || accion === "reactivar") {
    await dbAdmin
      .collection("clinics")
      .doc(clinicId)
      .set({ estadoCuenta: accion === "suspender" ? "suspendida" : "activa" } satisfies Partial<ClinicInfo>, {
        merge: true,
      });
    return NextResponse.json({ ok: true });
  }

  if (accion === "editar-plan") {
    const planesValidos: PlanId[] = ["prueba", "consultorio", "clinicas"];
    const estadosValidos = ["prueba", "activa", "atrasada", "cancelada"];
    const planActivo = body.planActivo;
    const estadoSuscripcion = body.estadoSuscripcion;
    if (!planesValidos.includes(planActivo) || !estadosValidos.includes(estadoSuscripcion)) {
      return NextResponse.json({ error: "Plan o estado inválido." }, { status: 400 });
    }
    // Se marca "manual" siempre aquí — si la clínica tiene una suscripción
    // real de Stripe, el próximo evento del webhook vuelve a tomar el
    // control y sobreescribe esto (ver src/app/api/stripe/webhook/route.ts).
    await dbAdmin
      .collection("users")
      .doc(clinicId)
      .collection("config")
      .doc("suscripcion")
      .set(
        { planActivo, estadoSuscripcion, origenSuscripcion: "manual" } satisfies Partial<SuscripcionPlan>,
        { merge: true }
      );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
}

/** Acción SECUNDARIA — borra únicamente el registro de la clínica en la
 * plataforma (`clinics/{clinicId}` + sus `clinicMembers`), para dar de baja
 * definitivamente a alguien que ya no es cliente. NO borra
 * `users/{clinicId}/**` (pacientes, citas, presupuestos, historia clínica
 * siguen intactos) — para revocar acceso sin perder esos datos, usar
 * Suspender (PATCH con accion "suspender"), que es el mecanismo principal. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const sesion = await verificarAdmin(req);
  if (sesion instanceof NextResponse) return sesion;
  const { clinicId } = await params;

  const membersSnap = await dbAdmin.collection("clinicMembers").where("clinicId", "==", clinicId).get();
  const batch = dbAdmin.batch();
  membersSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(dbAdmin.collection("clinics").doc(clinicId));
  await batch.commit();

  return NextResponse.json({ ok: true });
}
