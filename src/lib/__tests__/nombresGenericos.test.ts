import { describe, expect, it } from "vitest";
import { catalogoInicial, type MedicamentoCatalogo } from "../medicamentos";
import { migrarNombresGenericos, nombreConGenericoPrimero } from "../nombresGenericos";

describe("nombres genéricos primero (LGS art. 226, RIS art. 31)", () => {
  it("pasa la marca al final y deja el genérico al inicio", () => {
    expect(nombreConGenericoPrimero("DALACIN C (Clindamicina) cápsulas 300mg")).toBe("CLINDAMICINA cápsulas 300mg (Dalacin C)");
    expect(nombreConGenericoPrimero("CLAVULIN 12H (Amoxicilina con Ácido Clavulánico) tabletas 875/125mg")).toBe(
      "AMOXICILINA CON ÁCIDO CLAVULÁNICO tabletas 875/125mg (Clavulin 12H)"
    );
    expect(nombreConGenericoPrimero("LOSEC A-20 (Omeprazol) tabletas de 20mg")).toBe("OMEPRAZOL tabletas de 20mg (Losec A-20)");
  });

  it("también cuando el consultorio editó la presentación", () => {
    expect(nombreConGenericoPrimero("CLAVULIN (Amoxicilina/Ácido Clavulánico) SUSPENSIÓN 200mg/28.5mg por 10ml")).toBe(
      "AMOXICILINA/ÁCIDO CLAVULÁNICO SUSPENSIÓN 200mg/28.5mg por 10ml (Clavulin)"
    );
  });

  it("MOTRIN IBUPROFENO (sin paréntesis) y la vía sublingual", () => {
    expect(nombreConGenericoPrimero("MOTRIN IBUPROFENO DE 800 MG")).toBe("IBUPROFENO DE 800 MG (Motrin)");
    expect(nombreConGenericoPrimero("SUPRADOL SUBLINGUAL (Ketorolaco) tabletas 30mg")).toContain("KETOROLACO sublingual tabletas 30mg");
  });

  it("no altera nombres que ya son genéricos ni los que el consultorio escribió a su manera", () => {
    for (const n of ["PARACETAMOL TABLETAS DE 500 MG", "Amoxicilina cápsulas 500 mg", "CLINDAMICINA SUSPENSIÓN 75mg/5ml (alternativa en alergia a penicilina)", "TEMPRA (Paracetamol) gotas"]) {
      expect(nombreConGenericoPrimero(n)).toBe(n);
    }
  });

  it("es idempotente", () => {
    const una = nombreConGenericoPrimero("DALACIN C (Clindamicina) cápsulas 300mg");
    expect(nombreConGenericoPrimero(una)).toBe(una);
  });

  it("el catálogo precargado ya no trae ninguna marca primero", () => {
    expect(migrarNombresGenericos(catalogoInicial).cambios).toBe(0);
    expect(catalogoInicial.some((m) => /^(DALACIN|CLAVULIN|SUPRADOL|MOTRIN|ACTRON|LOSEC|MACROZIT|VELIAN|DAFLOXEN|PERIOXIDIN|DOLO)/i.test(m.nombre))).toBe(false);
  });

  it("migra el catálogo guardado de un consultorio sin tocar el resto de sus datos", () => {
    const guardado: MedicamentoCatalogo[] = [
      { id: "a", tipoPaciente: "adulto", nombre: "MACROZIT (Azitromicina) tabletas 500mg", dosisFrecuencia: "Tomar 1 cada 24 horas", periodo: "5 días" },
      { id: "b", tipoPaciente: "adulto", nombre: "PARACETAMOL TABLETAS DE 500 MG" },
    ];
    const { catalogo, cambios } = migrarNombresGenericos(guardado);
    expect(cambios).toBe(1);
    expect(catalogo[0]).toEqual({ ...guardado[0], nombre: "AZITROMICINA tabletas 500mg (Macrozit)" });
    expect(catalogo[1]).toBe(guardado[1]);
  });
});
