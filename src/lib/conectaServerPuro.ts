/** Parte de conectaServer.ts sin ninguna dependencia de Firebase — separado
 * a propósito para poder probarlo con Vitest puro sin arrastrar la
 * inicialización eager de firebaseAdmin.ts (que exige
 * FIREBASE_SERVICE_ACCOUNT_KEY con solo importarlo). conectaServer.ts
 * reexporta todo esto, así que el resto del código sigue importando desde
 * ahí sin cambios. */

export function nowISO(): string {
  return new Date().toISOString();
}

/** Error de negocio con código HTTP explícito — las funciones de lógica de
 * cada ruta lo lanzan en vez de construir un NextResponse directo, así las
 * pruebas de integración (§8.B del plan) pueden llamarlas sin necesitar
 * Next.js ni inspeccionar respuestas HTTP. */
export class ConectaError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** El Admin SDK de Firestore rechaza escribir un valor `undefined` salvo que
 * el proyecto active `ignoreUndefinedProperties` (no está activado aquí) —
 * se usa para construir documentos a partir de objetos con campos opcionales
 * sin arrastrar esas llaves. Recorre objetos anidados (ej. `resumenPaciente`
 * dentro de `Interconsulta`) porque un `undefined` ahí revienta la escritura
 * exactamente igual que uno de primer nivel — los arreglos se dejan tal
 * cual, ninguno de los tipos de MO Conecta guarda `undefined` dentro de uno.
 * No pasarle un objeto que ya traiga un sentinel de FieldValue (delete()/
 * increment()) — se agregan siempre DESPUÉS de limpiar, nunca antes. */
function esObjetoPlano(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date);
}

export function sinIndefinidos<T extends Record<string, unknown>>(obj: T): T {
  const limpio = {} as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    limpio[k] = esObjetoPlano(v) ? sinIndefinidos(v) : v;
  }
  return limpio as T;
}
