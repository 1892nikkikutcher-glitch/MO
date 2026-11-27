"use client";

import { useEffect, useState } from "react";
import Odontograma from "./Odontograma";
import PresupuestoImpreso from "./PresupuestoImpreso";
import { usePatientData } from "@/context/PatientDataContext";
import { sonEquivalentes } from "@/lib/deepEqual";
import {
  agruparPorEspecialidad,
  especialidadesPredefinidas,
  especialidadVigente,
  esEspecialidadPredefinida,
  esProcedimientoActivo,
  type Procedimiento,
} from "@/lib/procedimientos";
import { generarPresupuestoPdf } from "@/lib/generarPresupuestoPdf";
import { enviarPdfPorWhatsapp } from "@/lib/enviarPdfWhatsapp";
import AbrirWhatsAppPrompt from "@/components/AbrirWhatsAppPrompt";
import AvisoNoCabeEnHoja from "@/components/AvisoNoCabeEnHoja";
import { normalizarTexto } from "@/lib/reportes";
import { slugify } from "@/lib/textoNombre";
import { calcularFechaVigencia } from "@/lib/presupuestoVigencia";
import { prioridadTratamientoLabel } from "@/lib/planTratamiento";
import type { PresupuestoPrefillItem } from "@/lib/historiaClinica";
import { telefonoConsultorioDe } from "@/lib/telefonoConsultorio";
import { identidadDoctorDe, unidadCobroLabel, unidadCobroOptions, type BudgetData, type LineItem, type Patient, type UnidadCobro } from "@/lib/patientData";
import { cantidadDeCobro } from "@/lib/cuentaPaciente";
import { medicoPredeterminadoParaPago } from "@/lib/medicoDelPago";
import { toISODate } from "@/lib/agendaHelpers";

const VIGENCIA_DIAS_DEFECTO = 30;

export type { BudgetData };

const tiposDePrecios = ["Consultorio", "Convenio", "Particular", "Seguro Dental"];

/** Arcada, superficie y sesión se cobran por la cantidad que se indique; diente depende de los dientes marcados;
 * procedimiento completo y paquete son un precio fijo. */
const unidadPideCantidad = (u?: UnidadCobro) => u === "arcada" || u === "superficie" || u === "sesion";

function formatCurrency(value: number) {
  return `$${value.toLocaleString("es-MX")}`;
}

function generateFolio() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function todayFormatted() {
  return new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fechaLargaHoy() {
  const texto = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Borrador local (solo en este navegador, nunca en Firestore) para no
 * perder renglones capturados si se va la luz o la señal antes de dar clic
 * en "Guardar" — un presupuesto es un documento formal (folio, se manda a
 * imprimir/WhatsApp), así que a diferencia de Historia Clínica NUNCA se
 * autoguarda como definitivo mientras se sigue editando. */
type PresupuestoBorrador = {
  items: LineItem[];
  medico: string;
  tipoDePrecio: string;
  especialidad: string;
  vigenciaDias: number;
  guardadoEn: string;
};

function presupuestoBorradorKey(patientId: string, folioOEditando: string) {
  return `mo:presupuesto-borrador:${patientId}:${folioOEditando}`;
}

export default function NuevoPresupuesto({
  patient,
  initialBudget,
  planTratamientoSugerido,
  prefillItems,
  onCancel,
  onSave,
}: {
  patient: Patient;
  initialBudget?: BudgetData;
  planTratamientoSugerido?: string;
  /** Renglones ya prellenados desde un PlanTratamientoItem confirmado (ver
   * Historia Clínica → "Crear plan de tratamiento" → "Incluir en
   * presupuesto"/"Crear cotización") — nacen con el precio ya confirmado
   * del catálogo si hubo match, o en $0 ("Falta precio") si no. Ignorado si
   * se está editando un presupuesto existente. */
  prefillItems?: PresupuestoPrefillItem[];
  onCancel: () => void;
  onSave: (budget: BudgetData) => void;
}) {
  const patientName = patient.name;
  const { recursos, citas, procedimientos, setProcedimientos, perfilDoctor, clinicInfo, irAPagina, setCambiosSinGuardar, miRol } =
    usePatientData();
  const medicos = recursos.filter((r) => r.tipo === "medico");
  const procedimientosActivos = procedimientos.filter(esProcedimientoActivo);
  const gruposProcedimientos = agruparPorEspecialidad(procedimientosActivos);
  const [enviandoWhatsApp, setEnviandoWhatsApp] = useState(false);
  const [waUrlPendiente, setWaUrlPendiente] = useState<string | null>(null);

  const isEditing = Boolean(initialBudget);
  const [folio] = useState(() => initialBudget?.folio ?? generateFolio());
  const [fecha] = useState(() => initialBudget?.fecha ?? todayFormatted());
  // Con varios médicos en la clínica el de partida es el del paciente (responsable, cita de hoy o última cita), no el
  // primero de la lista: el médico del presupuesto define a quién se le atribuye el trabajo.
  const [medico, setMedico] = useState(
    () =>
      initialBudget?.medico ??
      (medicoPredeterminadoParaPago({
        patientId: patient.id,
        medicoResponsableId: patient.medicoResponsableId,
        recursos,
        citas,
        hoyISO: toISODate(new Date()),
      }) || medicos[0]?.nombre) ??
      ""
  );
  const [tipoDePrecio, setTipoDePrecio] = useState(initialBudget?.tipoDePrecio ?? tiposDePrecios[0]);
  const [especialidad, setEspecialidad] = useState(
    especialidadVigente(initialBudget?.especialidad ?? especialidadesPredefinidas[0])
  );
  const diagnostico = initialBudget?.diagnostico ?? "";
  const [vigenciaDias, setVigenciaDias] = useState(initialBudget?.vigenciaDias ?? VIGENCIA_DIAS_DEFECTO);
  const [notaProcedimiento, setNotaProcedimiento] = useState("");
  /** Se pueden marcar varios procedimientos a la vez (ej. acceso e
   * instrumentación + instrumentación y obturación + corona, todo en el
   * mismo OD 16) — "Agregar procedimiento" los agrega como renglones
   * independientes de una sola vez, todos con los mismos dientes marcados. */
  const [procedimientosSeleccionadosIds, setProcedimientosSeleccionadosIds] = useState<string[]>([]);
  const toggleProcedimientoSeleccionado = (id: string) => {
    setProcedimientosSeleccionadosIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const [busquedaProcedimiento, setBusquedaProcedimiento] = useState("");
  const terminoBusquedaProcedimiento = normalizarTexto(busquedaProcedimiento);
  const gruposProcedimientosFiltrados = terminoBusquedaProcedimiento
    ? gruposProcedimientos
        .map((grupo) => ({
          ...grupo,
          procedimientos: grupo.procedimientos.filter((p) =>
            normalizarTexto(p.nombre).includes(terminoBusquedaProcedimiento)
          ),
        }))
        .filter((grupo) => grupo.procedimientos.length > 0)
    : gruposProcedimientos;
  const [personalizadoNombre, setPersonalizadoNombre] = useState("");
  const [personalizadoPrecio, setPersonalizadoPrecio] = useState("");
  const [mostrarPersonalizado, setMostrarPersonalizado] = useState(false);
  const [personalizadoUnidad, setPersonalizadoUnidad] = useState<UnidadCobro>("diente");
  const [personalizadoIncluye, setPersonalizadoIncluye] = useState("");
  /** Guardar un concepto único en el catálogo es una decisión aparte (y solo del administrador): por defecto el
   * concepto vale solo para este presupuesto. */
  const [guardarEnCatalogo, setGuardarEnCatalogo] = useState(false);
  const puedeGuardarEnCatalogo = miRol === "admin";
  const [cantidadManual, setCantidadManual] = useState("");
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [descuentoPct, setDescuentoPct] = useState("");
  const [items, setItems] = useState<LineItem[]>(
    () =>
      initialBudget?.items ??
      // Mismo criterio que agregarItem/actualizarItem más abajo: el precio
      // del catálogo es SIEMPRE por diente, así que se multiplica por la
      // cantidad de dientes del diagnóstico (ej. resina en OD 45,43,41 =
      // 3 × precio unitario) — antes este renglón nacía con el precio de
      // un solo diente sin importar cuántos venían marcados.
      (prefillItems ?? []).map((p) => {
        const cantidad = Math.max(p.teeth.length, 1);
        const precioUnitario = p.precioConfirmado ?? 0;
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          procedure: p.procedure,
          price: Math.round(precioUnitario * cantidad * 100) / 100,
          precioUnitario,
          cantidad,
          teeth: p.teeth,
          note: p.note,
          origenClinico: { diagnosticoId: p.diagnosticoId, planTratamientoItemId: p.planTratamientoItemId, prioridad: p.prioridad },
        };
      })
  );
  /** Id del renglón que se está editando (null = capturando uno nuevo). La
   * edición reutiliza el mismo formulario de "procedimiento no catalogado"
   * (nombre + precio libres) sin importar si el renglón se agregó
   * originalmente desde el catálogo o no — así se puede corregir cualquier
   * renglón, por ejemplo para agregar el OD que se te olvidó marcar. */
  const [editandoItemId, setEditandoItemId] = useState<string | null>(null);

  const borradorKey = presupuestoBorradorKey(patient.id, initialBudget?.folio ?? "nuevo");
  const [borradorRecuperable, setBorradorRecuperable] = useState<PresupuestoBorrador | null>(null);
  const [decisionBorradorTomada, setDecisionBorradorTomada] = useState(false);

  // Al abrir el formulario, si hay un borrador local más reciente que lo que
  // se cargó (ej. se cerró el navegador sin dar "Guardar"), se ofrece
  // recuperarlo en vez de aplicarlo solo — un presupuesto es un documento
  // formal y el doctor debe decidir, nunca se reemplaza en silencio.
  useEffect(() => {
    try {
      const crudo = localStorage.getItem(borradorKey);
      if (crudo) {
        const parsed = JSON.parse(crudo) as PresupuestoBorrador;
        if (parsed.items?.length > 0 && !sonEquivalentes(parsed.items, items)) {
          setBorradorRecuperable(parsed);
          return;
        }
      }
    } catch {
      // Borrador corrupto o localStorage inaccesible — se ignora, no bloquea el formulario.
    }
    setDecisionBorradorTomada(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const continuarBorrador = () => {
    if (!borradorRecuperable) return;
    setItems(borradorRecuperable.items);
    setMedico(borradorRecuperable.medico);
    setTipoDePrecio(borradorRecuperable.tipoDePrecio);
    setEspecialidad(borradorRecuperable.especialidad);
    setVigenciaDias(borradorRecuperable.vigenciaDias);
    setBorradorRecuperable(null);
    setDecisionBorradorTomada(true);
  };

  const descartarBorrador = () => {
    try {
      localStorage.removeItem(borradorKey);
    } catch {
      // no crítico
    }
    setBorradorRecuperable(null);
    setDecisionBorradorTomada(true);
  };

  // Guarda el borrador local a cada cambio — nunca a Firestore, para no
  // crear de golpe un presupuesto "oficial" a medio capturar.
  useEffect(() => {
    if (!decisionBorradorTomada) return;
    try {
      if (items.length === 0) {
        localStorage.removeItem(borradorKey);
      } else {
        const borrador: PresupuestoBorrador = {
          items,
          medico,
          tipoDePrecio,
          especialidad,
          vigenciaDias,
          guardadoEn: new Date().toISOString(),
        };
        localStorage.setItem(borradorKey, JSON.stringify(borrador));
      }
    } catch {
      // Almacenamiento local lleno o inaccesible — no crítico, "Guardar" sigue guardando el presupuesto real.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisionBorradorTomada, items, medico, tipoDePrecio, especialidad, vigenciaDias]);

  // Avisa antes de salir (cambiar de pestaña dentro del expediente, o
  // volver al listado) si hay renglones capturados que no se han guardado
  // con el botón "Guardar" — mismo mecanismo que Historia Clínica.
  const hayCambiosSinGuardar =
    decisionBorradorTomada &&
    items.length > 0 &&
    (!initialBudget || !sonEquivalentes(items, initialBudget.items));
  useEffect(() => {
    setCambiosSinGuardar(hayCambiosSinGuardar ? "Presupuesto tiene cambios sin guardar." : null);
    return () => setCambiosSinGuardar(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hayCambiosSinGuardar]);

  const toggleTooth = (tooth: number) => {
    setSelectedTeeth((prev) =>
      prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth]
    );
  };

  /** Cuánto se cobra depende de la unidad del procedimiento (ver cantidadDeCobro): por diente multiplica por los
   * dientes marcados; un paquete o un procedimiento completo es un precio fijo aunque se marquen varios dientes
   * (quedan como información clínica); arcada, superficie y sesión usan la cantidad que se indique. */
  const procedimientosSeleccionados = procedimientos.filter((p) =>
    procedimientosSeleccionadosIds.includes(p.id)
  );
  const unidadActual: UnidadCobro | undefined = mostrarPersonalizado
    ? personalizadoUnidad
    : procedimientosSeleccionados.length === 1
      ? procedimientosSeleccionados[0].unidadCobro
      : undefined;
  const multiplicadorDe = (unidad?: UnidadCobro) =>
    cantidadDeCobro(unidad, selectedTeeth.length, Number(cantidadManual) || undefined);
  const precioUnitarioDelCatalogo =
    procedimientosSeleccionados.length === 1 ? procedimientosSeleccionados[0].costoPaciente : undefined;
  const multiplicador = multiplicadorDe(unidadActual);
  const pideCantidad =
    procedimientosSeleccionados.some((p) => unidadPideCantidad(p.unidadCobro)) ||
    (mostrarPersonalizado && unidadPideCantidad(personalizadoUnidad));
  const palabraUnidad = (n: number) => (n === 1 ? "unidad" : !unidadActual || unidadActual === "diente" ? "dientes" : "unidades");

  const limpiarCaptura = () => {
    setSelectedTeeth([]);
    setDescuentoPct("");
    setNotaProcedimiento("");
    setCantidadManual("");
  };

  const agregarItem = (procedure: string, precioUnitario: number, unidad?: UnidadCobro, incluye?: string[]) => {
    const descuento = Math.min(100, Math.max(0, Number(descuentoPct) || 0));
    const cantidad = multiplicadorDe(unidad);
    const precioTotal = Math.round(precioUnitario * cantidad * (1 - descuento / 100) * 100) / 100;
    setItems((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        procedure,
        price: precioTotal,
        precioUnitario,
        cantidad,
        descuentoPct: descuento,
        teeth: selectedTeeth,
        note: notaProcedimiento.trim(),
        ...(unidad && unidad !== "diente" ? { unidadCobro: unidad } : {}),
        ...(incluye && incluye.length > 0 ? { incluye } : {}),
      },
    ]);
    limpiarCaptura();
  };

  /** Igual que agregarItem pero reemplaza un renglón existente en vez de
   * añadir uno — misma fórmula de precio (cantidad × descuento). */
  const actualizarItem = (id: string, procedure: string, precioUnitario: number, unidad?: UnidadCobro, incluye?: string[]) => {
    const descuento = Math.min(100, Math.max(0, Number(descuentoPct) || 0));
    const cantidad = multiplicadorDe(unidad);
    const precioTotal = Math.round(precioUnitario * cantidad * (1 - descuento / 100) * 100) / 100;
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const { unidadCobro: _u, incluye: _i, ...base } = it;
        return {
          ...base,
          procedure,
          price: precioTotal,
          precioUnitario,
          cantidad,
          descuentoPct: descuento,
          teeth: selectedTeeth,
          note: notaProcedimiento.trim(),
          ...(unidad && unidad !== "diente" ? { unidadCobro: unidad } : {}),
          ...(incluye && incluye.length > 0 ? { incluye } : {}),
        };
      })
    );
    limpiarCaptura();
  };

  const iniciarEdicionItem = (item: LineItem) => {
    setEditandoItemId(item.id);
    setSelectedTeeth(item.teeth);
    setNotaProcedimiento(item.note);
    setDescuentoPct(item.descuentoPct ? String(item.descuentoPct) : "");
    setPersonalizadoNombre(item.procedure);
    setPersonalizadoPrecio(String(item.precioUnitario ?? item.price));
    setPersonalizadoUnidad(item.unidadCobro ?? "diente");
    setPersonalizadoIncluye((item.incluye ?? []).join(", "));
    setCantidadManual(unidadPideCantidad(item.unidadCobro) ? String(item.cantidad ?? 1) : "");
    setProcedimientosSeleccionadosIds([]);
    setMostrarPersonalizado(true);
  };

  const cancelarEdicionOPersonalizado = () => {
    setMostrarPersonalizado(false);
    setPersonalizadoNombre("");
    setPersonalizadoPrecio("");
    setPersonalizadoUnidad("diente");
    setPersonalizadoIncluye("");
    setGuardarEnCatalogo(false);
    if (editandoItemId) {
      setEditandoItemId(null);
      limpiarCaptura();
    }
  };

  const handleAgregarDelCatalogo = () => {
    if (procedimientosSeleccionados.length === 0) return;
    procedimientosSeleccionados.forEach((procedimiento) => {
      agregarItem(procedimiento.nombre, procedimiento.costoPaciente, procedimiento.unidadCobro);
    });
    setProcedimientosSeleccionadosIds([]);
  };

  /** Un concepto que no está en el catálogo vale solo para este presupuesto. Guardarlo en el catálogo es una decisión
   * aparte (solo el administrador): queda con el costo al odontólogo "sin configurar", no en $0. */
  const guardarProcedimientoNoCatalogadoEnCatalogo = (nombre: string, costoPaciente: number, unidad: UnidadCobro) => {
    const yaExiste = procedimientos.some(
      (p) => p.nombre.trim().toLowerCase() === nombre.toLowerCase()
    );
    if (yaExiste) return;
    const nuevo: Procedimiento = {
      id: `nocat${Date.now()}`,
      nombre,
      especialidad,
      costoPaciente,
      costoOdontologo: 0,
      costoSinConfigurar: true,
      duracionMinutos: 30,
      ...(unidad !== "diente" ? { unidadCobro: unidad } : {}),
    };
    setProcedimientos((prev) => [...prev, nuevo]);
  };

  const handleAgregarPersonalizado = () => {
    const nombre = personalizadoNombre.trim();
    const precio = Number(personalizadoPrecio);
    if (!nombre || !precio) return;
    const incluye = personalizadoUnidad === "paquete" ? personalizadoIncluye.split(/[,\n]/).map((t) => t.trim()).filter(Boolean) : undefined;
    if (editandoItemId) {
      actualizarItem(editandoItemId, nombre, precio, personalizadoUnidad, incluye);
      setEditandoItemId(null);
    } else {
      agregarItem(nombre, precio, personalizadoUnidad, incluye);
      if (guardarEnCatalogo && puedeGuardarEnCatalogo) guardarProcedimientoNoCatalogadoEnCatalogo(nombre, precio, personalizadoUnidad);
    }
    setPersonalizadoNombre("");
    setPersonalizadoPrecio("");
    setPersonalizadoUnidad("diente");
    setPersonalizadoIncluye("");
    setGuardarEnCatalogo(false);
    setMostrarPersonalizado(false);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const total = items.reduce((sum, item) => sum + item.price, 0);
  // Un renglón en $0 es "falta precio" salvo que sea una cortesía o garantía a propósito (descuento del 100 %),
  // por ejemplo atender sin costo una complicación del propio tratamiento.
  const esCortesia = (item: LineItem) => item.price === 0 && (item.descuentoPct ?? 0) >= 100;
  const hayRenglonesSinPrecio = items.some((item) => item.price === 0 && !esCortesia(item));

  const handleGuardar = () => {
    if (items.length === 0 || hayRenglonesSinPrecio) return;
    try {
      localStorage.removeItem(borradorKey);
    } catch {
      // no crítico
    }
    onSave({
      folio,
      fecha,
      medico,
      tipoDePrecio,
      especialidad,
      diagnostico,
      items,
      total,
      vigenciaDias,
      fechaVigenciaHasta: calcularFechaVigencia(fecha, vigenciaDias),
    });
  };

  const handleImprimir = () => {
    const tituloOriginal = document.title;
    document.title = `Presupuesto_${slugify(patientName)}_${slugify(fecha)}`;
    const restaurarTitulo = () => {
      document.title = tituloOriginal;
      window.removeEventListener("afterprint", restaurarTitulo);
    };
    window.addEventListener("afterprint", restaurarTitulo);
    window.print();
  };

  const handleEnviarWhatsApp = async () => {
    if (enviandoWhatsApp) return;
    const ventanaWhatsApp = window.open("", "_blank");
    const nombreArchivo = `Presupuesto_${slugify(patientName)}_${slugify(fecha)}.pdf`;
    const caption = `Plan de tratamiento — ${patientName} · Folio ${folio} · Total ${formatCurrency(total)}`;

    setEnviandoWhatsApp(true);
    try {
      const blob = await generarPresupuestoPdf({
        folio,
        fechaLarga: fechaLargaHoy(),
        medico,
        pacienteNombre: patientName,
        pacienteCorreo: patient.email ?? "",
        pacienteTelefono: patient.phone,
        diagnostico,
        items,
        total,
        identidadDoctor: identidadDoctorDe(medico, recursos),
        perfilDoctor,
        telefonoConsultorio: telefonoConsultorioDe(medico, recursos, clinicInfo?.telefono),
      });
      const resultado = await enviarPdfPorWhatsapp({
        blob,
        nombreArchivo,
        telefono: patient.phone,
        caption,
        ventanaPrevia: ventanaWhatsApp,
      });
      if (resultado.requiereAbrirManualmente) setWaUrlPendiente(resultado.waUrl);
    } catch (err) {
      console.error("No se pudo generar el PDF del presupuesto", err);
      ventanaWhatsApp?.close();
      alert("No se pudo generar el PDF del presupuesto. Intenta de nuevo.");
    } finally {
      setEnviandoWhatsApp(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-sm font-medium text-accent hover:text-accent print:hidden"
      >
        ← Volver a Presupuestos
      </button>

      <div className="print:hidden">
        <h2 className="text-xl font-semibold text-ink">
          {isEditing ? "Editar Presupuesto" : "Nuevo Presupuesto"}
        </h2>
        <p className="mt-1 text-sm text-ink/50">Paciente: {patientName}</p>
      </div>

      {borradorRecuperable && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm text-ink print:hidden">
          <span className="flex-1">
            Encontramos un presupuesto sin guardar de este paciente ({borradorRecuperable.items.length}{" "}
            {borradorRecuperable.items.length === 1 ? "renglón" : "renglones"}, guardado localmente el{" "}
            {new Date(borradorRecuperable.guardadoEn).toLocaleString("es-MX")}). ¿Continuar donde te quedaste?
          </span>
          <button
            onClick={continuarBorrador}
            className="shrink-0 rounded-lg border border-accent/60 bg-accent/15 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/25"
          >
            Continuar borrador
          </button>
          <button
            onClick={descartarBorrador}
            className="shrink-0 rounded-lg border border-edge/15 px-3 py-2 text-xs font-semibold text-ink/60 hover:bg-surface2"
          >
            Descartar
          </button>
        </div>
      )}

      <div className="space-y-6 print:hidden">
        <div className="space-y-5 rounded-2xl border border-edge/10 bg-surface p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Médico que presupuesta
            </label>
            <select
              value={medico}
              onChange={(e) => setMedico(e.target.value)}
              className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
            >
              {medicos.map((m) => (
                <option key={m.id} value={m.nombre}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">
                Tipos de precios
              </label>
              <select
                value={tipoDePrecio}
                onChange={(e) => setTipoDePrecio(e.target.value)}
                className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
              >
                {tiposDePrecios.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">
                Materias o especialidades
              </label>
              <select
                value={especialidad}
                onChange={(e) => setEspecialidad(e.target.value)}
                className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
              >
                {/* Un presupuesto viejo puede traer una rama que ya no es base (ej. Radiología): se conserva para no perderla. */}
                {(esEspecialidadPredefinida(especialidad) || !especialidad ? [...especialidadesPredefinidas] : [...especialidadesPredefinidas, especialidad]).map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60" title="Después de esta fecha, se avisa que conviene verificar que los precios sigan vigentes.">
                Vigencia (días)
              </label>
              <input
                type="number"
                min={1}
                value={vigenciaDias}
                onChange={(e) => setVigenciaDias(Math.max(1, Number(e.target.value) || VIGENCIA_DIAS_DEFECTO))}
                className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
              />
            </div>
          </div>

        </div>

        <Odontograma selectedTeeth={selectedTeeth} onToggleTooth={toggleTooth} hideSummary />

        <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Órganos dentales a trabajar
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-edge/10 bg-field px-3 py-2 focus-within:border-accent/60">
              {selectedTeeth.length > 0 && (
                <span className="shrink-0 rounded-md bg-accent/15 px-2 py-1 text-xs font-semibold text-accent">
                  OD {[...selectedTeeth].sort((a, b) => a - b).join(", ")}
                </span>
              )}
              <input
                type="text"
                value={notaProcedimiento}
                onChange={(e) => setNotaProcedimiento(e.target.value)}
                placeholder={
                  selectedTeeth.length > 0
                    ? "Detalle clínico opcional, ej. caries y resina clase I"
                    : "Marca dientes en el odontograma de abajo, o describe aquí (ej. OD 16 caries y resina clase I)"
                }
                className="w-full min-w-0 flex-1 bg-transparent text-sm text-ink placeholder-ink/30 outline-none"
              />
            </div>
          </div>

          {procedimientosActivos.length === 0 ? (
            <p className="rounded-lg border border-dashed border-edge/15 p-3 text-xs text-ink/40">
              Aún no hay procedimientos en tu catálogo — configúralos en{" "}
              <button
                onClick={() => irAPagina("administracion-procedimientos")}
                className="font-semibold text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
              >
                Administración → Procedimientos
              </button>{" "}
              para que aparezcan aquí. Por ahora puedes agregar uno personalizado.
            </p>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">
                Listado de procedimiento
              </label>
              <p className="mb-1.5 text-[11px] text-ink/40">
                Marca uno o varios — por ejemplo, acceso e instrumentación + instrumentación y
                obturación + corona, todo en el mismo diente.
              </p>
              <input
                type="text"
                value={busquedaProcedimiento}
                onChange={(e) => setBusquedaProcedimiento(e.target.value)}
                placeholder="Buscar procedimiento..."
                className="mb-2 w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60"
              />
              <div className="max-h-56 space-y-3 overflow-y-auto rounded-lg border border-edge/10 bg-field p-2">
                {gruposProcedimientosFiltrados.length === 0 && (
                  <p className="px-1 py-2 text-sm text-ink/40">Sin resultados para &quot;{busquedaProcedimiento}&quot;.</p>
                )}
                {gruposProcedimientosFiltrados.map((grupo) => (
                  <div key={grupo.especialidad}>
                    <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                      {grupo.especialidad}
                    </p>
                    {grupo.procedimientos.map((p) => {
                      const checked = procedimientosSeleccionadosIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-sm transition-colors ${
                            checked ? "bg-accent/10 text-accent" : "text-ink hover:bg-surface"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleProcedimientoSeleccionado(p.id)}
                              className="accent-[color:var(--accent)]"
                            />
                            {p.nombre}
                          </span>
                          <span className="whitespace-nowrap text-xs text-ink/50">
                            {formatCurrency(p.costoPaciente)}
                            {p.unidadCobro && p.unidadCobro !== "diente" ? ` · ${unidadCobroLabel[p.unidadCobro]}` : ""}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-ink/60">Descuento</label>
            <input
              type="number"
              min={0}
              max={100}
              value={descuentoPct}
              onChange={(e) => setDescuentoPct(e.target.value)}
              placeholder="0"
              className="w-20 rounded-lg border border-edge/10 bg-field px-2 py-1.5 text-sm text-ink outline-none focus:border-accent/60"
            />
            <span className="text-xs text-ink/50">%</span>
          </div>

          {pideCantidad && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-ink/60">Cantidad</label>
              <input
                type="number"
                min={1}
                value={cantidadManual}
                onChange={(e) => setCantidadManual(e.target.value)}
                placeholder="1"
                className="w-20 rounded-lg border border-edge/10 bg-field px-2 py-1.5 text-sm text-ink outline-none focus:border-accent/60"
              />
              <span className="text-xs text-ink/50">(arcadas, superficies o sesiones)</span>
            </div>
          )}

          {procedimientosSeleccionados.length > 1 ? (
            <p className="text-xs text-ink/50">
              Se agregarán {procedimientosSeleccionados.length} renglones
              {Number(descuentoPct) > 0 ? `, con ${descuentoPct}% de descuento` : ""}. Total:{" "}
              {formatCurrency(
                procedimientosSeleccionados.reduce(
                  (sum, p) =>
                    sum +
                    Math.round(p.costoPaciente * multiplicadorDe(p.unidadCobro) * (1 - (Number(descuentoPct) || 0) / 100) * 100) / 100,
                  0
                )
              )}
            </p>
          ) : (
            (multiplicador > 1 || Number(descuentoPct) > 0) && (
              <p className="text-xs text-ink/50">
                {precioUnitarioDelCatalogo !== undefined ? (
                  <>
                    {formatCurrency(precioUnitarioDelCatalogo)} × {multiplicador} {palabraUnidad(multiplicador)}
                    {Number(descuentoPct) > 0 ? ` − ${descuentoPct}%` : ""} ={" "}
                    {formatCurrency(
                      Math.round(precioUnitarioDelCatalogo * multiplicador * (1 - (Number(descuentoPct) || 0) / 100) * 100) /
                        100
                    )}
                  </>
                ) : (
                  `Se multiplicará el precio × ${multiplicador} ${palabraUnidad(multiplicador)}${
                    Number(descuentoPct) > 0 ? `, con ${descuentoPct}% de descuento` : ""
                  }.`
                )}
              </p>
            )
          )}

          {procedimientosActivos.length > 0 && (
            <button
              onClick={handleAgregarDelCatalogo}
              disabled={procedimientosSeleccionadosIds.length === 0}
              className="w-full rounded-lg border border-accent/40 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {procedimientosSeleccionadosIds.length > 1
                ? `+ Agregar ${procedimientosSeleccionadosIds.length} procedimientos`
                : "+ Agregar procedimiento"}
            </button>
          )}

          {!mostrarPersonalizado ? (
            <button
              onClick={() => setMostrarPersonalizado(true)}
              className="text-xs font-semibold text-ink/50 hover:text-ink"
            >
              + Agregar procedimiento no catalogado
            </button>
          ) : (
            <div className="space-y-2 rounded-lg border border-dashed border-edge/15 p-3">
              <p className="text-xs text-ink/40">
                {editandoItemId ? (
                  "Editando este renglón — ajusta nombre, precio, dientes o descuento y presiona \"Aplicar al renglón\". Después, no olvides guardar todo el presupuesto con el botón de hasta abajo — eso es lo que realmente lo guarda en el expediente."
                ) : (
                  <>
                    Concepto para este presupuesto: no está en tu catálogo, pero sí se puede
                    realizar. Vale solo para este presupuesto, salvo que el administrador lo guarde en el catálogo.
                  </>
                )}
              </p>
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <input
                  type="text"
                  value={personalizadoNombre}
                  onChange={(e) => setPersonalizadoNombre(e.target.value)}
                  placeholder="Nombre del procedimiento"
                  className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60"
                />
                <input
                  type="number"
                  min={0}
                  value={personalizadoPrecio}
                  onChange={(e) => setPersonalizadoPrecio(e.target.value)}
                  placeholder="Precio"
                  className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60"
                />
              </div>
              <select
                value={personalizadoUnidad}
                onChange={(e) => setPersonalizadoUnidad(e.target.value as UnidadCobro)}
                aria-label="Cómo se cobra"
                className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
              >
                {unidadCobroOptions.map((u) => (
                  <option key={u} value={u}>
                    {unidadCobroLabel[u]}
                  </option>
                ))}
              </select>
              {personalizadoUnidad === "paquete" && (
                <input
                  type="text"
                  value={personalizadoIncluye}
                  onChange={(e) => setPersonalizadoIncluye(e.target.value)}
                  placeholder="Qué incluye (separado por comas)"
                  className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60"
                />
              )}
              {!editandoItemId && puedeGuardarEnCatalogo && (
                <label className="flex items-center gap-2 text-xs text-ink/60">
                  <input type="checkbox" checked={guardarEnCatalogo} onChange={(e) => setGuardarEnCatalogo(e.target.checked)} className="accent-[color:var(--accent)]" />
                  Guardar también en el catálogo (costo al odontólogo quedará «sin configurar»)
                </label>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleAgregarPersonalizado}
                  disabled={!personalizadoNombre.trim() || !Number(personalizadoPrecio)}
                  className="flex-1 rounded-lg border border-accent/40 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {editandoItemId ? "Aplicar al renglón" : "Agregar"}
                </button>
                <button
                  onClick={cancelarEdicionOPersonalizado}
                  className="rounded-lg border border-edge/15 px-3 py-2 text-xs font-semibold text-ink/60 hover:bg-surface"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50">
              Resumen de presupuesto
            </h3>
            <p className="mt-1 text-lg font-semibold text-accent">Folio #{folio}</p>
          </div>
          <div className="text-right text-sm text-ink/50">
            <div>{fecha}</div>
            <div>{patientName}</div>
          </div>
        </div>

        {diagnostico && (
          <div className="mt-4 rounded-lg border border-edge/10 bg-inset px-3 py-2 text-sm text-ink/70">
            <span className="font-medium text-ink/50">Diagnóstico y tratamiento: </span>
            {diagnostico}
          </div>
        )}

        <div className="mt-4">
          {items.length === 0 ? (
            <p className="text-sm text-ink/30">Aún no hay procedimientos agregados.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-edge/10 bg-inset px-3 py-2 text-sm"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-ink">{item.procedure}</span>
                      {item.origenClinico && (
                        <span
                          className="rounded-full border border-edge/15 px-1.5 py-0.5 text-[10px] font-semibold text-ink/50"
                          title="Prioridad clínica al momento de generar este renglón — no afecta el precio ni el total"
                        >
                          {prioridadTratamientoLabel[item.origenClinico.prioridad]}
                        </span>
                      )}
                    </div>
                    {item.unidadCobro && (
                      <div className="text-xs text-ink/40">
                        {unidadCobroLabel[item.unidadCobro]}
                        {item.incluye && item.incluye.length > 0 ? ` — incluye: ${item.incluye.join(", ")}` : ""}
                      </div>
                    )}
                    {(item.cantidad ?? 1) > 1 && (
                      <div className="text-xs text-ink/40">
                        {formatCurrency(item.precioUnitario ?? item.price)} × {item.cantidad}
                        {item.descuentoPct ? ` − ${item.descuentoPct}%` : ""}
                      </div>
                    )}
                    {(item.cantidad ?? 1) <= 1 && (item.descuentoPct ?? 0) > 0 && (
                      <div className="text-xs text-ink/40">Descuento: {item.descuentoPct}%</div>
                    )}
                    {(item.teeth.length > 0 || item.note) && (
                      <div className="text-xs text-accent/80">
                        {item.teeth.length > 0 && (
                          <span className="font-semibold">
                            OD {[...item.teeth].sort((a, b) => a - b).join(", ")}
                          </span>
                        )}
                        {item.teeth.length > 0 && item.note && " — "}
                        {item.note}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {esCortesia(item) ? (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success" title="Sin costo para el paciente (descuento del 100 %)">
                        Cortesía
                      </span>
                    ) : item.price === 0 ? (
                      <button
                        onClick={() => iniciarEdicionItem(item)}
                        className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-semibold text-danger print:hidden"
                        title="Este renglón vino de un diagnóstico del odontograma — complétale el precio antes de guardar"
                      >
                        Falta precio
                      </button>
                    ) : (
                      <span className="font-medium text-ink">{formatCurrency(item.price)}</span>
                    )}
                    <button
                      onClick={() => iniciarEdicionItem(item)}
                      className="text-ink/30 hover:text-accent print:hidden"
                      title="Editar"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-ink/30 hover:text-danger print:hidden"
                      title="Quitar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-edge/10 pt-3 text-sm font-semibold">
                <span className="text-ink/60">Costo Total</span>
                <span className="text-lg text-accent">{formatCurrency(total)}</span>
              </div>
            </div>
          )}
        </div>

        <AvisoNoCabeEnHoja mostrar={items.length > 8}>
          Este presupuesto tiene {items.length} tratamientos — revisa la vista previa de impresión
          de tu navegador antes de entregarlo, por si no cabe en una sola hoja.
        </AvisoNoCabeEnHoja>

        <div className="mt-6 flex flex-wrap gap-3 print:hidden">
          <button
            onClick={handleGuardar}
            disabled={items.length === 0 || hayRenglonesSinPrecio}
            title={hayRenglonesSinPrecio ? "Completa el precio de todos los renglones antes de guardar" : undefined}
            className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isEditing ? "Guardar Cambios" : "Guardar Presupuesto"}
          </button>
          <button
            onClick={handleImprimir}
            disabled={items.length === 0}
            className="rounded-lg border border-edge/15 px-4 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
          >
            Imprimir
          </button>
          <button
            onClick={handleEnviarWhatsApp}
            disabled={items.length === 0 || enviandoWhatsApp}
            className="rounded-lg border border-success/40 px-4 py-2.5 text-sm font-semibold text-success transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enviandoWhatsApp ? "Generando PDF…" : "Enviar por WhatsApp"}
          </button>
        </div>
      </div>

      <PresupuestoImpreso
        folio={folio}
        fechaLarga={fechaLargaHoy()}
        medico={medico}
        pacienteNombre={patientName}
        pacienteCorreo={patient.email ?? ""}
        pacienteTelefono={patient.phone}
        diagnostico={diagnostico}
        items={items}
        total={total}
      />

      {waUrlPendiente && (
        <AbrirWhatsAppPrompt waUrl={waUrlPendiente} onCerrar={() => setWaUrlPendiente(null)} />
      )}
    </div>
  );
}
