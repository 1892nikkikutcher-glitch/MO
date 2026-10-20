import { describe, expect, it } from "vitest";
import { rentabilidadPorTratamiento } from "../rentabilidadTratamientos";

const proc = (id: string, nombre: string, costoPaciente: number, costoOdontologo: number, duracionMinutos: number, extra: Record<string, unknown> = {}) => ({
  id,
  nombre,
  especialidad: "General",
  costoPaciente,
  costoOdontologo,
  duracionMinutos,
  ...extra,
});

const citaA = (fecha: string, tratamientos: string[], estatus = "Atendida") => ({ fecha, estatus, tratamientos });
const rango = { primero: "2026-10-01", ultimo: "2026-10-31" };

describe("rentabilidad por tratamiento", () => {
  const procedimientos = [
    proc("1", "Limpieza dental", 800, 200, 60, { costoInterno: 100 }),
    proc("2", "Resina", 1200, 300, 30, { costoInterno: 150 }),
    proc("3", "Endodoncia", 4000, 1000, 120, { costoInterno: 600 }),
    proc("4", "Sin precio", 0, 0, 30),
    proc("5", "Inactivo", 500, 100, 30, { activo: false }),
  ];

  it("calcula utilidad directa y, con el costo de la estructura, la utilidad completa", () => {
    // Estructura: $1,000 por hora trabajada.
    const f = rentabilidadPorTratamiento({ procedimientos, estructuraPorHora: 1000, citas: [], ...rango });
    const limpieza = f.find((x) => x.nombre === "Limpieza dental")!;
    expect(limpieza.utilidadDirecta).toBe(500); // 800 − 200 − 100
    expect(limpieza.costoEstructura).toBe(1000); // 60 min
    expect(limpieza.costoTotal).toBe(1300); // 200 + 100 + 1000
    expect(limpieza.utilidad).toBe(-500);
    expect(limpieza.margen).toBeCloseTo(-500 / 800, 5);
    expect(limpieza.utilidadPorHora).toBe(-500);
    const endo = f.find((x) => x.nombre === "Endodoncia")!;
    expect(endo.utilidad).toBe(400); // 4000 − 1000 − 600 − 2000
    expect(endo.utilidadPorHora).toBe(200);
  });

  it("sin horas trabajadas solo hay utilidad directa", () => {
    const f = rentabilidadPorTratamiento({ procedimientos, estructuraPorHora: null, citas: [], ...rango });
    const resina = f.find((x) => x.nombre === "Resina")!;
    expect(resina.utilidadDirecta).toBe(750);
    expect(resina.costoEstructura).toBeNull();
    expect(resina.utilidad).toBeNull();
    expect(resina.utilidadPorHora).toBeNull();
    expect(resina.margen).toBeNull();
  });

  it("deja fuera los inactivos y marca los que no tienen precio, al final", () => {
    const f = rentabilidadPorTratamiento({ procedimientos, estructuraPorHora: 100, citas: [], ...rango });
    expect(f.some((x) => x.nombre === "Inactivo")).toBe(false);
    expect(f[f.length - 1]).toMatchObject({ nombre: "Sin precio", sinPrecio: true });
  });

  it("ordena por utilidad por hora, de más a menos", () => {
    const f = rentabilidadPorTratamiento({ procedimientos, estructuraPorHora: 100, citas: [], ...rango });
    const porHora = f.filter((x) => !x.sinPrecio).map((x) => x.utilidadPorHora!);
    expect([...porHora].sort((a, b) => b - a)).toEqual(porHora);
  });

  it("cuenta las veces del mes solo en citas atendidas, sin importar mayúsculas", () => {
    const f = rentabilidadPorTratamiento({
      procedimientos,
      estructuraPorHora: 100,
      citas: [
        citaA("2026-10-05", ["Limpieza dental", "resina"]),
        citaA("2026-10-12", ["LIMPIEZA DENTAL "]),
        citaA("2026-10-13", ["Limpieza dental"], "Cancelada"),
        citaA("2026-09-30", ["Limpieza dental"]), // otro mes
      ],
      ...rango,
    });
    expect(f.find((x) => x.nombre === "Limpieza dental")!.veces).toBe(2);
    expect(f.find((x) => x.nombre === "Resina")!.veces).toBe(1);
    const limpieza = f.find((x) => x.nombre === "Limpieza dental")!;
    expect(limpieza.utilidadDelMes).toBeCloseTo(limpieza.utilidad! * 2, 2);
  });
});
