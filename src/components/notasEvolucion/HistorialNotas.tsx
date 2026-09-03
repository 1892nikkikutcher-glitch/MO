"use client";

/** Historial de Notas de Evolución — muestra v1 (PSOAP, formato original,
 * nunca reinterpretado) y v2 ("Registrar atención de hoy") en una sola
 * lista, con los borradores v2 separados visiblemente de las notas
 * firmadas: un borrador nunca se presenta como si ya formara parte del
 * expediente clínico definitivo. */

import { usePatientData } from "@/context/PatientDataContext";
import {
  esNotaAdministrativa,
  esNotaV2,
  motivoNotaAdministrativaLabel,
  type NotaEvolucionAdministrativa,
  type NotaEvolucionAny,
  type NotaEvolucionV2,
} from "@/lib/notasEvolucion";
import { generarNarrativa } from "@/lib/notaNarrativa";
import type { DiagnosticoPaciente } from "@/lib/notasEvolucion";
import type { NotaEvolucion } from "@/lib/patientData";

const psoapCampos = [
  { key: "presentacion" as const, letra: "P", label: "Presentación" },
  { key: "subjetivo" as const, letra: "S", label: "Subjetivo" },
  { key: "objetivo" as const, letra: "O", label: "Objetivo" },
  { key: "analisis" as const, letra: "A", label: "Análisis" },
  { key: "pronostico" as const, letra: "P", label: "Pronóstico" },
];

const estadoBadge: Record<NotaEvolucionV2["estado"], { texto: string; clase: string }> = {
  borrador: { texto: "Borrador — pendiente de revisión y firma", clase: "bg-warning/15 text-warning" },
  lista_revision: { texto: "Lista para revisión", clase: "bg-accent/15 text-accent" },
  firmada: { texto: "Firmada", clase: "bg-success/15 text-success" },
  con_aclaracion: { texto: "Con aclaración", clase: "bg-accent/15 text-accent" },
};

function TarjetaBorrador({ nota, onContinuar }: { nota: NotaEvolucionV2; onContinuar: () => void }) {
  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-warning">
          {estadoBadge[nota.estado].texto}
        </span>
        <span className="text-xs text-ink/40">Última edición {new Date(nota.actualizadoEn).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <p className="mt-1 text-sm font-medium text-ink">
        {nota.detalleProcedimiento?.actividadRealizada || "Sin actividad registrada todavía"}
      </p>
      <button onClick={onContinuar} className="mt-2 text-xs font-semibold text-accent hover:underline">
        Continuar →
      </button>
    </div>
  );
}

function TarjetaFirmadaV2({ nota, diagnosticosCatalogo }: { nota: NotaEvolucionV2; diagnosticosCatalogo: DiagnosticoPaciente[] }) {
  // Notas firmadas ANTES de que la generación de narrativa se activara al
  // firmar se quedaron con `narrativa.texto` vacío — en vez de mostrar una
  // tarjeta ilegible (solo fecha/médico/estatus), se calcula la narrativa
  // al vuelo para mostrarla (nunca se persiste ni se reescribe la nota
  // firmada — sería tocar un documento inmutable). Notas nuevas ya traen
  // la narrativa guardada de fábrica.
  const narrativaTexto = nota.narrativa.texto || generarNarrativa(nota, { diagnosticosCatalogo });
  const organosDentales = nota.detalleProcedimiento?.organosDentales ?? nota.encabezado.organosDentales;
  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink/40">
        <span>
          <span className="font-medium text-ink/70">{new Date(nota.creadoEn).toLocaleDateString("es-MX")}</span> · {nota.encabezado.medico || "Sin médico registrado"}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${estadoBadge[nota.estado].clase}`}>
          {nota.estado === "con_aclaracion" ? "Con aclaración" : "Firmada"}
        </span>
      </div>
      {nota.detalleProcedimiento?.actividadRealizada && (
        <p className="mt-2 text-sm font-medium text-ink">
          {nota.detalleProcedimiento.actividadRealizada}
          {organosDentales.length > 0 && ` · OD ${organosDentales.join(", ")}`}
        </p>
      )}
      {narrativaTexto ? (
        <p className="mt-1 whitespace-pre-line text-sm text-ink/70">{narrativaTexto}</p>
      ) : (
        <p className="mt-1 text-sm italic text-ink/40">Esta nota no tiene contenido adicional capturado.</p>
      )}
      {nota.aclaraciones.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-edge/10 pt-2">
          {nota.aclaraciones.map((a) => (
            <div key={a.id} className="text-xs text-ink/60">
              <span className="font-medium text-ink/80">Aclaración ({a.motivo}):</span> {a.contenido}
              <span className="block text-ink/40">{a.autorNombre} · {new Date(a.fecha).toLocaleString("es-MX")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TarjetaAdministrativa({ nota }: { nota: NotaEvolucionAdministrativa }) {
  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink/40">
        <span className="font-medium text-ink/70">{new Date(nota.creadoEn).toLocaleDateString("es-MX")}</span>
        <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-ink/50">
          Nota administrativa
        </span>
      </div>
      <p className="mt-2 text-sm font-medium text-ink">{motivoNotaAdministrativaLabel[nota.motivo]}</p>
      {nota.notaLibre && <p className="mt-1 text-sm text-ink/70">{nota.notaLibre}</p>}
      {nota.psoap && (
        <div className="mt-3 space-y-2 border-t border-edge/10 pt-2">
          {psoapCampos
            .filter((campo) => nota.psoap![campo.key]?.trim())
            .map((campo) => (
              <div key={campo.key} className="flex gap-2 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-bold text-accent">
                  {campo.letra}
                </span>
                <p className="text-ink/80">
                  <span className="font-medium text-ink/50">{campo.label}: </span>
                  {nota.psoap![campo.key]}
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function TarjetaV1({ nota }: { nota: NotaEvolucion }) {
  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-4">
      <div className="flex items-center justify-between text-xs text-ink/40">
        <span>
          <span className="font-medium text-ink/60">{nota.fecha}</span> · {nota.medico}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {psoapCampos
          .filter((campo) => nota[campo.key]?.trim())
          .map((campo) => (
            <div key={campo.key} className="flex gap-2 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-bold text-accent">
                {campo.letra}
              </span>
              <p className="text-ink/80">
                <span className="font-medium text-ink/50">{campo.label}: </span>
                {nota[campo.key]}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}

export default function HistorialNotas({ patientId, onContinuarBorrador }: { patientId: string; onContinuarBorrador: (notaId: string) => void }) {
  const { notasEvolucionPorPaciente, diagnosticosPorPaciente } = usePatientData();
  const notas = notasEvolucionPorPaciente[patientId] ?? [];
  const diagnosticosCatalogo = diagnosticosPorPaciente[patientId] ?? [];

  const borradores = notas.filter((n): n is NotaEvolucionV2 => esNotaV2(n) && (n.estado === "borrador" || n.estado === "lista_revision"));
  const firmadasV2 = notas.filter(
    (n): n is NotaEvolucionV2 => esNotaV2(n) && (n.estado === "firmada" || n.estado === "con_aclaracion")
  );
  const administrativas = notas.filter(esNotaAdministrativa);
  const notasV1 = notas.filter((n): n is NotaEvolucion => !esNotaV2(n as NotaEvolucionAny) && !esNotaAdministrativa(n));

  // Firmadas v2 + administrativas en una sola línea de tiempo (por fecha
  // descendente) — una nota administrativa es un renglón de bitácora más,
  // no una categoría aparte de segunda clase.
  type EntradaHistorial =
    | { tipo: "v2"; fecha: string; nota: NotaEvolucionV2 }
    | { tipo: "administrativa"; fecha: string; nota: NotaEvolucionAdministrativa };
  const historial: EntradaHistorial[] = [
    ...firmadasV2.map((nota): EntradaHistorial => ({ tipo: "v2", fecha: nota.actualizadoEn, nota })),
    ...administrativas.map((nota): EntradaHistorial => ({ tipo: "administrativa", fecha: nota.creadoEn, nota })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));

  if (notas.length === 0) {
    return <p className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">No hay notas de evolución registradas</p>;
  }

  return (
    <div className="space-y-6">
      {borradores.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">Borradores</h3>
          <div className="space-y-2">
            {borradores.map((n) => (
              <TarjetaBorrador key={n.id} nota={n} onContinuar={() => onContinuarBorrador(n.id)} />
            ))}
          </div>
        </div>
      )}

      <div>
        {borradores.length > 0 && <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">Historial</h3>}
        <div className="space-y-3">
          {historial.map((entrada) =>
            entrada.tipo === "v2" ? (
              <TarjetaFirmadaV2 key={entrada.nota.id} nota={entrada.nota} diagnosticosCatalogo={diagnosticosCatalogo} />
            ) : (
              <TarjetaAdministrativa key={entrada.nota.id} nota={entrada.nota} />
            )
          )}
          {notasV1.map((n) => (
            <TarjetaV1 key={n.id} nota={n} />
          ))}
        </div>
      </div>
    </div>
  );
}
