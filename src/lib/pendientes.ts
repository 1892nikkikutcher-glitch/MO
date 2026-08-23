/** Pendientes rápidos del consultorio — para anotar en segundos algo que no
 * dio tiempo de hacer entre una cita y otra (una nota, un presupuesto, una
 * constancia) y resolverlo en un momento con menos prisa. */

export type Pendiente = {
  id: string;
  texto: string;
  completado: boolean;
  creadoEn: string;
  completadoEn: string | null;
  /** true si ya se copió a Faltantes por Surtir (Depósito Dental) — evita
   * mandarlo dos veces por accidente. */
  enviadoADeposito?: boolean;
};
