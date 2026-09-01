import { describe, expect, it } from "vitest";
import { estadoParaMostrar } from "../historiaClinica";

describe("estadoParaMostrar", () => {
  it("un diagnóstico legado sin estado se muestra como sin_clasificar, NUNCA confirmado", () => {
    expect(estadoParaMostrar({ estado: undefined })).toBe("sin_clasificar");
  });

  it("respeta el estado real cuando existe", () => {
    expect(estadoParaMostrar({ estado: "sospecha" })).toBe("sospecha");
    expect(estadoParaMostrar({ estado: "provisional" })).toBe("provisional");
    expect(estadoParaMostrar({ estado: "confirmado" })).toBe("confirmado");
    expect(estadoParaMostrar({ estado: "descartado" })).toBe("descartado");
  });
});
