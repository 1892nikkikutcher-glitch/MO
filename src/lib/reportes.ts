/** Helpers compartidos por los reportes que se construyen a partir de las
 * citas de la agenda — la única colección de nivel de clínica que siempre
 * está completa (no depende de abrir el expediente de cada paciente), así
 * que estos reportes sí reflejan el historial completo, no solo lo
 * capturado desde hoy. */

import type { CitaAgenda, Recurso } from "./patientData";
import type { Procedimiento } from "./procedimientos";

export function enRangoFecha(fecha: string, desde: string, hasta: string): boolean {
  if (desde && fecha < desde) return false;
  if (hasta && fecha > hasta) return false;
  return true;
}

function normalizarTexto(s: string): string {
  return Array.from(s.normalize("NFD"))
    .filter((c) => {
      const code = c.codePointAt(0) ?? 0;
      return code < 0x300 || code > 0x36f;
    })
    .join("")
    .toLowerCase()
    .trim();
}

export type RankingProcedimiento = { nombre: string; veces: number };

/** Cuenta cuántas veces aparece cada procedimiento (texto libre capturado
 * en la cita) dentro de las citas dadas, agrupando por texto exacto. */
export function rankingProcedimientos(citas: CitaAgenda[]): RankingProcedimiento[] {
  const conteo = new Map<string, number>();
  citas.forEach((c) => {
    c.tratamientos.forEach((t) => {
      const limpio = t.trim();
      if (!limpio) return;
      conteo.set(limpio, (conteo.get(limpio) ?? 0) + 1);
    });
  });
  return Array.from(conteo.entries())
    .map(([nombre, veces]) => ({ nombre, veces }))
    .sort((a, b) => b.veces - a.veces);
}

export type ResumenMedico = {
  recurso: Recurso;
  totalCitas: number;
  atendidas: number;
  canceladas: number;
  pacientesUnicos: number;
};

export function resumenPorMedico(citas: CitaAgenda[], recursos: Recurso[]): ResumenMedico[] {
  return recursos
    .filter((r) => r.tipo === "medico")
    .map((recurso) => {
      const propias = citas.filter((c) => c.recursoId === recurso.id);
      const pacientesUnicos = new Set(
        propias.map((c) => c.patientId ?? `sin-id:${c.paciente}`)
      ).size;
      return {
        recurso,
        totalCitas: propias.length,
        atendidas: propias.filter((c) => c.estatus === "Atendida").length,
        canceladas: propias.filter((c) => c.estatus === "Cancelada").length,
        pacientesUnicos,
      };
    });
}

export type ComisionMedico = {
  recurso: Recurso;
  items: { tratamiento: string; procedimiento: Procedimiento; comision: number }[];
  sinCatalogo: string[];
  totalComision: number;
};

/** Empareja cada tratamiento de texto libre capturado en las citas
 * "Atendida" con el catálogo de procedimientos (comparando sin
 * acentos/mayúsculas) para sumar la comisión del odontólogo. Los
 * tratamientos que no coinciden con ningún procedimiento del catálogo se
 * listan aparte — no se inventan montos para ellos. */
export function calcularComisiones(
  citas: CitaAgenda[],
  recursos: Recurso[],
  procedimientos: Procedimiento[]
): ComisionMedico[] {
  const catalogoNorm = procedimientos.map((p) => ({ p, norm: normalizarTexto(p.nombre) }));
  const buscarProcedimiento = (tratamiento: string) => {
    const norm = normalizarTexto(tratamiento);
    return catalogoNorm.find((c) => c.norm === norm || norm.includes(c.norm) || c.norm.includes(norm))?.p;
  };

  return recursos
    .filter((r) => r.tipo === "medico")
    .map((recurso) => {
      const atendidas = citas.filter((c) => c.recursoId === recurso.id && c.estatus === "Atendida");
      const items: ComisionMedico["items"] = [];
      const sinCatalogo: string[] = [];
      atendidas.forEach((cita) => {
        cita.tratamientos.forEach((t) => {
          const limpio = t.trim();
          if (!limpio) return;
          const procedimiento = buscarProcedimiento(limpio);
          if (procedimiento) {
            items.push({ tratamiento: limpio, procedimiento, comision: procedimiento.costoOdontologo });
          } else {
            sinCatalogo.push(limpio);
          }
        });
      });
      return {
        recurso,
        items,
        sinCatalogo,
        totalComision: items.reduce((sum, i) => sum + i.comision, 0),
      };
    });
}

export type ClasificacionPaciente = "Sin citas" | "Nuevo" | "Recurrente";

export function clasificarPaciente(numCitas: number): ClasificacionPaciente {
  if (numCitas === 0) return "Sin citas";
  if (numCitas === 1) return "Nuevo";
  return "Recurrente";
}
