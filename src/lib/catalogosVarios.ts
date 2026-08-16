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

export type Aseguradora = {
  id: string;
  nombre: string;
  contacto: string;
  telefono: string;
  correo: string;
  notas: string;
};

/** Empresa (o persona responsable) encargada de recolectar los Residuos
 * Peligrosos Biológico-Infecciosos (RPBI) del consultorio. */
export type EmpresaRPBI = {
  id: string;
  nombre: string;
  telefono: string;
  correo: string;
  notas: string;
};
