/** Contenido del Asistente flotante — una guía corta por sección/pestaña
 * de la plataforma, para orientar sobre qué hace cada vista y cómo hacer
 * las tareas comunes (agendar, presupuestar, cobrar, etc.). Se busca por
 * `ayudaContexto` (más específico, ej. una pestaña del expediente) o por
 * `activePage` si no hay nada más específico publicado. */

export type AyudaPagina = {
  titulo: string;
  resumen: string;
  puntos: string[];
};

export const ayudaPaginas: Record<string, AyudaPagina> = {
  inicio: {
    titulo: "Inicio",
    resumen: "El dashboard general del consultorio: ingresos, citas, pacientes y lo que requiere atención, todo en un vistazo.",
    puntos: [
      "Cambia el periodo (Hoy, Semana, Mes, Trimestre, Año o Personalizado) para que todas las tarjetas se recalculen a ese rango.",
      "\"Requieren atención\" junta pendientes reales (saldos, confirmaciones, laboratorios) para que no se te pasen.",
      "Los accesos rápidos de arriba (Nuevo Paciente, Agenda, Nueva Cita, Depósito Dental, Nueva Membresía, Registrar Pago) te llevan directo a esa acción sin pasar por el menú.",
    ],
  },
  agenda: {
    titulo: "Agenda",
    resumen: "Calendario de citas por médico o unidad, con confirmaciones por WhatsApp y control de conflictos de horario.",
    puntos: [
      "Haz clic en un espacio vacío del calendario para agendar una cita nueva; haz clic en una cita existente para editarla.",
      "En \"Editar Cita\" puedes cambiar el estatus (Agendada, Confirmada, En espera, Atendida, Reagendada, Cancelada, No Asistió) con los botones de arriba.",
      "Las flechas ← → del centro del cuadro cambian a la cita anterior/siguiente de ese mismo día, sin cerrar el diálogo — útil para revisar toda la agenda del día seguido.",
      "Desde ahí mismo puedes abrir el expediente del paciente, ir a Notas de Evolución, enviar la confirmación por WhatsApp o registrar un pago.",
      "\"Ver por\" te deja alternar entre Todos / Médicos / Unidades, y \"Exportar a Google Calendar\" descarga el rango visible.",
      "Puedes arrastrar una cita a otro horario o día directamente en el calendario para reagendarla.",
    ],
  },
  pacientes: {
    titulo: "Pacientes",
    resumen: "El listado completo de pacientes — desde aquí entras al expediente de cualquiera de ellos.",
    puntos: [
      "Busca por nombre, celular, fecha de nacimiento o edad en la barra de arriba.",
      "\"+ Nuevo Paciente\" da de alta un expediente nuevo; \"Importar Pacientes\" carga varios de golpe desde Excel/CSV.",
      "El botón de descarga exporta tu lista completa a un .csv, para tener tus datos disponibles fuera de MO.",
      "Haz clic en el nombre o en el ícono de la derecha para abrir el expediente completo de ese paciente.",
    ],
  },
  "pacientes-Datos del Paciente": {
    titulo: "Expediente — Datos del Paciente",
    resumen: "La ficha de identificación: contacto, fecha de nacimiento, datos del tutor (si es menor de edad) y demás información general.",
    puntos: [
      "Los cambios no se guardan solos — usa el botón Guardar antes de salir de la pestaña o del expediente.",
      "Si el paciente es menor de edad, aquí se captura el nombre del tutor, que luego se usa automáticamente en consentimientos informados.",
    ],
  },
  "pacientes-Historia Clínica": {
    titulo: "Expediente — Historia Clínica",
    resumen: "Cuestionario clínico configurable (antecedentes, alergias, diagnóstico sistémico) que alimenta las alertas del expediente.",
    puntos: [
      "Al marcar \"Sí\" en un antecedente patológico (ej. diabetes), aparece un campo para capturar detalles — se refleja automáticamente en Diagnóstico Sistémico.",
      "El recuadro de alergias se pone en verde solo si escribes una palabra que indique claramente que no tiene (Ninguna, Negado, No refiere, etc.) — evita marcarlo en falso.",
      "Las secciones y preguntas se pueden personalizar desde Administración → Historial Clínico.",
    ],
  },
  "pacientes-Presupuestos": {
    titulo: "Expediente — Presupuestos",
    resumen: "Aquí armas y das seguimiento a los planes de tratamiento con su costo, y de aquí salen los tratamientos que aparecen como pendientes de pago.",
    puntos: [
      "\"+ Nuevo Presupuesto\" abre el catálogo de procedimientos — agrega los que apliquen (o uno personalizado) y su precio se suma al Costo Total.",
      "Cada línea de un presupuesto se vuelve un \"tratamiento pendiente por pagar\" hasta que se registre un pago que lo cubra.",
      "Puedes editar un presupuesto ya guardado (cambiar precios, agregar/quitar procedimientos) con \"Guardar Cambios\" — el monto pendiente se recalcula solo.",
      "\"Enviar por WhatsApp\" manda el PDF del presupuesto directo al celular del paciente; \"Imprimir\" lo prepara para firma en papel.",
    ],
  },
  "pacientes-Pagos": {
    titulo: "Expediente — Pagos",
    resumen: "Registra los cobros del paciente y ligalos a los tratamientos pendientes de sus presupuestos.",
    puntos: [
      "\"+\" (Agregar Pago) muestra los tratamientos pendientes por pagar de ese paciente — marca la casilla de los que se están cobrando ahora.",
      "El monto de cada tratamiento se puede ajustar si el paciente solo abona una parte; el resto sigue pendiente para un pago futuro.",
      "\"Activo para facturar\" marca el pago para tu proceso de facturación — no genera la factura automáticamente.",
      "Puedes registrar un cobro que no viene de un presupuesto (ej. un extra) con \"Agregar\" dentro del mismo diálogo.",
      "Todo pago genera un recibo que se puede imprimir o mandar por WhatsApp.",
    ],
  },
  "pacientes-Membresía": {
    titulo: "Expediente — Membresía",
    resumen: "Vincula al paciente con un plan de membresía (si tu consultorio los maneja) y da seguimiento a sus beneficios usados.",
    puntos: [
      "Los planes disponibles se configuran en el módulo Membresías del menú lateral.",
      "Aquí ves la vigencia de la membresía activa del paciente y qué beneficios ya usó.",
    ],
  },
  "pacientes-Consentimientos Informados": {
    titulo: "Expediente — Consentimientos Informados",
    resumen: "Genera cartas de consentimiento informado ya prellenadas con los datos del paciente y del doctor.",
    puntos: [
      "El módulo Documentos (menú lateral) tiene el catálogo completo de consentimientos por especialidad (ortodoncia, cirugía bucal, endodoncia, odontopediatría, prótesis) además del general.",
    ],
  },
  "pacientes-Fotografías": {
    titulo: "Expediente — Fotografías",
    resumen: "Fotos clínicas del paciente: foto de perfil, identificación oficial (INE) y fotos extraorales/intraorales.",
    puntos: [
      "\"Subir foto\" abre la galería o cámara del dispositivo; una vez subida, \"Cambiar\" la reemplaza y \"Quitar\" la elimina (con confirmación).",
      "La sección de INE (Frente/Reverso) es para el documento de identidad del paciente, separada de las fotos clínicas.",
      "Extraorales e Intraorales aceptan varias fotos a la vez y se pueden descargar individualmente.",
    ],
  },
  "pacientes-Laboratorios": {
    titulo: "Expediente — Laboratorios",
    resumen: "Órdenes de trabajo (OT) enviadas a laboratorio dental para este paciente — prótesis, guardas, aparatos, etc.",
    puntos: [
      "Para el directorio de laboratorios externos con los que trabajas (contacto, WhatsApp), usa el módulo Laboratorio Dental del menú lateral — es distinto a esta pestaña, que es el seguimiento por paciente.",
    ],
  },
  "pacientes-Listado de Citas": {
    titulo: "Expediente — Listado de Citas",
    resumen: "Historial completo de citas de este paciente, pasadas y futuras.",
    puntos: [
      "Útil para ver la asistencia del paciente a lo largo del tiempo sin tener que buscarlo cita por cita en Agenda.",
    ],
  },
  "pacientes-Notas de Evolución y Seguimiento": {
    titulo: "Expediente — Notas de Evolución y Seguimiento",
    resumen: "Bitácora clínica: qué se hizo en cada cita, con formato PSOAP disponible como guía.",
    puntos: [
      "\"Formato PSOAP\" te da la estructura sugerida (Problema, Subjetivo, Objetivo, Análisis, Plan) para que las notas queden completas y consistentes.",
      "Se recomienda registrar una nota por cita atendida, para tener trazabilidad clínica del tratamiento.",
    ],
  },
  recetas: {
    titulo: "Recetas",
    resumen: "Genera recetas médicas para cualquier paciente, con el membrete y cédula profesional del doctor.",
    puntos: [
      "Busca al paciente, agrega los medicamentos (con dosis e indicaciones) y genera la receta para imprimir o enviar por WhatsApp.",
      "Si el paciente tiene alergias registradas en Historia Clínica, aparece una alerta antes de recetar.",
    ],
  },
  "deposito-dental": {
    titulo: "Depósito Dental",
    resumen: "Directorio de proveedores de material/instrumental, control de faltantes por surtir y de caducidades de cementos/medicamentos.",
    puntos: [
      "\"+ Agregar Depósito\" da de alta un proveedor; \"Pedir/Cotizar\" arma un mensaje de WhatsApp con lo pendiente para ese depósito.",
      "\"+ Agregar Faltante\" registra algo que falta comprar, con urgencia (Alta/Media/Baja); márcalo \"Surtido\" cuando llegue.",
      "\"Enviar Recordatorio\" manda por WhatsApp la lista completa de pendientes, ordenada por urgencia.",
      "Control de Caducidades avisa cuando un producto está \"Por vencer\" (30 días o menos) o ya \"Caducado\".",
    ],
  },
  "centro-radiodiagnostico": {
    titulo: "Centro de Radiodiagnóstico",
    resumen: "Directorio de centros de imagen (radiografías, tomografías) cercanos, para referir pacientes rápido.",
    puntos: [
      "\"+ Agregar Centro\" registra nombre, dirección, teléfono y qué estudios realiza.",
      "\"Contactar\" abre WhatsApp con un mensaje ya armado para coordinar el estudio del paciente.",
    ],
  },
  "laboratorio-dental": {
    titulo: "Laboratorio Dental",
    resumen: "Directorio de laboratorios externos a los que envías trabajos de prótesis, ortodoncia, etc.",
    puntos: [
      "\"+ Agregar Laboratorio\" registra nombre, dirección, teléfono y qué trabajos realiza.",
      "Es el directorio de contacto — el seguimiento de una orden de trabajo específica de un paciente se hace en la pestaña Laboratorios de su expediente.",
    ],
  },
  documentos: {
    titulo: "Documentos",
    resumen: "Genera consentimientos informados, constancias de permanencia y hojas de indicaciones, listos para imprimir o enviar por WhatsApp.",
    puntos: [
      "Busca al paciente escribiendo su nombre — la lista se filtra en vivo.",
      "Hay un consentimiento general y uno específico por especialidad (ortodoncia, cirugía bucal, endodoncia, odontopediatría, prótesis), más uno para concluir tratamiento de ortodoncia y un acuerdo de conformidad de prótesis entregada.",
      "Las hojas de indicaciones son de cuidados post-tratamiento, separadas de los consentimientos (que son legales, previos al tratamiento).",
    ],
  },
  membresias: {
    titulo: "Membresías",
    resumen: "Configura los planes de membresía del consultorio y sus beneficios — la asignación a cada paciente se hace desde su expediente.",
    puntos: [
      "Define el precio, vigencia y beneficios incluidos de cada plan aquí; luego se asigna paciente por paciente en la pestaña Membresía de su expediente.",
    ],
  },
  educacion: {
    titulo: "Educación",
    resumen: "Material educativo/visual para mostrar o enviar a pacientes.",
    puntos: [],
  },
  "panel-admin": {
    titulo: "Panel de administrador",
    resumen: "Vista de plataforma (solo visible para el dueño): todas las clínicas que usan MO, sus suscripciones y sugerencias recibidas.",
    puntos: [
      "Las tarjetas de arriba resumen consultorios registrados, MRR, ARPU, nuevas clínicas del mes, pruebas activas y cancelaciones.",
      "En la tabla, \"Suspender\" bloquea el acceso de una clínica sin borrar su información — es la forma correcta de dar de baja temporalmente, no \"Eliminar\".",
      "\"Editar\" cambia el plan/estado manualmente; si la clínica tiene una suscripción real de Stripe, se avisa antes de sobreescribirla.",
      "La bandeja de sugerencias junta lo que cada clínica envía desde su botón \"Enviar sugerencia\" del menú lateral.",
    ],
  },
  "administracion-colaboradores": {
    titulo: "Administración — Colaboradores",
    resumen: "Invita a otras personas a tu clínica y controla qué pueden ver o hacer (ej. si tienen acceso a finanzas).",
    puntos: [
      "Genera una invitación por correo; la persona la acepta y queda ligada a tu clínica con el rol que le asignes.",
    ],
  },
  "administracion-perfil": {
    titulo: "Administración — Perfil del Doctor",
    resumen: "Datos que aparecen en documentos impresos: nombre, cédula profesional, logos y dirección de la clínica.",
    puntos: [
      "Lo que captures aquí se usa automáticamente en presupuestos, recetas, consentimientos y hojas de indicaciones.",
    ],
  },
  "administracion-consultorio": {
    titulo: "Administración — Consultorio",
    resumen: "Horario de atención del consultorio (apertura, cierre, horario de comida) — controla el rango visible/agendable en Agenda.",
    puntos: [],
  },
  gastos: {
    titulo: "Gastos",
    resumen: "Registro de egresos del consultorio, para tener el panorama financiero completo junto con los ingresos.",
    puntos: [],
  },
  "regulacion-sanitaria": {
    titulo: "Regulación Sanitaria",
    resumen: "Checklist de cumplimiento normativo/sanitario del consultorio.",
    puntos: [],
  },
  rpbi: {
    titulo: "RPBI",
    resumen: "Control de Residuos Peligrosos Biológico-Infecciosos: empresa recolectora y bitácora de recolección.",
    puntos: [],
  },
  contabilidad: {
    titulo: "Contabilidad",
    resumen: "Información contable/fiscal del consultorio.",
    puntos: [],
  },
  asistencia: {
    titulo: "Asistencia",
    resumen: "Control de asistencia del personal del consultorio.",
    puntos: [],
  },
  planes: {
    titulo: "Planes",
    resumen: "El plan de suscripción de MO que tiene contratado tu clínica.",
    puntos: [],
  },
};

/** Cuando no hay contenido específico, se arma una ayuda genérica a partir
 * de la etiqueta del menú — mejor que no mostrar nada, aunque menos útil
 * que una entrada dedicada. */
export function obtenerAyuda(contexto: string, etiqueta: string): AyudaPagina {
  return (
    ayudaPaginas[contexto] ?? {
      titulo: etiqueta,
      resumen: `Sección "${etiqueta}" de MO. Si quieres que agreguemos una guía más detallada aquí, mándanos una sugerencia con el botón 💬 del menú.`,
      puntos: [],
    }
  );
}
