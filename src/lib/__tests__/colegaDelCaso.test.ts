import { describe, expect, it } from "vitest";
import { colegaDelCaso, type ResumenInvitacionDeCaso } from "../colegaDelCaso";

const directorio = [{ uid: "colega1", nombreCompleto: "Dra. Laura Ríos" }];
const yo = "yo";
const invitacion = (extra: Partial<ResumenInvitacionDeCaso> = {}): ResumenInvitacionDeCaso => ({
  destinatarioNombre: "Dr. Juan Pérez",
  destinatarioCorreo: "juan@gmail.com",
  canal: "whatsapp",
  estado: "activa",
  creadoEl: "2026-10-01T00:00:00Z",
  venceEl: "2026-10-08T00:00:00Z",
  ...extra,
});

describe("colegaDelCaso", () => {
  it("caso enviado y ya aceptado: nombre del directorio", () => {
    expect(colegaDelCaso({ odontologoRemitenteUid: yo, destinatarioUid: "colega1" }, yo, directorio, undefined)).toEqual({
      nombre: "Dra. Laura Ríos",
      detalle: "",
      pendiente: false,
    });
  });

  it("caso recibido: el colega es quien lo envió", () => {
    const r = colegaDelCaso({ odontologoRemitenteUid: "colega1", destinatarioUid: yo }, yo, directorio, undefined);
    expect(r.nombre).toBe("Dra. Laura Ríos");
  });

  it("enviado por invitación sin aceptar: muestra a quién se invitó, con su correo y que está pendiente", () => {
    const r = colegaDelCaso({ odontologoRemitenteUid: yo }, yo, directorio, invitacion());
    expect(r.nombre).toBe("Dr. Juan Pérez");
    expect(r.pendiente).toBe(true);
    expect(r.detalle).toContain("juan@gmail.com");
    expect(r.detalle).toContain("pendiente de que la acepte");
    expect(r.detalle).toContain("WhatsApp");
  });

  it("sin nombre, usa el correo como nombre", () => {
    const r = colegaDelCaso({ odontologoRemitenteUid: yo }, yo, directorio, invitacion({ destinatarioNombre: null }));
    expect(r.nombre).toBe("juan@gmail.com");
  });

  it("invitación vencida avisa que hay que generar otro enlace", () => {
    const r = colegaDelCaso({ odontologoRemitenteUid: yo }, yo, directorio, invitacion({ estado: "vencida" }));
    expect(r.detalle).toContain("venció");
  });

  it("sin ningún dato: 'colega por confirmar'", () => {
    const r = colegaDelCaso({ odontologoRemitenteUid: yo }, yo, directorio, undefined);
    expect(r.nombre).toBe("colega por confirmar");
    expect(r.pendiente).toBe(true);
  });

  it("colega con uid pero fuera del directorio: 'un colega'", () => {
    expect(colegaDelCaso({ odontologoRemitenteUid: yo, destinatarioUid: "x" }, yo, directorio, undefined).nombre).toBe("un colega");
  });
});
