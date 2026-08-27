import { describe, expect, it } from "vitest";
import { actualizarFrecuencias, sinAcentos, sugerencias } from "../vocabularioNotas";

describe("sinAcentos", () => {
  it("quita acentos sin cambiar las letras base", () => {
    expect(sinAcentos("sistémico")).toBe("sistemico");
    expect(sinAcentos("endodóntica")).toBe("endodontica");
  });
});

describe("actualizarFrecuencias", () => {
  it("cuenta palabras nuevas relevantes (≥4 letras)", () => {
    const resultado = actualizarFrecuencias({}, "Paciente con dolor agudo en zona apical");
    expect(resultado.paciente).toBe(1);
    expect(resultado.dolor).toBe(1);
    expect(resultado.agudo).toBe(1);
    expect(resultado.zona).toBe(1);
    expect(resultado.apical).toBe(1);
  });

  it("ignora palabras vacías y muy cortas", () => {
    const resultado = actualizarFrecuencias({}, "el paciente no la tiene y se ve mal");
    expect(resultado.el).toBeUndefined();
    expect(resultado.no).toBeUndefined();
    expect(resultado.tiene).toBe(1);
  });

  it("acumula en vez de reiniciar", () => {
    const primero = actualizarFrecuencias({}, "dolor apical");
    const segundo = actualizarFrecuencias(primero, "dolor apical recurrente");
    expect(segundo.dolor).toBe(2);
    expect(segundo.apical).toBe(2);
    expect(segundo.recurrente).toBe(1);
  });

  it("no muta el objeto original", () => {
    const original = { dolor: 1 };
    actualizarFrecuencias(original, "dolor de nuevo");
    expect(original.dolor).toBe(1);
  });
});

describe("sugerencias", () => {
  it("encuentra 'sistémico' del diccionario incorporado al escribir 'sistem'", () => {
    const resultado = sugerencias("sistem", {});
    expect(resultado.some((s) => s.palabra === "sistémico")).toBe(true);
  });

  it("ignora acentos al comparar el prefijo", () => {
    const resultado = sugerencias("sistemi", {});
    expect(resultado.some((s) => s.palabra === "sistémico")).toBe(true);
  });

  it("prioriza el vocabulario de la clínica sobre el diccionario fijo", () => {
    const resultado = sugerencias("perio", { periostitis: 5 });
    expect(resultado[0]).toEqual({ palabra: "periostitis", fuente: "clinica" });
  });

  it("ordena el vocabulario de la clínica por frecuencia descendente", () => {
    const resultado = sugerencias("cont", { contencion: 1, contusion: 9 });
    const deClinica = resultado.filter((s) => s.fuente === "clinica").map((s) => s.palabra);
    expect(deClinica).toEqual(["contusion", "contencion"]);
  });

  it("no sugiere nada con menos de 2 letras", () => {
    expect(sugerencias("s", {})).toEqual([]);
  });

  it("no sugiere la palabra exacta que ya se terminó de escribir", () => {
    const resultado = sugerencias("caries", {});
    expect(resultado.some((s) => s.palabra === "caries")).toBe(false);
  });
});
