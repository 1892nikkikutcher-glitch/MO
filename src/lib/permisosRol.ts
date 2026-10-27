import type { RolClinica } from "./patientData";

/** Cómo se llama cada rol de la clínica en pantalla. El valor guardado en `clinicMembers.role` del
 * Cirujano dentista es "odontologo" (así lo conocen también las reglas de Firestore). */
export const etiquetaRolClinica: Record<RolClinica, string> = {
  admin: "Administrador",
  colaborador: "Colaborador",
  odontologo: "Cirujano dentista",
};

export const descripcionRolClinica: Record<RolClinica, string> = {
  admin: "Dueño o socio: ve todo, incluidas finanzas, y puede configurar y eliminar.",
  colaborador:
    "Ve y edita pacientes, agenda, recetas, presupuestos y fotografías (puede subir archivos); no ve pagos ni cortes de caja y no puede eliminar nada: si se equivoca, avisa al administrador.",
  odontologo:
    "Atiende como empleado: ve y edita pacientes, historia clínica, odontograma, recetas, notas y agenda, pero no ve pagos ni finanzas y no puede eliminar nada.",
};

/** Solo el administrador elimina registros (pacientes, citas, presupuestos, notas, fotos...). Es la misma
 * regla que aplican las reglas de Firestore y de Storage (`puedeBorrar`); aquí sirve para avisar antes en
 * vez de dejar que falle. Sin rol conocido todavía se permite: las reglas son la autoridad. */
export function puedeEliminarConRol(rol: RolClinica | null | undefined): boolean {
  return !rol || rol === "admin";
}

export const MENSAJE_ROL_SIN_PERMISO_ELIMINAR =
  "Tu rol no permite eliminar registros. Si cometiste un error, avisa a tu administrador para que lo corrija.";

/** Módulos del menú que el rol no ve (los ids son los de BottomNav; un módulo oculto esconde también
 * sus subpáginas, ej. "reportes-pagos"). El Cirujano dentista ve lo clínico y operativo; lo
 * administrativo y financiero queda para el administrador. */
const MODULOS_OCULTOS_POR_ROL: Record<RolClinica, string[]> = {
  admin: [],
  colaborador: ["cashback", "facturacion"],
  odontologo: ["cashback", "facturacion", "reportes", "administracion", "asistencia", "gastos", "regulacion-sanitaria", "rpbi", "contabilidad", "planes"],
};

export function moduloVisibleParaRol(rol: RolClinica | null | undefined, idModulo: string): boolean {
  if (!rol) return true;
  return !MODULOS_OCULTOS_POR_ROL[rol].some((m) => idModulo === m || idModulo.startsWith(`${m}-`));
}
