import { describe, expect, it } from "vitest";
import {
  aplicarRegistro,
  diasHasta,
  fallasAbiertas,
  garantiaVigente,
  mensajeAvisoIngeniero,
  proximoMantenimiento,
  resolverFalla,
  resumenMantenimiento,
  situacionMantenimiento,
  sumarMeses,
  ultimoServicio,
  type Equipo,
  type RegistroEquipo,
} from "../mantenimientoEquipos";

const HOY = new Date(2026, 10, 1); // 1 de noviembre de 2026

const equipo = (extra: Partial<Equipo> = {}): Equipo => ({
  id: "e1",
  nombre: "Autoclave",
  marca: "Tuttnauer",
  modelo: "2540",
  numeroSerie: "SN-123",
  ubicacion: "Esterilización",
  fechaCompra: "2026-01-10",
  proveedor: "",
  costo: "",
  garantiaHasta: "",
  estado: "Operando",
  periodicidadMeses: 6,
  ingenieroId: "",
  notas: "",
  creadoEn: "2026-01-10T00:00:00.000Z",
  ...extra,
});

const registro = (extra: Partial<RegistroEquipo> = {}): RegistroEquipo => ({
  id: "r1",
  equipoId: "e1",
  tipo: "Mantenimiento preventivo",
  fecha: "2026-05-01",
  descripcion: "",
  responsable: "",
  costo: "",
  resuelta: false,
  registradoPor: "a@b.mx",
  creadoEn: "2026-05-01T00:00:00.000Z",
  ...extra,
});

describe("fechas", () => {
  it("suma meses sin pasarse de fin de mes", () => {
    expect(sumarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(sumarMeses("2026-10-15", 6)).toBe("2027-04-15");
    expect(sumarMeses("2026-11-30", 3)).toBe("2027-02-28");
    expect(sumarMeses("basura", 3)).toBe("");
  });

  it("cuenta los días hasta una fecha, negativos si ya pasó", () => {
    expect(diasHasta("2026-11-04", HOY)).toBe(3);
    expect(diasHasta("2026-10-30", HOY)).toBe(-2);
    expect(diasHasta("", HOY)).toBeNull();
  });
});

describe("próximo mantenimiento", () => {
  it("sin servicios cuenta desde la compra; con servicios, desde el último", () => {
    expect(proximoMantenimiento(equipo(), [])).toBe("2026-07-10");
    expect(proximoMantenimiento(equipo(), [registro({ fecha: "2026-05-01" }), registro({ id: "r2", fecha: "2026-09-20" })])).toBe("2027-03-20");
  });

  it("las fallas y las notas no reinician el reloj, y los servicios de otro equipo tampoco", () => {
    const regs = [registro({ tipo: "Falla reportada", fecha: "2026-10-01" }), registro({ id: "r2", tipo: "Otro", fecha: "2026-10-02" }), registro({ id: "r3", equipoId: "otro", fecha: "2026-10-03" })];
    expect(ultimoServicio("e1", regs)).toBe("");
    expect(proximoMantenimiento(equipo(), regs)).toBe("2026-07-10");
  });

  it("sin periodicidad o sin ninguna fecha base no hay próximo", () => {
    expect(proximoMantenimiento(equipo({ periodicidadMeses: 0 }), [])).toBe("");
    expect(proximoMantenimiento(equipo({ fechaCompra: "" }), [])).toBe("");
  });

  it("clasifica: vencido, próximo (15 días), al día y sin programa", () => {
    expect(situacionMantenimiento(equipo(), [], HOY)).toBe("vencido"); // tocaba el 10 de julio
    const regs = (fecha: string) => [registro({ fecha })];
    expect(situacionMantenimiento(equipo(), regs("2026-05-10"), HOY)).toBe("proximo"); // toca el 10 de noviembre
    expect(situacionMantenimiento(equipo(), regs("2026-05-20"), HOY)).toBe("al-dia"); // toca el 20 de noviembre
  });

  it("el día que toca todavía no está vencido", () => {
    expect(situacionMantenimiento(equipo(), [registro({ fecha: "2026-05-01" })], HOY)).toBe("proximo");
    expect(situacionMantenimiento(equipo({ periodicidadMeses: 0 }), [], HOY)).toBe("sin-programa");
  });
});

describe("bitácora que mueve el estado", () => {
  it("una falla deja el equipo con falla y se cuenta como abierta", () => {
    const falla = registro({ id: "f1", tipo: "Falla reportada", fecha: "2026-10-30", descripcion: "No llega a presión" });
    const r = aplicarRegistro(equipo(), [], falla);
    expect(r.equipo.estado).toBe("Con falla");
    expect(fallasAbiertas("e1", r.registros)).toHaveLength(1);
  });

  it("un correctivo resuelve las fallas abiertas y regresa el equipo a operar", () => {
    const falla = registro({ id: "f1", tipo: "Falla reportada" });
    const conFalla = aplicarRegistro(equipo(), [], falla);
    const r = aplicarRegistro(conFalla.equipo, conFalla.registros, registro({ id: "c1", tipo: "Mantenimiento correctivo", fecha: "2026-10-31" }));
    expect(r.equipo.estado).toBe("Operando");
    expect(fallasAbiertas("e1", r.registros)).toHaveLength(0);
  });

  it("un servicio no cambia un equipo fuera de servicio, y las fallas de otro equipo no se tocan", () => {
    const otraFalla = registro({ id: "f9", equipoId: "otro", tipo: "Falla reportada" });
    const r = aplicarRegistro(equipo({ estado: "Fuera de servicio" }), [otraFalla], registro({ id: "c1", tipo: "Mantenimiento preventivo" }));
    expect(r.equipo.estado).toBe("Fuera de servicio");
    expect(r.registros.find((x) => x.id === "f9")?.resuelta).toBe(false);
  });

  it("resolver la última falla regresa el equipo a operar; con otra abierta sigue con falla", () => {
    const regs = [registro({ id: "f1", tipo: "Falla reportada" }), registro({ id: "f2", tipo: "Falla reportada" })];
    const primera = resolverFalla(equipo({ estado: "Con falla" }), regs, "f1");
    expect(primera.equipo.estado).toBe("Con falla");
    const segunda = resolverFalla(primera.equipo, primera.registros, "f2");
    expect(segunda.equipo.estado).toBe("Operando");
  });
});

describe("garantía y resumen", () => {
  it("la garantía vigente incluye el día de vencimiento", () => {
    expect(garantiaVigente(equipo({ garantiaHasta: "2026-11-01" }), HOY)).toBe(true);
    expect(garantiaVigente(equipo({ garantiaHasta: "2026-10-31" }), HOY)).toBe(false);
    expect(garantiaVigente(equipo(), HOY)).toBe(false);
  });

  it("separa lo que tiene falla, lo vencido y lo próximo; fuera de servicio no avisa", () => {
    const equipos = [
      equipo({ id: "a", nombre: "Rayos X", estado: "Con falla" }),
      equipo({ id: "b", nombre: "Compresor" }),
      equipo({ id: "c", nombre: "Lámpara", fechaCompra: "2026-05-10" }),
      equipo({ id: "d", nombre: "Sillón viejo", estado: "Fuera de servicio" }),
      equipo({ id: "e", nombre: "Pieza", periodicidadMeses: 0 }),
    ];
    const r = resumenMantenimiento(equipos, [], HOY);
    expect(r.conFalla.map((e) => e.id)).toEqual(["a"]);
    expect(r.vencidos.map((e) => e.id)).toEqual(["b"]);
    expect(r.proximos.map((e) => e.id)).toEqual(["c"]);
  });
});

describe("mensaje al ingeniero", () => {
  it("por falla incluye el equipo, la serie y la descripción de la falla abierta", () => {
    const texto = mensajeAvisoIngeniero({
      clinica: "Clínica Sonrisa",
      equipo: equipo(),
      registros: [registro({ tipo: "Falla reportada", fecha: "2026-10-30", descripcion: "No llega a presión" })],
      motivo: "falla",
      ingeniero: { nombre: "Ing. Pérez" },
    });
    expect(texto).toContain("Hola Ing. Pérez");
    expect(texto).toContain("Clínica Sonrisa");
    expect(texto).toContain("Equipo: Autoclave");
    expect(texto).toContain("Serie: SN-123");
    expect(texto).toContain("No llega a presión");
  });

  it("por mantenimiento menciona cuándo le tocaba y el último servicio", () => {
    const texto = mensajeAvisoIngeniero({
      clinica: "",
      equipo: equipo(),
      registros: [registro({ fecha: "2026-05-01" })],
      motivo: "mantenimiento",
    });
    expect(texto).toContain("el consultorio");
    expect(texto).toContain("mantenimiento preventivo desde el 1 de noviembre de 2026");
    expect(texto).toContain("último servicio fue el 1 de mayo de 2026");
  });
});
