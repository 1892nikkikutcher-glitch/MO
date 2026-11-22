/** Aviso en pantalla cuando Firestore rechaza una escritura.
 *
 * MO muestra el cambio de inmediato y manda la escritura al servidor en segundo
 * plano; si el servidor la rechaza (sin permiso, documento demasiado grande...),
 * antes solo quedaba un `console.error` y el dato "desaparecía" al recargar sin
 * que nadie supiera por qué. Aquí se explica, con el mismo estilo de aviso que
 * ya usa la Papelera (`window.alert`, una vez cada pocos segundos para que una
 * ráfaga de guardados fallidos no lance una alerta por cada uno). */

const VENTANA_AVISO_MS = 8000;
let ultimoAviso = 0;

export type MotivoFallo = "permisos" | "tamano" | "conexion" | "otro";

export function motivoDeFallo(err: unknown): MotivoFallo {
  const code = String((err as { code?: unknown } | null)?.code ?? "");
  const texto = String((err as { message?: unknown } | null)?.message ?? "");
  if (code.includes("permission-denied") || /insufficient permissions/i.test(texto)) return "permisos";
  if (code.includes("resource-exhausted") || /maximum size|too large|exceeds/i.test(texto)) return "tamano";
  if (code.includes("unavailable") || code.includes("deadline-exceeded") || code.includes("network")) return "conexion";
  return "otro";
}

/** Nombre entendible de lo que se intentaba guardar, a partir de la ruta de Firestore. */
export function areaDeRuta(ruta: string): string {
  const partes = ruta.split("/").filter(Boolean);
  const i = partes.indexOf("pacientes");
  if (i >= 0) {
    const sub = partes[i + 2];
    if (!sub) return "el expediente del paciente";
    const nombres: Record<string, string> = {
      historiaClinica: "la historia clínica",
      fotos: "las fotografías del paciente",
      notasEvolucion: "las notas de evolución",
      diagnosticos: "los diagnósticos",
      planTratamiento: "el plan de tratamiento",
      recetas: "las recetas",
      presupuestos: "los presupuestos",
      pagos: "los pagos",
      laboratorios: "los laboratorios",
    };
    return nombres[sub] ?? "el expediente del paciente";
  }
  if (partes.includes("config")) return "la configuración de la clínica";
  if (partes[0] === "clinics") return "los datos de la clínica";
  return "este cambio";
}

const EXPLICACION: Record<MotivoFallo, string> = {
  permisos:
    "Tu usuario no tiene permiso para guardar esto (o su acceso a la clínica no está activo). Pídele al administrador que revise tu rol en Administración.",
  tamano: "El registro es demasiado grande para guardarse.",
  conexion: "No hubo conexión con el servidor. Revisa tu internet e inténtalo de nuevo.",
  otro: "El servidor no aceptó el cambio.",
};

export function mensajeFalloGuardado(ruta: string, err: unknown): string {
  const motivo = motivoDeFallo(err);
  const code = String((err as { code?: unknown } | null)?.code ?? "desconocido");
  return (
    `No se pudo guardar ${areaDeRuta(ruta)}. ${EXPLICACION[motivo]}\n\n` +
    "Lo que ves en pantalla puede NO estar guardado: al recargar se perdería. " +
    "Si el aviso se repite, mándale esto al administrador:\n" +
    `${code} · ${ruta}`
  );
}

/** Registra el error en consola y, si no se avisó hace poco, lo explica en pantalla. */
export function avisarFalloGuardado(ruta: string, err: unknown): void {
  console.error(`No se pudo guardar en ${ruta}`, err);
  if (typeof window === "undefined") return;
  const ahora = Date.now();
  if (ahora - ultimoAviso < VENTANA_AVISO_MS) return;
  ultimoAviso = ahora;
  window.alert(mensajeFalloGuardado(ruta, err));
}

/** Cuando la sesión no tiene una clínica activa, los guardados se descartaban sin
 * decir nada (cada función de guardado salía con `if (!clinicUid) return`). Pasa,
 * por ejemplo, si la clínica propia de una cuenta nueva no se pudo crear. Se avisa
 * una vez por minuto, porque el autoguardado de la historia clínica reintenta cada segundo. */
export const MENSAJE_SIN_CLINICA =
  "No se pudo guardar: tu sesión no tiene una clínica activa, así que MO no tiene dónde guardar los datos. " +
  "Cierra sesión y vuelve a entrar. Si el aviso sigue saliendo, avisa al administrador de la clínica " +
  "(puede faltar aceptar tu invitación) y no captures más datos hasta resolverlo.";

const VENTANA_SIN_CLINICA_MS = 60000;
let ultimoAvisoSinClinica = 0;

export function avisarSinClinica(): void {
  console.error("Guardado descartado: la sesión no tiene clínica activa (clinicUid nulo).");
  if (typeof window === "undefined") return;
  const ahora = Date.now();
  if (ahora - ultimoAvisoSinClinica < VENTANA_SIN_CLINICA_MS) return;
  ultimoAvisoSinClinica = ahora;
  window.alert(MENSAJE_SIN_CLINICA);
}

/** Solo para pruebas: reinicia la ventana anti-ráfaga. */
export function reiniciarAvisoFalloGuardado(): void {
  ultimoAviso = 0;
  ultimoAvisoSinClinica = 0;
}
