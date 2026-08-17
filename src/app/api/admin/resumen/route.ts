import { NextRequest, NextResponse } from "next/server";
import { dbAdmin, authAdmin } from "@/lib/firebaseAdmin";
import { verificarAdmin } from "@/lib/adminAuth";
import {
  planesDisponibles,
  type ClinicInfo,
  type SuscripcionPlan,
  type SugerenciaPlataforma,
} from "@/lib/patientData";

/** Resumen cross-clínica para el Panel de administrador — solo Nicolás
 * (ADMIN_UID) puede llamar esto. Combina `clinics/*` (registro de cada
 * clínica) con su `users/{id}/config/suscripcion` (plan real) y el conteo
 * de `clinicMembers`, todo vía Firebase Admin SDK (bypassa las reglas de
 * Firestore, que mantienen esto cerrado desde el cliente). */
export async function GET(req: NextRequest) {
  const sesion = await verificarAdmin(req);
  if (sesion instanceof NextResponse) return sesion;

  const clinicsSnap = await dbAdmin.collection("clinics").get();
  const clinicasRaw = clinicsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as ClinicInfo) }));

  const clinicas = await Promise.all(
    clinicasRaw.map(async (c) => {
      const [suscripcionSnap, membersSnap] = await Promise.all([
        dbAdmin.collection("users").doc(c.id).collection("config").doc("suscripcion").get(),
        dbAdmin.collection("clinicMembers").where("clinicId", "==", c.id).get(),
      ]);
      const suscripcion = (suscripcionSnap.exists ? suscripcionSnap.data() : {}) as Partial<SuscripcionPlan>;

      let ultimaActividad: string | null = null;
      try {
        const userRecord = await authAdmin.getUser(c.ownerId);
        ultimaActividad = userRecord.metadata.lastSignInTime ?? null;
      } catch {
        ultimaActividad = null;
      }

      const planActivo = suscripcion.planActivo ?? "prueba";
      const estadoSuscripcion = suscripcion.estadoSuscripcion ?? "prueba";
      const plan = planesDisponibles.find((p) => p.id === planActivo);
      const mrr = estadoSuscripcion === "activa" ? plan?.precioMensualAprox ?? 0 : 0;

      return {
        id: c.id,
        nombre: c.nombre || "(sin nombre)",
        correoContacto: c.correoContacto || "",
        creadoEl: c.creadoEl ?? null,
        estadoCuenta: c.estadoCuenta ?? "activa",
        usuarios: membersSnap.size,
        planActivo,
        estadoSuscripcion,
        origenSuscripcion: suscripcion.origenSuscripcion ?? "manual",
        mrr,
        ultimaActividad,
      };
    })
  );

  const consultoriosRegistrados = clinicas.length;
  const usuariosTotales = clinicas.reduce((suma, c) => suma + c.usuarios, 0);
  const pagando = clinicas.filter((c) => c.estadoSuscripcion === "activa");
  const mrr = pagando.reduce((suma, c) => suma + c.mrr, 0);
  const arpu = pagando.length > 0 ? mrr / pagando.length : 0;

  const porPlan: Record<string, number> = {};
  for (const plan of planesDisponibles) porPlan[plan.id] = 0;
  clinicas.forEach((c) => {
    porPlan[c.planActivo] = (porPlan[c.planActivo] ?? 0) + 1;
  });

  const mesActualISO = new Date().toISOString().slice(0, 7); // YYYY-MM
  const nuevasDelMes = clinicas.filter((c) => c.creadoEl?.startsWith(mesActualISO)).length;
  const pruebasActivas = clinicas.filter((c) => c.estadoSuscripcion === "prueba").length;
  const cancelaciones = clinicas.filter((c) => c.estadoSuscripcion === "cancelada").length;

  const sugerenciasSnap = await dbAdmin.collection("sugerenciasPlataforma").orderBy("fecha", "desc").get();
  const sugerencias = sugerenciasSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as SugerenciaPlataforma[];

  return NextResponse.json({
    consultoriosRegistrados,
    usuariosTotales,
    suscripcionesPagando: pagando.length,
    mrr,
    arpu,
    porPlan,
    conversion: consultoriosRegistrados > 0 ? (pagando.length / consultoriosRegistrados) * 100 : 0,
    nuevasDelMes,
    pruebasActivas,
    cancelaciones,
    // Requiere una foto histórica mensual (ej. un job programado que guarde
    // "suscripciones activas" cada fin de mes) que todavía no existe — se
    // deja el campo preparado en vez de inventar un número.
    churnMensual: null as number | null,
    clinicas,
    sugerencias,
  });
}
