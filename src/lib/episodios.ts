/** Episodio clínico — el alcance de un "tratamiento aislado con retorno":
 * un procedimiento o tratamiento puntual dentro de una interconsulta, del
 * que un colaborador responde específicamente (ver `participaciones.ts`,
 * rol "responsable_episodio"), sin que eso lo vuelva responsable del
 * expediente completo del paciente. Fase 1: vive en
 * `interconsultas/{id}/episodios/{episodioId}` — Fase 2+ agrega el
 * `expedienteId` una vez que exista el expediente clínico canónico, sin
 * mover ni recrear el episodio. */

export type EpisodioEstado = "activo" | "concluido";

export type Episodio = {
  id: string;
  interconsultaId: string;
  /** Ausente hasta que el paciente se migra a un expediente clínico
   * canónico (ver plan de arquitectura, Fase 2) — no bloquea que el
   * episodio exista y funcione antes de esa migración. */
  expedienteId?: string;
  titulo: string;
  especialidad: string;
  motivoOrigen: string;
  responsableUid: string;
  clinicaOrigenId: string;
  estado: EpisodioEstado;
  creadoEl: string;
  concluidoEl?: string;
  /** Id de la nota de conclusión/contrarreferencia que cerró este episodio. */
  notaConclusionId?: string;
};

export function episodioActivo(episodio: Pick<Episodio, "estado">): boolean {
  return episodio.estado === "activo";
}
