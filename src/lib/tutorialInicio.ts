/** Tutorial de primeros pasos: lo que se le enseña a quien entra por primera vez, en el orden en que conviene hacerlo
 * (consultorio → médicos → primer paciente → primera cita → expediente → cobro…). Lógica pura: los pasos, cuáles ve
 * cada rol, cuáles ya están hechos según los datos de la clínica y cómo se recuerda el avance. */

import type { RolClinica } from "./patientData";
import { moduloVisibleParaRol } from "./permisosRol";

/** Lo que se sabe de la clínica para marcar un paso como hecho. */
export type DatosTutorial = {
  consultorioCapturado: boolean;
  hayMedicos: boolean;
  hayMedicoConCedula: boolean;
  hayPacientes: boolean;
  hayCitas: boolean;
  hayPresupuestos: boolean;
  hayPagos: boolean;
};

/** A dónde lleva el botón "Hacerlo ahora" de un paso. */
export type DestinoTutorial =
  | { tipo: "pagina"; pagina: string }
  | { tipo: "nuevo-paciente" }
  | { tipo: "registrar-pago" };

export type PasoTutorial = {
  id: string;
  titulo: string;
  /** Qué es y para qué sirve, en una o dos frases. */
  que: string;
  /** Cómo se hace, paso por paso. */
  como: string[];
  accion?: { etiqueta: string; destino: DestinoTutorial };
  /** Id del módulo del menú: si el rol no lo ve, el paso no se muestra. */
  modulo?: string;
  /** Solo para el administrador (finanzas y equipo). */
  soloAdmin?: boolean;
  /** Si los datos de la clínica ya cubren este paso. Sin esto, el paso es solo informativo. */
  hecho?: (datos: DatosTutorial) => boolean;
};

export const PASOS_TUTORIAL: PasoTutorial[] = [
  {
    id: "consultorio",
    titulo: "Los datos de tu consultorio y los tuyos",
    que: "Tu nombre y el de tu consultorio salen en la barra de arriba, en los recibos y en los mensajes a tus pacientes.",
    como: [
      "Abre Administración → Consultorio.",
      "Escribe el nombre del consultorio, tu título y tu nombre, el teléfono y la dirección.",
      "Pon el horario de atención: de ahí sale el rango que se puede agendar.",
      "Presiona Guardar.",
    ],
    accion: { etiqueta: "Abrir Consultorio", destino: { tipo: "pagina", pagina: "administracion-consultorio" } },
    modulo: "administracion",
    hecho: (d) => d.consultorioCapturado,
  },
  {
    id: "medicos",
    titulo: "Da de alta a los médicos de tu agenda",
    que: "Cada médico o unidad (sillón) tiene su propio calendario y su color. Tú también cuentas como médico si atiendes.",
    como: [
      "Abre Agenda y busca el cuadro «Recursos».",
      "Presiona + y escribe el nombre del médico y elige su color.",
      "Si trabajas en más de un consultorio, da de alta cada sede y asígnale al médico sus días y horas de atención.",
    ],
    accion: { etiqueta: "Abrir Agenda", destino: { tipo: "pagina", pagina: "agenda" } },
    hecho: (d) => d.hayMedicos,
  },
  {
    id: "receta",
    titulo: "Tu identidad de receta",
    que: "Tu cédula, tu especialidad y tu firma van en tus recetas y consentimientos. Cada médico usa la suya.",
    como: [
      "Abre Administración → Médicos y Recetas.",
      "Elige al médico y captura su cédula profesional, especialidad, escuela y firma.",
      "Sube el logo de la clínica y escribe la dirección que va en los documentos.",
    ],
    accion: { etiqueta: "Abrir Médicos y Recetas", destino: { tipo: "pagina", pagina: "administracion-perfil" } },
    modulo: "administracion",
    hecho: (d) => d.hayMedicoConCedula,
  },
  {
    id: "paciente",
    titulo: "Da de alta a tu primer paciente",
    que: "Cada paciente tiene su expediente: datos, historia clínica, citas, presupuestos y pagos en un solo lugar.",
    como: [
      "Presiona «Nuevo Paciente» arriba, o entra a Pacientes y usa «+ Nuevo Paciente».",
      "Captura su nombre y su celular: el celular sirve para sus recordatorios por WhatsApp.",
      "Si ya tienes una lista en Excel, usa «Importar Pacientes» en Pacientes para cargarla de una vez.",
    ],
    accion: { etiqueta: "Nuevo paciente", destino: { tipo: "nuevo-paciente" } },
    hecho: (d) => d.hayPacientes,
  },
  {
    id: "cita",
    titulo: "Agenda su primera cita",
    que: "La agenda evita empalmes de horario y manda la confirmación por WhatsApp.",
    como: [
      "Abre Agenda y haz clic en un espacio vacío del calendario, o presiona «Nueva Cita».",
      "Busca al paciente, elige al médico, el motivo y la hora. Si ya tuvo citas, MO propone la hora de la anterior.",
      "Guarda y, desde la misma cita, mándale la confirmación por WhatsApp.",
    ],
    accion: { etiqueta: "Abrir Agenda", destino: { tipo: "pagina", pagina: "agenda" } },
    hecho: (d) => d.hayCitas,
  },
  {
    id: "expediente",
    titulo: "Su expediente y su primer presupuesto",
    que: "Haz clic en el nombre del paciente en Pacientes: arriba están las pestañas de su expediente.",
    como: [
      "Historia Clínica: antecedentes y alergias; alimenta las alertas del expediente.",
      "Plan de Tratamiento y Presupuesto: arma el presupuesto con los tratamientos y sus precios.",
      "Notas de Evolución y Seguimiento: anota lo que hiciste en cada visita.",
      "Fotografías: guarda las fotos clínicas del paciente.",
    ],
    accion: { etiqueta: "Abrir Pacientes", destino: { tipo: "pagina", pagina: "pacientes" } },
    hecho: (d) => d.hayPresupuestos,
  },
  {
    id: "pago",
    titulo: "Cobra y registra el pago",
    que: "Cada pago baja el saldo del presupuesto y alimenta tus finanzas.",
    como: [
      "Presiona «Registrar Pago» arriba y elige al paciente.",
      "Marca el tratamiento que se paga, elige la forma de pago y guarda.",
      "Si activas Cashback, MO te avisa cuánto saldo tiene el paciente y lo puedes usar ahí mismo.",
    ],
    accion: { etiqueta: "Registrar pago", destino: { tipo: "registrar-pago" } },
    soloAdmin: true,
    hecho: (d) => d.hayPagos,
  },
  {
    id: "recetas",
    titulo: "Genera una receta",
    que: "La receta sale con la cédula y la firma del médico que la firma.",
    como: [
      "Abre Recetas, elige al paciente y al médico.",
      "Agrega los medicamentos; los que más usas se guardan en Administración → Medicamentos.",
      "Genera el PDF para imprimirla o enviarla.",
    ],
    accion: { etiqueta: "Abrir Recetas", destino: { tipo: "pagina", pagina: "recetas" } },
  },
  {
    id: "equipo",
    titulo: "Invita a tu equipo",
    que: "Tus asistentes y otros doctores entran con su propia cuenta, con lo que tú decidas que vean.",
    como: [
      "Abre Administración → Colaboradores y genera una invitación.",
      "Compártela por WhatsApp: la persona entra con su correo.",
      "Elige su rol. Solo el administrador ve las finanzas y elimina registros.",
    ],
    accion: { etiqueta: "Abrir Colaboradores", destino: { tipo: "pagina", pagina: "administracion-colaboradores" } },
    soloAdmin: true,
  },
];

/** Los pasos que le corresponden a un rol: sin lo financiero ni el equipo si no es administrador, y sin lo que su menú no muestra. */
export function pasosParaRol(rol: RolClinica | null | undefined): PasoTutorial[] {
  return PASOS_TUTORIAL.filter((p) => {
    if (p.soloAdmin && rol !== "admin") return false;
    if (p.modulo && !moduloVisibleParaRol(rol, p.modulo)) return false;
    return true;
  });
}

export function pasoEstaHecho(paso: PasoTutorial, datos: DatosTutorial): boolean {
  return paso.hecho ? paso.hecho(datos) : false;
}

/** Cuántos pasos con comprobación ya están hechos, de cuántos se pueden comprobar. */
export function avanceTutorial(pasos: PasoTutorial[], datos: DatosTutorial): { hechos: number; total: number } {
  const comprobables = pasos.filter((p) => p.hecho);
  return { hechos: comprobables.filter((p) => pasoEstaHecho(p, datos)).length, total: comprobables.length };
}

// ---------- Avance recordado ----------

export type EstadoTutorial = {
  /** Ya lo terminó u omitió: no vuelve a salir solo. */
  visto: boolean;
  /** Paso en que iba (índice), para seguir donde se quedó. */
  paso: number;
};

export const claveTutorial = (uid: string) => `tutorialInicio:${uid}`;

/** Lee lo guardado sin reventar con datos viejos, vacíos o dañados. */
export function leerEstadoTutorial(crudo: string | null): EstadoTutorial {
  if (!crudo) return { visto: false, paso: 0 };
  try {
    const x = JSON.parse(crudo) as Partial<EstadoTutorial> | null;
    return {
      visto: x?.visto === true,
      paso: typeof x?.paso === "number" && Number.isInteger(x.paso) && x.paso >= 0 ? x.paso : 0,
    };
  } catch {
    return { visto: false, paso: 0 };
  }
}
