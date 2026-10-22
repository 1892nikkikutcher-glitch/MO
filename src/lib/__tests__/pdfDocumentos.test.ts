import { describe, expect, it } from "vitest";
import { ConstructorPdf, dineroPdf, fechaPdf, limpiarTextoPdf, nombreArchivoPdf, porcentajePdf } from "../pdfDocumento";
import { generarEstadosFinancierosPdf } from "../generarEstadosFinancierosPdf";
import { generarExpedientePdf, resumenDeNota } from "../generarExpedientePdf";
import { calcularIndicadores } from "../indicadoresNegocio";
import { balanceInicial } from "../balanceConsultorio";
import type { Gasto } from "../gastos";
import type { CitaAgenda, NotaEvolucion, Patient, Pago, SavedBudget } from "../patientData";
import type { HistoriaClinicaTemplate } from "../historiaClinica";
import type { NotaEvolucionAdministrativa } from "../notasEvolucion";

async function textoDe(blob: Blob): Promise<string> {
  return new TextDecoder("latin1").decode(await blob.arrayBuffer());
}

describe("formato de PDF", () => {
  it("da dinero, porcentajes y fechas legibles", () => {
    expect(dineroPdf(1250)).toBe("$1,250.00");
    expect(dineroPdf(-300.5)).toBe("-$300.50");
    expect(dineroPdf(0.004)).toBe("$0.00");
    expect(porcentajePdf(0.256)).toBe("25.6%");
    expect(porcentajePdf(null)).toBe("—");
    expect(fechaPdf("2026-10-05")).toBe("05/10/2026");
  });

  it("cambia los símbolos que la fuente estándar no dibuja", () => {
    expect(limpiarTextoPdf("−$300 → ok “x”…")).toBe('-$300 -> ok "x"...');
  });

  it("arma un nombre de archivo sin acentos ni espacios", () => {
    expect(nombreArchivoPdf("Expediente", "María del Carmen Peña")).toBe("Expediente_Maria_del_Carmen_Pena.pdf");
    expect(nombreArchivoPdf("", "")).toBe("documento.pdf");
  });

  it("pasa de hoja las tablas largas y pone el número de página en todas", async () => {
    const pdf = new ConstructorPdf({ titulo: "Prueba", clinicaNombre: "Clínica" });
    await pdf.encabezado();
    pdf.tabla(
      [{ titulo: "A" }, { titulo: "B", alinear: "derecha" }],
      Array.from({ length: 120 }, (_, i) => [`Fila ${i}`, `$${i}`])
    );
    expect(pdf.hojas).toBeGreaterThan(2);
    const total = pdf.hojas;
    const texto = await textoDe(pdf.finalizar());
    expect(texto.startsWith("%PDF")).toBe(true);
    expect(texto).toContain(`Página ${total} de ${total}`);
  });
});

const gasto = (categoria: Gasto["categoria"], monto: number, fecha: string, extra: Partial<Gasto> = {}): Gasto => ({ id: `${categoria}${fecha}${monto}`, concepto: "x", categoria, monto, fecha, ...extra });

describe("estados financieros en PDF", () => {
  const indicadores = calcularIndicadores({
    mes: "2026-10-15",
    hoyISO: "2026-10-20",
    finanzas: {
      porFecha: { "2026-10-05": 20000, "2026-10-12": 30000 },
      devolucionesPorFecha: { "2026-10-12": 2000 },
      pagosCountPorFecha: { "2026-10-05": 8, "2026-10-12": 12 },
      porFechaYMedico: {},
    },
    gastos: [gasto("Renta", 8000, "2026-10-01"), gasto("Insumos", 6000, "2026-10-08"), gasto("Impuestos e intereses", 1500, "2026-10-10")],
    clasificacionPorCategoria: { Renta: "fijo", Insumos: "variable" },
    citas: [],
    recursos: [],
    sedes: [],
    pacientes: [],
    saldos: [],
    metaMensual: 0,
    balance: { ...balanceInicial, efectivo: 50000, deudaCortoPlazo: 10000 },
  });

  it("incluye estado de resultados, flujo, balance e indicadores con las cifras del mes", async () => {
    const { blob, nombre } = await generarEstadosFinancierosPdf({
      indicadores,
      etiquetaMes: "Octubre de 2026",
      clinicaNombre: "Consultorio Medina",
      balance: { ...balanceInicial, efectivo: 50000, deudaCortoPlazo: 10000 },
    });
    expect(nombre).toBe("Estados_financieros_Octubre_de_2026_Consultorio_Medina.pdf");
    const texto = await textoDe(blob);
    expect(texto.startsWith("%PDF")).toBe(true);
    for (const frag of ["ESTADO DE RESULTADOS", "FLUJO DE EFECTIVO", "SITUACI", "INDICADORES CLAVE", "Utilidad neta", "$48,000.00", "Capital de trabajo"]) {
      expect(texto).toContain(frag);
    }
    // utilidad neta = 48,000 - 6,000 - 8,000 - 1,500
    expect(indicadores.finanzas.utilidadNeta).toBe(32500);
    expect(texto).toContain("$32,500.00");
  });

  it("avisa cuando todavía no se captura el balance", async () => {
    const { blob } = await generarEstadosFinancierosPdf({
      indicadores: calcularIndicadores({ ...{ mes: "2026-10-15", hoyISO: "2026-10-20", finanzas: { porFecha: {}, devolucionesPorFecha: {}, pagosCountPorFecha: {}, porFechaYMedico: {} }, gastos: [], clasificacionPorCategoria: {}, citas: [], recursos: [], sedes: [], pacientes: [], saldos: [], metaMensual: 0 } }),
      etiquetaMes: "Octubre de 2026",
      clinicaNombre: "X",
      balance: balanceInicial,
    });
    expect(await textoDe(blob)).toContain("Todav");
  });
});

describe("expediente en PDF", () => {
  const patient: Patient = { id: "p1", name: "María del Carmen Paloma", phone: "7751234567", birthDate: "1990-05-10", sexo: "Femenino", email: "m@x.com" };
  const template: HistoriaClinicaTemplate = {
    secciones: [
      {
        id: "s1",
        titulo: "Antecedentes Patológicos",
        preguntas: [
          { id: "q1", tipo: "sino", etiqueta: "Diabetes", mostrarDetalle: true },
          { id: "q2", tipo: "sino", etiqueta: "Hipertensión" },
        ],
      },
    ],
  };
  const notaV1: NotaEvolucion = { id: "n1", fecha: "2026-09-02", medico: "Dr. Luis", presentacion: "", subjetivo: "Dolor al masticar", objetivo: "Caries profunda en 36", analisis: "Pulpitis", pronostico: "Bueno" };
  const notaAdmin: NotaEvolucionAdministrativa = { id: "n2", tipo: "administrativa", patientId: "p1", pacienteNombreSnapshot: "x", citaId: "c1", motivo: "No Asistió" as never, registradoPorUid: "u", creadoEn: "2026-09-10T10:00:00.000Z" };
  const presupuesto: SavedBudget = { id: "b1", folio: "P-001", fecha: "2026-09-02", medico: "Dr. Luis", tipoDePrecio: "", especialidad: "", diagnostico: "", items: [{ id: "i1", procedure: "Endodoncia", price: 3000, teeth: [36], note: "" }], total: 3000, estado: "aceptado" };
  const pago: Pago = { id: "pg1", fecha: "2026-09-05", medico: "Dr. Luis", formaPago: "Efectivo", lineas: [{ id: "l1", tratamientoId: "i1", folio: null, label: "Endodoncia", monto: 1000 } as never], total: 1000, facturar: false, firma: null };
  const cita = { id: "c1", folio: "1", recursoId: "r", patientId: "p1", paciente: "x", tratamientos: ["Endodoncia"], comentarios: "", fecha: "2026-09-05", horaInicio: "10:00", horaFin: "11:00", estatus: "Atendida", recurrenciaId: null } as unknown as CitaAgenda;
  const base = {
    patient,
    clinicaNombre: "Consultorio Medina",
    historiaTemplate: template,
    historiaRespuestas: { porPregunta: { q1: "si", q1__detalle: "Tipo 2, controlada", q2: "no" }, alergias: "Penicilina" },
    notas: [notaV1, notaAdmin],
    citas: [cita],
    presupuestos: [presupuesto],
    pagos: [pago],
    devoluciones: [],
  };

  it("resume cualquier tipo de nota", () => {
    expect(resumenDeNota(notaV1)).toMatchObject({ fecha: "2026-09-02", medico: "Dr. Luis" });
    expect(resumenDeNota(notaV1).texto).toContain("Caries profunda en 36");
    expect(resumenDeNota(notaAdmin)).toMatchObject({ fecha: "2026-09-10", estado: "Nota administrativa" });
  });

  it("incluye datos, alergias, notas, citas y finanzas cuando se permite", async () => {
    const { blob, nombre } = await generarExpedientePdf({ ...base, incluirFinanzas: true });
    expect(nombre).toBe("Expediente_Maria_del_Carmen_Paloma.pdf");
    const texto = await textoDe(blob);
    for (const frag of ["Mar", "Penicilina", "Caries profunda en 36", "HISTORIAL DE CITAS", "PRESUPUESTOS", "P-001", "$2,000.00"]) {
      expect(texto).toContain(frag);
    }
  });

  it("sin permiso de finanzas no sale ni un presupuesto ni un pago", async () => {
    const { blob } = await generarExpedientePdf({ ...base, incluirFinanzas: false });
    const texto = await textoDe(blob);
    expect(texto).not.toContain("PRESUPUESTOS");
    expect(texto).not.toContain("P-001");
    expect(texto).not.toContain("Resumen de cuenta");
  });
});

describe("saldos pendientes en PDF", () => {
  const entrada = (patientId: string, patientName: string, totalPresupuestado: number, totalPagado: number) => ({ patientId, patientName, totalPresupuestado, totalPagado, actualizadoEn: "" });

  it("lista de mayor a menor deuda, con teléfono y total, sin quien ya pagó todo", async () => {
    const { generarSaldosPendientesPdf } = await import("../generarSaldosPendientesPdf");
    const { blob, nombre } = await generarSaldosPendientesPdf({
      saldos: [entrada("a", "Ana Pérez", 5000, 4000), entrada("b", "Beto Ruiz", 9000, 1000), entrada("c", "Cora Saldada", 2000, 2000)],
      telefonos: { a: "7751111111", b: "7752222222" },
      clinicaNombre: "Consultorio Medina",
      fecha: new Date("2026-10-20T12:00:00"),
    });
    expect(nombre).toBe("Saldos_pendientes_2026_10_20_Consultorio_Medina.pdf");
    const texto = await textoDe(blob);
    expect(texto).toContain("$9,000.00");
    expect(texto).toContain("7752222222");
    expect(texto).toContain("$9,000.00"); // total por cobrar: 8,000 + 1,000
    expect(texto).not.toContain("Cora");
    expect(texto.indexOf("Beto")).toBeLessThan(texto.indexOf("Ana"));
  });

  it("avisa cuando nadie debe y cuando las cifras son provisionales", async () => {
    const { generarSaldosPendientesPdf } = await import("../generarSaldosPendientesPdf");
    const { blob } = await generarSaldosPendientesPdf({ saldos: [], telefonos: {}, clinicaNombre: "X", provisional: true });
    const texto = await textoDe(blob);
    expect(texto).toContain("Ning");
    expect(texto).toContain("provisionales");
  });
});

describe("cierre del día en PDF", () => {
  const cierre = {
    fecha: "2026-10-23",
    diaNombre: "viernes",
    citas: [
      { id: "c1", patientId: "p1", paciente: "Ana Pérez", telefono: "7751111111", horaInicio: "10:00", horaFin: "11:00", duracionMin: 60, motivo: "Endodoncia", estatus: "Confirmada", confirmada: true, medicoNombre: "Dra. Ana", sedeId: "s1", sedeNombre: "Centro", fueraDeBloque: false },
      { id: "c2", patientId: "p2", paciente: "Beto Ruiz", telefono: "", horaInicio: "11:00", horaFin: "11:30", duracionMin: 30, motivo: "Limpieza", estatus: "Agendada", confirmada: false, medicoNombre: "Dra. Ana", sedeId: "s1", sedeNombre: "Centro", fueraDeBloque: false },
    ],
    confirmadas: 1,
    porConfirmar: 1,
    espacios: [{ medicoNombre: "Dra. Ana", sedeId: "s1", sedeNombre: "Centro", inicio: "12:00", fin: "13:30", minutos: 90 }],
    minutosLibres: 90,
    pendientes: [{ tipo: "sin_telefono" as const, citaId: "c2", paciente: "Beto Ruiz", texto: "No tiene teléfono registrado" }],
  };

  it("trae resumen, citas por sede y médico, espacios y pendientes", async () => {
    const { generarCierreDelDiaPdf } = await import("../generarCierreDelDiaPdf");
    const { blob, nombre } = await generarCierreDelDiaPdf({ cierre, clinicaNombre: "Consultorio Medina" });
    expect(nombre).toBe("Cierre_del_dia_2026_10_23_Consultorio_Medina.pdf");
    const texto = await textoDe(blob);
    for (const frag of ["Cierre del d", "viernes 23 de octubre", "Centro - Dra. Ana", "Ana P", "Por confirmar", "Sin tel", "1 h 30 min", "No tiene tel"]) {
      expect(texto).toContain(frag);
    }
  });

  it("un día sin citas lo dice", async () => {
    const { generarCierreDelDiaPdf } = await import("../generarCierreDelDiaPdf");
    const { blob } = await generarCierreDelDiaPdf({ cierre: { ...cierre, citas: [], confirmadas: 0, porConfirmar: 0, espacios: [], minutosLibres: 0, pendientes: [] }, clinicaNombre: "X" });
    const texto = await textoDe(blob);
    expect(texto).toContain("No hay citas agendadas");
    expect(texto).toContain("Sin citas, sin pendientes");
  });
});

describe("evaluación semanal en PDF", () => {
  it("trae las medidas, el detalle por médico, los cobros por operador y el margen", async () => {
    const { generarEvaluacionSemanalPdf } = await import("../generarEvaluacionSemanalPdf");
    const { resumenSemana, costosDeLaSemana, cobrosPorOperador, veredictoDeBloques } = await import("../evaluacionSemanal");
    const recursos = [{ id: "m1", tipo: "medico", nombre: "Dra. Ana", bloques: [{ id: "b1", sedeId: "s1", dias: [1, 2, 3, 4, 5], inicio: "09:00", fin: "13:00" }] }];
    const sedes = [{ id: "s1", nombre: "Centro", direccion: "" }];
    const citas = [{ id: "c1", fecha: "2026-10-19", horaInicio: "09:00", horaFin: "10:00", estatus: "Atendida", medicoId: "m1", recursoId: "m1" }];
    const lunes = "2026-10-19";
    const resumen = resumenSemana({ lunes, recursos: recursos as never, sedes: sedes as never, citas: citas as never });
    const costos = costosDeLaSemana([{ id: "g1", concepto: "x", categoria: "Insumos", monto: 500, fecha: "2026-10-20" }], lunes);
    const cobros = cobrosPorOperador([{ id: "p1", patientId: "p", patientName: "Ana", pago: { id: "p1", fecha: "20/10/2026", total: 3000 } as never, registradoEn: "2026-10-20T10:00:00.000Z", registradoPor: "caja@x.com" }], lunes);
    const veredicto = veredictoDeBloques({ hoyISO: "2026-10-22", recursos: recursos as never, sedes: sedes as never, citas: citas as never });
    const { blob, nombre } = await generarEvaluacionSemanalPdf({
      lunes,
      resumen,
      cobros,
      brutos: 3000,
      devoluciones: 200,
      costos,
      comisiones: 300,
      veredicto,
      nombreOperador: (c) => (c === "caja@x.com" ? "Claudia Carbajal" : c),
      clinicaNombre: "Consultorio Medina",
    });
    expect(nombre).toBe("Evaluacion_semanal_2026_10_19_Consultorio_Medina.pdf");
    const texto = await textoDe(blob);
    for (const frag of ["Evaluaci", "Semana del 19 oct 2026 al 25 oct 2026", "MEDIDAS DE LA SEMANA", "Dra. Ana", "Claudia Carbajal", "$2,800.00", "Margen directo", "$2,000.00"]) {
      expect(texto).toContain(frag);
    }
  });
});

describe("corte de caja en PDF", () => {
  const base = {
    fecha: "2026-10-20",
    cobrosBrutos: 6000,
    devoluciones: 500,
    formas: [["Efectivo", 4000], ["Tarjeta de débito", 1500], ["Cashback", 500]] as [string, number][],
    metodosDevolucion: [["Efectivo", 500]] as [string, number][],
    medicos: [{ nombre: "Dra. Ana", monto: 4000, porcentajeComision: 30 }, { nombre: "Dr. Luis", monto: 2000, porcentajeComision: null }],
    ultimosDias: [["2026-10-20", 6000], ["2026-10-19", 3000]] as [string, number][],
    clinicaNombre: "Consultorio Medina",
  };

  it("trae cobros, forma de pago, devoluciones, comisión a pagar y últimos días", async () => {
    const { generarCorteCajaPdf } = await import("../generarCorteCajaPdf");
    const { blob, nombre } = await generarCorteCajaPdf(base);
    expect(nombre).toBe("Corte_de_caja_2026_10_20_Consultorio_Medina.pdf");
    const texto = await textoDe(blob);
    for (const frag of ["martes 20 de octubre de 2026", "$5,500.00", "DESGLOSE POR FORMA DE PAGO", "Tarjeta de d", "no es dinero que entr", "DEVOLUCIONES POR M", "$1,200.00", "Sin %", "LTIMOS D"]) {
      expect(texto).toContain(frag);
    }
  });

  it("un día sin cobros lo dice y no pone secciones vacías", async () => {
    const { generarCorteCajaPdf } = await import("../generarCorteCajaPdf");
    const { blob } = await generarCorteCajaPdf({ ...base, cobrosBrutos: 0, devoluciones: 0, formas: [], metodosDevolucion: [], medicos: [], ultimosDias: [] });
    const texto = await textoDe(blob);
    expect(texto).toContain("No hay pagos registrados");
    expect(texto).not.toContain("DESGLOSE POR M");
  });
});
