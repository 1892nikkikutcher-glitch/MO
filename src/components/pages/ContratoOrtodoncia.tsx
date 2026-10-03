"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { calcularEdadDetallada, identidadDoctorDe, formatCurrency, type Patient } from "@/lib/patientData";
import { manejarCambioNombre } from "@/lib/textoNombre";
import { renderPlantilla } from "@/lib/formatosWhatsapp";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

function todayFormatted() {
  const d = new Date();
  const dia = d.toLocaleDateString("es-MX", { day: "2-digit" });
  const mes = d.toLocaleDateString("es-MX", { month: "long" });
  const anio = d.toLocaleDateString("es-MX", { year: "numeric" });
  return { dia, mes, anio };
}

export default function ContratoOrtodoncia({
  patient,
  onVolver,
}: {
  patient: Patient;
  onVolver?: () => void;
}) {
  const { perfilDoctor, clinicInfo, recursos, citas, contratoOrtodoncia } = usePatientData();
  const medicos = recursos.filter((r) => r.tipo === "medico");
  const clinicaNombre = clinicInfo?.nombre || "";
  const esMenorDeEdad = (calcularEdadDetallada(patient.birthDate)?.years ?? 18) < 18;
  const fechaInicial = todayFormatted();
  const [dia, setDia] = useState(fechaInicial.dia);
  const [mes, setMes] = useState(fechaInicial.mes);
  const [anio, setAnio] = useState(fechaInicial.anio);
  // Mismo criterio que ConsentimientoInformado: se sugiere el médico de la
  // cita más cercana del paciente, siempre editable.
  const [medico, setMedico] = useState(() => {
    const hoyISO = new Date().toISOString().slice(0, 10);
    const citasPaciente = citas.filter((c) => c.patientId === patient.id && c.estatus !== "Cancelada");
    const proxima = citasPaciente
      .filter((c) => c.fecha >= hoyISO)
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio))[0];
    const pasada = citasPaciente.filter((c) => c.fecha < hoyISO).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
    const citaRelevante = proxima ?? pasada;
    const medicoSugerido = citaRelevante?.medicoId
      ? recursos.find((r) => r.id === citaRelevante.medicoId)?.nombre
      : undefined;
    return medicoSugerido || medicos[0]?.nombre || "";
  });
  const cedula = identidadDoctorDe(medico, recursos).cedulaProfesional;

  const [duracionMeses, setDuracionMeses] = useState("");
  const [pagoInicial, setPagoInicial] = useState("");
  const [numCuotas, setNumCuotas] = useState("");
  const [cuotaMensual, setCuotaMensual] = useState("");
  const [costoProntoPago, setCostoProntoPago] = useState("");
  const [costoBracketDespegado, setCostoBracketDespegado] = useState("");
  const [costoConsultaExtra, setCostoConsultaExtra] = useState("");
  const [descuentoLimpieza, setDescuentoLimpieza] = useState("");
  const [mesesDescuento, setMesesDescuento] = useState("");

  const [nombreFirmante, setNombreFirmante] = useState(
    esMenorDeEdad ? patient.nombreTutor || "" : patient.name
  );
  const [parentesco, setParentesco] = useState(esMenorDeEdad ? "Madre/Padre/Tutor" : "Titular");

  const handleImprimir = () => {
    window.print();
  };

  const textoContrato = renderPlantilla(contratoOrtodoncia.clausulas, {
    clinica: clinicaNombre || "el consultorio",
    dia,
    mes,
    anio,
    medico,
    paciente: patient.name,
    duracionMeses,
    pagoInicial: pagoInicial ? formatCurrency(Number(pagoInicial) || 0) : "",
    numCuotas,
    cuotaMensual: cuotaMensual ? formatCurrency(Number(cuotaMensual) || 0) : "",
    costoProntoPago: costoProntoPago ? formatCurrency(Number(costoProntoPago) || 0) : "",
    costoBracketDespegado: costoBracketDespegado ? formatCurrency(Number(costoBracketDespegado) || 0) : "",
    costoConsultaExtra: costoConsultaExtra ? formatCurrency(Number(costoConsultaExtra) || 0) : "",
    descuentoLimpieza,
    mesesDescuento,
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-edge/10 bg-surface p-6 sm:grid-cols-2 print:hidden">
        <div className="sm:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Datos del contrato — Ortodoncia
          </h3>
          <p className="mt-1 text-xs text-ink/40">
            Los datos fijos ya están cargados. Completa los montos y plazos acordados con este
            paciente — el texto de las cláusulas se edita desde Administración → Contrato de
            Ortodoncia.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Día</label>
          <input type="text" value={dia} onChange={(e) => setDia(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Mes</label>
          <input type="text" value={mes} onChange={(e) => setMes(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Año</label>
          <input type="text" value={anio} onChange={(e) => setAnio(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Médico que atiende</label>
          {medicos.length > 0 ? (
            <select value={medico} onChange={(e) => setMedico(e.target.value)} className={inputClass}>
              {!medicos.some((m) => m.nombre === medico) && medico && <option value={medico}>{medico}</option>}
              {medicos.map((m) => (
                <option key={m.id} value={m.nombre}>
                  {m.nombre}
                </option>
              ))}
            </select>
          ) : (
            <input type="text" value={medico} onChange={(e) => setMedico(e.target.value)} className={inputClass} />
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Duración estimada (meses)</label>
          <input
            type="text"
            value={duracionMeses}
            onChange={(e) => setDuracionMeses(e.target.value)}
            placeholder="Ej. 18"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">N° de cuotas mensuales</label>
          <input
            type="text"
            value={numCuotas}
            onChange={(e) => setNumCuotas(e.target.value)}
            placeholder="Ej. 16"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            Pago inicial (Kit de Ortodoncia)
          </label>
          <input
            type="number"
            min={0}
            value={pagoInicial}
            onChange={(e) => setPagoInicial(e.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Costo de cada cuota mensual</label>
          <input
            type="number"
            min={0}
            value={cuotaMensual}
            onChange={(e) => setCuotaMensual(e.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Costo con pronto pago</label>
          <input
            type="number"
            min={0}
            value={costoProntoPago}
            onChange={(e) => setCostoProntoPago(e.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Costo por bracket despegado</label>
          <input
            type="number"
            min={0}
            value={costoBracketDespegado}
            onChange={(e) => setCostoBracketDespegado(e.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            Costo por consulta fuera de calendario
          </label>
          <input
            type="number"
            min={0}
            value={costoConsultaExtra}
            onChange={(e) => setCostoConsultaExtra(e.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            % Descuento de limpieza semestral
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={descuentoLimpieza}
            onChange={(e) => setDescuentoLimpieza(e.target.value)}
            placeholder="Ej. 20"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Meses en que aplica el descuento</label>
          <input
            type="text"
            value={mesesDescuento}
            onChange={(e) => setMesesDescuento(e.target.value)}
            placeholder="Ej. Mayo y Noviembre"
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            Nombre del paciente o representante legal
          </label>
          <input
            type="text"
            value={nombreFirmante}
            onChange={(e) => manejarCambioNombre(e, setNombreFirmante)}
            className={inputClass}
          />
          {esMenorDeEdad && (
            <p className="mt-1 text-xs text-accent/70">
              Paciente menor de edad — se llenó con el tutor de Datos del Paciente. Verifica o
              corrígelo antes de imprimir.
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Parentesco</label>
          <input
            type="text"
            value={parentesco}
            onChange={(e) => setParentesco(e.target.value)}
            placeholder="Titular, madre, padre, tutor..."
            className={inputClass}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          {onVolver && (
            <button onClick={onVolver} className="text-sm font-medium text-accent hover:text-accent">
              ← Volver a Documentos
            </button>
          )}
          <button
            onClick={handleImprimir}
            className="ml-auto rounded-lg border border-accent/60 bg-accent/15 py-2.5 px-6 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25"
          >
            Imprimir para firmar con pluma
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-8 text-black shadow-lg print:rounded-none print:p-0 print:shadow-none">
        <h2 className="text-center text-base font-bold uppercase tracking-wide print:text-sm">
          Contrato de Prestación de Servicios Odontológicos
          {clinicaNombre && <> — {clinicaNombre}</>}
        </h2>
        {perfilDoctor.direccionClinica && (
          <p className="mt-2 text-center text-sm print:text-xs">{perfilDoctor.direccionClinica}</p>
        )}
        <p className="mt-4 whitespace-pre-line text-justify text-[13px] leading-relaxed print:mt-2 print:text-[10.5px] print:leading-snug">
          {textoContrato}
        </p>

        <div className="mt-10 grid grid-cols-2 gap-x-10 gap-y-10 text-center text-[11px] print:mt-5 print:gap-x-8 print:gap-y-5 print:text-[9.5px]">
          <div>
            <div className="mb-1 h-12 border-b border-black print:h-8" />
            <p>Nombre y firma del paciente o representante legal</p>
            <p className="mt-1 font-medium">
              {nombreFirmante} — {parentesco}
            </p>
          </div>
          <div>
            <div className="mb-1 h-12 border-b border-black print:h-8" />
            <p>Nombre y firma del Cirujano Dentista</p>
            <p className="mt-1 font-medium">
              {medico}
              {cedula && ` — Cédula ${cedula}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
