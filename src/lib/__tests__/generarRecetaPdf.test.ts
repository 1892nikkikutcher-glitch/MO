import { describe, expect, it } from "vitest";
import { generarRecetaPdf, type DatosRecetaPdf } from "../generarRecetaPdf";

async function textoDe(blob: Blob): Promise<string> {
  return new TextDecoder("latin1").decode(await blob.arrayBuffer());
}

const datos = (telefono: string, direccionClinica = "Calle Hermenegildo Galeana #14, Centro. Almoloya de Juárez"): DatosRecetaPdf => ({
  folio: "7",
  fecha: "26/11/2026",
  hora: "10:15",
  fechaLarga: "Jueves, 26 de noviembre de 2026",
  medico: "Dra. Ana Mendoza",
  pacienteNombre: "Brenda Ivonne Cruz",
  edadTexto: "34",
  sexo: "F",
  estatura: "",
  temperatura: "",
  peso: "",
  diagnostico: "",
  alergias: "",
  medicamentos: [{ id: "m1", nombre: "AMOXICILINA CÁPSULAS 500 MG", instrucciones: "1 cada 8 horas" }],
  notas: "",
  identidadDoctor: { cedulaProfesional: "123", especialidad: "", correo: "", telefono, escuelaEgreso: "", logoEscuelaUrl: "", firmaDigitalUrl: "" },
  perfilDoctor: { logoClinicaUrl: "", direccionClinica, textoValidezReceta: "Esta receta es válida durante 48h" },
});

describe("pie de la receta en PDF", () => {
  it("imprime la dirección y, debajo, el teléfono del consultorio del médico", async () => {
    const texto = await textoDe(await generarRecetaPdf(datos("722 123 4567")));
    expect(texto).toContain("Tel. 722 123 4567");
    expect(texto).toContain("Almoloya");
  });

  it("sin teléfono no imprime la línea «Tel.»", async () => {
    const texto = await textoDe(await generarRecetaPdf(datos("   ")));
    expect(texto).not.toContain("Tel.");
    expect(texto).toContain("Almoloya");
  });

  it("el teléfono sale aunque no haya dirección", async () => {
    const texto = await textoDe(await generarRecetaPdf(datos("722 123 4567", "")));
    expect(texto).toContain("Tel. 722 123 4567");
  });
});
