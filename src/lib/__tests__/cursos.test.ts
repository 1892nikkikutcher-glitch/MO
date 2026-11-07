import { describe, expect, it } from "vitest";
import {
  cursoSchema,
  enlaceSeguro,
  mensajeRecomendarCurso,
  urlInscribirmeCurso,
  urlRecomendarCurso,
  type CursoPlataforma,
} from "../cursos";

const curso: CursoPlataforma = {
  id: "c1",
  nombre: "Master Endodoncia México Brasil",
  institucion: "Instituto Ejemplo",
  area: "Endodoncia",
  modalidad: "Mixto",
  imparten: "Dr. Jaffet B y Dra. Susy",
  descripcion: "",
  contactoNombre: "Dra. Susy",
  contactoTelefono: "55 1234 5678",
  contactoCorreo: "",
  enlace: "",
  detalles: "",
  imagenUrl: "",
  creadoEn: "2026-11-07T00:00:00.000Z",
};

describe("mensajeRecomendarCurso", () => {
  it("lleva nombre, quiénes lo imparten y el contacto para inscripciones", () => {
    const texto = mensajeRecomendarCurso(curso);
    expect(texto).toContain("curso en endodoncia");
    expect(texto).toContain("*Master Endodoncia México Brasil*");
    expect(texto).toContain("impartido por Dr. Jaffet B y Dra. Susy");
    expect(texto).toContain("contacto para inscripciones: Dra. Susy · WhatsApp: 55 1234 5678");
  });

  it("manda el sitio con https para que WhatsApp lo vuelva enlace", () => {
    expect(mensajeRecomendarCurso({ ...curso, enlace: "ejemplo.mx/master" })).toContain("https://ejemplo.mx/master");
  });

  it("omite lo que el curso no trae", () => {
    const texto = mensajeRecomendarCurso({ ...curso, imparten: "", contactoNombre: "", contactoTelefono: "" });
    expect(texto).not.toContain("impartido por");
    expect(texto).not.toContain("inscripciones");
  });
});

describe("urlRecomendarCurso", () => {
  it("abre WhatsApp sin número para elegir al colega", () => {
    expect(urlRecomendarCurso(curso).startsWith("https://wa.me/?text=")).toBe(true);
  });
});

describe("urlInscribirmeCurso", () => {
  it("antepone 52 a un número de 10 dígitos", () => {
    expect(urlInscribirmeCurso(curso)?.startsWith("https://wa.me/525512345678?text=")).toBe(true);
  });

  it("es null sin teléfono usable", () => {
    expect(urlInscribirmeCurso({ ...curso, contactoTelefono: "" })).toBeNull();
    expect(urlInscribirmeCurso({ ...curso, contactoTelefono: "123" })).toBeNull();
  });
});

describe("enlaceSeguro", () => {
  it("agrega https y acepta http(s)", () => {
    expect(enlaceSeguro("ejemplo.mx/curso")).toBe("https://ejemplo.mx/curso");
    expect(enlaceSeguro("http://ejemplo.mx")).toBe("http://ejemplo.mx/");
  });

  it("rechaza vacíos y esquemas peligrosos", () => {
    expect(enlaceSeguro("  ")).toBeNull();
    expect(enlaceSeguro("javascript:alert(1)")).toBeNull();
  });
});

describe("cursoSchema", () => {
  const { id: _id, creadoEn: _creadoEn, ...editable } = curso;
  void _id;
  void _creadoEn;

  it("acepta un curso completo", () => {
    expect(cursoSchema.safeParse(editable).success).toBe(true);
  });

  it("rechaza campos que no son del curso y modalidades desconocidas", () => {
    expect(cursoSchema.safeParse({ ...editable, creadoEn: "x" }).success).toBe(false);
    expect(cursoSchema.safeParse({ ...editable, modalidad: "Híbrido" }).success).toBe(false);
  });

  it("exige nombre e institución", () => {
    expect(cursoSchema.safeParse({ ...editable, nombre: " " }).success).toBe(false);
    expect(cursoSchema.safeParse({ ...editable, institucion: "" }).success).toBe(false);
  });
});
