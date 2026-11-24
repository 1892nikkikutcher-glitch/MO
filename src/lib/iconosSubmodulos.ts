/** Dibujo (trazo de un SVG de 24×24) de cada submódulo del menú de navegación — Proveedores,
 * Reportes y Administración. Se mantiene aparte de `navItems` para no ensanchar ese arreglo; lo
 * que no esté aquí se dibuja con un círculo sencillo (ver `trazoSubmodulo`). */

const DIENTE =
  "M12 6.5C10.5 4.5 8 3.5 6 4.5 3.5 5.8 3.5 9 4.5 11.5c1 2.5.8 5.5 1.7 8 .4 1 1.7 1 2.1 0 .7-1.8.8-4 1.9-4.5h3.6c1.1.5 1.2 2.7 1.9 4.5.4 1 1.7 1 2.1 0 .9-2.5.7-5.5 1.7-8 1-2.5 1-5.7-1.5-7C16 3.5 13.5 4.5 12 6.5Z";
const DOCUMENTO = "M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM14 2v6h6";
const CALENDARIO = "M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z";

export const TRAZOS_SUBMODULOS: Record<string, string> = {
  // Proveedores
  "deposito-dental": "M21 8 12 3 3 8v8l9 5 9-5V8ZM3 8l9 5 9-5M12 13v8",
  "laboratorio-dental": "M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2l-5-10V3M7.5 15h9",
  "centro-radiodiagnostico": "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16",

  // Reportes
  "reportes-pagos": "M3 6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6ZM3 10h18M7 15h3",
  "reportes-devoluciones": "M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11",
  "reportes-corte-caja":
    "M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01",
  "reportes-porcentajes": "M19 5 5 19M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  "reportes-cierre-del-dia": "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z",
  "reportes-evaluacion-semanal": `${CALENDARIO}M9 15l2 2 4-4`,
  "reportes-presupuestos": `${DOCUMENTO}M8 13h8M8 17h5`,
  "reportes-saldos-pendientes":
    "M6 2h12M6 22h12M7 2v4a5 5 0 0 0 2 4l1 2-1 2a5 5 0 0 0-2 4v4M17 2v4a5 5 0 0 1-2 4l-1 2 1 2a5 5 0 0 1 2 4v4",
  "reportes-aviso-privacidad": "M17 10V7a5 5 0 0 0-10 0v3M5 10h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z",
  "reportes-aseguradoras": "M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5l-8-3Z",
  "reportes-ots": "M9 4h6v3H9zM7 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1M9 12h6M9 16h6",
  "reportes-graficas": "M3 3v18h18M7 14l4-4 3 3 5-6",
  "reportes-bitacora-citas": "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  "reportes-encuestas": "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01",
  "reportes-clasificacion": "M3 6h18M6 12h12M9 18h6",
  "reportes-corte-diario": `${CALENDARIO}M8 14h3v3H8z`,
  "reportes-seguimiento-asistencia": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM16 11l2 2 4-4",
  "reportes-recordatorios": "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9ZM13.7 21a2 2 0 0 1-3.4 0",
  "reportes-procedimientos": DIENTE,
  "reportes-cp": "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0ZM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  "reportes-domiciliacion": "M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3",

  // Administración
  "administracion-procedimientos": DIENTE,
  "administracion-historial-clinico": "M3 12h4l3-8 4 16 3-8h4",
  "administracion-borrar-citas": `${CALENDARIO}M10 13l4 4M14 13l-4 4`,
  "administracion-papelera": "M4 7h16M9 7V4h6v3M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6",
  "administracion-consultorio": "M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 10h4a1 1 0 0 1 1 1v10M2 21h20M8 7v6M5 10h6",
  "administracion-comisiones":
    "M18 6c0 1.7-2.7 3-6 3S6 7.7 6 6s2.7-3 6-3 6 1.3 6 3ZM6 6v6c0 1.7 2.7 3 6 3s6-1.3 6-3V6M6 12v6c0 1.7 2.7 3 6 3s6-1.3 6-3v-6",
  "administracion-medicos-pacientes": "M17 3l4 4-4 4M21 7H8M7 21l-4-4 4-4M3 17h13",
  "administracion-medicamentos": "M10.5 20.5a5 5 0 0 1-7-7l10-10a5 5 0 0 1 7 7l-10 10ZM8.5 8.5l7 7",
  "administracion-marketing": "M3 11v3a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1ZM15 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11",
  "administracion-formatos-whatsapp": "M21 12a8 8 0 0 1-11.7 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12ZM9 10h6M9 13.5h4",
  "administracion-catalogos": "M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2V5ZM8 3v18M11 8h5",
  "administracion-metas": "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0ZM13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z",
  "administracion-presupuesto-gastos":
    "M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2ZM16 14.5h.01",
  "administracion-perfil": "M6 3v6a4 4 0 0 0 8 0V3M4 3h3M13 3h3M10 13v2a5 5 0 0 0 10 0v-2M20 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  "administracion-colaboradores": "M18 21a6 6 0 0 0-12 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM21 19a4 4 0 0 0-3-3.9M3 19a4 4 0 0 1 3-3.9",
  "administracion-contrato-ortodoncia": `${DOCUMENTO}M8 16c1-2 2-2 3 0s2 0 4-1`,
  "administracion-consentimientos": `${DOCUMENTO}M8.5 15l2.2 2.2L15.5 12`,
};

/** Trazo del dibujo de un submódulo; un círculo sencillo si todavía no tiene uno propio. */
export function trazoSubmodulo(id: string): string {
  return TRAZOS_SUBMODULOS[id] ?? "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z";
}
