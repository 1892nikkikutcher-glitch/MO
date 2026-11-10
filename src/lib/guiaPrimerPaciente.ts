/** Guía del primer paciente: acompaña a quien acaba de dar de alta su consultorio, paso por paso — crear al primer
 * paciente, llenar cada pestaña de su expediente y agendarle la primera cita. Lógica pura: los pasos, cuáles ve cada
 * rol, cuáles ya están hechos según los datos del paciente y cómo se recuerda el avance. */

import type { RolClinica } from "./patientData";

/** Lo que se sabe del paciente de la guía para marcar un paso como hecho. */
export type DatosGuia = {
  hayPaciente: boolean;
  datosPacienteCapturados: boolean;
  historiaClinicaCapturada: boolean;
  hayPresupuestos: boolean;
  hayPagos: boolean;
  hayMembresia: boolean;
  hayFotografias: boolean;
  hayLaboratorios: boolean;
  hayNotasEvolucion: boolean;
  hayCitas: boolean;
};

export type PasoGuia = {
  id: string;
  /** "paciente" crea al paciente, "pestana" lleva a una pestaña de su expediente, "cita" agenda la primera cita. */
  tipo: "paciente" | "pestana" | "cita";
  titulo: string;
  /** Qué es y para qué sirve, en una frase. */
  que: string;
  /** Qué llenar, paso por paso. */
  llenar: string[];
  /** Pestaña del expediente a la que lleva (exactamente como se llama en el Expediente). */
  pestana?: string;
  /** Se puede dejar para después sin que el expediente quede incompleto. */
  opcional?: boolean;
  /** Solo quien ve las finanzas (administrador). */
  soloFinanzas?: boolean;
  /** Solo el administrador. */
  soloAdmin?: boolean;
  /** Si los datos del paciente ya cubren este paso. Sin esto no se puede comprobar y se avanza a mano. */
  hecho?: (datos: DatosGuia) => boolean;
};

export const PASOS_GUIA: PasoGuia[] = [
  {
    id: "paciente",
    tipo: "paciente",
    titulo: "Da de alta a tu primer paciente",
    que: "Cada paciente tiene su expediente: datos, historia clínica, citas, presupuestos y pagos en un solo lugar.",
    llenar: [
      "Presiona «Crear al paciente» y escribe su nombre completo y su celular (el celular sirve para sus recordatorios por WhatsApp).",
      "La fecha de nacimiento es opcional aquí; la puedes completar en el siguiente paso.",
      "Al guardar te llevo directo a su expediente.",
    ],
    hecho: (d) => d.hayPaciente,
  },
  {
    id: "datos",
    tipo: "pestana",
    pestana: "Datos del Paciente",
    titulo: "Datos del Paciente",
    que: "Su ficha de identificación y de contacto. Con ella los recibos y mensajes salen completos.",
    llenar: [
      "En «Ficha de Identificación»: fecha de nacimiento, sexo, estado civil, ocupación, escolaridad y lugar de nacimiento. Si es menor de edad, escribe el nombre de su padre, madre o tutor.",
      "En «Datos de Contacto»: teléfono fijo, correo electrónico, dirección, código postal y contacto de emergencia.",
      "«Horario preferente para sus citas» te ayuda a saber cuándo proponerle su cita.",
      "Presiona «Guardar Cambios» al terminar.",
    ],
    hecho: (d) => d.datosPacienteCapturados,
  },
  {
    id: "consentimientos",
    tipo: "pestana",
    pestana: "Consentimientos Informados",
    titulo: "Consentimientos Informados",
    que: "Las cartas que el paciente firma antes de empezar un tratamiento. Se imprimen con sus datos ya puestos.",
    llenar: [
      "Elige «Consentimiento Informado General» (o «Contrato de Servicios — Ortodoncia» si va a llevar brackets).",
      "Confirma el médico que atiende, anota el procedimiento a realizar y, si aplica, el nombre de los testigos.",
      "Presiona «Imprimir para firmar con pluma». Esta pestaña no guarda nada: es un documento para imprimir.",
      "Si quieres cambiar la redacción de las cartas, está en Administración → Consentimientos Informados.",
    ],
    opcional: true,
  },
  {
    id: "historia",
    tipo: "pestana",
    pestana: "Historia Clínica",
    titulo: "Historia Clínica",
    que: "Sus antecedentes, alergias y exploración. Alimenta las alertas del expediente.",
    llenar: [
      "Empieza por el motivo de consulta y las alergias (recuadro fijo de alergias).",
      "Sigue con los antecedentes patológicos y no patológicos, la medicación y, si aplica, los gineco-obstétricos.",
      "Anota signos vitales, la exploración física, el examen estomatológico y el odontograma diagnóstico.",
      "Presiona «Guardar Historial». También se guarda sola cada segundo, pero confirma que el botón diga «Actualizar Historial».",
    ],
    hecho: (d) => d.historiaClinicaCapturada,
  },
  {
    id: "plan",
    tipo: "pestana",
    pestana: "Plan de Tratamiento y Presupuesto",
    titulo: "Plan de Tratamiento y Presupuesto",
    que: "Lo que vas a hacerle y cuánto cuesta. De aquí salen los cobros y los saldos.",
    llenar: [
      "Presiona «+ Nuevo Presupuesto».",
      "Elige el médico que presupuesta, el tipo de precios y la vigencia en días.",
      "Busca cada procedimiento en «Buscar procedimiento...», marca los órganos dentales y agrega descuento si aplica.",
      "Presiona «Guardar Presupuesto». Los precios salen de Administración → Procedimientos y costos.",
    ],
    hecho: (d) => d.hayPresupuestos,
  },
  {
    id: "pagos",
    tipo: "pestana",
    pestana: "Pagos",
    titulo: "Pagos",
    que: "Cada pago baja el saldo del presupuesto y alimenta tus finanzas.",
    llenar: [
      "Presiona «+ Agregar Pago» cuando el paciente pague algo.",
      "Elige el médico al que se atribuye, la forma de pago y marca el tratamiento que se paga con su abono.",
      "Para un cobro fuera del presupuesto usa «Pago extra» (concepto y monto).",
      "Guarda, pide la firma del paciente y manda el recibo por WhatsApp. Si todavía no cobras nada, déjalo para después.",
    ],
    opcional: true,
    soloFinanzas: true,
    hecho: (d) => d.hayPagos,
  },
  {
    id: "membresia",
    tipo: "pestana",
    pestana: "Membresía",
    titulo: "Membresía",
    que: "Si tu consultorio vende membresías con beneficios, aquí se activan para el paciente.",
    llenar: [
      "Presiona «Activar membresía» y elige la membresía.",
      "Indica el médico tratante y la forma de pago, y presiona «Confirmar pago».",
      "Si no vendes membresías, sáltate este paso: lo puedes hacer cuando quieras.",
    ],
    opcional: true,
    hecho: (d) => d.hayMembresia,
  },
  {
    id: "cashback",
    tipo: "pestana",
    pestana: "Cashback",
    titulo: "Cashback",
    que: "El saldo a favor que gana el paciente por sus pagos. Aquí solo se consulta: se genera solo.",
    llenar: [
      "Verás su saldo disponible, lo que está por aprobar, lo próximo a vencer y la lista de movimientos.",
      "Para que genere saldo, activa el programa en Cashback (menú) y registra sus pagos.",
      "Desde aquí le puedes enviar su saldo por WhatsApp.",
    ],
    opcional: true,
    soloAdmin: true,
  },
  {
    id: "fotografias",
    tipo: "pestana",
    pestana: "Fotografías",
    titulo: "Fotografías",
    que: "Las imágenes clínicas y los documentos del paciente, guardados en su expediente.",
    llenar: [
      "Sube su foto de perfil y, si la necesitas, su identificación oficial (frente y reverso).",
      "Agrega las fotografías extraorales e intraorales de su estado inicial: te sirven para comparar el antes y el después.",
      "Usa «Subir radiografía» y «Subir documento» para estudios y papeles. Se guardan al subirlos.",
    ],
    opcional: true,
    hecho: (d) => d.hayFotografias,
  },
  {
    id: "laboratorios",
    tipo: "pestana",
    pestana: "Laboratorios",
    titulo: "Laboratorios",
    que: "Los trabajos que mandas a laboratorio para este paciente: prótesis, coronas, estudios.",
    llenar: [
      "Presiona «+ Nueva Solicitud» cuando tengas un trabajo que mandar.",
      "Elige el tipo de laboratorio, el laboratorio y el médico solicitante, describe el trabajo y pon la fecha estimada de entrega y el costo.",
      "Si por ahora no mandas nada, déjalo para cuando haga falta.",
    ],
    opcional: true,
    hecho: (d) => d.hayLaboratorios,
  },
  {
    id: "listado-citas",
    tipo: "pestana",
    pestana: "Listado de Citas",
    titulo: "Listado de Citas",
    que: "El historial de todas sus citas. No se llena a mano: se arma solo con lo que agendes.",
    llenar: [
      "Por ahora estará vacío. Aquí aparecerán la fecha, el procedimiento, el estatus y el médico de cada cita.",
      "Al final de esta guía agendamos su primera cita y la verás aquí.",
    ],
    opcional: true,
  },
  {
    id: "notas",
    tipo: "pestana",
    pestana: "Notas de Evolución y Seguimiento",
    titulo: "Notas de Evolución y Seguimiento",
    que: "Lo que hiciste en cada visita. Se firma y queda como respaldo clínico.",
    llenar: [
      "Cuando atiendas al paciente, presiona «+ Registrar atención de hoy».",
      "Contesta lo que se te pregunta: cómo llega, qué encontraste, el diagnóstico, qué hiciste, cómo terminó e indicaciones.",
      "Termina con «Firmar y finalizar nota». Todavía no atiendes al paciente, así que por ahora déjala para su primera visita.",
    ],
    opcional: true,
    hecho: (d) => d.hayNotasEvolucion,
  },
  {
    id: "conecta",
    tipo: "pestana",
    pestana: "MO Conecta",
    titulo: "MO Conecta",
    que: "Interconsultas con otros especialistas sobre este paciente.",
    llenar: [
      "Si necesitas la opinión de otro especialista, presiona «Solicitar interconsulta».",
      "Aquí verás quién es el responsable actual del caso y con quién está compartido su expediente.",
      "No es obligatorio: úsalo cuando lo necesites.",
    ],
    opcional: true,
  },
  {
    id: "cita",
    tipo: "cita",
    titulo: "Agenda su primera cita",
    que: "La agenda evita empalmes de horario y manda la confirmación por WhatsApp.",
    llenar: [
      "Presiona «Agendar la cita»: se abre la Agenda con el paciente y una consulta de valoración ya puestos.",
      "Elige al médico, el día y la hora, y guarda.",
      "Desde la misma cita le puedes mandar la confirmación por WhatsApp.",
    ],
    hecho: (d) => d.hayCitas,
  },
];

/** Los pasos que le corresponden a un rol: sin finanzas ni Cashback si no es administrador. */
export function pasosGuiaParaRol(rol: RolClinica | null | undefined, puedeVerFinanzas: boolean): PasoGuia[] {
  return PASOS_GUIA.filter((p) => {
    if (p.soloFinanzas && !puedeVerFinanzas) return false;
    if (p.soloAdmin && rol !== "admin") return false;
    return true;
  });
}

export function pasoGuiaHecho(paso: PasoGuia, datos: DatosGuia): boolean {
  return paso.hecho ? paso.hecho(datos) : false;
}

// ---------- Avance recordado ----------

export type EstadoGuia = {
  /** La guía está en marcha (la tarjeta flotante se muestra). */
  activa: boolean;
  /** Ya la terminó o la descartó: no vuelve a salir sola. */
  vista: boolean;
  /** Paso en que iba (índice). */
  paso: number;
  /** Paciente con el que se está recorriendo la guía. */
  patientId: string | null;
  /** Tarjeta reducida a una pastilla. */
  minimizada: boolean;
  /** De qué lado de la pantalla se muestra: se puede cambiar para no tapar lo que se está llenando. */
  lado: "izquierda" | "derecha";
};

export const estadoGuiaInicial: EstadoGuia = { activa: false, vista: false, paso: 0, patientId: null, minimizada: false, lado: "izquierda" };

export const claveGuia = (uid: string) => `guiaPrimerPaciente:${uid}`;

/** Lee lo guardado sin reventar con datos viejos, vacíos o dañados. */
export function leerEstadoGuia(crudo: string | null): EstadoGuia {
  if (!crudo) return estadoGuiaInicial;
  try {
    const x = JSON.parse(crudo) as Partial<EstadoGuia> | null;
    return {
      activa: x?.activa === true,
      vista: x?.vista === true,
      paso: typeof x?.paso === "number" && Number.isInteger(x.paso) && x.paso >= 0 ? x.paso : 0,
      patientId: typeof x?.patientId === "string" && x.patientId ? x.patientId : null,
      minimizada: x?.minimizada === true,
      lado: x?.lado === "derecha" ? "derecha" : "izquierda",
    };
  } catch {
    return estadoGuiaInicial;
  }
}

/** ¿La guía debe ofrecerse sola? Justo cuando el consultorio acaba de quedar dado de alta, la clínica no tiene
 * pacientes y la persona no la ha visto ni descartado antes. */
export function debeOfrecerGuia(opciones: {
  consultorioRecienCapturado: boolean;
  hayPacientes: boolean;
  estado: EstadoGuia;
}): boolean {
  return opciones.consultorioRecienCapturado && !opciones.hayPacientes && !opciones.estado.vista && !opciones.estado.activa;
}
