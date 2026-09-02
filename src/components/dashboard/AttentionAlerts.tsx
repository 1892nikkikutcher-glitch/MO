"use client";

import { useEffect, useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { agruparLaboratoriosPendientes, parseFechaEntrega, type RangoPeriodo } from "@/lib/dashboardMetrics";
import {
  diasDesde,
  estadoDocumentacionDeCita,
  prioridadPorAntiguedad,
  textoAntiguedad,
  type EstadoDocumentacion,
} from "@/lib/documentacionPendiente";
import LaboratoriosPendientesPanel from "./LaboratoriosPendientesPanel";

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type PrioridadAlerta = "baja" | "media" | "alta";
type CategoriaAlerta =
  | "documentacion"
  | "inventario"
  | "financiero"
  | "laboratorio"
  | "agenda"
  | "asistencia"
  | "perfil"
  | "configuracion";

const ORDEN_PRIORIDAD: Record<PrioridadAlerta, number> = { alta: 0, media: 1, baja: 2 };

type Alerta = {
  key: string;
  emoji: string;
  texto: string;
  /** Independiente del emoji — el emoji es solo presentación visual, el
   * orden final depende exclusivamente de este campo (ver sort al final). */
  prioridad: PrioridadAlerta;
  categoria: CategoriaAlerta;
  onClick: () => void;
};

/** Sección administrativa "Requieren Atención" — cada fila es una alerta
 * accionable que lleva directo al lugar donde se puede resolver. Solo
 * incluye alertas que se pueden calcular con datos reales; ver el resto de
 * la lista pedida (tratamientos sin próxima cita, control de ortodoncia
 * atrasado) en el mensaje de resumen — no hay dato confiable para esas
 * todavía.
 *
 * Las alertas basadas en citas con fecha (inasistencias, notas de
 * evolución pendientes) SÍ reaccionan a `rango` — se recalculan sobre el
 * periodo elegido arriba en vez de una ventana fija. Las que son un estado
 * ACTUAL sin historial (saldo pendiente, presupuestos por seguimiento,
 * materiales, laboratorios, firma, horario) se quedan fijas a hoy sin
 * importar `rango`: no hay forma de saber "cómo estaban en agosto" sin
 * guardar un historial que hoy no existe — recortarlas por periodo
 * mostraría un dato incompleto o inventado, no uno real. */
export default function AttentionAlerts({ rango }: { rango: RangoPeriodo }) {
  const {
    puedeVerFinanzas,
    citas,
    saldosPendientes,
    presupuestosPendientesDetalle,
    laboratoriosPendientes,
    irAPagina,
    perfilDoctor,
    perfilDoctorCargado,
    horario,
    horarioCargado,
    articulosFaltantes,
    notasEvolucionPorPaciente,
    estadoCargaNotasPorPaciente,
    cargarNotasPaciente,
  } = usePatientData();
  const [mostrarLaboratorios, setMostrarLaboratorios] = useState(false);

  const hoy = new Date();
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  const mananaISO = toIso(manana);

  const gruposLab = agruparLaboratoriosPendientes(Object.values(laboratoriosPendientes.porOrden));
  const enTresDias = new Date(hoy);
  enTresDias.setDate(enTresDias.getDate() + 3);
  const proximosATresDias = gruposLab.proximos.filter((e) => {
    const fecha = parseFechaEntrega(e.fechaEntrega);
    return fecha !== null && fecha <= enTresDias;
  });

  const saldosArr = Object.values(saldosPendientes.porPaciente);
  const saldoTotal = saldosArr.reduce((s, e) => s + (e.totalPresupuestado - e.totalPagado), 0);

  const presupuestosArr = Object.values(presupuestosPendientesDetalle.porPresupuesto);
  const presupuestosTotal = presupuestosArr.reduce((s, e) => s + e.total, 0);

  const citasMananaSinConfirmar = citas.filter((c) => c.fecha === mananaISO && c.estatus === "Agendada").length;

  const noAsistieronRecientes = citas.filter(
    (c) => c.estatus === "No Asistió" && c.fecha >= rango.desdeISO && c.fecha <= rango.hastaISO
  ).length;

  const materialesFaltantes = articulosFaltantes.filter((a) => !a.surtido);

  const citasAtendidasRecientes = useMemo(
    () =>
      citas.filter(
        (c) => c.estatus === "Atendida" && c.patientId && c.fecha >= rango.desdeISO && c.fecha <= rango.hastaISO
      ),
    [citas, rango.desdeISO, rango.hastaISO]
  );

  const patientIdsNecesarios = useMemo(
    () => Array.from(new Set(citasAtendidasRecientes.map((c) => c.patientId as string))),
    [citasAtendidasRecientes]
  );
  const claveIdsNecesarios = patientIdsNecesarios.join(",");

  useEffect(() => {
    patientIdsNecesarios.forEach((pid) => cargarNotasPaciente(pid));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveIdsNecesarios]);

  const clasificadas = citasAtendidasRecientes
    .map((c) => ({
      cita: c,
      estado: estadoDocumentacionDeCita(
        c.id,
        notasEvolucionPorPaciente[c.patientId as string],
        estadoCargaNotasPorPaciente[c.patientId as string]
      ),
      dias: diasDesde(c.fecha, hoy),
    }))
    .filter((x): x is { cita: (typeof citasAtendidasRecientes)[number]; estado: EstadoDocumentacion; dias: number } =>
      x.estado !== null
    );

  const sinNota = clasificadas.filter((x) => x.estado === "sin_nota");
  const borrador = clasificadas.filter((x) => x.estado === "borrador");
  const listaRevision = clasificadas.filter((x) => x.estado === "lista_revision");

  const alertas: Alerta[] = [];

  if (puedeVerFinanzas && saldosArr.length > 0) {
    alertas.push({
      key: "saldo",
      emoji: "🔴",
      texto: `${saldosArr.length} paciente(s) tienen saldo pendiente — ${formatCurrency(saldoTotal)}`,
      prioridad: "alta",
      categoria: "financiero",
      onClick: () => irAPagina("reportes-saldos-pendientes"),
    });
  }

  if (puedeVerFinanzas && presupuestosArr.length > 0) {
    alertas.push({
      key: "presupuestos",
      emoji: "🟠",
      texto: `${presupuestosArr.length} presupuesto(s) esperan seguimiento — ${formatCurrency(presupuestosTotal)}`,
      prioridad: "media",
      categoria: "financiero",
      onClick: () => irAPagina("reportes-presupuestos"),
    });
  }

  if (citasMananaSinConfirmar > 0) {
    alertas.push({
      key: "manana",
      emoji: "🟡",
      texto: `${citasMananaSinConfirmar} paciente(s) de mañana no han confirmado`,
      prioridad: "baja",
      categoria: "agenda",
      onClick: () => irAPagina("agenda"),
    });
  }

  if (gruposLab.vencidos.length > 0) {
    alertas.push({
      key: "lab-vencidos",
      emoji: "🔴",
      texto: `${gruposLab.vencidos.length} trabajo(s) de laboratorio están vencidos`,
      prioridad: "alta",
      categoria: "laboratorio",
      onClick: () => setMostrarLaboratorios(true),
    });
  }

  if (proximosATresDias.length + gruposLab.vencenHoy.length > 0) {
    alertas.push({
      key: "lab-proximos",
      emoji: "🟠",
      texto: `${proximosATresDias.length + gruposLab.vencenHoy.length} trabajo(s) de laboratorio vencen hoy o en los próximos 3 días`,
      prioridad: "media",
      categoria: "laboratorio",
      onClick: () => setMostrarLaboratorios(true),
    });
  }

  if (noAsistieronRecientes > 0) {
    alertas.push({
      key: "no-show",
      emoji: "🟡",
      texto: `${noAsistieronRecientes} paciente(s) no asistieron (${rango.label})`,
      prioridad: "baja",
      categoria: "asistencia",
      onClick: () => irAPagina("reportes-bitacora-citas"),
    });
  }

  if (materialesFaltantes.length > 0) {
    alertas.push({
      key: "materiales",
      emoji: "🟠",
      texto: `${materialesFaltantes.length} material(es) pendientes de comprar`,
      prioridad: "alta",
      categoria: "inventario",
      onClick: () => irAPagina("deposito-dental"),
    });
  }

  if (sinNota.length > 0) {
    const masAntiguaDias = Math.max(...sinNota.map((x) => x.dias));
    alertas.push({
      key: "notas-sin-nota",
      emoji: "🟠",
      texto: `${sinNota.length} atención(es) sin nota de evolución (${rango.label}) — la más antigua ${textoAntiguedad(masAntiguaDias)}`,
      prioridad: prioridadPorAntiguedad(masAntiguaDias),
      categoria: "documentacion",
      onClick: () => irAPagina("agenda"),
    });
  }

  if (borrador.length > 0) {
    alertas.push({
      key: "notas-borrador",
      emoji: "🟡",
      texto: `${borrador.length} nota(s) de evolución pendientes de terminar — borrador (${rango.label})`,
      prioridad: "media",
      categoria: "documentacion",
      onClick: () => irAPagina("agenda"),
    });
  }

  if (listaRevision.length > 0) {
    alertas.push({
      key: "notas-revision",
      emoji: "🟡",
      texto: `${listaRevision.length} nota(s) pendientes de revisión/firma (${rango.label})`,
      prioridad: "media",
      categoria: "documentacion",
      onClick: () => irAPagina("agenda"),
    });
  }

  if (perfilDoctorCargado && !perfilDoctor.firmaDigitalUrl) {
    alertas.push({
      key: "firma",
      emoji: "🟡",
      texto: "Aún no subes tu firma digital para las recetas",
      prioridad: "baja",
      categoria: "perfil",
      onClick: () => irAPagina("administracion-perfil"),
    });
  }

  if (horarioCargado && !horario.confirmado) {
    alertas.push({
      key: "horario",
      emoji: "🟡",
      texto: "Confirma el horario de atención del consultorio",
      prioridad: "baja",
      categoria: "configuracion",
      onClick: () => irAPagina("administracion-consultorio"),
    });
  }

  const alertasOrdenadas = [...alertas].sort((a, b) => ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad]);

  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-6">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink/60">Requieren Atención</h2>
      <p className="mb-4 text-xs text-ink/40">
        Tratamientos sin próxima cita y control de ortodoncia atrasado no están aquí — el modelo de
        datos actual no tiene forma de calcularlos de manera confiable todavía. Saldo pendiente,
        presupuestos por seguimiento, materiales, laboratorios, firma y horario reflejan el estado
        de hoy sin importar el periodo elegido arriba (no hay historial guardado de cómo estaban
        en el pasado); inasistencias y notas de evolución sí cambian con ese periodo.
      </p>

      {alertasOrdenadas.length === 0 ? (
        <p className="text-sm text-ink/40">Todo al día por ahora. 🎉</p>
      ) : (
        <div className="space-y-2">
          {alertasOrdenadas.map((a) => (
            <button
              key={a.key}
              onClick={a.onClick}
              className="flex w-full items-center gap-3 rounded-lg border border-edge/10 bg-inset px-4 py-3 text-left text-sm text-ink transition-colors hover:border-accent/40 hover:bg-surface2"
            >
              <span className="text-lg leading-none">{a.emoji}</span>
              <span>{a.texto}</span>
            </button>
          ))}
        </div>
      )}

      {mostrarLaboratorios && <LaboratoriosPendientesPanel onClose={() => setMostrarLaboratorios(false)} />}
    </div>
  );
}
