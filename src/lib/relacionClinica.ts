/** `relacionesClinica/{expedienteId}_{clinicaId}` (arquitectura MO Conecta
 * v3, §3/§7) — "esta clínica atiende a este paciente", capa administrativa
 * (facturación/directorio), nunca clínica: se lee sin exigir sesión
 * auditada (ver firestore.rules), a diferencia de `participaciones`. */

import type { Timestamp } from "firebase-admin/firestore";

/** Único valor que produce esta fase — nace siempre como efecto de
 * `migracionesExpediente.ts` al crear el expediente canónico. Cuando
 * exista otra vía de generar una relación (p. ej. aceptar una
 * interconsulta sin que medie migración, Fase 4), este tipo crece con el
 * valor nuevo — nunca se reinterpreta el existente. */
export type TipoRelacionClinica = "origen_migracion";

export type EstadoRelacionClinica = "activa" | "concluida";

export type RelacionClinica = {
  id: string; // {expedienteId}_{clinicaId}
  expedienteId: string;
  clinicaId: string;
  tipoRelacion: TipoRelacionClinica;
  desde: Timestamp;
  hasta?: Timestamp;
  estado: EstadoRelacionClinica;
};

/** Construye el id determinístico — usar siempre esta función, nunca
 * concatenar a mano (mismo criterio que `idParticipacion` en
 * participaciones.ts), para que el convenio no se desalinee entre el
 * código y firestore.rules. */
export function idRelacionClinica(expedienteId: string, clinicaId: string): string {
  return `${expedienteId}_${clinicaId}`;
}
