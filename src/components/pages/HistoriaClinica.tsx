"use client";

import { useState } from "react";
import Odontograma from "./Odontograma";

type SiNo = "" | "si" | "no";

const antecedentesPatologicosList = [
  "Enfermedades del corazón",
  "Presión alta o baja",
  "Hepatitis, otras enfermedades del hígado",
  "Problemas del estómago, úlceras, gastritis",
  "Alergias: drogas, alimentos, medicamentos, anestesia",
  "SIDA",
  "Tumores, cáncer",
  "Anemia u otra enfermedad de la sangre, especificar",
  "Enfermedades venéreas (sífilis, gonorrea, etc.)",
  "Herpes",
  "Diabetes",
];

const atmList = [
  "Ruidos al abrir o cerrar la boca",
  "Dolor a la apertura",
  "Dolor al cierre",
  "Dificultad para abrir la boca",
];

const gangliosGrupo1 = ["Palpables", "Único", "Adherido", "Múltiple", "Móvil"];
const gangliosGrupo2 = ["Supuración", "Unilateral", "Duro", "Bilateral", "Blando"];

const higieneUtiliza = [
  "Hilo dental",
  "Cepillos interproximales",
  "Palillos dentales",
  "Dentífrico",
  "Enjuague",
];

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
        <span className="text-accent">{number}.</span> {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink/60">{label}</label>
      {children}
    </div>
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`${inputClass} resize-none`}
    />
  );
}

function SiNoRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: SiNo;
  onChange: (v: SiNo) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-edge/5 py-2 last:border-0">
      <span className="text-sm text-ink/70">{label}</span>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => onChange(value === "si" ? "" : "si")}
          className={`h-7 w-12 rounded-md border text-xs font-semibold transition-colors ${
            value === "si"
              ? "border-success bg-success/15 text-success"
              : "border-edge/15 text-ink/40 hover:border-edge/30"
          }`}
        >
          SI
        </button>
        <button
          type="button"
          onClick={() => onChange(value === "no" ? "" : "no")}
          className={`h-7 w-12 rounded-md border text-xs font-semibold transition-colors ${
            value === "no"
              ? "border-danger bg-danger/15 text-danger"
              : "border-edge/15 text-ink/40 hover:border-edge/30"
          }`}
        >
          NO
        </button>
      </div>
    </div>
  );
}

function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              isSelected
                ? "border-accent bg-accent/15 text-accent"
                : "border-edge/15 text-ink/50 hover:border-accent/40 hover:text-ink"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export default function HistoriaClinica() {
  const [motivoConsulta, setMotivoConsulta] = useState("");

  const [antecedentesPatologicos, setAntecedentesPatologicos] = useState<Record<string, SiNo>>(
    () => Object.fromEntries(antecedentesPatologicosList.map((item) => [item, ""]))
  );

  const [antecedentesNoPatologicos, setAntecedentesNoPatologicos] = useState("");

  const [medicamentos, setMedicamentos] = useState("");
  const [alcohol, setAlcohol] = useState<SiNo>("");
  const [tabaco, setTabaco] = useState<SiNo>("");
  const [drogas, setDrogas] = useState<SiNo>("");

  const [anticonceptivos, setAnticonceptivos] = useState<SiNo>("");
  const [hormonas, setHormonas] = useState<SiNo>("");
  const [embarazada, setEmbarazada] = useState<SiNo>("");
  const [mesesEmbarazo, setMesesEmbarazo] = useState("");

  const [tensionArterial, setTensionArterial] = useState("");
  const [temperatura, setTemperatura] = useState("");
  const [frecuenciaCardiaca, setFrecuenciaCardiaca] = useState("");
  const [frecuenciaRespiratoria, setFrecuenciaRespiratoria] = useState("");

  const [pielCara, setPielCara] = useState("");
  const [peso, setPeso] = useState("");
  const [talla, setTalla] = useState("");

  const [atm, setAtm] = useState<Record<string, SiNo>>(() =>
    Object.fromEntries(atmList.map((item) => [item, ""]))
  );
  const [ganglios, setGanglios] = useState<string[]>([]);
  const [labios, setLabios] = useState("");
  const [lengua, setLengua] = useState("");
  const [regionVestibular, setRegionVestibular] = useState("");
  const [tejidosBlandos, setTejidosBlandos] = useState("");
  const [tejidosDuros, setTejidosDuros] = useState("");

  const [examenOclusion, setExamenOclusion] = useState("");

  const [odontogramaTeeth, setOdontogramaTeeth] = useState<number[]>([]);

  const [seCepilla, setSeCepilla] = useState<SiNo>("");
  const [frecuenciaCepillado, setFrecuenciaCepillado] = useState("");
  const [higieneUtilizaSeleccion, setHigieneUtilizaSeleccion] = useState<string[]>([]);
  const [porcentajePlaca, setPorcentajePlaca] = useState("");
  const [porcentajeSarro, setPorcentajeSarro] = useState("");

  const [otraEnfermedad, setOtraEnfermedad] = useState("");
  const [diagnosticoSistemico, setDiagnosticoSistemico] = useState("");
  const [diagnosticoBucal, setDiagnosticoBucal] = useState("");

  const [planTratamiento, setPlanTratamiento] = useState<{ id: string; texto: string }[]>([]);
  const [nuevoPuntoPlan, setNuevoPuntoPlan] = useState("");

  const [saved, setSaved] = useState(false);

  const toggleTooth = (tooth: number) => {
    setOdontogramaTeeth((prev) =>
      prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth]
    );
    setSaved(false);
  };

  const toggleGanglio = (option: string) => {
    setGanglios((prev) =>
      prev.includes(option) ? prev.filter((g) => g !== option) : [...prev, option]
    );
    setSaved(false);
  };

  const toggleHigieneUtiliza = (option: string) => {
    setHigieneUtilizaSeleccion((prev) =>
      prev.includes(option) ? prev.filter((h) => h !== option) : [...prev, option]
    );
    setSaved(false);
  };

  const handleAgregarPuntoPlan = () => {
    if (!nuevoPuntoPlan.trim()) return;
    setPlanTratamiento((prev) => [...prev, { id: `${Date.now()}`, texto: nuevoPuntoPlan.trim() }]);
    setNuevoPuntoPlan("");
    setSaved(false);
  };

  const handleQuitarPuntoPlan = (id: string) => {
    setPlanTratamiento((prev) => prev.filter((p) => p.id !== id));
    setSaved(false);
  };

  return (
    <div className="space-y-6">
      <Section number="II" title="Motivo de Consulta">
        <TextArea
          value={motivoConsulta}
          onChange={(v) => {
            setMotivoConsulta(v);
            setSaved(false);
          }}
          placeholder="Describe el motivo de la consulta..."
        />
      </Section>

      <Section number="III" title="Antecedentes Patológicos. Usted presenta:">
        <div>
          {antecedentesPatologicosList.map((item) => (
            <SiNoRow
              key={item}
              label={item}
              value={antecedentesPatologicos[item]}
              onChange={(v) => {
                setAntecedentesPatologicos((prev) => ({ ...prev, [item]: v }));
                setSaved(false);
              }}
            />
          ))}
        </div>
      </Section>

      <Section number="IV" title="Antecedentes No Patológicos">
        <TextArea
          value={antecedentesNoPatologicos}
          onChange={(v) => {
            setAntecedentesNoPatologicos(v);
            setSaved(false);
          }}
        />
      </Section>

      <Section number="V" title="Medicación: ¿Está usted tomando…?">
        <Field label="Medicamentos">
          <input
            type="text"
            value={medicamentos}
            onChange={(e) => {
              setMedicamentos(e.target.value);
              setSaved(false);
            }}
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <SiNoRow label="Alcohol" value={alcohol} onChange={(v) => { setAlcohol(v); setSaved(false); }} />
          <SiNoRow label="Tabaco" value={tabaco} onChange={(v) => { setTabaco(v); setSaved(false); }} />
          <SiNoRow label="Drogas" value={drogas} onChange={(v) => { setDrogas(v); setSaved(false); }} />
        </div>
      </Section>

      <Section number="VI" title="Antecedentes Gineco – Obstétricos">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <SiNoRow
            label="¿Se controla con anticonceptivos?"
            value={anticonceptivos}
            onChange={(v) => { setAnticonceptivos(v); setSaved(false); }}
          />
          <SiNoRow label="¿Toma hormonas?" value={hormonas} onChange={(v) => { setHormonas(v); setSaved(false); }} />
          <SiNoRow
            label="¿Está usted embarazada?"
            value={embarazada}
            onChange={(v) => { setEmbarazada(v); setSaved(false); }}
          />
          <Field label="¿De cuántos meses?">
            <input
              type="text"
              value={mesesEmbarazo}
              onChange={(e) => {
                setMesesEmbarazo(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section number="VII" title="Signos Vitales">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tensión arterial">
            <input
              type="text"
              placeholder="Ej. 120/80"
              value={tensionArterial}
              onChange={(e) => {
                setTensionArterial(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Temperatura">
            <input
              type="text"
              placeholder="°C"
              value={temperatura}
              onChange={(e) => {
                setTemperatura(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Frecuencia cardiaca">
            <input
              type="text"
              placeholder="lpm"
              value={frecuenciaCardiaca}
              onChange={(e) => {
                setFrecuenciaCardiaca(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Frecuencia respiratoria">
            <input
              type="text"
              placeholder="rpm"
              value={frecuenciaRespiratoria}
              onChange={(e) => {
                setFrecuenciaRespiratoria(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section number="VIII" title="Exploración Física">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Piel de la cara">
            <input
              type="text"
              value={pielCara}
              onChange={(e) => {
                setPielCara(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Peso">
            <input
              type="text"
              placeholder="kg"
              value={peso}
              onChange={(e) => {
                setPeso(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Talla">
            <input
              type="text"
              placeholder="cm"
              value={talla}
              onChange={(e) => {
                setTalla(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section number="IX" title="Examen Clínico Estomatológico">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
            Articulación temporomandibular
          </h4>
          {atmList.map((item) => (
            <SiNoRow
              key={item}
              label={item}
              value={atm[item]}
              onChange={(v) => {
                setAtm((prev) => ({ ...prev, [item]: v }));
                setSaved(false);
              }}
            />
          ))}
        </div>

        <div className="border-t border-edge/10 pt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
            Ganglios
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ChipGroup options={gangliosGrupo1} selected={ganglios} onToggle={toggleGanglio} />
            <ChipGroup options={gangliosGrupo2} selected={ganglios} onToggle={toggleGanglio} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-edge/10 pt-4 sm:grid-cols-2">
          <Field label="Labios">
            <input
              type="text"
              value={labios}
              onChange={(e) => {
                setLabios(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Lengua">
            <input
              type="text"
              value={lengua}
              onChange={(e) => {
                setLengua(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Región vestibular">
            <input
              type="text"
              value={regionVestibular}
              onChange={(e) => {
                setRegionVestibular(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Tejidos blandos">
            <input
              type="text"
              value={tejidosBlandos}
              onChange={(e) => {
                setTejidosBlandos(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Tejidos duros">
            <input
              type="text"
              value={tejidosDuros}
              onChange={(e) => {
                setTejidosDuros(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section number="X" title="Examen de Oclusión">
        <TextArea
          value={examenOclusion}
          onChange={(v) => {
            setExamenOclusion(v);
            setSaved(false);
          }}
        />
      </Section>

      <div>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink/60">
          <span className="text-accent">XI.</span> Odontograma
        </h3>
        <Odontograma selectedTeeth={odontogramaTeeth} onToggleTooth={toggleTooth} title="" />
      </div>

      <Section number="XII" title="Higiene Bucal">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SiNoRow
            label="¿Se cepilla usted los dientes?"
            value={seCepilla}
            onChange={(v) => { setSeCepilla(v); setSaved(false); }}
          />
          <Field label="Frecuencia diaria del cepillado">
            <input
              type="text"
              placeholder="Ej. 3 veces al día"
              value={frecuenciaCepillado}
              onChange={(e) => {
                setFrecuenciaCepillado(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </Field>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-ink/60">Usted utiliza</label>
          <ChipGroup
            options={higieneUtiliza}
            selected={higieneUtilizaSeleccion}
            onToggle={toggleHigieneUtiliza}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Porcentaje de placa">
            <input
              type="text"
              placeholder="%"
              value={porcentajePlaca}
              onChange={(e) => {
                setPorcentajePlaca(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Porcentaje de sarro">
            <input
              type="text"
              placeholder="%"
              value={porcentajeSarro}
              onChange={(e) => {
                setPorcentajeSarro(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section
        number="XIII"
        title="Si usted padece otra enfermedad que no se mencione en la historia clínica o tiene algún otro padecimiento, especifique:"
      >
        <TextArea
          value={otraEnfermedad}
          onChange={(v) => {
            setOtraEnfermedad(v);
            setSaved(false);
          }}
        />
      </Section>

      <Section number="XIV" title="Diagnóstico Sistémico">
        <TextArea
          value={diagnosticoSistemico}
          onChange={(v) => {
            setDiagnosticoSistemico(v);
            setSaved(false);
          }}
        />
      </Section>

      <Section number="XV" title="Diagnóstico Bucal">
        <TextArea
          value={diagnosticoBucal}
          onChange={(v) => {
            setDiagnosticoBucal(v);
            setSaved(false);
          }}
        />
      </Section>

      <Section number="XVI" title="Plan de Tratamiento por Prioridad">
        <div className="space-y-2">
          {planTratamiento.map((punto, index) => (
            <div
              key={punto.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-edge/10 bg-inset px-3 py-2 text-sm"
            >
              <span className="text-ink">
                <span className="mr-2 font-semibold text-accent">{index + 1}.</span>
                {punto.texto}
              </span>
              <button
                onClick={() => handleQuitarPuntoPlan(punto.id)}
                className="text-ink/30 hover:text-danger"
                title="Quitar"
              >
                ✕
              </button>
            </div>
          ))}
          {planTratamiento.length === 0 && (
            <p className="text-sm text-ink/30">Aún no hay puntos en el plan de tratamiento.</p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={nuevoPuntoPlan}
            onChange={(e) => setNuevoPuntoPlan(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAgregarPuntoPlan();
              }
            }}
            placeholder="Ej. Extracción de OD 18, seguido de resina en OD 16..."
            className={inputClass}
          />
          <button
            onClick={handleAgregarPuntoPlan}
            className="shrink-0 rounded-lg border border-accent/40 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
          >
            + Agregar
          </button>
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setSaved(true)}
          className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Guardar Historia Clínica
        </button>
        {saved && <span className="text-sm text-success">Cambios guardados</span>}
      </div>
    </div>
  );
}
