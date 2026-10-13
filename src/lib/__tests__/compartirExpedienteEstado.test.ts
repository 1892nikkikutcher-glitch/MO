import { describe, expect, it } from "vitest";
import { casosQueComparten, estadoCompartirDelCaso } from "../compartirExpedienteEstado";

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
