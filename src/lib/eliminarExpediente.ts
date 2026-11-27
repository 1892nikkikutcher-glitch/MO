/** Texto de la confirmación al eliminar un expediente (el botón de Datos del Paciente y el bote de basura de la lista
 * de Pacientes dicen exactamente lo mismo). */
export function textoConfirmarEliminarExpediente(nombre: string): string {
  return (
    `¿Eliminar el expediente de ${nombre}?\n\n` +
    "Desaparece de la lista de pacientes y de los buscadores. Sus citas pasadas, pagos, presupuestos, notas y fotografías " +
    "NO se destruyen: se conservan y una copia queda en la Papelera, desde donde puedes restaurarlo cuando quieras."
  );
}
