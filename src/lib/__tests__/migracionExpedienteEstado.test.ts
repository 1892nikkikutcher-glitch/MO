import { describe, expect, it } from "vitest";
import {
  migracionBloqueaEscrituraLocal,
  migracionYaCongeloOrigen,
  puedeAvanzarMigracion,
  puedeContinuarHacia,
} from "../migracionExpedienteEstado";

describe("puedeAvanzarMigracion — avance normal", () => {
  it("permite cada paso secuencial de la cadena feliz", () => {
    expect(puedeAvanzarMigracion("iniciada", "preparando")).toBe(true);
    expect(puedeAvanzarMigracion("preparando", "copiando")).toBe(true);
    expect(puedeAvanzarMigracion("copiando", "validando")).toBe(true);
    expect(puedeAvanzarMigracion("validando", "congelado")).toBe(true);
    expect(puedeAvanzarMigracion("congelado", "sincronizando_final")).toBe(true);
    expect(puedeAvanzarMigracion("sincronizando_final", "migrado")).toBe(true);
  });

  it("nunca permite saltarse una etapa", () => {
    expect(puedeAvanzarMigracion("iniciada", "copiando")).toBe(false);
    expect(puedeAvanzarMigracion("copiando", "congelado")).toBe(false);
    expect(puedeAvanzarMigracion("validando", "migrado")).toBe(false);
  });

  it("nunca retrocede", () => {
    expect(puedeAvanzarMigracion("congelado", "copiando")).toBe(false);
    expect(puedeAvanzarMigracion("migrado", "sincronizando_final")).toBe(false);
  });

  it("un mismo estado nunca 'avanza' a sí mismo", () => {
    expect(puedeAvanzarMigracion("copiando", "copiando")).toBe(false);
  });
});

describe("puedeAvanzarMigracion — fallos", () => {
  it("fallido_antes_congelamiento solo procede si el origen todavía no se congeló", () => {
    expect(puedeAvanzarMigracion("iniciada", "fallido_antes_congelamiento")).toBe(true);
    expect(puedeAvanzarMigracion("copiando", "fallido_antes_congelamiento")).toBe(true);
    expect(puedeAvanzarMigracion("validando", "fallido_antes_congelamiento")).toBe(true);
  });

  it("fallido_antes_congelamiento nunca procede si el origen ya se congeló", () => {
    expect(puedeAvanzarMigracion("congelado", "fallido_antes_congelamiento")).toBe(false);
    expect(puedeAvanzarMigracion("sincronizando_final", "fallido_antes_congelamiento")).toBe(false);
  });

  it("fallido_despues_congelamiento solo procede si el origen ya se congeló", () => {
    expect(puedeAvanzarMigracion("congelado", "fallido_despues_congelamiento")).toBe(true);
    expect(puedeAvanzarMigracion("sincronizando_final", "fallido_despues_congelamiento")).toBe(true);
  });

  it("fallido_despues_congelamiento nunca procede si el origen no se había congelado", () => {
    expect(puedeAvanzarMigracion("copiando", "fallido_despues_congelamiento")).toBe(false);
  });

  it("un fallo nunca reinicia la migración desde 'iniciada' — no hay transición válida de salida de un estado de fallo salvo reversión", () => {
    expect(puedeAvanzarMigracion("fallido_antes_congelamiento", "iniciada")).toBe(false);
    expect(puedeAvanzarMigracion("fallido_antes_congelamiento", "copiando")).toBe(false);
    expect(puedeAvanzarMigracion("fallido_despues_congelamiento", "sincronizando_final")).toBe(false);
  });

  it("reversion_pendiente es excepcional y puede declararse desde cualquier estado no terminal", () => {
    expect(puedeAvanzarMigracion("copiando", "reversion_pendiente")).toBe(true);
    expect(puedeAvanzarMigracion("fallido_despues_congelamiento", "reversion_pendiente")).toBe(true);
  });

  it("los estados terminales (migrado, reversion_pendiente) no tienen ninguna transición de salida", () => {
    expect(puedeAvanzarMigracion("migrado", "reversion_pendiente")).toBe(false);
    expect(puedeAvanzarMigracion("reversion_pendiente", "copiando")).toBe(false);
  });
});

describe("puedeContinuarHacia — avance fresco o reintento del mismo paso", () => {
  it("un avance fresco válido sigue permitido, igual que puedeAvanzarMigracion", () => {
    expect(puedeContinuarHacia("preparando", "copiando")).toBe(true);
  });

  it("reintentar el mismo paso (el proceso se interrumpió a medio copiar) está permitido", () => {
    expect(puedeContinuarHacia("copiando", "copiando")).toBe(true);
  });

  it("nunca permite ni saltarse una etapa ni retroceder, ni como reintento", () => {
    expect(puedeContinuarHacia("iniciada", "copiando")).toBe(false);
    expect(puedeContinuarHacia("congelado", "copiando")).toBe(false);
  });

  it("un estado terminal nunca 'continúa', ni hacia sí mismo", () => {
    expect(puedeContinuarHacia("migrado", "migrado")).toBe(false);
  });
});

describe("migracionYaCongeloOrigen / migracionBloqueaEscrituraLocal", () => {
  it("false antes de 'congelado'", () => {
    expect(migracionYaCongeloOrigen("iniciada")).toBe(false);
    expect(migracionYaCongeloOrigen("preparando")).toBe(false);
    expect(migracionYaCongeloOrigen("copiando")).toBe(false);
    expect(migracionYaCongeloOrigen("validando")).toBe(false);
    expect(migracionYaCongeloOrigen("fallido_antes_congelamiento")).toBe(false);
  });

  it("true desde 'congelado' en adelante", () => {
    expect(migracionYaCongeloOrigen("congelado")).toBe(true);
    expect(migracionYaCongeloOrigen("sincronizando_final")).toBe(true);
    expect(migracionYaCongeloOrigen("migrado")).toBe(true);
    expect(migracionYaCongeloOrigen("fallido_despues_congelamiento")).toBe(true);
    expect(migracionYaCongeloOrigen("reversion_pendiente")).toBe(true);
  });

  it("migracionBloqueaEscrituraLocal: ausente (no_migrado) nunca bloquea", () => {
    expect(migracionBloqueaEscrituraLocal(undefined)).toBe(false);
  });

  it("migracionBloqueaEscrituraLocal coincide exactamente con migracionYaCongeloOrigen para cada estado presente", () => {
    const estados = [
      "iniciada", "preparando", "copiando", "validando", "congelado",
      "sincronizando_final", "migrado", "fallido_antes_congelamiento",
      "fallido_despues_congelamiento", "reversion_pendiente",
    ] as const;
    for (const estado of estados) {
      expect(migracionBloqueaEscrituraLocal(estado)).toBe(migracionYaCongeloOrigen(estado));
    }
  });
});
