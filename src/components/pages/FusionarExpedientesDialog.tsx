"use client";

/** Modal de 3 pasos para fusionar dos expedientes de paciente duplicados —
 * ver el plan "Fusionar Expedientes de pacientes duplicados". La lógica de
 * qué es o no un conflicto real vive en src/lib/fusionExpedientes.ts (pura,
 * probada); este componente solo la usa para decidir qué mostrar y junta
 * las decisiones del usuario antes de llamar a `fusionarPacientes` del
 * contexto, que es quien realmente aplica los cambios. */

import { useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import {
  aplicarResolucionesConflicto,
  fusionarAlergias,
  fusionarCamposPorClave,
  type ConflictoCampo,
} from "@/lib/fusionExpedientes";
import { formatEdad, fotosVacias, type FotoPaciente, type Patient } from "@/lib/patientData";
import { respuestasVacias, type RespuestaValor } from "@/lib/historiaClinica";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";
const botonPrimario =
  "rounded-lg border border-accent/60 bg-accent/15 px-4 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40";
const botonSecundario =
  "rounded-lg border border-edge/15 px-4 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface";

const etiquetaCampoPaciente: Record<string, string> = {
  name: "Nombre completo",
  phone: "Celular",
  email: "Correo",
  birthDate: "Fecha de nacimiento",
  notas: "Notas",
  sexo: "Sexo",
  estadoCivil: "Estado civil",
  ocupacion: "Ocupación",
  escolaridad: "Escolaridad",
  lugarNacimiento: "Lugar de nacimiento",
  nivelSocioeconomico: "Nivel socioeconómico",
  ingresoFamiliar: "Ingreso familiar",
  dependientes: "Dependientes",
  tipoVivienda: "Tipo de vivienda",
  servicios: "Servicios",
  responsablePago: "Responsable de pago",
  telefonoFijo: "Teléfono fijo",
  direccion: "Dirección",
  codigoPostal: "Código postal",
  contactoNombre: "Contacto de emergencia",
  contactoParentesco: "Parentesco del contacto",
  contactoTelefono: "Teléfono del contacto",
  nombreTutor: "Nombre del tutor",
};

function mostrarValor(v: unknown): string {
  if (v === undefined || v === null) return "—";
  if (Array.isArray(v)) return v.length > 0 ? v.join(", ") : "—";
  return String(v);
}

/** Campos de `Patient` que nunca deben entrar a un conflicto de fusión —
 * identidad/estado interno, no datos capturables por el doctor. */
const CAMPOS_PACIENTE_EXCLUIDOS = new Set(["id", "createdAt", "fusionadoEnId", "fusionadoEn"]);

function camposPacienteComoRecord(p: Patient): Record<string, unknown> {
  const registro: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(p)) {
    if (CAMPOS_PACIENTE_EXCLUIDOS.has(clave)) continue;
    registro[clave] = valor;
  }
  return registro;
}

function FotoMiniatura({ foto }: { foto: FotoPaciente | null | undefined }) {
  if (!foto) return <p className="text-xs italic text-ink/40">Sin foto</p>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={foto.url} alt={foto.name} className="h-20 w-20 rounded-lg border border-edge/10 object-cover" />;
}

export default function FusionarExpedientesDialog({
  pacientes,
  onClose,
  onFusionado,
}: {
  pacientes: [Patient, Patient];
  onClose: () => void;
  onFusionado: () => void;
}) {
  const {
    historiaClinicaPorPaciente,
    historiaClinicaTemplate,
    fotosPorPaciente,
    presupuestosPorPaciente,
    pagosPorPaciente,
    recetasPorPaciente,
    laboratoriosPorPaciente,
    notasEvolucionPorPaciente,
    diagnosticosPorPaciente,
    membresiasPorPaciente,
    citas,
    fusionarPacientes,
  } = usePatientData();

  const [paso, setPaso] = useState<"elegir" | "resolver" | "confirmar">("elegir");
  const [sobrevivienteId, setSobrevivienteId] = useState(pacientes[0].id);
  const [resolucionesPaciente, setResolucionesPaciente] = useState<Record<string, unknown>>({});
  const [resolucionesHistoria, setResolucionesHistoria] = useState<Record<string, RespuestaValor>>({});
  const [resolucionesFotos, setResolucionesFotos] = useState<Record<string, FotoPaciente | null>>({});
  const [fusionando, setFusionando] = useState(false);
  const [errorFusion, setErrorFusion] = useState<string | null>(null);

  const sobreviviente = pacientes.find((p) => p.id === sobrevivienteId) ?? pacientes[0];
  const perdedor = pacientes.find((p) => p.id !== sobrevivienteId) ?? pacientes[1];

  const etiquetaPorPreguntaId = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const seccion of historiaClinicaTemplate.secciones) {
      for (const pregunta of seccion.preguntas) mapa.set(pregunta.id, pregunta.etiqueta);
    }
    return mapa;
  }, [historiaClinicaTemplate]);

  const historiaSobreviviente = historiaClinicaPorPaciente[sobreviviente.id] ?? respuestasVacias;
  const historiaPerdedor = historiaClinicaPorPaciente[perdedor.id] ?? respuestasVacias;
  const fotosSobreviviente = fotosPorPaciente[sobreviviente.id] ?? fotosVacias;
  const fotosPerdedor = fotosPorPaciente[perdedor.id] ?? fotosVacias;

  const resultadoPaciente = useMemo(
    () => fusionarCamposPorClave(camposPacienteComoRecord(sobreviviente), camposPacienteComoRecord(perdedor)),
    [sobreviviente, perdedor]
  );
  const resultadoHistoria = useMemo(
    () => fusionarCamposPorClave(historiaSobreviviente.porPregunta, historiaPerdedor.porPregunta),
    [historiaSobreviviente, historiaPerdedor]
  );
  const resultadoFotos = useMemo(
    () =>
      fusionarCamposPorClave<FotoPaciente | null>(
        { perfil: fotosSobreviviente.perfil ?? null, ineFrente: fotosSobreviviente.ineFrente ?? null, ineReverso: fotosSobreviviente.ineReverso ?? null },
        { perfil: fotosPerdedor.perfil ?? null, ineFrente: fotosPerdedor.ineFrente ?? null, ineReverso: fotosPerdedor.ineReverso ?? null }
      ),
    [fotosSobreviviente, fotosPerdedor]
  );
  const alergiasFusionadas = fusionarAlergias(historiaSobreviviente.alergias, historiaPerdedor.alergias);

  const totalConflictos =
    resultadoPaciente.conflictos.length + resultadoHistoria.conflictos.length + resultadoFotos.conflictos.length;

  const conteos = [
    { label: "Presupuestos", n: (presupuestosPorPaciente[perdedor.id] ?? []).length },
    { label: "Pagos", n: (pagosPorPaciente[perdedor.id] ?? []).length },
    { label: "Recetas", n: (recetasPorPaciente[perdedor.id] ?? []).length },
    { label: "Laboratorios", n: (laboratoriosPorPaciente[perdedor.id] ?? []).length },
    { label: "Notas de evolución", n: (notasEvolucionPorPaciente[perdedor.id] ?? []).length },
    { label: "Diagnósticos", n: (diagnosticosPorPaciente[perdedor.id] ?? []).length },
    { label: "Membresías", n: (membresiasPorPaciente[perdedor.id] ?? []).length },
    { label: "Citas en Agenda", n: citas.filter((c) => c.patientId === perdedor.id).length },
  ].filter((c) => c.n > 0);

  async function confirmarFusion() {
    setFusionando(true);
    setErrorFusion(null);
    try {
      const camposPacienteResueltos = aplicarResolucionesConflicto(resultadoPaciente.fusionado, resolucionesPaciente) as Partial<Patient>;
      const porPreguntaResuelto = aplicarResolucionesConflicto(resultadoHistoria.fusionado, resolucionesHistoria);
      const fotosResueltasSingulares = aplicarResolucionesConflicto(resultadoFotos.fusionado, resolucionesFotos);

      fusionarPacientes({
        sobrevivienteId: sobreviviente.id,
        perdedorId: perdedor.id,
        camposPacienteResueltos,
        historiaClinicaResuelta: {
          porPregunta: porPreguntaResuelto,
          alergias: alergiasFusionadas || undefined,
          actualizadoEn: new Date().toISOString(),
        },
        fotosResueltas: {
          perfil: fotosResueltasSingulares.perfil ?? undefined,
          ineFrente: fotosResueltasSingulares.ineFrente ?? undefined,
          ineReverso: fotosResueltasSingulares.ineReverso ?? undefined,
          extraorales: [...fotosSobreviviente.extraorales, ...fotosPerdedor.extraorales],
          intraorales: [...fotosSobreviviente.intraorales, ...fotosPerdedor.intraorales],
        },
      });
      onFusionado();
    } catch (err) {
      console.error("No se pudo fusionar los expedientes", err);
      setErrorFusion("Algo falló al fusionar. Ningún dato original se perdió — puedes volver a intentar.");
    } finally {
      setFusionando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl border border-edge/10 bg-modal-solid p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Fusionar Expedientes</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink">
            ✕
          </button>
        </div>

        {paso === "elegir" && (
          <div className="space-y-4">
            <p className="text-sm text-ink/60">
              ¿Cuál de los dos expedientes conserva su identidad (folio, historial de citas más antiguo, etc.)? El
              otro se retira — su información nunca se borra, solo se une a este.
            </p>
            <div className="space-y-2">
              {pacientes.map((p) => (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                    sobrevivienteId === p.id ? "border-accent/60 bg-accent/10" : "border-edge/10 hover:bg-surface"
                  }`}
                >
                  <input type="radio" checked={sobrevivienteId === p.id} onChange={() => setSobrevivienteId(p.id)} className="accent-[color:var(--accent)]" />
                  <div>
                    <p className="font-medium text-ink">
                      {p.name} {p.birthDate && `— ${formatEdad(p.birthDate)}`}
                    </p>
                    <p className="text-xs text-ink/50">
                      {p.phone} · Nació {p.birthDate || "sin registrar"}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className={botonSecundario}>
                Cancelar
              </button>
              <button onClick={() => setPaso("resolver")} className={botonPrimario}>
                Siguiente
              </button>
            </div>
          </div>
        )}

        {paso === "resolver" && (
          <div className="space-y-4">
            {totalConflictos === 0 ? (
              <p className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
                No hay diferencias que decidir — todo lo que capturó cada expediente se conserva automáticamente.
              </p>
            ) : (
              <p className="text-sm text-ink/60">
                Los dos expedientes tienen esto distinto. Elige qué valor conservar para cada uno — todo lo demás ya
                se resolvió solo.
              </p>
            )}

            {resultadoPaciente.conflictos.map((c) => (
              <ConflictoRow
                key={`paciente-${c.clave}`}
                etiqueta={etiquetaCampoPaciente[c.clave] ?? c.clave}
                conflicto={c}
                mostrar={mostrarValor}
                valorActual={resolucionesPaciente[c.clave] ?? c.valorSobreviviente}
                onElegir={(v) => setResolucionesPaciente((prev) => ({ ...prev, [c.clave]: v }))}
              />
            ))}

            {resultadoHistoria.conflictos.map((c) => (
              <ConflictoRow
                key={`historia-${c.clave}`}
                etiqueta={etiquetaPorPreguntaId.get(c.clave) ?? "Historia clínica"}
                conflicto={c}
                mostrar={mostrarValor}
                valorActual={resolucionesHistoria[c.clave] ?? c.valorSobreviviente}
                onElegir={(v) => setResolucionesHistoria((prev) => ({ ...prev, [c.clave]: v as RespuestaValor }))}
              />
            ))}

            {resultadoFotos.conflictos.map((c) => {
              const etiquetaFoto: Record<string, string> = { perfil: "Foto de perfil", ineFrente: "INE (frente)", ineReverso: "INE (reverso)" };
              const elegido = resolucionesFotos[c.clave] ?? c.valorSobreviviente;
              return (
                <div key={`foto-${c.clave}`} className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <p className="mb-2 text-xs font-semibold text-warning">{etiquetaFoto[c.clave] ?? c.clave} — ambos expedientes tienen una distinta</p>
                  <div className="flex gap-4">
                    {[
                      { valor: c.valorSobreviviente, label: sobreviviente.name },
                      { valor: c.valorPerdedor, label: perdedor.name },
                    ].map((op, i) => (
                      <label key={i} className="flex cursor-pointer flex-col items-center gap-1 text-xs text-ink/60">
                        <input
                          type="radio"
                          checked={elegido === op.valor}
                          onChange={() => setResolucionesFotos((prev) => ({ ...prev, [c.clave]: op.valor }))}
                          className="accent-[color:var(--accent)]"
                        />
                        <FotoMiniatura foto={op.valor} />
                        {op.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

            {alergiasFusionadas && (
              <p className="rounded-lg border border-edge/10 bg-field p-3 text-xs text-ink/60">
                <span className="font-semibold text-ink/80">Alergias: </span>
                se combinan las de ambos expedientes — &quot;{alergiasFusionadas}&quot;.
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setPaso("elegir")} className={botonSecundario}>
                Atrás
              </button>
              <button onClick={() => setPaso("confirmar")} className={botonPrimario}>
                Siguiente
              </button>
            </div>
          </div>
        )}

        {paso === "confirmar" && (
          <div className="space-y-4">
            <p className="text-sm text-ink/70">
              El expediente de <span className="font-semibold text-ink">{perdedor.name}</span> se va a unir dentro
              del de <span className="font-semibold text-ink">{sobreviviente.name}</span>:
            </p>
            {conteos.length > 0 ? (
              <ul className="space-y-1 rounded-lg border border-edge/10 bg-field p-3 text-sm text-ink/70">
                {conteos.map((c) => (
                  <li key={c.label}>
                    {c.n} {c.label.toLowerCase()}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink/40">El expediente que se retira no tiene información adicional registrada.</p>
            )}
            <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
              El expediente de {perdedor.name} dejará de aparecer en búsquedas y listados — su información nunca se
              borra, y esta acción se puede corregir manualmente después si hiciera falta, pero no hay un botón para
              deshacerla automáticamente.
            </p>
            {errorFusion && <p className="text-xs text-danger">{errorFusion}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => setPaso("resolver")} className={botonSecundario} disabled={fusionando}>
                Atrás
              </button>
              <button onClick={confirmarFusion} className={botonPrimario} disabled={fusionando}>
                {fusionando ? "Fusionando…" : "Fusionar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConflictoRow<T>({
  etiqueta,
  conflicto,
  valorActual,
  mostrar,
  onElegir,
}: {
  etiqueta: string;
  conflicto: ConflictoCampo<T>;
  valorActual: T;
  mostrar: (v: T) => string;
  onElegir: (v: T) => void;
}) {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
      <p className="mb-2 text-xs font-semibold text-warning">{etiqueta}</p>
      <div className="space-y-1.5">
        {[conflicto.valorSobreviviente, conflicto.valorPerdedor].map((valor, i) => (
          <label key={i} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-ink/80 hover:bg-surface">
            <input type="radio" checked={valorActual === valor} onChange={() => onElegir(valor)} className="accent-[color:var(--accent)]" />
            {mostrar(valor)}
          </label>
        ))}
      </div>
    </div>
  );
}
