"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { toISODate } from "@/lib/agendaHelpers";
import { guardarDocumentoPendiente } from "@/lib/documentoPendiente";
import {
  calcularFlujoFormatos,
  conMarcaFormato,
  ETAPAS_FLUJO,
  type EstadoFormato,
  type FilaFlujo,
} from "@/lib/flujoFormatos";
import { formatFechaCita, type Patient } from "@/lib/patientData";

const estadoVisual: Record<EstadoFormato, { texto: string; clase: string }> = {
  hecho: { texto: "Realizado", clase: "border-success/40 bg-success/10 text-success" },
  parcial: { texto: "Incompleto", clase: "border-warning/40 bg-warning/10 text-warning" },
  pendiente: { texto: "Pendiente", clase: "border-edge/15 bg-ink/5 text-ink/60" },
  noAplica: { texto: "No aplica", clase: "border-edge/10 bg-transparent text-ink/40" },
  proximamente: { texto: "Próximamente", clase: "border-accent/40 bg-transparent text-accent" },
};

const botonClase =
  "rounded-lg border border-edge/15 px-2.5 py-1 text-xs font-semibold text-ink/70 transition-colors hover:bg-surface";

export default function FlujoFormatos({
  patient,
  onIrAPestana,
}: {
  patient: Patient;
  /** Cambia a otra pestaña del mismo expediente. */
  onIrAPestana: (pestana: string) => void;
}) {
  const {
    updatePatient,
    irAPagina,
    puedeVerFinanzas,
    historiaClinicaPorPaciente,
    diagnosticosPorPaciente,
    planTratamientoPorPaciente,
    presupuestosPorPaciente,
    notasEvolucionPorPaciente,
    recetasPorPaciente,
    pagosPorPaciente,
    laboratoriosPorPaciente,
    fotosPorPaciente,
    encuestas,
  } = usePatientData();

  const historia = historiaClinicaPorPaciente[patient.id];
  const encuestasDelPaciente = encuestas.filter((e) => e.patientId === patient.id);

  const { filas, resumen } = calcularFlujoFormatos({
    paciente: patient,
    tieneIne: !!fotosPorPaciente[patient.id]?.ineFrente,
    historiaClinicaCapturada:
      !!historia && (Object.keys(historia.porPregunta ?? {}).length > 0 || (historia.alergias ?? "").trim().length > 0),
    diagnosticos: (diagnosticosPorPaciente[patient.id] ?? []).length,
    planTratamiento: (planTratamientoPorPaciente[patient.id] ?? []).length,
    presupuestos: (presupuestosPorPaciente[patient.id] ?? []).length,
    notasEvolucion: (notasEvolucionPorPaciente[patient.id] ?? []).length,
    recetas: (recetasPorPaciente[patient.id] ?? []).length,
    pagos: (pagosPorPaciente[patient.id] ?? []).length,
    laboratorios: (laboratoriosPorPaciente[patient.id] ?? []).length,
    encuestasEnviadas: encuestasDelPaciente.length,
    encuestasRespondidas: encuestasDelPaciente.filter((e) => e.respondidaEn).length,
  });

  const marcar = (clave: string, valor: string | null) => {
    updatePatient(patient.id, { flujoFormatos: conMarcaFormato(patient.flujoFormatos, clave, valor) });
  };

  const abrirDocumento = (tipo: string) => {
    guardarDocumentoPendiente({ patientId: patient.id, tipo });
    irAPagina("documentos");
  };

  const abrirDestino = (fila: FilaFlujo) => {
    const { pestana, pagina } = fila.formato;
    if (pestana) onIrAPestana(pestana);
    else if (pagina) irAPagina(pagina);
  };

  const puedeAbrir = (fila: FilaFlujo) => {
    if (fila.formato.pestana === "Pagos" && !puedeVerFinanzas) return false;
    return !!(fila.formato.pestana || fila.formato.pagina);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Flujo de formatos</h3>
          <p className="text-sm text-ink">
            <span className="font-semibold">{resumen.hechos}</span> de {resumen.aplicables} realizados
          </p>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={resumen.porcentaje}
          aria-label="Avance del flujo de formatos"
        >
          <div className="h-full rounded-full bg-success" style={{ width: `${resumen.porcentaje}%` }} />
        </div>
        <p className="mt-3 text-xs text-ink/50">
          Lo que MO ya guarda (datos, historia clínica, presupuestos, notas, pagos…) se marca solo. Los papeles que se
          firman a mano se marcan aquí cuando los tengas. Lo que no aplica a este paciente se puede marcar como "No aplica"
          y deja de contar.
        </p>
      </div>

      {ETAPAS_FLUJO.map((etapa) => (
        <div key={etapa}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/60">{etapa}</h3>
          <div className="space-y-2">
            {filas
              .filter((fila) => fila.formato.etapa === etapa)
              .map((fila) => {
                const { formato, estado } = fila;
                const visual = estadoVisual[estado];
                const detalle =
                  fila.marcadoEl
                    ? `Marcado el ${formatFechaCita(fila.marcadoEl)}.`
                    : estado === "hecho" && formato.pestana === "Pagos" && !puedeVerFinanzas
                      ? undefined
                      : fila.detalle;
                return (
                  <div
                    key={formato.clave}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-edge/10 bg-surface px-4 py-3 ${
                      estado === "noAplica" || estado === "proximamente" ? "opacity-60" : ""
                    }`}
                  >
                    <span className="w-6 shrink-0 text-xs font-semibold tabular-nums text-ink/40">{formato.numero}</span>
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="text-sm font-medium text-ink">{formato.titulo}</p>
                      {detalle && <p className="mt-0.5 text-xs text-ink/50">{detalle}</p>}
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${visual.clase}`}
                    >
                      {visual.texto}
                    </span>
                    {estado !== "proximamente" && (
                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        {formato.documento && estado !== "noAplica" && (
                          <button type="button" className={botonClase} onClick={() => abrirDocumento(formato.documento!)}>
                            Generar
                          </button>
                        )}
                        {puedeAbrir(fila) && estado !== "noAplica" && (
                          <button type="button" className={botonClase} onClick={() => abrirDestino(fila)}>
                            {estado === "hecho" ? "Ver" : "Llenar"}
                          </button>
                        )}
                        {estado === "hecho" && fila.marcadoEl && (
                          <button type="button" className={botonClase} onClick={() => marcar(formato.clave, null)}>
                            Desmarcar
                          </button>
                        )}
                        {estado !== "hecho" && estado !== "noAplica" && (
                          <button
                            type="button"
                            className={botonClase}
                            onClick={() => marcar(formato.clave, toISODate(new Date()))}
                          >
                            Marcar realizado
                          </button>
                        )}
                        {formato.siAplica && estado !== "noAplica" && estado !== "hecho" && (
                          <button type="button" className={botonClase} onClick={() => marcar(formato.clave, "na")}>
                            No aplica
                          </button>
                        )}
                        {estado === "noAplica" && (
                          <button type="button" className={botonClase} onClick={() => marcar(formato.clave, null)}>
                            Volver a incluir
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
