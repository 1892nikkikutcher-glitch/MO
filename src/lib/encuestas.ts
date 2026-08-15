/** Encuestas de satisfacción post-cita — se envían por WhatsApp de forma
 * manual (igual que los recordatorios) y, como la respuesta llega al chat
 * de WhatsApp del doctor y no hay integración con la API oficial, se
 * registra aquí a mano cuando el paciente contesta. */

export type EncuestaEnviada = {
  id: string;
  citaId: string;
  patientId: string | null;
  patientName: string;
  procedimiento: string;
  fechaCita: string;
  enviadaEn: string;
  calificacion: number | null;
  comentario: string;
  respondidaEn: string | null;
};
