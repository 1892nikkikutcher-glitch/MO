"use client";

/** Acuerdo de pago (montos menores), Contrato de prestación de servicios
 * odontológicos (montos mayores) y Carnet del paciente — tres documentos de la
 * lista de formatos del expediente que faltaban. Mismo patrón que
 * ConsentimientoEspecialidad: formulario (no se imprime) + hoja blanca. */

import { useEffect, useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import {
  calcularEdadDetallada,
  formatCurrency,
  formatFechaCita,
  identidadDoctorDe,
  tratamientosDeDisponibles,
  type Patient,
} from "@/lib/patientData";
import { manejarCambioNombre } from "@/lib/textoNombre";
import { calendarioDePagos, montoEnLetra, type Periodicidad } from "@/lib/documentosPago";

export type TipoDocumentoPago = "acuerdoPago" | "contratoServicios" | "carnetPaciente";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";
const labelClass = "mb-1 block text-xs font-medium text-ink/60";

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fechaLarga(iso: string) {
  if (!iso) return "________________";
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

const periodicidadTexto: Record<Periodicidad, string> = {
  semanal: "semanales",
  quincenal: "quincenales",
  mensual: "mensuales",
};

function num(v: string) {
  const n = Number(v.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export default function DocumentosPago({
  patient,
  tipo,
  onVolver,
}: {
  patient: Patient;
  tipo: TipoDocumentoPago;
  onVolver?: () => void;
}) {
  const { clinicInfo, perfilDoctor, recursos, citas, presupuestosPorPaciente, cargarDatosPaciente } = usePatientData();
  const medicos = recursos.filter((r) => r.tipo === "medico");
  const clinicaNombre = clinicInfo?.nombre || "el consultorio";
  const esMenorDeEdad = (calcularEdadDetallada(patient.birthDate)?.years ?? 18) < 18;

  // Presupuestos del paciente para sugerir tratamiento y monto.
  useEffect(() => {
    cargarDatosPaciente(patient.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id]);
  const presupuestos = presupuestosPorPaciente[patient.id] ?? [];
  const tratamientosSugeridos = useMemo(() => tratamientosDeDisponibles(presupuestos), [presupuestos]);

  const [fecha, setFecha] = useState(hoyISO());
  const [medico, setMedico] = useState(() => {
    const hoy = hoyISO();
    const propias = citas.filter((c) => c.patientId === patient.id && c.estatus !== "Cancelada");
    const proxima = propias.filter((c) => c.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
    const sugerido = proxima?.medicoId ? recursos.find((r) => r.id === proxima.medicoId)?.nombre : undefined;
    return sugerido || medicos[0]?.nombre || "";
  });
  const identidad = identidadDoctorDe(medico, recursos);
  const [nombreFirmante, setNombreFirmante] = useState(esMenorDeEdad ? patient.nombreTutor || "" : patient.name);
  const [parentesco, setParentesco] = useState(esMenorDeEdad ? "Madre/Padre/Tutor" : "Titular");
  const [tratamiento, setTratamiento] = useState("");
  const [total, setTotal] = useState("");
  const [anticipo, setAnticipo] = useState("");
  const [parcialidades, setParcialidades] = useState("1");
  const [periodicidad, setPeriodicidad] = useState<Periodicidad>("mensual");
  const [primerPago, setPrimerPago] = useState("");
  const [formaPago, setFormaPago] = useState("Efectivo / transferencia");
  const [vigenciaGarantia, setVigenciaGarantia] = useState("");
  const [testigo1, setTestigo1] = useState("");
  const [testigo2, setTestigo2] = useState("");

  const totalNum = num(total);
  const anticipoNum = num(anticipo);
  const calendario = calendarioDePagos({
    total: totalNum,
    anticipo: anticipoNum,
    parcialidades: num(parcialidades),
    periodicidad,
    primeraFechaISO: primerPago,
  });
  const saldo = Math.max(0, totalNum - anticipoNum);

  const titulo =
    tipo === "acuerdoPago" ? "Acuerdo de pago" : tipo === "contratoServicios" ? "Contrato de prestación de servicios odontológicos" : "Carnet del paciente";

  const citasFuturas = citas
    .filter((c) => c.patientId === patient.id && c.fecha >= hoyISO() && c.estatus !== "Cancelada")
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio));

  const sugerirTratamiento = (id: string) => {
    const t = tratamientosSugeridos.find((x) => x.id === id);
    if (!t) return;
    setTratamiento(t.label);
    if (!total) setTotal(String(t.price));
  };

  const cabecera = (
    <div className="text-center text-sm leading-snug print:text-xs">
      <p className="font-semibold">{clinicaNombre}</p>
      {medico && (
        <p>
          {medico}
          {identidad.cedulaProfesional && <> · Cédula profesional {identidad.cedulaProfesional}</>}
        </p>
      )}
      {perfilDoctor.direccionClinica && <p>{perfilDoctor.direccionClinica}</p>}
    </div>
  );

  const bloqueFirmas = (
    <div className="mt-10 grid grid-cols-2 gap-x-10 gap-y-10 text-center text-[11px] print:mt-5 print:gap-y-5 print:text-[9.5px]">
      <div>
        <div className="mb-1 h-12 border-b border-black print:h-8" />
        <p>Por el consultorio: {medico || "profesional que atiende"}</p>
      </div>
      <div>
        <div className="mb-1 h-12 border-b border-black print:h-8" />
        <p>El paciente o responsable</p>
        <p className="mt-1 font-medium">
          {nombreFirmante} — {parentesco}
        </p>
      </div>
      {tipo === "contratoServicios" && (
        <>
          <div>
            <div className="mb-1 h-12 border-b border-black print:h-8" />
            <p>Testigo</p>
            {testigo1 && <p className="mt-1 font-medium">{testigo1}</p>}
          </div>
          <div>
            <div className="mb-1 h-12 border-b border-black print:h-8" />
            <p>Testigo</p>
            {testigo2 && <p className="mt-1 font-medium">{testigo2}</p>}
          </div>
        </>
      )}
    </div>
  );

  const tablaPagos = calendario.length > 0 && (
    <table className="mt-2 w-full border-collapse text-[13px] print:text-[10.5px]">
      <thead>
        <tr className="border-b border-black/60 text-left">
          <th className="py-1 pr-2">Pago</th>
          <th className="py-1 pr-2">Fecha</th>
          <th className="py-1 text-right">Monto</th>
        </tr>
      </thead>
      <tbody>
        {calendario.map((p) => (
          <tr key={p.numero} className="border-b border-black/10">
            <td className="py-0.5 pr-2">{p.numero}</td>
            <td className="py-0.5 pr-2">{formatFechaCita(p.fechaISO)}</td>
            <td className="py-0.5 text-right">{formatCurrency(p.monto)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-edge/10 bg-surface p-6 sm:grid-cols-2 print:hidden">
        <div className="sm:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Datos — {titulo}</h3>
          <p className="mt-1 text-xs text-ink/40">
            {tipo === "carnetPaciente"
              ? "Se llena con los datos del paciente y sus próximas citas; las filas en blanco son para anotar a mano."
              : "Completa los montos y plazos acordados. Es un formato base: si el monto es alto o el caso es especial, conviene que lo revise tu asesor legal."}
          </p>
        </div>

        <div>
          <label className={labelClass}>Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Médico que atiende</label>
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

        {tipo !== "carnetPaciente" && (
          <>
            <div className="sm:col-span-2">
              <label className={labelClass}>Tratamiento o servicio</label>
              {tratamientosSugeridos.length > 0 && (
                <select
                  defaultValue=""
                  onChange={(e) => sugerirTratamiento(e.target.value)}
                  className={`${inputClass} mb-2`}
                >
                  <option value="">Tomar de un presupuesto del paciente…</option>
                  {tratamientosSugeridos.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.folio} — {t.label} ({formatCurrency(t.price)})
                    </option>
                  ))}
                </select>
              )}
              <input
                type="text"
                value={tratamiento}
                onChange={(e) => setTratamiento(e.target.value)}
                placeholder="Ej. Rehabilitación con coronas de zirconia OD 14–16"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Costo total ($)</label>
              <input type="text" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Anticipo ($)</label>
              <input type="text" inputMode="decimal" value={anticipo} onChange={(e) => setAnticipo(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Número de pagos del saldo</label>
              <input type="text" inputMode="numeric" value={parcialidades} onChange={(e) => setParcialidades(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Periodicidad</label>
              <select value={periodicidad} onChange={(e) => setPeriodicidad(e.target.value as Periodicidad)} className={inputClass}>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Fecha del primer pago</label>
              <input type="date" value={primerPago} onChange={(e) => setPrimerPago(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Forma de pago</label>
              <input type="text" value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className={inputClass} />
            </div>
            {tipo === "contratoServicios" && (
              <>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Garantía / vigencia del trabajo (opcional)</label>
                  <input
                    type="text"
                    value={vigenciaGarantia}
                    onChange={(e) => setVigenciaGarantia(e.target.value)}
                    placeholder="Ej. 12 meses contra defectos de fabricación, con revisiones semestrales"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Testigo 1 (opcional)</label>
                  <input type="text" value={testigo1} onChange={(e) => manejarCambioNombre(e, setTestigo1)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Testigo 2 (opcional)</label>
                  <input type="text" value={testigo2} onChange={(e) => manejarCambioNombre(e, setTestigo2)} className={inputClass} />
                </div>
              </>
            )}
            <div>
              <label className={labelClass}>Nombre del paciente o responsable</label>
              <input type="text" value={nombreFirmante} onChange={(e) => manejarCambioNombre(e, setNombreFirmante)} className={inputClass} />
              {esMenorDeEdad && (
                <p className="mt-1 text-xs text-accent/70">Paciente menor de edad — se llenó con el tutor; verifícalo.</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Parentesco</label>
              <input type="text" value={parentesco} onChange={(e) => setParentesco(e.target.value)} className={inputClass} />
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          {onVolver && (
            <button onClick={onVolver} className="text-sm font-medium text-accent hover:text-accent">
              ← Volver a Documentos
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="ml-auto rounded-lg border border-accent/60 bg-accent/15 px-6 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25"
          >
            Imprimir
          </button>
        </div>
      </div>

      {/* ---------------- Hoja imprimible ---------------- */}
      <div className="rounded-2xl bg-white p-8 text-black shadow-lg print:rounded-none print:p-0 print:shadow-none">
        <h2 className="text-center text-base font-bold uppercase tracking-wide print:text-sm">{titulo}</h2>
        <div className="mt-3 print:mt-1.5">{cabecera}</div>

        {tipo === "acuerdoPago" && (
          <div className="mt-4 space-y-3 text-justify text-[13px] leading-relaxed print:mt-2 print:space-y-2 print:text-[10.5px] print:leading-snug">
            <p>
              En {perfilDoctor.direccionClinica || "la ciudad donde se ubica el consultorio"}, a {fechaLarga(fecha)},{" "}
              <strong>{nombreFirmante || "________________"}</strong> ({parentesco}
              {nombreFirmante !== patient.name && <>, en representación de <strong>{patient.name}</strong></>}) y{" "}
              <strong>{clinicaNombre}</strong>, representado por <strong>{medico || "________________"}</strong>, acuerdan
              lo siguiente:
            </p>
            <p>
              <strong>Primera.</strong> El paciente recibirá el tratamiento de{" "}
              <strong>{tratamiento || "________________"}</strong>, con un costo total de{" "}
              <strong>{formatCurrency(totalNum)}</strong> ({montoEnLetra(totalNum) || "____________"}).
            </p>
            <p>
              <strong>Segunda.</strong> Entrega un anticipo de <strong>{formatCurrency(anticipoNum)}</strong>
              {montoEnLetra(anticipoNum) && <> ({montoEnLetra(anticipoNum)})</>} y se compromete a liquidar el saldo de{" "}
              <strong>{formatCurrency(saldo)}</strong> en {calendario.length || "____"} pago(s){" "}
              {periodicidadTexto[periodicidad]}, en las fechas y montos siguientes. Forma de pago: {formaPago}.
            </p>
            {tablaPagos}
            <p>
              <strong>Tercera.</strong> Si un pago no se realiza en la fecha acordada, el paciente se compromete a
              avisar con anticipación para reprogramarlo. La continuidad del tratamiento queda sujeta a que los pagos
              estén al corriente.
            </p>
            <p>
              <strong>Cuarta.</strong> Los pagos se aplican al tratamiento descrito y se registran en el expediente del
              paciente. Cualquier cambio en el plan de tratamiento que modifique el costo se acordará por escrito antes
              de realizarse.
            </p>
            <p>Leído el presente acuerdo, ambas partes lo firman de conformidad.</p>
          </div>
        )}

        {tipo === "contratoServicios" && (
          <div className="mt-4 space-y-2.5 text-justify text-[13px] leading-relaxed print:mt-2 print:space-y-1.5 print:text-[10px] print:leading-snug">
            <p>
              Contrato de prestación de servicios odontológicos que celebran, por una parte,{" "}
              <strong>{clinicaNombre}</strong>, a través de <strong>{medico || "________________"}</strong>
              {identidad.cedulaProfesional && <> (cédula profesional {identidad.cedulaProfesional})</>}, en lo sucesivo
              &ldquo;EL PRESTADOR&rdquo;; y por la otra <strong>{nombreFirmante || "________________"}</strong> (
              {parentesco}
              {nombreFirmante !== patient.name && <>, en representación de <strong>{patient.name}</strong></>}), en lo
              sucesivo &ldquo;EL PACIENTE&rdquo;, al tenor de las siguientes declaraciones y cláusulas, en{" "}
              {perfilDoctor.direccionClinica || "________________"}, a {fechaLarga(fecha)}.
            </p>
            <p className="font-bold">DECLARACIONES</p>
            <p>
              I. EL PRESTADOR declara contar con los conocimientos y la autorización profesional para ejercer la
              odontología, y que sus instalaciones cumplen con la normatividad sanitaria aplicable.
            </p>
            <p>
              II. EL PACIENTE declara haber sido informado de su diagnóstico, de las alternativas de tratamiento, de sus
              riesgos y beneficios, y que la información que proporcionó sobre su estado de salud es veraz y completa.
            </p>
            <p className="font-bold">CLÁUSULAS</p>
            <p>
              <strong>Primera. Objeto.</strong> EL PRESTADOR se obliga a realizar a EL PACIENTE el tratamiento de{" "}
              <strong>{tratamiento || "________________"}</strong>, conforme al plan y presupuesto entregados, empleando
              los medios y la técnica que la práctica odontológica recomienda. Se trata de una obligación de medios, no
              de resultados: la evolución depende también de la respuesta biológica y de la cooperación del paciente.
            </p>
            <p>
              <strong>Segunda. Honorarios.</strong> EL PACIENTE pagará un total de{" "}
              <strong>{formatCurrency(totalNum)}</strong> ({montoEnLetra(totalNum) || "____________"}), mediante un
              anticipo de <strong>{formatCurrency(anticipoNum)}</strong> y el saldo de{" "}
              <strong>{formatCurrency(saldo)}</strong> en {calendario.length || "____"} pago(s){" "}
              {periodicidadTexto[periodicidad]}, según el calendario siguiente. Forma de pago: {formaPago}.
            </p>
            {tablaPagos}
            <p>
              <strong>Tercera. Retraso en pagos.</strong> La falta de pago en las fechas pactadas faculta a EL PRESTADOR a
              suspender el tratamiento hasta regularizarse, sin responsabilidad por las consecuencias clínicas de la
              interrupción atribuibles a ello. Los pagos realizados corresponden al trabajo ya ejecutado y a los
              materiales y servicios de laboratorio ya solicitados.
            </p>
            <p>
              <strong>Cuarta. Obligaciones del paciente.</strong> Acudir puntualmente a sus citas, seguir las
              indicaciones, mantener su higiene y avisar con al menos 24 horas si no puede asistir. Las faltas
              reiteradas sin aviso pueden retrasar o comprometer el resultado.
            </p>
            <p>
              <strong>Quinta. Garantía.</strong>{" "}
              {vigenciaGarantia
                ? `EL PRESTADOR garantiza el trabajo realizado: ${vigenciaGarantia}. La garantía no cubre daños por mal uso, falta de higiene, accidentes o por no acudir a las revisiones indicadas.`
                : "La garantía del trabajo, en su caso, será la que EL PRESTADOR indique por escrito y no cubre daños por mal uso, falta de higiene, accidentes o por no acudir a las revisiones indicadas."}
            </p>
            <p>
              <strong>Sexta. Cambios y rescisión.</strong> Cualquier cambio al plan que modifique el costo se acordará por
              escrito. Si EL PACIENTE decide terminar el tratamiento, se le cobrará lo ya realizado y lo
              solicitado a terceros, y se le entregará el saldo a favor si lo hubiera, conforme al expediente.
            </p>
            <p>
              <strong>Séptima. Datos personales.</strong> Los datos de EL PACIENTE se tratan conforme al Aviso de
              Privacidad del consultorio y la LFPDPPP. El expediente clínico se conserva por el plazo que marca la
              NOM-004-SSA3-2012.
            </p>
            <p>
              <strong>Octava. Jurisdicción.</strong> Para la interpretación y cumplimiento de este contrato, las partes
              se someten a los tribunales competentes del lugar donde se ubica el consultorio, renunciando a cualquier
              otro fuero que por su domicilio presente o futuro pudiera corresponderles.
            </p>
            <p>Leído el contrato y enteradas las partes de su contenido, lo firman por duplicado.</p>
          </div>
        )}

        {tipo !== "carnetPaciente" && bloqueFirmas}

        {tipo === "carnetPaciente" && (
          <div className="mt-4 space-y-3 text-[13px] print:mt-2 print:text-[10.5px]">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <p>
                <span className="text-black/60">Paciente: </span>
                <strong>{patient.name}</strong>
              </p>
              <p>
                <span className="text-black/60">Fecha de nacimiento: </span>
                {patient.birthDate ? formatFechaCita(patient.birthDate) : "________________"}
              </p>
              <p>
                <span className="text-black/60">Teléfono: </span>
                {patient.phone || "________________"}
              </p>
              <p>
                <span className="text-black/60">Atiende: </span>
                {medico || "________________"}
              </p>
            </div>
            <p className="font-semibold">Mis citas</p>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-black/60">
                  <th className="w-28 py-1 pr-2">Fecha</th>
                  <th className="w-16 py-1 pr-2">Hora</th>
                  <th className="py-1 pr-2">Tratamiento</th>
                  <th className="w-24 py-1">Firma</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.max(10, citasFuturas.length) }).map((_, i) => {
                  const c = citasFuturas[i];
                  return (
                    <tr key={i} className="h-7 border-b border-black/30 print:h-6">
                      <td className="pr-2">{c ? formatFechaCita(c.fecha) : ""}</td>
                      <td className="pr-2">{c?.horaInicio ?? ""}</td>
                      <td className="pr-2">{c ? c.tratamientos.filter(Boolean).join(", ") : ""}</td>
                      <td />
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-[11px] text-black/60 print:text-[9px]">
              Por favor avisa con 24 horas de anticipación si no puedes asistir. Llega 10 minutos antes de tu cita.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
