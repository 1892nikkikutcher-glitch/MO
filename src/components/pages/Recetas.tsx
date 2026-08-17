"use client";

import { useEffect, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatNombreConEdad, type MedicamentoRecetado, type Receta } from "@/lib/patientData";
import { calcularDosisPediatrica, type MedicamentoCatalogo } from "@/lib/medicamentos";
import { generarRecetaPdf } from "@/lib/generarRecetaPdf";
import { slugify } from "@/lib/textoNombre";
import { coincideAlergia, condicionesSistemicasPositivas, esNegacionAlergia } from "@/lib/historiaClinica";

const plantillasRecomendaciones = [
  "Evitar alimentos duros o muy calientes durante las primeras 24 horas.",
  "Aplicar hielo local de forma intermitente las primeras 24 horas para reducir inflamación.",
  "Mantener buena higiene bucal; cepillado suave en la zona tratada.",
  "Acudir de inmediato en caso de sangrado abundante, fiebre o dolor que no cede con el analgésico.",
];

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

const sexoOptions = ["", "F", "M"];

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

function horaActualFormateada() {
  return new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}


function fechaLargaHoy() {
  const texto = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function Recetas() {
  const {
    patients,
    recursos,
    recetasPorPaciente,
    setRecetasPaciente,
    cargarDatosPaciente,
    irAExpediente,
    catalogoMedicamentos,
    perfilDoctor,
    consumirSiguienteFolioReceta,
    historiaClinicaPorPaciente,
    historiaClinicaTemplate,
  } = usePatientData();
  const medicos = recursos.filter((r) => r.tipo === "medico");

  const [patientId, setPatientId] = useState("");
  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [medico, setMedico] = useState(medicos[0]?.nombre ?? "");
  const [sexo, setSexo] = useState("");
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
  const [folioActual, setFolioActual] = useState<string | null>(null);
  const [horaActual, setHoraActual] = useState<string | null>(null);
  const [enviandoWhatsApp, setEnviandoWhatsApp] = useState(false);

  const patient = patients.find((p) => p.id === patientId) ?? null;
  const edad = patient ? calculateAge(patient.birthDate) : null;
  const alergiasHistoria = patientId ? historiaClinicaPorPaciente[patientId]?.alergias?.trim() ?? "" : "";
  const condicionesSistemicas = patientId
    ? condicionesSistemicasPositivas(
        historiaClinicaTemplate,
        historiaClinicaPorPaciente[patientId] ?? { porPregunta: {} }
      )
    : [];

  // Precarga el campo de alergias con lo capturado en la Historia Clínica del
  // paciente (llega de forma asíncrona desde Firestore) — solo si el campo
  // sigue vacío, para no pisar algo que el usuario ya haya escrito a mano.
  useEffect(() => {
    if (alergiasHistoria) setAlergias((prev) => prev || alergiasHistoria);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alergiasHistoria]);

  const coincidenciasMedicamento =
    busquedaMedicamento.trim().length > 0
      ? catalogoMedicamentos.filter((m) => m.nombre.toLowerCase().includes(busquedaMedicamento.trim().toLowerCase()))
      : [];

  const seleccionarPaciente = (id: string) => {
    const p = patients.find((pp) => pp.id === id);
    setPatientId(id);
    setBusquedaPaciente(p ? formatNombreConEdad(p.name, p.birthDate) : "");
    setGuardado(false);
    if (id) cargarDatosPaciente(id);
  };

  const cambiarPaciente = () => {
    setPatientId("");
    setBusquedaPaciente("");
    setGuardado(false);
  };

  const coincidenciasPaciente =
    !patientId && busquedaPaciente.trim().length > 0
      ? patients
          .filter((p) => p.name.toLowerCase().includes(busquedaPaciente.trim().toLowerCase()))
          .slice(0, 20)
      : [];

  const abrirConfirmarMedicamento = (m: MedicamentoCatalogo) => {
    setMedicamentoParaConfirmar(m);
    if (m.tipoPaciente === "adulto") {
      setTextoConfirmar(`${m.nombre}\n${[m.dosisFrecuencia, m.periodo].filter(Boolean).join(". ")}`);
    } else {
      const pesoNum = Number(peso);
      const resultado = calcularDosisPediatrica(m, pesoNum);
      setTextoConfirmar(resultado ? `${m.nombre}\n${resultado.texto}` : `${m.nombre}\nCaptura el peso del paciente para calcular la dosis.`);
    }
  };

  const abrirNuevoMedicamento = () => {
    const nombre = busquedaMedicamento.trim();
    if (!nombre) return;
    setMedicamentoParaConfirmar({ id: "nuevo", nombre, tipoPaciente: "adulto" });
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
    setBusquedaPaciente("");
    setSexo("");
    setPeso("");
    setEstatura("");
    setTemperatura("");
    setAlergias("");
    setDiagnostico("");
    setMedicamentosRecetados([]);
    setNotas("");
    setPlantillaSeleccionada("");
    setGuardado(false);
    setFolioActual(null);
    setHoraActual(null);
  };

  const handleGuardar = () => {
    if (!puedeGuardar) return;
    const folio = folioActual ?? consumirSiguienteFolioReceta();
    const hora = horaActual ?? horaActualFormateada();
    if (!folioActual) setFolioActual(folio);
    if (!horaActual) setHoraActual(hora);
    const receta: Receta = {
      id: `${Date.now()}`,
      folio,
      fecha: todayFormatted(),
      hora,
      medico,
      edadTexto: edad !== null ? String(edad) : "",
      sexo,
      peso,
      estatura,
      temperatura,
      alergias,
      diagnostico,
      medicamentos: medicamentosRecetados,
      notas,
    };
    setRecetasPaciente(patientId, (prev) => [receta, ...prev.filter((r) => r.folio !== folio)]);
    setGuardado(true);
  };

  const handleImprimir = () => {
    handleGuardar();
    if (patient) {
      const tituloOriginal = document.title;
      document.title = `Receta_${slugify(patient.name)}_${slugify(todayFormatted())}`;
      const restaurarTitulo = () => {
        document.title = tituloOriginal;
        window.removeEventListener("afterprint", restaurarTitulo);
      };
      window.addEventListener("afterprint", restaurarTitulo);
    }
    window.print();
  };

  const handleEnviarWhatsApp = async () => {
    if (!patient || enviandoWhatsApp) return;
    // Se abre la pestaña de inmediato, de forma síncrona dentro del clic, porque
    // window.open() después de esperar la generación del PDF pierde el gesto de
    // usuario y el navegador lo bloquea como pop-up. Se navega una vez listo el PDF.
    const ventanaWhatsApp = window.open("", "_blank");
    handleGuardar();
    const folio = folioActual ?? consumirSiguienteFolioReceta();
    const hora = horaActual ?? horaActualFormateada();
    const nombreArchivo = `Receta_${slugify(patient.name)}_${slugify(todayFormatted())}.pdf`;
    const caption = `Receta médica — ${patient.name} · Folio ${folio} · ${todayFormatted()} ${hora}`;
    const telefono = patient.phone.replace(/\D/g, "");

    setEnviandoWhatsApp(true);
    try {
      const blob = await generarRecetaPdf({
        folio,
        fecha: todayFormatted(),
        hora,
        fechaLarga: fechaLargaHoy(),
        medico,
        pacienteNombre: patient.name,
        edadTexto: edad !== null ? String(edad) : "",
        sexo,
        estatura,
        temperatura,
        peso,
        diagnostico,
        alergias,
        medicamentos: medicamentosRecetados,
        notas,
        perfilDoctor,
      });
      const archivo = new File([blob], nombreArchivo, { type: "application/pdf" });

      if (navigator.canShare?.({ files: [archivo] })) {
        ventanaWhatsApp?.close(); // no se usa la pestaña — el share sheet nativo adjunta el PDF directamente
        try {
          await navigator.share({ files: [archivo], title: nombreArchivo, text: caption });
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return; // el usuario canceló el share sheet
          throw err;
        }
        return;
      }

      // En escritorio no existe forma de adjuntar un archivo a un chat de WhatsApp
      // mediante un link — se descarga el PDF y se abre WhatsApp con el texto para
      // que el usuario lo adjunte manualmente.
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombreArchivo;
      enlace.click();
      URL.revokeObjectURL(url);
      const waUrl = `https://wa.me/${telefono}?text=${encodeURIComponent(`${caption}\n\n(Adjunta el PDF que se acaba de descargar)`)}`;
      if (ventanaWhatsApp) ventanaWhatsApp.location.href = waUrl;
      else window.open(waUrl, "_blank");
    } catch (err) {
      console.error("No se pudo generar el PDF de la receta", err);
      ventanaWhatsApp?.close();
      alert("No se pudo generar el PDF de la receta. Intenta de nuevo.");
    } finally {
      setEnviandoWhatsApp(false);
    }
  };

  const recetasPrevias = patientId ? recetasPorPaciente[patientId] ?? [] : [];
  const esMedicamentoPediatrico = medicamentoParaConfirmar?.tipoPaciente === "pediatrico";

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
          <div className="relative">
            <label className="mb-1 block text-xs font-medium text-ink/60">Paciente</label>
            {patientId ? (
              <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm">
                <span className="text-ink">{busquedaPaciente}</span>
                <button
                  type="button"
                  onClick={cambiarPaciente}
                  className="text-xs font-semibold text-success hover:text-success"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={busquedaPaciente}
                  onChange={(e) => setBusquedaPaciente(e.target.value)}
                  placeholder="Escribe el nombre completo del paciente..."
                  className={inputClass}
                />
                {coincidenciasPaciente.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-edge/10 bg-modal shadow-card">
                    {coincidenciasPaciente.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => seleccionarPaciente(p.id)}
                        className="block w-full border-b border-edge/5 px-3 py-2 text-left text-sm text-ink/80 last:border-0 hover:bg-surface"
                      >
                        {resaltarCoincidencia(formatNombreConEdad(p.name, p.birthDate), busquedaPaciente.trim())}
                      </button>
                    ))}
                  </div>
                )}
                {busquedaPaciente.trim().length > 0 && coincidenciasPaciente.length === 0 && (
                  <p className="mt-1.5 text-xs text-ink/40">
                    No se encontró ningún paciente con &quot;{busquedaPaciente.trim()}&quot;.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {alergiasHistoria && !esNegacionAlergia(alergiasHistoria) && (
          <div className="flex items-start gap-3 rounded-2xl border border-danger bg-danger/15 p-4 text-sm text-danger">
            <span className="mt-0.5 text-lg">⚠️</span>
            <p>
              <span className="font-bold uppercase tracking-wide">Alergias: </span>
              {alergiasHistoria} — verifica antes de recetar.
            </p>
          </div>
        )}

        {condicionesSistemicas.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-accent bg-accent/15 p-4 text-sm text-accent">
            <span className="mt-0.5 text-lg">⚕️</span>
            <div>
              <span className="font-bold uppercase tracking-wide">
                Diagnóstico sistémico / antecedentes relevantes:{" "}
              </span>
              {condicionesSistemicas
                .map((c) => (c.detalle === "Sí" ? c.etiqueta : `${c.etiqueta}: ${c.detalle}`))
                .join(" · ")}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Sexo</label>
            <select value={sexo} onChange={(e) => setSexo(e.target.value)} className={inputClass}>
              {sexoOptions.map((s) => (
                <option key={s} value={s}>
                  {s || "—"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Peso (Kg)</label>
            <input
              type="text"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              placeholder="Ej. 18"
              className={inputClass}
              title="Se usa para calcular la dosis de medicamentos pediátricos"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Estatura (mts)</label>
            <input type="text" value={estatura} onChange={(e) => setEstatura(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Temperatura (°C)</label>
            <input type="text" value={temperatura} onChange={(e) => setTemperatura(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs font-medium text-ink/60">Alergias</label>
            <textarea value={alergias} onChange={(e) => setAlergias(e.target.value)} rows={1} className={`${inputClass} resize-none`} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs font-medium text-ink/60">Diagnóstico</label>
            <textarea value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} rows={1} className={`${inputClass} resize-none`} />
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
            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-edge/10 bg-modal shadow-card">
              {coincidenciasMedicamento.map((m) => (
                <button
                  key={m.id}
                  onClick={() => abrirConfirmarMedicamento(m)}
                  className="flex w-full items-center justify-between border-b border-edge/5 px-3 py-2 text-left text-sm text-ink/80 last:border-0 hover:bg-surface"
                >
                  <span>{resaltarCoincidencia(m.nombre, busquedaMedicamento.trim())}</span>
                  {m.tipoPaciente === "pediatrico" && (
                    <span className="ml-2 shrink-0 rounded-full bg-info/10 px-2 py-0.5 text-[10px] font-semibold text-info">
                      Pediátrico
                    </span>
                  )}
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
              {medicamentosRecetados.map((m, i) => (
                <div key={m.id} className="rounded-lg border border-edge/10 p-3 text-sm">
                  <p className="font-medium text-ink">
                    {i + 1}. {m.nombre}
                  </p>
                  {m.instrucciones && <p className="mt-0.5 whitespace-pre-line text-accent">{m.instrucciones}</p>}
                  <button onClick={() => quitarMedicamento(m.id)} className="mt-1 text-xs font-semibold text-danger hover:text-danger">
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
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Plantillas recomendaciones</label>
            <select value={plantillaSeleccionada} onChange={(e) => aplicarPlantilla(e.target.value)} className={inputClass}>
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
          {!guardado && (
            <button
              onClick={handleGuardar}
              disabled={!puedeGuardar}
              className="rounded-lg border border-accent/60 bg-accent/15 px-4 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Guardar Receta
            </button>
          )}
          <button
            onClick={handleImprimir}
            disabled={!puedeGuardar}
            className="rounded-lg border border-edge/15 px-4 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-app disabled:cursor-not-allowed disabled:opacity-40"
          >
            Imprimir
          </button>
          <button
            onClick={handleEnviarWhatsApp}
            disabled={!puedeGuardar || enviandoWhatsApp}
            className="rounded-lg border border-success/40 px-4 py-2.5 text-sm font-semibold text-success transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enviandoWhatsApp ? "Generando PDF…" : "Enviar por WhatsApp"}
          </button>
          {patientId && (
            <button onClick={() => irAExpediente(patientId)} className="ml-auto text-sm font-medium text-ink/50 hover:text-ink">
              Ir a paciente →
            </button>
          )}
          {guardado && (
            <>
              <span className="text-sm text-success">Receta guardada · Folio {folioActual}</span>
              <button onClick={nuevaReceta} className="text-sm font-medium text-accent hover:text-accent">
                + Nueva receta
              </button>
            </>
          )}
        </div>
      </div>

      {patientId && recetasPrevias.length > 0 && (
        <div className="print:hidden">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/60">Recetas anteriores de {patient?.name}</h3>
          <div className="space-y-2">
            {recetasPrevias.map((r) => (
              <div key={r.id} className="rounded-xl border border-edge/10 bg-surface p-3 text-sm">
                <p className="text-xs text-ink/40">
                  Folio {r.folio} · {r.fecha} · {r.medico}
                </p>
                <p className="mt-1 text-ink/70">{r.medicamentos.map((m) => m.nombre).join(", ")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receta imprimible — formato tipo COPRISEM */}
      {patient && medicamentosRecetados.length > 0 && (
        <div className="hidden border-4 border-black bg-white p-8 text-black print:block">
          <div className="flex items-start justify-between">
            <div className="w-24 shrink-0 text-center">
              {perfilDoctor.logoEscuelaUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={perfilDoctor.logoEscuelaUrl} alt="" className="mx-auto h-20 w-20 object-contain" />
              )}
              {perfilDoctor.escuelaEgreso && (
                <p className="mt-1 text-[9px] font-semibold leading-tight">{perfilDoctor.escuelaEgreso}</p>
              )}
            </div>
            <div className="flex-1 text-center">
              <p className="text-xl font-bold">{perfilDoctor.nombre || medico}</p>
              {perfilDoctor.cedulaProfesional && <p className="text-sm">Ced. Prof. {perfilDoctor.cedulaProfesional}</p>}
              {perfilDoctor.especialidad && <p className="text-sm">{perfilDoctor.especialidad}</p>}
            </div>
            <div className="w-24 shrink-0 text-right text-xs">
              {perfilDoctor.logoClinicaUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={perfilDoctor.logoClinicaUrl} alt="" className="ml-auto h-16 w-16 object-contain" />
              )}
              <p className="mt-1 font-semibold text-accent">Folio: {folioActual}</p>
              <p className="mt-1 font-semibold">{fechaLargaHoy()}</p>
              {horaActual && <p className="text-gray-600">{horaActual} hrs</p>}
            </div>
          </div>

          <p className="mt-6 text-sm">
            <span className="font-semibold">Nombre del paciente:</span> {patient.name}{" "}
            <span className="font-semibold">Edad:</span> {edad ?? "—"}{" "}
            <span className="font-semibold">Sexo:</span> {sexo || "—"}{" "}
            <span className="font-semibold">Talla:</span> {estatura || "—"}{" "}
            <span className="font-semibold">Temperatura:</span> {temperatura || "—"}{" "}
            <span className="font-semibold">Peso:</span> {peso || "—"}
          </p>
          {diagnostico && <p className="text-sm">Diagnóstico: {diagnostico}</p>}
          {alergias && <p className="text-sm">Alergias: {alergias}</p>}

          <p className="mt-4 text-base font-semibold">Rx.</p>
          <div className="mt-2 space-y-3 text-sm">
            {medicamentosRecetados.map((m, i) => (
              <div key={m.id}>
                <p className="font-semibold">
                  {i + 1}-{m.nombre}
                </p>
                {m.instrucciones && <p className="whitespace-pre-line">{m.instrucciones}</p>}
              </div>
            ))}
          </div>
          {notas && <p className="mt-4 whitespace-pre-line text-sm">{notas}</p>}

          <div className="mt-16 flex items-end justify-between">
            {perfilDoctor.textoValidezReceta && (
              <p className="text-sm underline">{perfilDoctor.textoValidezReceta}</p>
            )}
            <div className="text-center text-xs">
              {perfilDoctor.firmaDigitalUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={perfilDoctor.firmaDigitalUrl} alt="" className="mx-auto h-10 object-contain" />
              )}
              <div className="mb-1 w-40 border-b border-black" />
              Firma médico
            </div>
          </div>

          {perfilDoctor.direccionClinica && (
            <p className="mt-8 text-center text-xs">{perfilDoctor.direccionClinica}</p>
          )}
        </div>
      )}

      {medicamentoParaConfirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 print:hidden">
          <div className="w-full max-w-md rounded-2xl border border-edge/10 bg-modal p-6">
            <h3 className="text-base font-semibold text-ink">Medicamento para recetar</h3>
            {(() => {
              const conflicto = coincideAlergia(alergias, medicamentoParaConfirmar.nombre);
              if (conflicto.length === 0) return null;
              return (
                <p className="mt-2 flex items-start gap-2 rounded-lg border border-danger bg-danger/20 px-3 py-2 text-xs font-semibold text-danger">
                  <span>⚠️</span>
                  <span>
                    ¡Cuidado! El paciente es alérgico a &quot;{conflicto.join(", ")}&quot; y este
                    medicamento coincide. Verifica antes de recetar.
                  </span>
                </p>
              );
            })()}
            {esMedicamentoPediatrico && (
              <p className="mt-2 rounded-lg bg-info/10 px-3 py-2 text-xs text-info">
                Dosis calculada con el peso capturado ({peso || "sin capturar"} kg). Verifica siempre antes de
                recetar — es una referencia, no sustituye tu criterio clínico.
              </p>
            )}
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
                className="rounded-lg border border-accent/60 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/25"
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
