import { describe, expect, it } from "vitest";
import { calcularEstadoGuardado, claveLocalBorrador, detectarConflictoBorrador } from "../borradorLocalNotaPuro";

describe("claveLocalBorrador", () => {
  it("compone una clave única por clínica+paciente+nota", () => {
    expect(claveLocalBorrador("clinicA", "pacB", "notaC")).toBe("clinicA:pacB:notaC");
  });

  it("dos notas distintas del mismo paciente nunca colisionan de clave", () => {
    const a = claveLocalBorrador("clinicA", "pacB", "nota1");
    const b = claveLocalBorrador("clinicA", "pacB", "nota2");
    expect(a).not.toBe(b);
  });
});

describe("calcularEstadoGuardado", () => {
  const base = {
    escribiendoAhora: false,
    pendienteSincronizar: false,
    hayRespaldoLocal: true,
    online: true,
    ultimoIntentoSincronizacionFallo: false,
  };

  it("mientras se escribe, siempre reporta 'guardando'", () => {
    expect(calcularEstadoGuardado({ ...base, escribiendoAhora: true })).toBe("guardando");
  });

  it("todo sincronizado y sin pendientes -> 'guardado'", () => {
    expect(calcularEstadoGuardado(base)).toBe("guardado");
  });

  it("sin conexión con cambios pendientes -> 'sin_conexion_local', nunca 'guardado'", () => {
    const estado = calcularEstadoGuardado({ ...base, online: false, pendienteSincronizar: true });
    expect(estado).toBe("sin_conexion_local");
    expect(estado).not.toBe("guardado");
  });

  it("con conexión pero un intento de sincronización fallido -> 'error_sincronizacion'", () => {
    const estado = calcularEstadoGuardado({
      ...base,
      pendienteSincronizar: true,
      ultimoIntentoSincronizacionFallo: true,
    });
    expect(estado).toBe("error_sincronizacion");
  });

  it("pendiente de sincronizar sin error ni desconexión -> 'pendiente_sincronizar'", () => {
    expect(calcularEstadoGuardado({ ...base, pendienteSincronizar: true })).toBe("pendiente_sincronizar");
  });

  it("nunca reporta 'guardado' si no hay respaldo local ni confirmación remota", () => {
    const estado = calcularEstadoGuardado({
      ...base,
      hayRespaldoLocal: false,
      pendienteSincronizar: true,
    });
    expect(estado).not.toBe("guardado");
  });
});

describe("detectarConflictoBorrador", () => {
  it("sin conflicto cuando Firestore no ha avanzado más allá de lo que el local ya sincronizó", () => {
    const resultado = detectarConflictoBorrador(
      { actualizadoEnBaseLocal: "2026-08-27T10:00:00.000Z" },
      { actualizadoEn: "2026-08-27T10:00:00.000Z" }
    );
    expect(resultado.hayConflicto).toBe(false);
  });

  it("detecta conflicto real cuando Firestore avanzó por una escritura que el local no hizo", () => {
    const resultado = detectarConflictoBorrador(
      { actualizadoEnBaseLocal: "2026-08-27T10:00:00.000Z" },
      { actualizadoEn: "2026-08-27T12:00:00.000Z" }
    );
    expect(resultado.hayConflicto).toBe(true);
    expect(resultado.motivo).toBeTruthy();
  });
});
