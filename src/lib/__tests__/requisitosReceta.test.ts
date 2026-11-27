import { describe, expect, it } from "vitest";
import { requisitosFaltantesReceta } from "../requisitosReceta";

const completo = {
  cedulaProfesional: "12656138",
  domicilioConsultorio: "Calle Hermenegildo Galeana #14, Almoloya de Juárez",
  telefono: "722 123 4567",
  medicamentos: [{ nombre: "Ampicilina tabletas de 500mg", instrucciones: "Tomar 1 cada 12 horas durante 5 días." }],
};

describe("requisitos de la receta (Reglamento de Insumos, arts. 29 y 30)", () => {
  it("una receta completa no tiene faltantes", () => {
    expect(requisitosFaltantesReceta(completo)).toEqual({ obligatorios: [], recomendados: [] });
  });

  it("sin cédula ni domicilio, ambos son obligatorios", () => {
    const r = requisitosFaltantesReceta({ ...completo, cedulaProfesional: " ", domicilioConsultorio: "" });
    expect(r.obligatorios).toHaveLength(2);
    expect(r.obligatorios[0]).toMatch(/cédula/);
    expect(r.obligatorios[1]).toMatch(/domicilio/);
  });

  it("un medicamento sin indicaciones falta a la dosis, vía, frecuencia y duración", () => {
    const r = requisitosFaltantesReceta({
      ...completo,
      medicamentos: [...completo.medicamentos, { nombre: "Paracetamol 1 g", instrucciones: "  " }],
    });
    expect(r.obligatorios).toHaveLength(1);
    expect(r.obligatorios[0]).toMatch(/Paracetamol 1 g/);
    expect(r.obligatorios[0]).not.toMatch(/Ampicilina/);
  });

  it("el teléfono es solo una recomendación, no una obligación", () => {
    const r = requisitosFaltantesReceta({ ...completo, telefono: null });
    expect(r.obligatorios).toEqual([]);
    expect(r.recomendados).toHaveLength(1);
    expect(r.recomendados[0]).toMatch(/teléfono/);
  });
});
