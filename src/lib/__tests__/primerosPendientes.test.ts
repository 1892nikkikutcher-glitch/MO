import { describe, expect, it } from "vitest";
import { primerosPendientes, type DatosPrimerosPendientes } from "../primerosPendientes";

const vacia: DatosPrimerosPendientes = { esAdmin: true, consultorioCapturado: false, hayPacientes: false, hayCitas: false };

describe("primerosPendientes", () => {
  it("una clínica vacía recibe consultorio y primer paciente, en ese orden", () => {
    expect(primerosPendientes(vacia).map((p) => p.key)).toEqual(["primer-consultorio", "primer-paciente"]);
  });

  it("con paciente pero sin citas pide la primera cita", () => {
    const lista = primerosPendientes({ ...vacia, consultorioCapturado: true, hayPacientes: true });
    expect(lista.map((p) => p.key)).toEqual(["primera-cita"]);
    expect(lista[0].accion).toBe("nueva-cita");
  });

  it("no pide la cita antes de que exista un paciente", () => {
    expect(primerosPendientes({ ...vacia, consultorioCapturado: true }).map((p) => p.key)).toEqual(["primer-paciente"]);
  });

  it("quien no es administrador no recibe el pendiente del consultorio", () => {
    expect(primerosPendientes({ ...vacia, esAdmin: false }).map((p) => p.key)).toEqual(["primer-paciente"]);
  });

  it("una clínica con todo hecho no tiene pendientes", () => {
    expect(
      primerosPendientes({ esAdmin: true, consultorioCapturado: true, hayPacientes: true, hayCitas: true })
    ).toEqual([]);
  });
});
