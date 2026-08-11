"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import type { MedicamentoRecetado, Receta } from "@/lib/patientData";

type MedicamentoCatalogo = { nombre: string; instrucciones: string };

const catalogoMedicamentos: MedicamentoCatalogo[] = [
  { nombre: "PARACETAMOL TABLETAS DE 500 MG", instrucciones: "Tomar 1 tableta cada 8 horas por dolor." },
  {
    nombre: "CLAVULIN 12H (Amoxicilina con Ácido Clavulánico) tabletas 875/125mg",
    instrucciones: "Tomar 1 tableta cada 12 horas durante 7 días.",
  },
  {
    nombre: "CLAVULIN 12H SUSPENSIÓN (Amoxicilina con Ácido Clavulánico) Suspensión 200mg/28.5mg/5ml",
    instrucciones: "Tomar según indicación del médico cada 12 horas durante 7 días.",
  },
  {
    nombre: "DAFLOXEN F (Naproxeno Sódico/Paracetamol) tabletas 275/300mg",
    instrucciones: "Tomar 1 tableta cada 8 horas por dolor.",
  },
  {
    nombre: "DAFLOXEN F SUSPENSIÓN (Naproxeno Sódico/Paracetamol) Suspensión 2.5mg/2mg/100ml",
    instrucciones: "Tomar según indicación del médico cada 8 horas.",
  },
  { nombre: "MELOXICAM 7.5 MG / METOCARBAMOL 215 MG", instrucciones: "Tomar 1 tableta cada 12 horas durante 5 días." },
  { nombre: "IBUPROFENO TABLETAS DE 800 MG", instrucciones: "Tomar 1 tableta cada 8 horas por dolor." },
  { nombre: "MOTRIN IBUPROFENO DE 800 MG", instrucciones: "Tomar 1 tableta cada 8 horas." },
  { nombre: "ACTRON (Ibuprofeno) tabletas de 400 mg", instrucciones: "Tomar 1 tableta cada 8 horas." },
  {
    nombre: "MOTRIN SUSPENSIÓN (Ibuprofeno) Suspensión 2g/100ml",
    instrucciones: "Tomar según indicación del médico cada 8 horas.",
  },
  {
    nombre: "DALACIN C (Clindamicina) capsulas 300mg",
    instrucciones: "Tomar una capsula cada ocho horas.\nDurante siete días.",
  },
  { nombre: "AMOXICILINA CÁPSULAS 500 MG", instrucciones: "Tomar 1 cápsula cada 8 horas durante 7 días." },
];

const plantillasRecomendaciones = [
  "Evitar alimentos duros o muy calientes durante las primeras 24 horas.",
  "Aplicar hielo local de forma intermitente las primeras 24 horas para reducir inflamación.",
  "Mantener buena higiene bucal; cepillado suave en la zona tratada.",
  "Acudir de inmediato en caso de sangrado abundante, fiebre o dolor que no cede con el analgésico.",
];

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function calculateAge(birthDate: string) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(`${birthDate}T00:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function resaltarCoincidencia(texto: string, query: string) {
  const idx = texto.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1 || !query) return texto;
  return (
    <>
      {texto.slice(0, idx)}
      <strong>{texto.slice(idx, idx + query.length)}</strong>
      {texto.slice(idx + query.length)}
    </>
  );
}

function todayFormatted() {
  return new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function Recetas() {
  const { patients, recursos, recetasPorPaciente, setRecetasPaciente, cargarDatosPaciente, irAExpediente } =
    usePatientData();
  const medicos = recursos.filter((r) => r.tipo === "medico");

  const [patientId, setPatientId] = useState("");
  const [medico, setMedico] = useState(medicos[0]?.nombre ?? "");
  const [peso, setPeso] = useState("");
  const [estatura, setEstatura] = useState("");
  const [temperatura, setTemperatura] = useState("");
  const [alergias, setAlergias] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [busquedaMedicamento, setBusquedaMedicamento] = useState("");
  const [medicamentoParaConfirmar, setMedicamentoParaConfirmar] = useState<MedicamentoCatalogo | null>(null);
  const [textoConfirmar, setTextoConfirmar] = useState("");
  const [medicamentosRecetados, setMedicamentosRecetados] = useState<MedicamentoRecetado[]>([]);
  const [notas, setNotas] = useState("");
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState("");
  const [guardado, setGuardado] = useState(false);

  const patient = patients.find((p) => p.id === patientId) ?? null;
  const edad = patient ? calculateAge(patient.birthDate) : null;

  const coincidenciasMedicamento =
    busquedaMedicamento.trim().length > 0
      ? catalogoMedicamentos.filter((m) =>
          m.nombre.toLowerCase().includes(busquedaMedicamento.trim().toLowerCase())
        )
      : [];

  const seleccionarPaciente = (id: string) => {
    setPatientId(id);
    setGuardado(false);
    if (id) cargarDatosPaciente(id);
  };

  const abrirConfirmarMedicamento = (m: MedicamentoCatalogo) => {
    setMedicamentoParaConfirmar(m);
    setTextoConfirmar(`${m.nombre}\n${m.instrucciones}`);
  };

  const abrirNuevoMedicamento = () => {
    const nombre = busquedaMedicamento.trim();
    if (!nombre) return;
    setMedicamentoParaConfirmar({ nombre, instrucciones: "" });
    setTextoConfirmar(nombre);
  };

  const confirmarMedicamento = () => {
    if (!textoConfirmar.trim()) return;
    const [primeraLinea, ...resto] = textoConfirmar.split("\n");
    setMedicamentosRecetados((prev) => [
      ...prev,
      { id: `${Date.now()}`, nombre: primeraLinea.trim(), instrucciones: resto.join("\n").trim() },
    ]);
    setMedicamentoParaConfirmar(null);
    setTextoConfirmar("");
    setBusquedaMedicamento("");
  };

  const quitarMedicamento = (id: string) => {
    setMedicamentosRecetados((prev) => prev.filter((m) => m.id !== id));
  };

  const aplicarPlantilla = (texto: string) => {
    setPlantillaSeleccionada(texto);
    if (texto) setNotas((prev) => (prev.trim() ? `${prev.trim()}\n${texto}` : texto));
  };

  const puedeGuardar = Boolean(patientId) && medicamentosRecetados.length > 0;

  const nuevaReceta = () => {
    setPatientId("");
    setPeso("");
    setEstatura("");
    setTemperatura("");
    setAlergias("");
    setDiagnostico("");
    setMedicamentosRecetados([]);
    setNotas("");
    setPlantillaSeleccionada("");
    setGuardado(false);
  };

  const handleGuardar = () => {
    if (!puedeGuardar) return;
    const receta: Receta = {
      id: `${Date.now()}`,
      fecha: todayFormatted(),
      medico,
      peso,
      estatura,
      temperatura,
      alergias,
      diagnostico,
      medicamentos: medicamentosRecetados,
      notas,
    };
    setRecetasPaciente(patientId, (prev) => [receta, ...prev]);
    setGuardado(true);
  };

  const handleImprimir = () => {
    handleGuardar();
    window.print();
  };

  const handleEnviarWhatsApp = () => {
    if (!patient) return;
    handleGuardar();
    const lineas = [
      `Receta médica — ${patient.name}`,
      medico ? `Médico: ${medico}` : "",
      "",
      ...medicamentosRecetados.map((m) => `${m.nombre}${m.instrucciones ? `\n${m.instrucciones}` : ""}`),
      notas ? `\n${notas}` : "",
    ].filter(Boolean);
    const texto = encodeURIComponent(lineas.join("\n"));
    const telefono = patient.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${telefono}?text=${texto}`, "_blank");
  };

  const recetasPrevias = patientId ? recetasPorPaciente[patientId] ?? [] : [];

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6 print:hidden">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Médico</label>
            <select value={medico} onChange={(e) => setMedico(e.target.value)} className={inputClass}>
              {medicos.map((m) => (
                <option key={m.id} value={m.nombre}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Paciente</label>
            <select value={patientId} onChange={(e) => seleccionarPaciente(e.target.value)} className={inputClass}>
              <option value="">Selecciona un paciente...</option>
              {patients.map((p) => {
                const a = calculateAge(p.birthDate);
                return (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {a !== null ? ` - Edad: ${a} años` : ""}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Peso (Kg)</label>
            <input type="text" value={peso} onChange={(e) => setPeso(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Estatura (mts)</label>
            <input
              type="text"
              value={estatura}
              onChange={(e) => setEstatura(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Temperatura (°C)</label>
            <input
              type="text"
              value={temperatura}
              onChange={(e) => setTemperatura(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs font-medium text-ink/60">Alergias</label>
            <textarea
              value={alergias}
              onChange={(e) => setAlergias(e.target.value)}
              rows={1}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs font-medium text-ink/60">Diagnóstico</label>
            <textarea
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
              rows={1}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        <div className="relative">
          <label className="mb-1 block text-xs font-medium text-ink/60">Medicamento</label>
          <input
            type="text"
            value={busquedaMedicamento}
            onChange={(e) => setBusquedaMedicamento(e.target.value)}
            placeholder="Busca por nombre del medicamento..."
            className={inputClass}
          />
          {busquedaMedicamento.trim().length > 0 && (
            <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-edge/10 bg-field shadow-card">
              {coincidenciasMedicamento.map((m) => (
                <button
                  key={m.nombre}
                  onClick={() => abrirConfirmarMedicamento(m)}
                  className="block w-full border-b border-edge/5 px-3 py-2 text-left text-sm text-ink/80 last:border-0 hover:bg-surface"
                >
                  {resaltarCoincidencia(m.nombre, busquedaMedicamento.trim())}
                </button>
              ))}
              <button
                onClick={abrirNuevoMedicamento}
                className="block w-full px-3 py-2 text-left text-sm font-semibold text-accent hover:bg-surface"
              >
                + Nuevo medicamento
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Medicamentos recetados</label>
          {medicamentosRecetados.length === 0 ? (
            <div className="rounded-lg border border-dashed border-edge/15 p-4 text-center text-xs text-ink/40">
              Aún no has agregado medicamentos
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {medicamentosRecetados.map((m) => (
                <div key={m.id} className="rounded-lg border border-edge/10 p-3 text-sm">
                  <p className="font-medium text-ink">{m.nombre}</p>
                  {m.instrucciones && (
                    <p className="mt-0.5 whitespace-pre-line text-accent">{m.instrucciones}</p>
                  )}
                  <button
                    onClick={() => quitarMedicamento(m.id)}
                    className="mt-1 text-xs font-semibold text-danger hover:text-danger"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Notas y/o recomendaciones</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Plantillas recomendaciones</label>
            <select
              value={plantillaSeleccionada}
              onChange={(e) => aplicarPlantilla(e.target.value)}
              className={inputClass}
            >
              <option value="">:: Elija una plantilla ::</option>
              {plantillasRecomendaciones.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleGuardar}
            disabled={!puedeGuardar}
            className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar Receta
          </button>
          <button
            onClick={handleImprimir}
            disabled={!puedeGuardar}
            className="rounded-lg border border-edge/15 px-4 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-app disabled:cursor-not-allowed disabled:opacity-40"
          >
            Imprimir
          </button>
          <button
            onClick={handleEnviarWhatsApp}
            disabled={!puedeGuardar}
            className="rounded-lg border border-success/40 px-4 py-2.5 text-sm font-semibold text-success transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Enviar por WhatsApp
          </button>
          {patientId && (
            <button
              onClick={() => irAExpediente(patientId)}
              className="ml-auto text-sm font-medium text-ink/50 hover:text-ink"
            >
              Ir a paciente →
            </button>
          )}
          {guardado && (
            <>
              <span className="text-sm text-success">Receta guardada</span>
              <button onClick={nuevaReceta} className="text-sm font-medium text-accent hover:text-accent">
                + Nueva receta
              </button>
            </>
          )}
        </div>
      </div>

      {patientId && recetasPrevias.length > 0 && (
        <div className="print:hidden">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/60">
            Recetas anteriores de {patient?.name}
          </h3>
          <div className="space-y-2">
            {recetasPrevias.map((r) => (
              <div key={r.id} className="rounded-xl border border-edge/10 bg-surface p-3 text-sm">
                <p className="text-xs text-ink/40">
                  {r.fecha} · {r.medico}
                </p>
                <p className="mt-1 text-ink/70">{r.medicamentos.map((m) => m.nombre).join(", ")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receta imprimible */}
      {patient && medicamentosRecetados.length > 0 && (
        <div className="hidden rounded-2xl bg-white p-8 text-black print:block">
          <h2 className="text-center text-base font-bold uppercase tracking-wide">Receta Médica</h2>
          <p className="mt-3 text-sm">
            Paciente: <span className="font-medium">{patient.name}</span>
            {edad !== null && ` · Edad: ${edad} años`}
          </p>
          <p className="text-sm">
            Médico: <span className="font-medium">{medico}</span> · Fecha:{" "}
            <span className="font-medium">{todayFormatted()}</span>
          </p>
          {diagnostico && <p className="mt-2 text-sm">Diagnóstico: {diagnostico}</p>}
          {alergias && <p className="text-sm">Alergias: {alergias}</p>}
          <div className="mt-4 space-y-3 text-sm">
            {medicamentosRecetados.map((m) => (
              <div key={m.id}>
                <p className="font-semibold">{m.nombre}</p>
                {m.instrucciones && <p className="whitespace-pre-line">{m.instrucciones}</p>}
              </div>
            ))}
          </div>
          {notas && <p className="mt-4 whitespace-pre-line text-sm">{notas}</p>}
        </div>
      )}

      {medicamentoParaConfirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 print:hidden">
          <div className="w-full max-w-md rounded-2xl border border-edge/10 bg-modal p-6">
            <h3 className="text-base font-semibold text-ink">Medicamento para recetar</h3>
            <label className="mb-1 mt-4 block text-xs font-medium text-ink/60">Medicamento</label>
            <textarea
              value={textoConfirmar}
              onChange={(e) => setTextoConfirmar(e.target.value)}
              rows={4}
              className={`${inputClass} resize-none`}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setMedicamentoParaConfirmar(null)}
                className="rounded-lg border border-edge/15 px-4 py-2 text-sm font-semibold text-ink/80 hover:bg-surface"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarMedicamento}
                className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
              >
                Recetar medicamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
