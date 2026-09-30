/** Contrato de Prestación de Servicios y Acuerdo de Pago — por ahora
 * específico a Ortodoncia (el primer caso concreto que se modeló). El
 * texto es editable por clínica desde Administración → Contrato de
 * Ortodoncia (mismo patrón que formatosWhatsapp.ts) — MO es una
 * plataforma para varios consultorios, así que ninguna cláusula ni monto
 * propio de un consultorio se hornea en el código; esto solo trae la
 * redacción original como punto de partida editable. */

export type ContratoOrtodonciaConfig = {
  clausulas: string;
};

export const contratoOrtodonciaInicial: ContratoOrtodonciaConfig = {
  clausulas: `San Francisco Tlalcilalcalpan, México a {{dia}} de {{mes}} del {{anio}}.

A través del presente contrato, el que suscribe {{clinica}} por medio de su C.D. {{medico}} y sus colaboradores, se comprometen a realizar el tratamiento de ortodoncia al paciente de nombre: {{paciente}} en un tiempo de {{duracionMeses}} meses, con una variable de 2 meses más o 2 meses menos, dependiendo de la dedicación y cuidado del paciente, siempre y cuando el paciente cumpla con sus citas puntuales y las indicaciones anexas sobre el cuidado de sus aparatos de Ortodoncia. Las fechas asignadas para su tratamiento de Ortodoncia quedarán calendarizadas por todo el año en curso para cumplir con el compromiso de ambas partes. Así mismo el paciente se compromete a cubrir el costo de su tratamiento, con pago inicial de {{pagoInicial}} (Kit de Ortodoncia) que incluye la cita de instalación de los aparatos ortodónticos fijos o Brackets. De igual manera se cubrirán {{numCuotas}} cuotas mensuales de {{cuotaMensual}} como costo de su tratamiento de Ortodoncia, los días de su cita de control ortodóntico.

NOTA: Es necesario que el paciente se realice un estudio completo de Ortodoncia o una Ortopantomografía según sea el caso, previo a su tratamiento; por lo cual se canalizará al paciente a un CENTRO RADIOLÓGICO DENTAL el cual es ajeno a nuestro consultorio.

CLAUSULAS

1.- DE LOS COSTOS:
1.1.- El pago inicial del tratamiento de Ortodoncia será cubierto por el paciente en su totalidad el día del inicio de su tratamiento.
1.2.- El costo del tratamiento no incluye aparatos adicionales como orto-implantes, ortopédicos y/o de fabricación de un Técnico dental; en caso de requerirse durante el tratamiento se le informará al paciente y se acordará un costo.
1.3.- Si el paciente quiere asistir en un día diferente de los estipulados en el calendario tendrá un costo adicional a su tratamiento, sujeto a disponibilidad de horario y pagando esto con anticipación.
1.4.- Siempre y cuando el paciente agende de acuerdo con el calendario de ortodoncia y a los horarios de atención, se tendrá como consideración el "pronto pago". Cuando el paciente asista en tiempo y forma a sus citas calendarizadas sin modificar en día u horario las mismas. El costo de las citas con pronto pago será de {{costoProntoPago}}. En caso de incumplimiento con fechas, horarios o inasistencias nos reservamos el derecho de negar el descuento por pronto pago en cualquier momento y sin previo aviso.
1.5.- En caso de que el paciente despegue un bracket tendrá un costo adicional de {{costoBracketDespegado}}, ya que se colocará un bracket nuevo y esto no está incluido en su pago inicial, ni en sus mensualidades. De igual manera el bracket se colocará en su cita de control calendarizada; en caso de requerir una consulta en otra fecha, fuera del calendario de ortodoncia, tendrá un costo de {{costoConsultaExtra}}.

2.- DE LAS CITAS:
2.1.- {{clinica}} y el Paciente se comprometen a respetar el calendario de citas de Ortodoncia.
2.2.- El Paciente es el responsable de recordar su cita y {{clinica}} podrá enviar un recordatorio de cortesía.
2.3.- Si el paciente quiere reprogramar su cita, él será el encargado de notificarlo directamente a {{clinica}}.
2.4.- El Paciente es el responsable de la programación de sus citas mensuales, en horarios y días disponibles durante la semana de ortodoncia.
2.5.- {{clinica}} tomará como confirmada su cita en caso de que el paciente no la reprograme antes de la misma, ya que la cita se generó en su última asistencia, por lo cual quedará fija en la agenda.
2.6.- Si el paciente no asiste a su cita mensual consecutiva, {{clinica}} se deslinda de las modificaciones, retrocesos o daños que represente la aparatología Ortodóntica en su tratamiento.
2.7.- Si el paciente deja de asistir 2 meses consecutivos se tomará como abandono de tratamiento, por tanto, {{clinica}} se deslinda de todo el presente tratamiento de Ortodoncia.
2.8.- {{clinica}} registrará sus citas del tratamiento en su carnet de citas para llevar un registro de sus citas.

3.- DE LOS CUIDADOS DEL PACIENTE:
3.1.- Es responsabilidad del paciente el llevar un aseo bucal adecuado, ya que es de suma importancia para un tratamiento exitoso y de calidad. En caso de presentarse el paciente con más de 60% de placa dentobacteriana, automáticamente se le agendará una cita de limpieza preventiva.
3.2.- {{clinica}} apoyará al paciente para la realización de sus limpiezas semestrales con un descuento especial del {{descuentoLimpieza}}% sobre el precio de lista, única y exclusivamente los meses de {{mesesDescuento}}.
3.3.- Si el paciente despega Brackets constantemente, dobla arcos o tiene deficiencias en su aseo, o no asiste a sus citas consecutivamente, retrasará el tratamiento de Ortodoncia y los meses adicionales que requiera su tratamiento no estarán incluidos en el costo que pagó al inicio en este presente contrato, por lo tanto, tendrá que hacer pagos adicionales al costo actual de las consultas de Ortodoncia.

4.- DEL EXPEDIENTE DEL PACIENTE:
4.1.- {{clinica}} resguardará el expediente del paciente.
4.2.- {{clinica}} es el responsable del cuidado y buen uso del expediente del Paciente; en caso de que el Paciente solicite algún dato de su expediente deberá hacerlo por escrito.

5.- DE LOS ESTUDIOS DE ORTODONCIA:
5.1.- {{clinica}} expedirá una orden para los estudios radiológicos que crea pertinente se realice el Paciente antes de iniciar su tratamiento de Ortodoncia.
5.2.- Por seguridad del Paciente y de {{clinica}}, no se podrá iniciar ningún tratamiento de Ortodoncia sin contar con una ortopantomografía del paciente.
5.3.- En caso de que el paciente quiera retirar algún documento de su expediente, tendrá que solicitarlo en tiempo y forma por escrito con nombre completo y firma del interesado.

6.- DE LA FINALIZACIÓN DEL TRATAMIENTO:
6.1.- El paciente se compromete a usar retenedores al término del tratamiento por el tiempo indicado.
Nota.- Estos no están incluidos en el costo del tratamiento de Ortodoncia ya que es un tratamiento adicional. Sin embargo, se les podrá realizar un descuento por recomendación en los mismos.

Recibí calendario de Ortodoncia.`,
};
