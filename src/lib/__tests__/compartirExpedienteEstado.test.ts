import { describe, expect, it } from "vitest";
import { casosConcluidosCompartiendo, casosQueComparten, estadoCompartirDelCaso } from "../compartirExpedienteEstado";

const exp = { secciones: [], generadoEl: "" } as never;
const comp = (activo: boolean) => ({ activo, secciones: [], actualizadoEl: "" });

describe("estadoCompartirDelCaso", () => {
  it("distingue al día, foto fija, apagado y nunca compartido", () => {
    expect(estadoCompartirDelCaso({ compartirExpediente: comp(true), expedienteCompartido: exp })).toBe("vivo");
    expect(estadoCompartirDelCaso({ compartirExpediente: comp(false) })).toBe("apagado");
    expect(estadoCompartirDelCaso({ expedienteCompartido: exp })).toBe("foto_fija");
    expect(estadoCompartirDelCaso({})).toBe("ninguno");
  });
});

describe("casosQueComparten", () => {
  const caso = (id: string, extra: object) => ({ id, odontologoRemitenteUid: "yo", pacienteId: "p1", estado: "sent" as const, ...extra });
  it("solo los míos, de ese paciente, que hoy muestran el expediente", () => {
    const r = casosQueComparten(
      [
        caso("vivo", { compartirExpediente: comp(true), expedienteCompartido: exp }),
        caso("fija", { expedienteCompartido: exp }),
        caso("apagado", { compartirExpediente: comp(false) }),
        caso("nada", {}),
        { ...caso("otroPaciente", { compartirExpediente: comp(true) }), pacienteId: "p2" },
        { ...caso("ajeno", { compartirExpediente: comp(true) }), odontologoRemitenteUid: "otro" },
      ],
      "yo",
      "p1"
    );
    expect(r.map((c) => c.id)).toEqual(["vivo", "fija"]);
  });
});

describe("casosConcluidosCompartiendo", () => {
  const caso = (id: string, estado: string, extra: object) => ({ id, odontologoRemitenteUid: "yo", estado: estado as never, ...extra });
  it("solo los míos que ya concluyeron y todavía muestran el expediente", () => {
    const r = casosConcluidosCompartiendo(
      [
        caso("cerradoVivo", "closed", { compartirExpediente: comp(true), expedienteCompartido: exp }),
        caso("canceladoFija", "cancelled", { expedienteCompartido: exp }),
        caso("rechazadoVivo", "rejected", { compartirExpediente: comp(true) }),
        caso("cerradoApagado", "closed", { compartirExpediente: comp(false) }),
        caso("cerradoNunca", "closed", {}),
        caso("enCursoVivo", "accepted", { compartirExpediente: comp(true) }),
        { ...caso("ajeno", "closed", { compartirExpediente: comp(true) }), odontologoRemitenteUid: "otro" },
      ],
      "yo"
    );
    expect(r.map((c) => c.id)).toEqual(["cerradoVivo", "canceladoFija", "rechazadoVivo"]);
  });
});
