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
  colaborador: "Ve pacientes, agenda, recetas y presupuestos; no ve pagos ni cortes de caja.",
  odontologo:
    "Atiende como empleado: ve y edita pacientes, historia clínica, odontograma, recetas, notas y agenda, pero no ve pagos ni finanzas y no puede eliminar nada.",
};

/** Solo el Cirujano dentista no elimina registros (pacientes, citas, presupuestos, notas, fotos...). Es
 * la misma regla que aplican las reglas de Firestore (`puedeBorrar`); aquí sirve para avisar antes
 * en vez de dejar que falle. Sin rol conocido todavía se permite: las reglas son la autoridad. */
export function puedeEliminarConRol(rol: RolClinica | null | undefined): boolean {
  return rol !== "odontologo";
}

export const MENSAJE_ROL_SIN_PERMISO_ELIMINAR =
  "Tu rol (Cirujano dentista) no permite eliminar registros. Pídele al administrador que lo haga.";

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
