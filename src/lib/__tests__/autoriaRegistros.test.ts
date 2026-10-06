import { describe, expect, it } from "vitest";
import {
  estamparNuevos,
  origenDePresupuesto,
  pareceControlOMensualidad,
  textoAutoriaPresupuesto,
} from "../autoriaRegistros";

const autor = { uid: "u1", email: "recepcion@clinica.mx" };
const ahora = "2026-10-05T20:00:00.000Z";

describe("estamparNuevos", () => {
  it("marca solo los registros nuevos con autor y fecha", () => {
    const prev = [{ id: "a" }];
    const next = [{ id: "a", total: 1 }, { id: "b" }];
    const r = estamparNuevos(prev as { id: string }[], next as { id: string }[], autor, ahora);
    expect(r[0]).toEqual({ id: "a", total: 1 });
    expect(r[1]).toMatchObject({ id: "b", creadoPorUid: "u1", creadoPorEmail: "recepcion@clinica.mx", creadoEl: ahora });
  });

  it("no pisa un autor que ya traía el registro", () => {
    const r = estamparNuevos([], [{ id: "x", creadoPorUid: "otro", creadoPorEmail: "otro@x.mx" } as never], autor, ahora);
    expect((r[0] as { creadoPorEmail?: string }).creadoPorEmail).toBe("otro@x.mx");
  });
});

describe("origen y texto", () => {
  it("deduce el origen del id", () => {
    expect(origenDePresupuesto("pres-cita-123")).toBe("cita");
    expect(origenDePresupuesto("pres-1759999")).toBe("pago");
    expect(origenDePresupuesto("1759999")).toBe("manual");
  });

  it("con autor: lo nombra; sin autor: lo dice claro", () => {
    expect(textoAutoriaPresupuesto({ id: "pres-cita-1", creadoPorEmail: "ana@x.mx", creadoEl: "2026-10-02T20:05:00Z" })).toContain(
      "Creado por ana@x.mx"
    );
    const viejo = textoAutoriaPresupuesto({ id: "pres-cita-1" });
    expect(viejo).toContain("sin registro de quién lo capturó");
    expect(viejo.startsWith("Creado automáticamente")).toBe(true);
  });
});

describe("pareceControlOMensualidad", () => {
  it.each([
    [["Control de ortodoncia"], true],
    [["Mensualidad de ortodoncia"], true],
    [["Revisión"], true],
    [["Ajuste de brackets"], true],
    [["Endodoncia"], false],
    [["Limpieza dental", "Resina"], false],
    [["Controlador"], false],
  ])("%j -> %s", (t, esperado) => {
    expect(pareceControlOMensualidad(t)).toBe(esperado);
  });
});
