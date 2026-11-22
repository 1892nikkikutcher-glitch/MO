import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  areaDeRuta,
  avisarFalloGuardado,
  avisarSinClinica,
  mensajeFalloGuardado,
  motivoDeFallo,
  reiniciarAvisoFalloGuardado,
} from "../avisoFalloGuardado";

describe("avisoFalloGuardado", () => {
  it("distingue el motivo del fallo por el código o el texto del error", () => {
    expect(motivoDeFallo({ code: "permission-denied" })).toBe("permisos");
    expect(motivoDeFallo(new Error("Missing or insufficient permissions."))).toBe("permisos");
    expect(motivoDeFallo({ code: "resource-exhausted" })).toBe("tamano");
    expect(motivoDeFallo(new Error("Document exceeds the maximum size"))).toBe("tamano");
    expect(motivoDeFallo({ code: "unavailable" })).toBe("conexion");
    expect(motivoDeFallo({ code: "algo-raro" })).toBe("otro");
    expect(motivoDeFallo(null)).toBe("otro");
  });

  it("nombra lo que se intentaba guardar según la ruta", () => {
    expect(areaDeRuta("users/u1/pacientes/p1")).toBe("el expediente del paciente");
    expect(areaDeRuta("users/u1/pacientes/p1/historiaClinica/respuestas")).toBe("la historia clínica");
    expect(areaDeRuta("users/u1/pacientes/p1/fotos/datos")).toBe("las fotografías del paciente");
    expect(areaDeRuta("users/u1/config/finanzas")).toBe("la configuración de la clínica");
    expect(areaDeRuta("clinics/u1")).toBe("los datos de la clínica");
    expect(areaDeRuta("users/u1/otraCosa/x")).toBe("este cambio");
  });

  it("el mensaje explica el motivo y deja el detalle técnico para el administrador", () => {
    const m = mensajeFalloGuardado("users/u1/pacientes/p1", { code: "permission-denied" });
    expect(m).toContain("No se pudo guardar el expediente del paciente");
    expect(m).toContain("no tiene permiso");
    expect(m).toContain("permission-denied · users/u1/pacientes/p1");
  });

  describe("alerta en pantalla", () => {
    const alerta = vi.fn();
    beforeEach(() => {
      alerta.mockReset();
      vi.stubGlobal("window", { alert: alerta });
      vi.spyOn(console, "error").mockImplementation(() => {});
      reiniciarAvisoFalloGuardado();
    });
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it("sin clínica activa explica qué hacer, y solo una vez por minuto aunque el autoguardado insista", () => {
      avisarSinClinica();
      avisarSinClinica();
      expect(alerta).toHaveBeenCalledTimes(1);
      expect(alerta.mock.calls[0][0]).toContain("no tiene una clínica activa");
      expect(alerta.mock.calls[0][0]).toContain("Cierra sesión");
    });

    it("avisa una sola vez ante una ráfaga de fallos y siempre deja el error en consola", () => {
      avisarFalloGuardado("users/u1/pacientes/p1", { code: "permission-denied" });
      avisarFalloGuardado("users/u1/pacientes/p2", { code: "permission-denied" });
      expect(alerta).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledTimes(2);
    });
  });
});
