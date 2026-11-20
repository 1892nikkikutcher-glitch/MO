"use client";

import { useEffect, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import ConsentimientoInformado from "./ConsentimientoInformado";
import ConsentimientoEspecialidad from "./ConsentimientoEspecialidad";
import ConstanciaPermanencia from "./ConstanciaPermanencia";
import HojaIndicaciones from "./HojaIndicaciones";
import AvisoPrivacidad from "./AvisoPrivacidad";
import DocumentosPago, { type TipoDocumentoPago } from "./DocumentosPago";
import { formatNombreConEdad } from "@/lib/patientData";
import { FORMATOS_FLUJO, type FormatoFlujo } from "@/lib/flujoFormatos";
import { consumirDocumentoPendiente } from "@/lib/documentoPendiente";
import type { TipoHojaIndicaciones } from "@/lib/hojasIndicaciones";
import {
  consentimientosEspecialidad,
  type TipoConsentimientoEspecialidad,
} from "@/lib/consentimientosEspecialidad";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

type TipoDocumento =
  | "consentimiento"
  | "constancia"
  | "avisoPrivacidad"
  | TipoDocumentoPago
  | TipoHojaIndicaciones
  | TipoConsentimientoEspecialidad;

function esDocumentoPago(tipo: TipoDocumento): tipo is TipoDocumentoPago {
  return tipo === "acuerdoPago" || tipo === "contratoServicios" || tipo === "carnetPaciente";
}

function esConsentimientoEspecialidad(tipo: TipoDocumento): tipo is TipoConsentimientoEspecialidad {
  return tipo in consentimientosEspecialidad;
}

const documentosDisponibles: { tipo: TipoDocumento; titulo: string; descripcion: string }[] = [
  {
    tipo: "consentimiento",
    titulo: "Consentimiento Informado",
    descripcion: "Carta general para autorizar un procedimiento clínico, con espacio para firma y testigos.",
  },
  {
    tipo: "constancia",
    titulo: "Constancia de Permanencia",
    descripcion: "Certifica la presencia del paciente en el consultorio, para escuela o trabajo.",
  },
  {
    tipo: "avisoPrivacidad",
    titulo: "Aviso de Privacidad",
    descripcion: "Documento legal sobre el tratamiento de datos personales, conforme a la LFPDPPP.",
  },
  {
    tipo: "consentimientoUsoImagen",
    titulo: "Consentimiento Informado — Uso de Imagen",
    descripcion: "Autoriza el uso de fotografías o videos del paciente en redes sociales y materiales de difusión.",
  },
  {
    tipo: "acuerdoPago",
    titulo: "Acuerdo de Pago",
    descripcion: "Para montos menores: anticipo, pagos y fechas acordadas con el paciente, con cantidad en letra y firma.",
  },
  {
    tipo: "contratoServicios",
    titulo: "Contrato de Prestación de Servicios",
    descripcion: "Para tratamientos de monto mayor: objeto, honorarios y calendario de pagos, garantía, rescisión y testigos.",
  },
  {
    tipo: "carnetPaciente",
    titulo: "Carnet del Paciente",
    descripcion: "Tarjeta con datos del paciente y sus próximas citas, con filas libres para anotar a mano.",
  },
  {
    tipo: "protesis",
    titulo: "Indicaciones — Prótesis",
    descripcion: "Hoja de cuidados para pacientes con tratamiento de prótesis.",
  },
  {
    tipo: "ortodoncia",
    titulo: "Indicaciones — Ortodoncia",
    descripcion: "Hoja de cuidados para pacientes con brackets o aparatos de ortodoncia.",
  },
  {
    tipo: "cirugiaBucal",
    titulo: "Indicaciones — Cirugía Bucal",
    descripcion: "Cuidados posteriores a una extracción u otro procedimiento quirúrgico.",
  },
  {
    tipo: "odontopediatria",
    titulo: "Indicaciones — Odontopediatría",
    descripcion: "Hoja de cuidados para padres o tutores de pacientes pediátricos.",
  },
  {
    tipo: "consentimientoOrtodoncia",
    titulo: "Consentimiento Informado — Ortodoncia",
    descripcion: "Autoriza el tratamiento de ortodoncia, con los riesgos propios de la especialidad.",
  },
  {
    tipo: "consentimientoCirugiaBucal",
    titulo: "Consentimiento Informado — Cirugía Bucal",
    descripcion: "Autoriza extracciones u otros procedimientos quirúrgicos bucales.",
  },
  {
    tipo: "consentimientoEndodoncia",
    titulo: "Consentimiento Informado — Endodoncia",
    descripcion: "Autoriza el tratamiento de conductos, con sus riesgos y posibles complicaciones.",
  },
  {
    tipo: "consentimientoOdontopediatria",
    titulo: "Consentimiento Informado — Odontopediatría",
    descripcion: "Autorización del padre, madre o tutor para el tratamiento dental infantil.",
  },
  {
    tipo: "consentimientoProtesisDental",
    titulo: "Consentimiento Informado — Prótesis Dental",
    descripcion: "Autoriza el tratamiento de rehabilitación con prótesis dental.",
  },
  {
    tipo: "consentimientoConclusionOrtodoncia",
    titulo: "Consentimiento — Conclusión de Tratamiento de Ortodoncia",
    descripcion: "Cierra la fase activa del tratamiento y deja constancia del compromiso de retención.",
  },
  {
    tipo: "consentimientoConformidadProtesis",
    titulo: "Acuerdo de Conformidad — Prótesis Dental",
    descripcion: "El paciente confirma haber recibido la prótesis a satisfacción.",
  },
];

/** Formatos del flujo del consultorio que no son una hoja para imprimir desde aquí: unos ya
 * viven dentro de MO (el expediente, Recetas, Encuestas…) y se abren desde su tarjeta; otros
 * todavía no existen y salen como "Próximamente". Cuál es cuál lo decide `FORMATOS_FLUJO`
 * (src/lib/flujoFormatos.ts), la misma fuente que usa la pestaña "Flujo de formatos". */
const formatosSinHoja: { clave: string; titulo: string; descripcion: string }[] = [
  {
    clave: "datosGenerales",
    titulo: "Datos Generales del Paciente",
    descripcion: "Ficha de identificación del paciente con copia de su INE.",
  },
  {
    clave: "estudioSocioeconomico",
    titulo: "Estudio Socioeconómico",
    descripcion: "Cuestionario para conocer la situación económica del paciente y su familia.",
  },
  {
    clave: "historiaClinica",
    titulo: "Historia Clínica",
    descripcion: "Antecedentes médicos y odontológicos del paciente.",
  },
  {
    clave: "diagnosticoTratamiento",
    titulo: "Diagnóstico y Tratamiento",
    descripcion: "Diagnóstico del caso y plan de tratamiento propuesto.",
  },
  {
    clave: "presupuesto",
    titulo: "Presupuesto Odontológico",
    descripcion: "Costo de cada tratamiento del plan, para entregar al paciente.",
  },
  {
    clave: "calendarioCitas",
    titulo: "Calendario de Citas",
    descripcion: "Calendario impreso con las citas programadas del paciente.",
  },
  {
    clave: "seguimientoCita",
    titulo: "Seguimiento de Cita",
    descripcion: "Control de asistencia, evolución y reprogramaciones de cada cita.",
  },
  {
    clave: "notasEvolucion",
    titulo: "Notas de Evolución",
    descripcion: "Registro por cita de lo realizado y la evolución del paciente.",
  },
  {
    clave: "receta",
    titulo: "Receta Médico Odontológica",
    descripcion: "Receta con los medicamentos indicados al paciente.",
  },
  {
    clave: "historialPagos",
    titulo: "Historial de Pagos",
    descripcion: "Pagos, abonos y saldo pendiente del paciente.",
  },
  {
    clave: "formatoLaboratorio",
    titulo: "Formato para Laboratorio Dental",
    descripcion: "Orden de trabajo para enviar al laboratorio dental.",
  },
  {
    clave: "encuestaSatisfaccion",
    titulo: "Encuesta de Satisfacción",
    descripcion: "Opinión del paciente sobre la atención recibida al terminar su tratamiento.",
  },
];

/** Etapas del flujo de formatos del consultorio, en orden. Cada clave es un `tipo` de
 * `documentosDisponibles` o una `clave` de `documentosProximos`. Lo que no esté en ninguna
 * etapa se muestra al final en "Otros documentos". */
const etapasFlujo: { titulo: string; claves: string[] }[] = [
  {
    titulo: "Admisión",
    claves: ["datosGenerales", "estudioSocioeconomico", "avisoPrivacidad", "consentimientoUsoImagen"],
  },
  {
    titulo: "Historia clínica y diagnóstico",
    claves: [
      "historiaClinica",
      "consentimiento",
      "diagnosticoTratamiento",
      "presupuesto",
      "acuerdoPago",
      "contratoServicios",
    ],
  },
  {
    titulo: "Consentimientos específicos",
    claves: [
      "consentimientoOrtodoncia",
      "consentimientoCirugiaBucal",
      "consentimientoEndodoncia",
      "consentimientoProtesisDental",
      "consentimientoOdontopediatria",
    ],
  },
  {
    titulo: "Ejecución clínica y seguimiento",
    claves: [
      "carnetPaciente",
      "calendarioCitas",
      "seguimientoCita",
      "notasEvolucion",
      "receta",
      "historialPagos",
      "formatoLaboratorio",
    ],
  },
  {
    titulo: "Finalización del tratamiento",
    claves: ["consentimientoConclusionOrtodoncia", "consentimientoConformidadProtesis", "encuestaSatisfaccion"],
  },
];

type TarjetaDocumento =
  | { clave: string; titulo: string; descripcion: string; tipo: TipoDocumento; formato?: undefined }
  | { clave: string; titulo: string; descripcion: string; tipo: null; formato: FormatoFlujo };

const tarjetasPorClave = new Map<string, TarjetaDocumento>([
  ...documentosDisponibles.map((d): [string, TarjetaDocumento] => [d.tipo, { ...d, clave: d.tipo }]),
  ...formatosSinHoja.flatMap((d): [string, TarjetaDocumento][] => {
    const formato = FORMATOS_FLUJO.find((f) => f.clave === d.clave);
    return formato ? [[d.clave, { ...d, tipo: null, formato }]] : [];
  }),
]);

const clavesEnEtapas = new Set(etapasFlujo.flatMap((e) => e.claves));

const etapasConDocumentos: { titulo: string; tarjetas: TarjetaDocumento[] }[] = [
  ...etapasFlujo.map((e) => ({
    titulo: e.titulo,
    tarjetas: e.claves.flatMap((c) => tarjetasPorClave.get(c) ?? []),
  })),
  {
    titulo: "Otros documentos",
    tarjetas: documentosDisponibles.filter((d) => !clavesEnEtapas.has(d.tipo)).map((d) => ({ ...d, clave: d.tipo })),
  },
];

export default function Documentos() {
  const { patients, irAExpediente, irAPagina } = usePatientData();
  const [patientId, setPatientId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [documentoActivo, setDocumentoActivo] = useState<TipoDocumento | null>(null);

  // Viene de "Generar" en el Flujo de formatos del expediente: abre ese documento ya con el paciente elegido.
  useEffect(() => {
    const pendiente = consumirDocumentoPendiente();
    if (!pendiente) return;
    const documento = documentosDisponibles.find((d) => d.tipo === pendiente.tipo);
    if (!documento || !patients.some((p) => p.id === pendiente.patientId)) return;
    setPatientId(pendiente.patientId);
    setDocumentoActivo(documento.tipo);
    // Solo al entrar a la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patient = patients.find((p) => p.id === patientId) ?? null;

  const coincidencias =
    !patientId && searchText.trim().length > 0
      ? patients.filter((p) => p.name.toLowerCase().includes(searchText.trim().toLowerCase()))
      : [];

  if (patient && documentoActivo) {
    const onVolver = () => setDocumentoActivo(null);
    if (documentoActivo === "consentimiento") {
      return <ConsentimientoInformado patient={patient} onVolver={onVolver} />;
    }
    if (documentoActivo === "constancia") {
      return <ConstanciaPermanencia patient={patient} onVolver={onVolver} />;
    }
    if (documentoActivo === "avisoPrivacidad") {
      return <AvisoPrivacidad onVolver={onVolver} />;
    }
    if (esDocumentoPago(documentoActivo)) {
      return <DocumentosPago patient={patient} tipo={documentoActivo} onVolver={onVolver} />;
    }
    if (esConsentimientoEspecialidad(documentoActivo)) {
      return <ConsentimientoEspecialidad patient={patient} tipo={documentoActivo} onVolver={onVolver} />;
    }
    return <HojaIndicaciones patient={patient} tipo={documentoActivo} onVolver={onVolver} />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <label className="mb-1 block text-xs font-medium text-ink/60">Paciente</label>
        {patient ? (
          <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm">
            <span className="text-ink">{formatNombreConEdad(patient.name, patient.birthDate)}</span>
            <button
              onClick={() => {
                setPatientId("");
                setSearchText("");
              }}
              className="text-xs font-semibold text-success hover:text-success"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar paciente por nombre..."
              className={inputClass}
            />
            {coincidencias.length > 0 && (
              <div className="mt-1.5 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-edge/10 bg-field p-1.5">
                {coincidencias.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPatientId(p.id);
                      setSearchText("");
                    }}
                    className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-ink/80 hover:bg-surface"
                  >
                    {formatNombreConEdad(p.name, p.birthDate)}
                    <span className="ml-2 text-xs text-ink/40">{p.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {searchText.trim().length > 0 && coincidencias.length === 0 && (
              <p className="mt-2 text-xs text-ink/40">No se encontró ningún paciente con ese nombre.</p>
            )}
            <p className="mt-2 text-xs text-ink/40">Elige un paciente para poder generar sus documentos.</p>
          </>
        )}
      </div>

      {etapasConDocumentos
        .filter((etapa) => etapa.tarjetas.length > 0)
        .map((etapa) => (
          <div key={etapa.titulo}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/60">{etapa.titulo}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {etapa.tarjetas.map((doc) => {
                const tipo = doc.tipo;
                if (tipo === null && doc.formato.modo !== "proximamente") {
                  // Ya vive dentro de MO: la tarjeta lleva al lugar donde se llena.
                  const { pestana, pagina } = doc.formato;
                  const lugar = pestana ? `expediente → ${pestana}` : pagina === "recetas" ? "Recetas" : "Reportes → Encuestas";
                  return (
                    <button
                      key={doc.clave}
                      onClick={() => {
                        if (pestana && patient) irAExpediente(patient.id, pestana);
                        else if (pagina) irAPagina(pagina);
                      }}
                      disabled={!!pestana && !patient}
                      className="rounded-2xl border border-edge/10 bg-surface p-5 text-left transition-colors hover:border-accent/40 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-ink">{doc.titulo}</p>
                        <span className="shrink-0 rounded-full border border-success/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
                          Ya en MO
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-ink/50">{doc.descripcion}</p>
                      <p className="mt-2 text-xs font-medium text-accent">Se llena en {lugar}</p>
                    </button>
                  );
                }
                if (tipo === null) {
                  return (
                    <div
                      key={doc.clave}
                      aria-disabled="true"
                      className="rounded-2xl border border-dashed border-edge/10 bg-surface p-5 text-left opacity-60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-ink">{doc.titulo}</p>
                        <span className="shrink-0 rounded-full border border-accent/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                          Próximamente
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-ink/50">{doc.descripcion}</p>
                    </div>
                  );
                }
                return (
                  <button
                    key={doc.clave}
                    onClick={() => patient && setDocumentoActivo(tipo)}
                    disabled={!patient}
                    className="rounded-2xl border border-edge/10 bg-surface p-5 text-left transition-colors hover:border-accent/40 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <p className="text-sm font-semibold text-ink">{doc.titulo}</p>
                    <p className="mt-1 text-xs text-ink/50">{doc.descripcion}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}
