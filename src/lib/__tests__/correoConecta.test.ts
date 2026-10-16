import { describe, expect, it } from "vitest";
import { correoCasoNuevo, correoInvitacionCaso, escaparHtml } from "../correoConecta";

const enlace = "https://mo.example/conecta/invite/TOKEN123";

describe("correos de MO Conecta", () => {
  it("el aviso de caso nuevo dice quién lo envió y a dónde entrar, sin datos del paciente", () => {
    const c = correoCasoNuevo({ remitenteNombre: "Dra. Ana Mendoza", destinatarioNombre: "Dr. Luis Ortega", enlace: "https://mo.example" });
    expect(c.asunto).toBe("Dra. Ana Mendoza te envió un caso por MO Conecta");
    expect(c.texto).toContain("Hola, Dr. Luis Ortega.");
    expect(c.texto).toContain("https://mo.example");
    expect(c.texto).toContain("no incluye ningún dato del paciente");
    expect(c.texto).toContain("Protegido por Sonríe X Todos Dental");
    expect(c.html).toContain("Abrir MO Conecta");
    expect(c.html).toContain('href="https://mo.example"');
  });

  it("la invitación lleva el enlace de un solo uso y cuándo vence", () => {
    const c = correoInvitacionCaso({ remitenteNombre: "Dra. Ana Mendoza", enlace, vence: "21 de octubre de 2026" });
    expect(c.asunto).toBe("Dra. Ana Mendoza te invitó a ver un caso en MO Conecta");
    expect(c.texto).toContain(enlace);
    expect(c.texto).toContain("vence el 21 de octubre de 2026");
    expect(c.texto).toContain("crea tu cuenta con este mismo correo");
    expect(c.html).toContain("Ver el caso");
  });

  it("sin nombre del remitente dice 'Un colega'", () => {
    expect(correoCasoNuevo({ remitenteNombre: "  ", enlace: "https://mo.example" }).asunto).toBe("Un colega te envió un caso por MO Conecta");
  });

  it("escapa lo que viene de personas para que no se meta HTML en el correo", () => {
    expect(escaparHtml(`<b>"Dr" & 'Co'</b>`)).toBe("&lt;b&gt;&quot;Dr&quot; &amp; &#39;Co&#39;&lt;/b&gt;");
    const c = correoCasoNuevo({ remitenteNombre: `<script>alert(1)</script>`, enlace: "https://mo.example" });
    expect(c.html).not.toContain("<script>");
    expect(c.html).toContain("&lt;script&gt;");
  });
});
