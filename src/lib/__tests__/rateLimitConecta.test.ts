import { describe, expect, it } from "vitest";
import { evaluarRateLimit } from "../rateLimitConecta";

describe("evaluarRateLimit", () => {
  const LIMITE = 10;
  const VENTANA_MIN = 60;

  it("sin ventana previa, permite y arranca el conteo en 1", () => {
    const { permitido, nuevaVentana } = evaluarRateLimit(undefined, new Date("2026-01-01T00:00:00.000Z"), LIMITE, VENTANA_MIN);
    expect(permitido).toBe(true);
    expect(nuevaVentana.conteo).toBe(1);
  });

  it("dentro de la ventana y bajo el límite, permite e incrementa", () => {
    const ventana = { inicioVentana: "2026-01-01T00:00:00.000Z", conteo: 5 };
    const { permitido, nuevaVentana } = evaluarRateLimit(ventana, new Date("2026-01-01T00:10:00.000Z"), LIMITE, VENTANA_MIN);
    expect(permitido).toBe(true);
    expect(nuevaVentana.conteo).toBe(6);
  });

  it("al llegar al límite dentro de la ventana, bloquea (el intento N+1)", () => {
    const ventana = { inicioVentana: "2026-01-01T00:00:00.000Z", conteo: 10 };
    const { permitido, nuevaVentana } = evaluarRateLimit(ventana, new Date("2026-01-01T00:10:00.000Z"), LIMITE, VENTANA_MIN);
    expect(permitido).toBe(false);
    expect(nuevaVentana.conteo).toBe(10); // no se incrementa un intento bloqueado
  });

  it("una vez pasada la ventana, reinicia el conteo aunque antes estuviera en el límite", () => {
    const ventana = { inicioVentana: "2026-01-01T00:00:00.000Z", conteo: 10 };
    const { permitido, nuevaVentana } = evaluarRateLimit(ventana, new Date("2026-01-01T02:00:00.000Z"), LIMITE, VENTANA_MIN);
    expect(permitido).toBe(true);
    expect(nuevaVentana.conteo).toBe(1);
  });
});
