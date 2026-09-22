import { describe, expect, it } from "vitest";
import {
  cedulaProfesionalDe,
  computeTratamientosPendientes,
  diasRestantesDePrueba,
  DURACION_PRUEBA_DIAS,
  pruebaVencida,
  type DevolucionPago,
  type Pago,
  type Recurso,
  type SavedBudget,
} from "../patientData";

// Fecha LOCAL (nunca .toISOString(), que da la fecha en UTC) — coincide con
// cómo diasRestantesDePrueba interpreta el string (`${fecha}T00:00:00`,
// hora local) y con cómo el resto de la app ya genera estas fechas
// (ej. hoyIso() en ReporteCorteCaja.tsx).
function haceNDias(n: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - n);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

describe("diasRestantesDePrueba", () => {
  it("recién iniciada, quedan los 14 días completos (redondeado hacia arriba)", () => {
    expect(diasRestantesDePrueba(haceNDias(0))).toBe(DURACION_PRUEBA_DIAS);
  });

  it("a la mitad, quedan aproximadamente la mitad de los días", () => {
    expect(diasRestantesDePrueba(haceNDias(7))).toBe(7);
  });

  it("justo el día 14, ya no queda ningún día (vencida)", () => {
    expect(diasRestantesDePrueba(haceNDias(DURACION_PRUEBA_DIAS))).toBeLessThanOrEqual(0);
  });

  it("mucho después de vencida, el número sigue siendo negativo (nunca se congela en 0)", () => {
    expect(diasRestantesDePrueba(haceNDias(30))).toBeLessThan(0);
  });

  it("sin pruebaIniciadaEl (dato faltante), nunca se asume vencida — se da el beneficio de la duda", () => {
    expect(diasRestantesDePrueba(undefined)).toBe(DURACION_PRUEBA_DIAS);
  });

  it("una fecha con formato inválido tampoco se asume vencida", () => {
    expect(diasRestantesDePrueba("no-es-una-fecha")).toBe(DURACION_PRUEBA_DIAS);
  });
});

describe("pruebaVencida", () => {
  it("false mientras sigan quedando días de prueba", () => {
    expect(pruebaVencida({ planActivo: "prueba", pruebaIniciadaEl: haceNDias(1) })).toBe(false);
  });

  it("true una vez que los 14 días ya se cumplieron", () => {
    expect(pruebaVencida({ planActivo: "prueba", pruebaIniciadaEl: haceNDias(20) })).toBe(true);
  });

  it("nunca es 'vencida' si el plan activo ya es de pago, sin importar cuánto tiempo pasó", () => {
    expect(pruebaVencida({ planActivo: "consultorio", pruebaIniciadaEl: haceNDias(365) })).toBe(false);
    expect(pruebaVencida({ planActivo: "clinicas", pruebaIniciadaEl: haceNDias(365) })).toBe(false);
  });
});

const presupuesto: SavedBudget = {
  id: "pres-1",
  folio: "F-1",
  fecha: "01/06/2026",
  medico: "Dra. López",
  tipoDePrecio: "Consultorio",
  especialidad: "Odontología General",
  diagnostico: "",
  items: [
    { id: "trat-A", procedure: "Endodoncia OD 36", price: 500, teeth: [36], note: "" },
    { id: "trat-B", procedure: "Corona OD 36", price: 2500, teeth: [36], note: "" },
  ],
  total: 3000,
};

const pago: Pago = {
  id: "pago-1",
  fecha: "01/06/2026",
  medico: "Dra. López",
  formaPago: "Efectivo",
  lineas: [
    { id: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "Endodoncia OD 36", monto: 500 },
    { id: "linea-B", tratamientoId: "trat-B", folio: "F-1", label: "Corona OD 36", monto: 2500 },
  ],
  total: 3000,
  facturar: false,
  firma: null,
};

function devolucion(overrides: Partial<DevolucionPago> = {}): DevolucionPago {
  return {
    id: "dev-1",
    patientId: "pac-1",
    pagoOrigenId: "pago-1",
    tipo: "parcial",
    monto: 500,
    moneda: "MXN",
    metodo: "efectivo",
    motivo: "procedimiento_no_realizado",
    itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "Endodoncia OD 36", montoDevuelto: 500, efectoTratamiento: "referido" }],
    registradoPorUid: "uid-1",
    estado: "completada",
    creadoEn: "2026-06-15T10:00:00.000Z",
    completadoEn: "2026-06-15T10:00:00.000Z",
    ...overrides,
  };
}

describe("computeTratamientosPendientes — regresión sin devoluciones", () => {
  it("se comporta exactamente igual que antes cuando no hay devoluciones", () => {
    const pendientes = computeTratamientosPendientes([presupuesto], [pago]);
    expect(pendientes).toEqual([]);
  });

  it("presupuesto sin pagos sigue mostrando el pendiente completo", () => {
    const pendientes = computeTratamientosPendientes([presupuesto], []);
    expect(pendientes.find((t) => t.id === "trat-A")?.pendiente).toBe(500);
    expect(pendientes.find((t) => t.id === "trat-B")?.pendiente).toBe(2500);
  });
});

describe("computeTratamientosPendientes — con devoluciones", () => {
  it("efectoTratamiento 'continua' por renglón reabre saldo de ESE tratamiento", () => {
    const pendientes = computeTratamientosPendientes([presupuesto], [pago], [devolucion({ itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 500, efectoTratamiento: "continua" }] })]);
    const tratA = pendientes.find((t) => t.id === "trat-A");
    expect(tratA?.pendiente).toBe(500);
    expect(pendientes.find((t) => t.id === "trat-B")).toBeUndefined();
  });

  it.each(["cancelado", "referido", "pendiente", "solo_financiero"] as const)(
    "efectoTratamiento '%s' nunca genera una cuenta por cobrar automática",
    (efecto) => {
      const pendientes = computeTratamientosPendientes(
        [presupuesto],
        [pago],
        [devolucion({ itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 500, efectoTratamiento: efecto }] })]
      );
      expect(pendientes).toEqual([]);
    }
  );

  it("una devolución con estado distinto de 'completada' se ignora, aunque tenga items 'continua'", () => {
    const pendientes = computeTratamientosPendientes(
      [presupuesto],
      [pago],
      [devolucion({ estado: "borrador", itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 500, efectoTratamiento: "continua" }] })]
    );
    expect(pendientes).toEqual([]);
  });

  it("una devolución puede tener renglones mixtos — solo el 'continua' reabre saldo", () => {
    const dev = devolucion({
      monto: 3000,
      tipo: "total",
      itemsAfectados: [
        { lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 500, efectoTratamiento: "referido" },
        { lineaPagoId: "linea-B", tratamientoId: "trat-B", folio: "F-1", label: "B", montoDevuelto: 2500, efectoTratamiento: "continua" },
      ],
    });
    const pendientes = computeTratamientosPendientes([presupuesto], [pago], [dev]);
    expect(pendientes.find((t) => t.id === "trat-A")).toBeUndefined();
    expect(pendientes.find((t) => t.id === "trat-B")?.pendiente).toBe(2500);
  });
});

describe("cedulaProfesionalDe", () => {
  const perfilDoctor = { nombre: "Dr. Nicolás Medina González", cedulaProfesional: "1111111" };
  const recursos: Pick<Recurso, "nombre" | "tipo" | "cedulaProfesional">[] = [
    { nombre: "Dr. Enrique Gómez Salas", tipo: "medico", cedulaProfesional: "2222222" },
    { nombre: "Dra. Ana Paola Ríos Cervantes", tipo: "medico" }, // sin cédula capturada todavía
    { nombre: "Sillón 1", tipo: "unidad", cedulaProfesional: "9999999" }, // nunca debería usarse (no es médico)
  ];

  it("un médico con su propia cédula registrada como Recurso: siempre la suya, nunca la de Perfil del Doctor", () => {
    expect(cedulaProfesionalDe("Dr. Enrique Gómez Salas", recursos, perfilDoctor)).toBe("2222222");
  });

  it("el propio dueño de Perfil del Doctor: cae a su cédula ahí (retrocompatible con consultorios de un solo doctor)", () => {
    expect(cedulaProfesionalDe("Dr. Nicolás Medina González", recursos, perfilDoctor)).toBe("1111111");
  });

  it("un médico SIN cédula capturada en su Recurso: nunca muestra la de otra persona, aunque exista Perfil del Doctor", () => {
    expect(cedulaProfesionalDe("Dra. Ana Paola Ríos Cervantes", recursos, perfilDoctor)).toBe("");
  });

  it("un nombre que no corresponde a ningún médico ni a Perfil del Doctor: vacío, nunca inventa una cédula", () => {
    expect(cedulaProfesionalDe("Dr. Alguien Más", recursos, perfilDoctor)).toBe("");
  });

  it("un recurso tipo 'unidad' con el mismo nombre nunca presta su cédula", () => {
    expect(cedulaProfesionalDe("Sillón 1", recursos, perfilDoctor)).toBe("");
  });
});
