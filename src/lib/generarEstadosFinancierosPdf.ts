import { ConstructorPdf, dineroPdf, nombreArchivoPdf, porcentajePdf } from "./pdfDocumento";
import type { Indicadores } from "./indicadoresNegocio";
import type { BalanceConsultorio } from "./balanceConsultorio";

export type DatosEstadosFinancierosPdf = {
  indicadores: Indicadores;
  /** "Octubre de 2026" */
  etiquetaMes: string;
  clinicaNombre: string;
  direccion?: string;
  logoUrl?: string;
  /** Lo capturado a mano, para mostrar cada partida del balance. */
  balance: BalanceConsultorio;
  elaboradoPor?: string;
};

const dias = (n: number) => `${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })} ${Math.round(n) === 1 ? "día" : "días"}`;

/** Estados financieros del mes en PDF: estado de resultados, flujo de efectivo, situación financiera (balance),
 * indicadores clave y costos por categoría — todo a partir de los mismos cálculos que ve el administrador en pantalla. */
export async function generarEstadosFinancierosPdf(datos: DatosEstadosFinancierosPdf): Promise<{ blob: Blob; nombre: string }> {
  const f = datos.indicadores.finanzas;
  const o = datos.indicadores.operacion;
  const b = f.balance;
  const pdf = new ConstructorPdf({
    titulo: "Estados financieros",
    subtitulo: datos.etiquetaMes,
    clinicaNombre: datos.clinicaNombre,
    direccion: datos.direccion,
    logoUrl: datos.logoUrl,
    pieDePagina: `Estados financieros de ${datos.etiquetaMes} · Documento confidencial`,
  });
  await pdf.encabezado();

  const monto = { titulo: "Importe", ancho: 1.4, alinear: "derecha" as const };
  const pctIngresos = (n: number) => (f.ingresosNetos > 0 ? porcentajePdf(n / f.ingresosNetos) : "—");

  // ----- Estado de resultados -----
  pdf.seccion("Estado de resultados");
  pdf.tabla(
    [{ titulo: "Concepto", ancho: 4 }, monto, { titulo: "% de ingresos", ancho: 1.2, alinear: "derecha" }],
    [
      ["Cobros del mes", dineroPdf(f.ingresosBrutos), pctIngresos(f.ingresosBrutos)],
      ["(-) Devoluciones", dineroPdf(-f.devoluciones), pctIngresos(f.devoluciones)],
      { celdas: ["Ingresos por ventas", dineroPdf(f.ingresosNetos), f.ingresosNetos > 0 ? "100%" : "—"], negrita: true, relleno: true },
      ["(-) Costos directos (insumos, laboratorio...)", dineroPdf(-f.costos), pctIngresos(f.costos)],
      { celdas: ["Utilidad bruta", dineroPdf(f.utilidadBruta), pctIngresos(f.utilidadBruta)], negrita: true, relleno: true },
      ["(-) Gastos de operación (renta, nómina, servicios...)", dineroPdf(-f.gastosOperativos), pctIngresos(f.gastosOperativos)],
      { celdas: ["Utilidad operativa", dineroPdf(f.utilidad), pctIngresos(f.utilidad)], negrita: true, relleno: true },
      ["(-) Impuestos e intereses", dineroPdf(-f.financieros), pctIngresos(f.financieros)],
      { celdas: ["Utilidad neta", dineroPdf(f.utilidadNeta), pctIngresos(f.utilidadNeta)], negrita: true, relleno: true },
    ]
  );
  pdf.parrafo("La inversión (equipo, mobiliario, remodelación) no se resta de la utilidad: se compra una vez y rinde durante años. Sí sale del efectivo.", { gris: true, tamano: 8.5 });

  // ----- Flujo de efectivo -----
  pdf.seccion("Flujo de efectivo");
  pdf.tabla(
    [{ titulo: "Concepto", ancho: 4 }, monto],
    [
      ["Entradas: cobros netos de devoluciones y de lo pagado con Saldo Sonríe", dineroPdf(f.entradasEfectivo)],
      ["(-) Costos directos y gastos de operación", dineroPdf(-f.gastos)],
      ["(-) Inversión del mes", dineroPdf(-f.inversion)],
      ["(-) Impuestos e intereses", dineroPdf(-f.financieros)],
      { celdas: ["Flujo de efectivo del mes", dineroPdf(f.flujoEfectivo)], negrita: true, relleno: true },
    ]
  );

  // ----- Situación financiera -----
  pdf.seccion("Situación financiera (balance)");
  if (!b.capturado) {
    pdf.parrafo("Todavía no se captura el balance del consultorio (efectivo, inventario, deudas). Se llena en Contabilidad y finanzas > Indicadores del negocio > Balance del consultorio. Las cuentas por cobrar y el equipo sí se toman automáticamente.", { gris: true });
  }
  pdf.tabla(
    [{ titulo: "Activos", ancho: 4 }, monto],
    [
      ["Efectivo en caja y bancos", dineroPdf(datos.balance.efectivo)],
      ["Inventario de insumos", dineroPdf(datos.balance.inventario)],
      ["Otros activos de corto plazo", dineroPdf(datos.balance.otrosCirculantes)],
      ["Cuentas por cobrar (pacientes)", dineroPdf(f.cuentasPorCobrar.total)],
      { celdas: ["Activo circulante", dineroPdf(b.activoCirculante)], negrita: true, relleno: true },
      [datos.balance.valorEquipo !== null ? "Equipo y mobiliario (valor capturado)" : "Equipo y mobiliario (lo registrado como inversión)", dineroPdf(b.activosFijos)],
      { celdas: ["Activos totales", dineroPdf(b.activosTotales)], negrita: true, relleno: true },
    ]
  );
  pdf.tabla(
    [{ titulo: "Pasivos", ancho: 4 }, monto],
    [
      ["Cuentas por pagar (proveedores y laboratorios)", dineroPdf(datos.balance.cuentasPorPagar)],
      ["Deuda a corto plazo", dineroPdf(datos.balance.deudaCortoPlazo)],
      { celdas: ["Pasivo circulante", dineroPdf(b.pasivoCirculante)], negrita: true, relleno: true },
      ["Deuda a largo plazo", dineroPdf(datos.balance.deudaLargoPlazo)],
      { celdas: ["Pasivos totales", dineroPdf(b.pasivosTotales)], negrita: true, relleno: true },
      { celdas: ["Capital (activos menos pasivos)", dineroPdf(b.activosTotales - b.pasivosTotales)], negrita: true },
    ]
  );
  if (datos.balance.actualizadoEl) {
    pdf.parrafo(`Balance capturado el ${new Date(datos.balance.actualizadoEl).toLocaleDateString("es-MX")}.`, { gris: true, tamano: 8.5 });
  }

  // ----- Indicadores -----
  pdf.seccion("Indicadores clave");
  pdf.tabla(
    [{ titulo: "Indicador", ancho: 2.4 }, { titulo: "Valor", ancho: 1.3, alinear: "derecha" }, { titulo: "Cómo se calcula", ancho: 4 }],
    [
      ["Ingresos por ventas", dineroPdf(f.ingresosNetos), f.variacionIngresos !== null ? `${f.variacionIngresos >= 0 ? "+" : ""}${porcentajePdf(f.variacionIngresos, 0)} contra el mes anterior` : "Sin ingresos el mes anterior"],
      ["Margen bruto", porcentajePdf(f.margenBruto), "(Ventas - costos directos) / ventas"],
      ["Utilidad operativa", dineroPdf(f.utilidad), "Utilidad bruta - gastos de operación"],
      ["Margen neto", porcentajePdf(f.margenNeto), "Utilidad neta / ventas"],
      ["Flujo de efectivo", dineroPdf(f.flujoEfectivo), "Cobros efectivos - pagos efectivos"],
      [
        "Punto de equilibrio",
        f.puntoEquilibrio ? dineroPdf(f.puntoEquilibrio.ingresoNecesario) : "—",
        "Costos fijos / margen de contribución" + (f.puntoEquilibrio ? (f.puntoEquilibrio.superado ? " (superado)" : ` (faltan ${dineroPdf(f.puntoEquilibrio.faltan)})`) : ""),
      ],
      ["Capital de trabajo", b.capturado ? dineroPdf(b.capitalTrabajo) : "—", "Activo circulante - pasivo circulante" + (b.razonCirculante !== null ? ` (liquidez ${b.razonCirculante.toFixed(1)})` : "")],
      ["Endeudamiento", b.capturado ? porcentajePdf(b.endeudamiento, 0) : "—", "Pasivos totales / activos totales"],
      ["Cuentas por cobrar", dineroPdf(f.cuentasPorCobrar.total), `${f.cuentasPorCobrar.pacientes} paciente(s) con saldo pendiente`],
      ["Días de cobranza", f.diasDeCobranza !== null ? dias(f.diasDeCobranza) : "—", "Cuentas por cobrar / cobros diarios promedio de los últimos 90 días"],
      [
        "Rentabilidad de la inversión",
        f.rentabilidadInversion ? porcentajePdf(f.rentabilidadInversion.rendimiento, 0) : "—",
        f.rentabilidadInversion
          ? `Utilidad neta de 12 meses (${dineroPdf(f.rentabilidadInversion.utilidadNeta12m)}) / inversión acumulada (${dineroPdf(f.inversionAcumulada)})`
          : "Sin inversión registrada",
      ],
    ]
  );

  // ----- Costos y gastos por categoría -----
  pdf.seccion("Costos y gastos por categoría");
  pdf.tabla(
    [
      { titulo: "Categoría", ancho: 3 },
      { titulo: "Tipo", ancho: 1.3 },
      { titulo: "Monto", ancho: 1.4, alinear: "derecha" },
      { titulo: "% de ingresos", ancho: 1.2, alinear: "derecha" },
    ],
    [
      ...f.gastosPorCategoria.map((g) => [g.categoria, g.clasificacion === "fijo" ? "Fijo" : g.clasificacion === "variable" ? "Variable" : "Mixto", dineroPdf(g.monto), porcentajePdf(g.porcentajeDeIngresos)]),
      ...(f.gastosPorCategoria.length > 0 ? [{ celdas: ["Fijos / variables", "", `${dineroPdf(f.gastosFijos)} / ${dineroPdf(f.gastosVariables)}`, ""], negrita: true, relleno: true }] : []),
    ],
    { vacio: "Sin gastos registrados en el mes." }
  );

  // ----- Operación -----
  pdf.seccion("Operación del consultorio");
  pdf.pares([
    ["Citas agendadas", String(o.citasAgendadas)],
    ["Atendidas", String(o.atendidas)],
    ["Canceladas / no asistió", `${o.canceladas} / ${o.noAsistio}`],
    ["Utilización de bloques", o.utilizacionBloques !== null ? porcentajePdf(o.utilizacionBloques, 0) : ""],
    ["Horas atendidas", o.horasAtendidas > 0 ? `${o.horasAtendidas.toLocaleString("es-MX", { maximumFractionDigits: 1 })} h` : ""],
    ["Ingreso por hora atendida", o.ingresoPorHoraAtendida !== null ? dineroPdf(o.ingresoPorHoraAtendida) : ""],
    ["Pacientes nuevos", String(o.pacientesNuevos)],
    ["Pacientes activos (12 meses)", String(o.pacientesActivos)],
    ["Ticket promedio", f.ticketPromedio !== null ? dineroPdf(f.ticketPromedio) : ""],
    ["Dependencia de un médico", f.concentracionMedico ? `${porcentajePdf(f.concentracionMedico.porcentaje, 0)} (${f.concentracionMedico.nombre})` : ""],
  ]);

  if (datos.elaboradoPor) pdf.parrafo(`Elaborado por: ${datos.elaboradoPor}`, { gris: true, tamano: 8.5 });
  pdf.parrafo("Cifras generadas automáticamente por MO a partir de los cobros, gastos y saldos registrados. No sustituyen la contabilidad formal ni la declaración de impuestos.", { gris: true, tamano: 8 });

  return { blob: pdf.finalizar(), nombre: nombreArchivoPdf("Estados financieros", datos.etiquetaMes, datos.clinicaNombre) };
}
