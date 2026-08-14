/** Sugerencia de Nivel Socioeconómico (escala AMAI: A/B, C+, C, C-, D+, D, E)
 * a partir de lo ya capturado en el Estudio Socioeconómico del paciente. No
 * es el cuestionario oficial de AMAI (que usa escolaridad del jefe de
 * familia, baños, autos, etc.) — es una aproximación razonable con los
 * campos que este formulario sí tiene, pensada como punto de partida que el
 * doctor puede corregir, no como un dato definitivo. */

const puntosIngreso: Record<string, number> = {
  "Menos de $8,000": 0,
  "$8,000 – $15,000": 1.5,
  "$15,001 – $25,000": 3,
  "$25,001 – $40,000": 4.5,
  "Más de $40,000": 6,
};

const puntosEscolaridad: Record<string, number> = {
  Ninguna: 0,
  Primaria: 0,
  Secundaria: 0.5,
  Preparatoria: 1.5,
  Licenciatura: 3,
  Posgrado: 4,
};

const puntosVivienda: Record<string, number> = {
  Propia: 1.5,
  Familiar: 0.5,
  Rentada: 0,
};

export function sugerirNivelSocioeconomico(datos: {
  ingresoFamiliar: string;
  escolaridad: string;
  tipoVivienda: string;
  servicios: string[];
  ocupacion: string;
}): string {
  const puntos =
    (puntosIngreso[datos.ingresoFamiliar] ?? 0) +
    (puntosEscolaridad[datos.escolaridad] ?? 0) +
    (puntosVivienda[datos.tipoVivienda] ?? 0) +
    (datos.servicios.length / 5) * 2 +
    (datos.ocupacion.trim() ? 0.5 : 0);

  if (puntos >= 11) return "A/B";
  if (puntos >= 9) return "C+";
  if (puntos >= 6.5) return "C";
  if (puntos >= 4.5) return "C-";
  if (puntos >= 2.5) return "D+";
  if (puntos >= 1) return "D";
  return "E";
}
