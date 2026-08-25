import { describe, expect, it } from "vitest";
import {
  generarTokenInvitacion,
  fechaVencimientoInvitacion,
  fechaVencimientoSolicitudAcceso,
  invitacionVencida,
  normalizarCorreo,
  coincideIdentidad,
  existeInvitacionActivaDuplicada,
  buildMensajeInvitacionConecta,
  urlInvitacion,
  type InvitacionConecta,
} from "../invitacionesConecta";
import { hashToken } from "../tokenHashServer";

describe("generarTokenInvitacion", () => {
  it("genera tokens distintos e impredecibles cada vez", () => {
    const a = generarTokenInvitacion();
    const b = generarTokenInvitacion();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(20);
  });

  it("nunca trae el símbolo '/' u otros caracteres inseguros para una URL", () => {
    expect(generarTokenInvitacion()).toMatch(/^[a-z0-9]+$/i);
  });
});

describe("hashToken", () => {
  it("es determinista", () => {
    const token = generarTokenInvitacion();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("el hash nunca es igual al token crudo", () => {
    const token = generarTokenInvitacion();
    expect(hashToken(token)).not.toBe(token);
  });

  it("tokens distintos producen hashes distintos", () => {
    expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
  });

  it("produce un hex de 64 caracteres (sha256)", () => {
    expect(hashToken("cualquier-token")).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("vencimiento", () => {
  it("la invitación vence 7 días después de creada (expiración breve)", () => {
    const creada = new Date("2026-01-01T00:00:00.000Z");
    const vence = fechaVencimientoInvitacion(creada);
    expect(new Date(vence).getTime() - creada.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("la solicitud de acceso también vence en 7 días", () => {
    const creada = new Date("2026-01-01T00:00:00.000Z");
    const vence = fechaVencimientoSolicitudAcceso(creada);
    expect(new Date(vence).getTime() - creada.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("invitacionVencida compara correctamente contra 'ahora'", () => {
    const inv = { venceEl: "2026-01-08T00:00:00.000Z" };
    expect(invitacionVencida(inv, new Date("2026-01-05T00:00:00.000Z"))).toBe(false);
    expect(invitacionVencida(inv, new Date("2026-01-10T00:00:00.000Z"))).toBe(true);
  });
});

describe("normalizarCorreo", () => {
  it("minúsculas y sin espacios", () => {
    expect(normalizarCorreo("  Colega@Correo.COM  ")).toBe("colega@correo.com");
  });
});

describe("coincideIdentidad — solo Firebase Auth, nunca un campo editable", () => {
  it("coincide cuando el correo verificado es igual (normalizado)", () => {
    expect(coincideIdentidad("colega@correo.com", "Colega@Correo.com", true)).toBe(true);
  });

  it("no coincide si el correo es distinto", () => {
    expect(coincideIdentidad("colega@correo.com", "otro@correo.com", true)).toBe(false);
  });

  it("no coincide si el correo no está verificado, aunque sea el mismo texto", () => {
    expect(coincideIdentidad("colega@correo.com", "colega@correo.com", false)).toBe(false);
  });

  it("no coincide si no hay correo verificado en el token", () => {
    expect(coincideIdentidad("colega@correo.com", undefined, true)).toBe(false);
  });
});

function invitacionBase(overrides: Partial<InvitacionConecta> = {}): InvitacionConecta {
  return {
    id: "auto1",
    tokenHash: hashToken("tok1"),
    remitenteUid: "uidA",
    remitenteClinicaId: "clinicaA",
    remitenteNombre: "Dr. A",
    destinatarioCorreoNormalizado: "colega@correo.com",
    interconsultaId: "ic1",
    canal: "whatsapp",
    creadoEl: "2026-01-01T00:00:00.000Z",
    venceEl: "2026-01-08T00:00:00.000Z",
    maxUsos: 1,
    usosActuales: 0,
    estado: "activa",
    ...overrides,
  };
}

describe("existeInvitacionActivaDuplicada", () => {
  const ahora = new Date("2026-01-05T00:00:00.000Z");

  it("detecta una invitación activa ya existente para el mismo caso y destinatario", () => {
    expect(existeInvitacionActivaDuplicada([invitacionBase()], "ic1", "colega@correo.com", ahora)).toBe(true);
  });

  it("no la marca duplicada si es para otro caso", () => {
    const existentes = [invitacionBase({ interconsultaId: "ic2" })];
    expect(existeInvitacionActivaDuplicada(existentes, "ic1", "colega@correo.com", ahora)).toBe(false);
  });

  it("no la marca duplicada si ya venció", () => {
    const existentes = [invitacionBase({ venceEl: "2026-01-02T00:00:00.000Z" })];
    expect(existeInvitacionActivaDuplicada(existentes, "ic1", "colega@correo.com", ahora)).toBe(false);
  });

  it("no la marca duplicada si ya está cancelada o reclamada — permite regenerar", () => {
    expect(
      existeInvitacionActivaDuplicada([invitacionBase({ estado: "cancelada" })], "ic1", "colega@correo.com", ahora)
    ).toBe(false);
    expect(
      existeInvitacionActivaDuplicada([invitacionBase({ estado: "reclamada" })], "ic1", "colega@correo.com", ahora)
    ).toBe(false);
  });

  it("ignora mayúsculas/espacios al comparar el correo", () => {
    const existentes = [invitacionBase({ destinatarioCorreoNormalizado: "colega@correo.com" })];
    expect(existeInvitacionActivaDuplicada(existentes, "ic1", "  Colega@Correo.com  ", ahora)).toBe(true);
  });
});

describe("buildMensajeInvitacionConecta", () => {
  it("nunca incluye datos del paciente, solo nombre y enlace", () => {
    const msg = buildMensajeInvitacionConecta("Fernández", "https://mo-ten-lime.vercel.app/conecta/invite/abc123");
    expect(msg).toContain("Fernández");
    expect(msg).toContain("https://mo-ten-lime.vercel.app/conecta/invite/abc123");
    expect(msg.toLowerCase()).not.toMatch(/paciente|diagn[oó]stico|caries|edad/);
  });
});

describe("urlInvitacion", () => {
  it("arma la ruta correcta con el token crudo", () => {
    expect(urlInvitacion("tok123", "https://mo-ten-lime.vercel.app")).toBe(
      "https://mo-ten-lime.vercel.app/conecta/invite/tok123"
    );
  });
});
