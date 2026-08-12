/** Catálogo de medicamentos para recetas, editable desde Administración >
 * Medicamentos. Los de tipo "pediatrico" calculan la dosis a partir del
 * peso del paciente (mg/kg) en vez de tener una dosis fija de adulto.
 *
 * Los rangos mg/kg de los medicamentos pediátricos precargados son valores
 * de referencia de uso común en odontopediatría (Cuadro Básico / literatura
 * de farmacología pediátrica estándar) — siempre deben verificarse contra
 * el criterio clínico, alergias y peso real del paciente antes de recetar;
 * no sustituyen el juicio profesional del odontólogo. */

export type TipoPacienteMedicamento = "adulto" | "pediatrico";

export type MedicamentoCatalogo = {
  id: string;
  nombre: string;
  tipoPaciente: TipoPacienteMedicamento;
  // Adulto: instrucciones de dosis fijas.
  dosisFrecuencia?: string;
  periodo?: string;
  // Pediátrico: dosis calculada por peso.
  mgPorKgMin?: number;
  mgPorKgMax?: number;
  frecuenciaPediatrica?: string;
  duracionPediatrica?: string;
  /** Tope de seguridad por toma, en mg — si la dosis calculada lo supera, se avisa. */
  dosisMaximaMg?: number;
  /** Ej. "250 mg / 5 ml" — para poder mostrar también el resultado en ml. */
  concentracion?: string;
};

function id(prefijo: string) {
  return `${prefijo}${Math.random().toString(36).slice(2, 9)}`;
}

export const catalogoInicial: MedicamentoCatalogo[] = [
  // ---- Adulto ----
  { id: id("m"), tipoPaciente: "adulto", nombre: "PARACETAMOL TABLETAS DE 500 MG", dosisFrecuencia: "Tomar 1 tableta cada 8 horas", periodo: "Durante 3 días" },
  { id: id("m"), tipoPaciente: "adulto", nombre: "IBUPROFENO TABLETAS DE 800 MG", dosisFrecuencia: "Tomar por vía oral una tableta cada ocho horas", periodo: "Durante 3 días" },
  { id: id("m"), tipoPaciente: "adulto", nombre: "MOTRIN IBUPROFENO DE 800 MG", dosisFrecuencia: "Tomar cada 8 horas por 3 días", periodo: "En caso de dolor" },
  { id: id("m"), tipoPaciente: "adulto", nombre: "ACTRON (Ibuprofeno) tabletas de 400 mg", dosisFrecuencia: "Tomar una tableta cada ocho horas", periodo: "Durante cinco días" },
  { id: id("m"), tipoPaciente: "adulto", nombre: "AMOXICILINA CÁPSULAS 500 MG", dosisFrecuencia: "Tomar 1 cápsula cada 8 horas", periodo: "Durante 7 días" },
  { id: id("m"), tipoPaciente: "adulto", nombre: "CLAVULIN 12H (Amoxicilina con Ácido Clavulánico) tabletas 875/125mg", dosisFrecuencia: "Tomar 1 tableta cada 12 horas", periodo: "Durante 7 días" },
  { id: id("m"), tipoPaciente: "adulto", nombre: "DALACIN C (Clindamicina) cápsulas 300mg", dosisFrecuencia: "Tomar una cápsula cada ocho horas", periodo: "Durante siete días" },
  { id: id("m"), tipoPaciente: "adulto", nombre: "MACROZIT (Azitromicina) tabletas 500mg", dosisFrecuencia: "Tomar una tableta cada veinticuatro horas", periodo: "Durante cinco días" },
  { id: id("m"), tipoPaciente: "adulto", nombre: "DAFLOXEN F (Naproxeno Sódico/Paracetamol) tabletas 275/300mg", dosisFrecuencia: "Tomar una tableta cada ocho horas", periodo: "Durante cinco días" },
  { id: id("m"), tipoPaciente: "adulto", nombre: "MELOXICAM 7.5 MG / METOCARBAMOL 215 MG", dosisFrecuencia: "Tomar por vía oral 1 tableta cada 12 horas", periodo: "Durante 3 días" },
  { id: id("m"), tipoPaciente: "adulto", nombre: "SUPRADOL (Ketorolaco) tabletas 10mg", dosisFrecuencia: "Tomar una tableta cada ocho horas", periodo: "Durante tres días" },
  { id: id("m"), tipoPaciente: "adulto", nombre: "SUPRADOL SUBLINGUAL (Ketorolaco) tabletas 30mg", dosisFrecuencia: "Colocar una tableta debajo de la lengua cada doce horas", periodo: "En caso de dolor" },
  { id: id("m"), tipoPaciente: "adulto", nombre: "TRAMADOL 25 MG / KETOROLACO 10 MG comprimidos", dosisFrecuencia: "Tomar 1 comprimido por vía oral cada 12 horas", periodo: "Durante 3 días" },
  { id: id("m"), tipoPaciente: "adulto", nombre: "VELIAN (Dexketoprofeno/Trometamol) solución 25mg/10ml", dosisFrecuencia: "Tomar un sobre de 10 ml cada doce horas", periodo: "Durante tres días o en caso de dolor agudo" },
  { id: id("m"), tipoPaciente: "adulto", nombre: "DOLO NEUROBION FORTE (Diclofenaco/Tiamina/Piridoxina/Cianocobalamina) tabletas", dosisFrecuencia: "Tomar una tableta cada veinticuatro horas", periodo: "Durante un mes" },
  { id: id("m"), tipoPaciente: "adulto", nombre: "DEXAMETASONA AMPOLLETA DE 8 MG", dosisFrecuencia: "Aplicar 8 mg vía intramuscular cada 24 horas", periodo: "Durante 3 días posteriores al procedimiento quirúrgico" },
  { id: id("m"), tipoPaciente: "adulto", nombre: "KETOROLACO AMPOLLETA DE 30 MG", dosisFrecuencia: "Aplicar 30 mg vía intramuscular cada 12 horas", periodo: "Durante 2 a 3 días posteriores al procedimiento quirúrgico" },
  { id: id("m"), tipoPaciente: "adulto", nombre: "LOSEC A-20 (Omeprazol) tabletas de 20mg", dosisFrecuencia: "Tomar una tableta cada veinticuatro horas", periodo: "Durante el tratamiento con antibiótico" },
  { id: id("m"), tipoPaciente: "adulto", nombre: "PERIOXIDIN (Clorhexidina 0.12%) colutorio 200ml", dosisFrecuencia: "Realizar enjuagues bucales tres veces al día", periodo: "Durante siete días" },

  // ---- Pediátrico (dosis por peso) ----
  {
    id: id("m"), tipoPaciente: "pediatrico",
    nombre: "AMOXICILINA SUSPENSIÓN 250mg/5ml",
    mgPorKgMin: 25, mgPorKgMax: 50, frecuenciaPediatrica: "cada 8 horas", duracionPediatrica: "durante 7 días",
    dosisMaximaMg: 500, concentracion: "250 mg / 5 ml",
  },
  {
    id: id("m"), tipoPaciente: "pediatrico",
    nombre: "CLAVULIN (Amoxicilina/Ácido Clavulánico) SUSPENSIÓN 200mg/28.5mg por 5ml",
    mgPorKgMin: 25, mgPorKgMax: 45, frecuenciaPediatrica: "cada 12 horas", duracionPediatrica: "durante 7 días",
    dosisMaximaMg: 875, concentracion: "200 mg / 5 ml",
  },
  {
    id: id("m"), tipoPaciente: "pediatrico",
    nombre: "IBUPROFENO SUSPENSIÓN 100mg/5ml",
    mgPorKgMin: 5, mgPorKgMax: 10, frecuenciaPediatrica: "cada 6-8 horas", duracionPediatrica: "durante 3 días o en caso de dolor",
    dosisMaximaMg: 400, concentracion: "100 mg / 5 ml",
  },
  {
    id: id("m"), tipoPaciente: "pediatrico",
    nombre: "PARACETAMOL SUSPENSIÓN/GOTAS 100mg/ml",
    mgPorKgMin: 10, mgPorKgMax: 15, frecuenciaPediatrica: "cada 6 horas", duracionPediatrica: "durante 3 días o en caso de dolor/fiebre",
    dosisMaximaMg: 500, concentracion: "100 mg / ml",
  },
  {
    id: id("m"), tipoPaciente: "pediatrico",
    nombre: "CLINDAMICINA SUSPENSIÓN 75mg/5ml (alternativa en alergia a penicilina)",
    mgPorKgMin: 8, mgPorKgMax: 25, frecuenciaPediatrica: "cada 8 horas", duracionPediatrica: "durante 7 días",
    dosisMaximaMg: 300, concentracion: "75 mg / 5 ml",
  },
];

export type ResultadoDosisPediatrica = {
  mgMin: number;
  mgMax: number;
  mlMin: number | null;
  mlMax: number | null;
  excedeMaximo: boolean;
  texto: string;
};

export function calcularDosisPediatrica(
  medicamento: MedicamentoCatalogo,
  pesoKg: number
): ResultadoDosisPediatrica | null {
  if (medicamento.tipoPaciente !== "pediatrico" || !medicamento.mgPorKgMin || !medicamento.mgPorKgMax) return null;
  if (!pesoKg || pesoKg <= 0) return null;

  let mgMin = Math.round(medicamento.mgPorKgMin * pesoKg);
  let mgMax = Math.round(medicamento.mgPorKgMax * pesoKg);
  const excedeMaximo = Boolean(medicamento.dosisMaximaMg && mgMax > medicamento.dosisMaximaMg);
  if (excedeMaximo && medicamento.dosisMaximaMg) {
    mgMax = medicamento.dosisMaximaMg;
    if (mgMin > mgMax) mgMin = mgMax;
  }

  let mlMin: number | null = null;
  let mlMax: number | null = null;
  const match = medicamento.concentracion?.match(/([\d.]+)\s*mg\s*\/\s*([\d.]+)?\s*ml/i);
  if (match) {
    const mgPorMl = Number(match[1]) / (match[2] ? Number(match[2]) : 1);
    if (mgPorMl > 0) {
      mlMin = Math.round((mgMin / mgPorMl) * 10) / 10;
      mlMax = Math.round((mgMax / mgPorMl) * 10) / 10;
    }
  }

  const rangoMg = mgMin === mgMax ? `${mgMin} mg` : `${mgMin}–${mgMax} mg`;
  const rangoMl = mlMin !== null && mlMax !== null ? ` (${mlMin === mlMax ? `${mlMin} ml` : `${mlMin}–${mlMax} ml`})` : "";
  const texto = `${rangoMg}${rangoMl} ${medicamento.frecuenciaPediatrica ?? ""}, ${medicamento.duracionPediatrica ?? ""}${
    excedeMaximo ? " — dosis ajustada al máximo por toma, verificar" : ""
  }`.trim();

  return { mgMin, mgMax, mlMin, mlMax, excedeMaximo, texto };
}
