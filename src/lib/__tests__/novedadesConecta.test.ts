import { describe, expect, it } from "vitest";
import { novedadesConecta } from "../novedadesConecta";

const YO = "yo";
const nombre = (uid: string) => (uid === "m" ? "Dra. Mariana" : "Dr. Beto");
const caso = (id: string, paciente: string, over: Record<string, unknown> = {}) => ({
  id,
  resumenPaciente: { nombre: paciente, edadTexto: "", condicionesSistemicas: [] },
  destinatarioUid: "m",
  odontologoRemitenteUid: YO,
  historialEstados: [{ estado: "sent" as const, fecha: "2026-10-01T10:00:00Z", uid: YO }],
  ...over,
});
const base = { calendariosMios: [], uid: YO, vistoHasta: "2026-10-01T12:00:00Z", nombreDeColega: nombre };

describe("novedadesConecta", () => {
  it("avisa lo que el colega hizo después de la última vez, no lo mío ni lo viejo", () => {
    const c = caso("c1", "Brenda", {
      historialEstados: [
        { estado: "sent", fecha: "2026-10-01T10:00:00Z", uid: YO },
        { estado: "accepted", fecha: "2026-10-01T11:00:00Z", uid: "m" }, // anterior a vistoHasta
        { estado: "counter_referral_sent", fecha: "2026-10-02T09:00:00Z", uid: "m" },
        { estado: "cancelled", fecha: "2026-10-02T10:00:00Z", uid: YO }, // lo hice yo
      ],
    });
    const r = novedadesConecta({ ...base, casosEnviados: [c] });
    expect(r.map((n) => n.texto)).toEqual(["Dra. Mariana te envió la contrarreferencia de Brenda"]);
    expect(r[0].casoId).toBe("c1");
  });

  it("junta en una sola novedad a quien se unió con un enlace para varios casos", () => {
    const j = "2026-10-03T08:00:00Z";
    const r = novedadesConecta({
      ...base,
      casosEnviados: [caso("c1", "Ana", { colegaSeUnioEl: j }), caso("c2", "Luis", { colegaSeUnioEl: j }), caso("c3", "Eva", { colegaSeUnioEl: "2026-09-01T00:00:00Z" })],
    });
    expect(r.map((n) => n.texto)).toEqual(["Dra. Mariana se unió a MO con tu enlace y ya ve 2 casos"]);
  });

  it("un solo caso dice el nombre del paciente", () => {
    const r = novedadesConecta({ ...base, casosEnviados: [caso("c1", "Ana", { colegaSeUnioEl: "2026-10-03T08:00:00Z" })] });
    expect(r[0].texto).toBe("Dra. Mariana se unió a MO con tu enlace y ya ve el caso de Ana");
  });

  it("avisa cuando aceptan tu calendario y ordena lo más reciente primero", () => {
    const cal = {
      id: "k1",
      clinicaId: "x",
      recursoId: "r",
      recursoNombre: "Dr. Luis",
      remitenteUid: YO,
      remitenteNombre: "Yo",
      destinatarioUid: "m",
      destinatarioNombre: "Dra. Mariana",
      estado: "activo" as const,
      creadoEl: "2026-10-01T00:00:00Z",
      aceptadoEl: "2026-10-04T00:00:00Z",
    };
    const c = caso("c1", "Brenda", { historialEstados: [{ estado: "rejected", fecha: "2026-10-02T09:00:00Z", uid: "m" }] });
    const r = novedadesConecta({ ...base, casosEnviados: [c], calendariosMios: [cal] });
    expect(r.map((n) => n.texto)).toEqual(["Dra. Mariana aceptó tu calendario «Dr. Luis»", "Dra. Mariana rechazó el caso de Brenda"]);
  });

  it("sin novedades devuelve vacío", () => {
    expect(novedadesConecta({ ...base, casosEnviados: [caso("c1", "Ana")] })).toEqual([]);
  });
});
