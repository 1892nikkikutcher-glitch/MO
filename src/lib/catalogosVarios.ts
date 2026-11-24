/** Catálogos administrativos sencillos (promociones, aseguradoras) — cada
 * uno vive en su propia colección de nivel de clínica en Firestore. */

export type Promocion = {
  id: string;
  nombre: string;
  descripcion: string;
  descuento: string;
  vigenciaInicio: string;
  vigenciaFin: string;
  activa: boolean;
};

export function promocionVigente(p: Promocion, hoy: string): boolean {
  if (!p.activa) return false;
  if (p.vigenciaInicio && hoy < p.vigenciaInicio) return false;
  if (p.vigenciaFin && hoy > p.vigenciaFin) return false;
  return true;
}

export type EstadoPromocion = { vigente: boolean; etiqueta: string; motivo: string };

function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d} ${meses[m - 1]} ${a}`;
}

/** Lo mismo que `promocionVigente`, pero diciendo por qué una promoción no lo está. */
export function estadoPromocion(p: Promocion, hoy: string): EstadoPromocion {
  if (!p.activa) {
    return { vigente: false, etiqueta: "Desactivada", motivo: "Está desactivada: abre Editar y marca «Promoción activa»." };
  }
  if (p.vigenciaInicio && hoy < p.vigenciaInicio) {
    return { vigente: false, etiqueta: "Aún no inicia", motivo: `Empieza el ${fechaCorta(p.vigenciaInicio)}.` };
  }
  if (p.vigenciaFin && hoy > p.vigenciaFin) {
    return { vigente: false, etiqueta: "Venció", motivo: `Venció el ${fechaCorta(p.vigenciaFin)}.` };
  }
  return { vigente: true, etiqueta: "Vigente", motivo: "" };
}

export type Aseguradora = {
  id: string;
  nombre: string;
  contacto: string;
  telefono: string;
  correo: string;
  notas: string;
};

/** Empresa (y/o persona responsable) encargada de recolectar los Residuos
 * Peligrosos Biológico-Infecciosos (RPBI) del consultorio. `empresa` y
 * `responsable` son independientes — se puede llenar solo uno o ambos.
 * `nombre` es el campo original (empresa/responsable combinados en uno
 * solo) de antes de este cambio: ausente en registros nuevos, se conserva
 * como opcional solo para no perder los datos de registros ya guardados. */
export type EmpresaRPBI = {
  id: string;
  empresa: string;
  responsable: string;
  telefono: string;
  correo: string;
  frecuencia: string;
  costo: string;
  incluye: string;
  requiereFactura: boolean;
  notas: string;
  nombre?: string;
};

/** Contador o despacho contable del consultorio — mismo patrón que
 * EmpresaRPBI: `despacho` y `contador` son independientes, se puede
 * llenar solo uno o ambos. */
export type Contador = {
  id: string;
  despacho: string;
  contador: string;
  telefono: string;
  correo: string;
  notas: string;
};
