import { describe, expect, it } from "vitest";
import { pacientesYMedicosConectados, soloDelPaciente } from "../casosConectados";

const YO = "yo";
const dir = [
  { uid: "a", nombreCompleto: "Dra. Ana" },
  { uid: "b", nombreCompleto: "Dr. Beto" },
];
const caso = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  pacienteId: "p1",
  odontologoRemitenteUid: YO,
  destinatarioUid: "a",
  actualizadoEl: `2026-10-0${id}T10:00:00Z`,
  resumenPaciente: { nombre: "Brenda", edadTexto: "30", condicionesSistemicas: [] },
  ...over,
});

describe("pacientesYMedicosConectados", () => {
  it("agrupa por paciente y por médico", () => {
    const { pacientes, medicos } = pacientesYMedicosConectados(
      [caso("1"), caso("2", { destinatarioUid: "b" }), caso("3", { pacienteId: "p2", resumenPaciente: { nombre: "Carlos", edadTexto: "", condicionesSistemicas: [] } })],
      YO,
      dir,
      {}
    );
    const brenda = pacientes.find((p) => p.nombre === "Brenda")!;
    expect(brenda.casos).toBe(2);
    expect(brenda.colegas.sort()).toEqual(["Dr. Beto", "Dra. Ana"]);
    expect(pacientes).toHaveLength(2);
    expect(medicos.find((m) => m.nombre === "Dra. Ana")).toMatchObject({ enviados: 2, recibidos: 0, pacientes: ["Carlos", "Brenda"] });
  });

  it("un caso recibido cuenta como recibido y no se mezcla con un paciente propio del mismo id", () => {
    const { pacientes, medicos } = pacientesYMedicosConectados(
      [caso("1"), caso("2", { odontologoRemitenteUid: "a", destinatarioUid: YO, pacienteId: "p1", resumenPaciente: { nombre: "Otro Paciente", edadTexto: "", condicionesSistemicas: [] } })],
      YO,
      dir,
      {}
    );
    expect(pacientes.map((p) => p.nombre).sort()).toEqual(["Brenda", "Otro Paciente"]);
    expect(medicos[0]).toMatchObject({ nombre: "Dra. Ana", enviados: 1, recibidos: 1 });
  });

  it("ordena del más reciente al más antiguo y apunta al último caso", () => {
    const { medicos } = pacientesYMedicosConectados([caso("1"), caso("2", { destinatarioUid: "b" })], YO, dir, {});
    expect(medicos.map((m) => m.nombre)).toEqual(["Dr. Beto", "Dra. Ana"]);
    expect(medicos[0].ultimoCasoId).toBe("2");
  });

  it("sin colega aceptado, usa a quien se invitó y lo marca pendiente", () => {
    const { medicos } = pacientesYMedicosConectados([caso("1", { destinatarioUid: undefined })], YO, dir, {
      "1": { destinatarioNombre: "Dr. Invitado", destinatarioCorreo: null, canal: "whatsapp", estado: "activa", creadoEl: "", venceEl: "" },
    });
    expect(medicos[0]).toMatchObject({ nombre: "Dr. Invitado", pendiente: true });
  });
});

describe("soloDelPaciente", () => {
  it("deja solo los casos enviados de ese paciente", () => {
    const casos = [caso("1"), caso("2", { pacienteId: "p2" }), caso("3", { odontologoRemitenteUid: "a", destinatarioUid: YO })];
    expect(soloDelPaciente(casos, YO, "p1").map((c) => c.id)).toEqual(["1"]);
  });
});
