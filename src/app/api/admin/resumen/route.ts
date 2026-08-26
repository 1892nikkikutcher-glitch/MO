import { NextRequest, NextResponse } from "next/server";
import { dbAdmin, authAdmin } from "@/lib/firebaseAdmin";
import { verificarAdmin } from "@/lib/adminAuth";
import {
  planesDisponibles,
  type ClinicInfo,
  type SuscripcionPlan,
  type SugerenciaPlataforma,
} from "@/lib/patientData";
import type {
  EventoCrecimiento,
  Interconsulta,
  PerfilProfesionalPrivado,
  PerfilProfesionalPublico,
} from "@/lib/moConecta";
import type { InvitacionConecta } from "@/lib/invitacionesConecta";

/** Métricas de MO Conecta para el Panel de administrador — mismo criterio
 * que el resto de este archivo: solo lectura vía dbAdmin, nunca desde el
 * cliente. Incluye la lista de perfiles pendientes de verificación con lo
 * mínimo necesario para revisarlos (nombre, correo, cédula) — la evidencia
 * en sí se descarga por separado vía el proxy de streaming, nunca una URL. */
async function resumenMoConecta() {
  const [publicosSnap, privadosSnap, interconsultasSnap, invitacionesSnap, afiliacionesSnap, eventosSnap] =
    await Promise.all([
      dbAdmin.collection("perfilesProfesionalesPublicos").get(),
      dbAdmin.collection("perfilesProfesionalesPrivados").get(),
      dbAdmin.collection("interconsultas").get(),
      dbAdmin.collection("invitacionesConecta").get(),
      dbAdmin.collection("afiliaciones").where("estado", "==", "activa").count().get(),
      dbAdmin.collection("eventosCrecimientoConecta").get(),
    ]);

  const privadosPorUid = new Map(privadosSnap.docs.map((d) => [d.id, d.data() as PerfilProfesionalPrivado]));
  const publicos = publicosSnap.docs.map((d) => d.data() as PerfilProfesionalPublico);

  const perfilesPendientes = publicos
    .filter((p) => p.estadoVerificacion !== "verificado")
    .map((p) => {
      const privado = privadosPorUid.get(p.uid);
      return {
        uid: p.uid,
        nombreCompleto: p.nombreCompleto,
        estadoVerificacion: p.estadoVerificacion,
        correo: privado?.correo ?? null,
        cedulaProfesional: privado?.cedulaProfesional ?? null,
        tieneEvidencia: Boolean(privado?.evidenciaVerificacionStoragePath),
      };
    });

  const interconsultasPorEstado: Record<string, number> = {};
  interconsultasSnap.docs.forEach((d) => {
    const estado = (d.data() as Interconsulta).estado;
    interconsultasPorEstado[estado] = (interconsultasPorEstado[estado] ?? 0) + 1;
  });

  const invitaciones = invitacionesSnap.docs.map((d) => d.data() as InvitacionConecta);

  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);
  const eventosPorTipo: Record<string, number> = {};
  eventosSnap.docs.forEach((d) => {
    const evento = d.data() as EventoCrecimiento;
    if (new Date(evento.fecha) < hace30Dias) return;
    eventosPorTipo[evento.tipo] = (eventosPorTipo[evento.tipo] ?? 0) + 1;
  });

  return {
    perfilesTotal: publicos.length,
    perfilesVerificados: publicos.filter((p) => p.estadoVerificacion === "verificado").length,
    perfilesPendientes,
    interconsultasTotal: interconsultasSnap.size,
    interconsultasPorEstado,
    invitacionesTotal: invitaciones.length,
    invitacionesReclamadas: invitaciones.filter((i) => i.estado === "reclamada").length,
    afiliacionesActivas: afiliacionesSnap.data().count,
    eventosUltimos30Dias: eventosPorTipo,
  };
}

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
      let correoOwner = "";
      try {
        const userRecord = await authAdmin.getUser(c.ownerId);
        ultimaActividad = userRecord.metadata.lastSignInTime ?? null;
        correoOwner = userRecord.email ?? "";
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
        // correoContacto es un campo que el usuario podría llenar a mano en
        // Consultorio, pero casi nunca se usa — el correo de inicio de
        // sesión en Firebase Auth siempre existe, así que es el respaldo.
        correoContacto: c.correoContacto || correoOwner,
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

  const moConecta = await resumenMoConecta();

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
    moConecta,
  });
}
