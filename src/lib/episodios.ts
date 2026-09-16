/** Episodio clínico — el alcance de un "tratamiento aislado con retorno":
 * un procedimiento o tratamiento puntual dentro de una interconsulta, del
 * que un colaborador responde específicamente (ver `participaciones.ts`,
 * rol "responsable_episodio"), sin que eso lo vuelva responsable del
 * expediente completo del paciente.
 *
 * Ubicación ÚNICA y definitiva (v3 §9, decidida en una ronda de
 * aprobación posterior a cuando se escribió esta nota por primera vez):
 * `expedientesClinicos/{expedienteId}/episodios/{episodioId}` — nunca
 * `interconsultas/{id}/episodios` (esa ubicación provisional se usó
 * brevemente en Fase 1 y ya dejó de recibir escrituras, ver
 * conectaEstado.ts). Un episodio real solo puede crearse una vez que el
 * expediente canónico ya existe (Fase 4, conectaEpisodioExpediente.ts) —
 * por eso `expedienteId` es obligatorio, nunca se crea "provisionalmente"
 * sin él. */

import type { Timestamp } from "firebase-admin/firestore";

export type EpisodioEstado = "activo" | "concluido";

export type Episodio = {
  id: string;
  expedienteId: string;
  interconsultaId: string;
  titulo: string;
  especialidad: string;
  motivoOrigen: string;
  responsableUid: string;
  clinicaOrigenId: string;
  estado: EpisodioEstado;
  creadoEl: Timestamp;
  concluidoEl?: Timestamp;
  /** Id de la nota de conclusión/contrarreferencia que cerró este episodio. */
  notaConclusionId?: string;
};

export function episodioActivo(episodio: Pick<Episodio, "estado">): boolean {
  return episodio.estado === "activo";
}
