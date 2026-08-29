import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import {
  buscarBorradorLocalPorCita,
  buscarBorradorLocalPorPaciente,
  eliminarBorradorLocal,
  guardarBorradorLocal,
  obtenerBorradorLocalPorNotaId,
} from "../borradorLocalNota";
import { notaEvolucionV2Inicial, type EncabezadoNota } from "../notasEvolucion";
import type { RegistroBorradorLocal } from "../borradorLocalNotaPuro";

function registro(clinicUid: string, patientId: string, notaId: string, citaId?: string | null): RegistroBorradorLocal {
  const encabezado: EncabezadoNota = { patientId, pacienteNombreSnapshot: "Paciente de prueba", medico: "Dr. X", organosDentales: [] };
  const nota = { ...notaEvolucionV2Inicial(encabezado, "rapido", "uid-1"), id: notaId };
  return {
    claveLocal: `${clinicUid}:${patientId}:${notaId}`,
    clinicUid,
    patientId,
    notaId,
    citaId: citaId ?? null,
    nota,
    metadataLocal: {
      ultimaSeccionActiva: "como_llega",
      modoCaptura: "rapido",
      ultimoCambioLocalEn: new Date().toISOString(),
      pendienteSincronizar: true,
      sincronizacion: { revisionLocal: nota.revision, ultimaRevisionSincronizada: 0 },
    },
  };
}

describe("borradorLocalNota (IndexedDB, via fake-indexeddb)", () => {
  it("guarda y recupera un registro por notaId", async () => {
    const r = registro("clinicA", "pac1", "notaX");
    await guardarBorradorLocal(r);
    const leido = await obtenerBorradorLocalPorNotaId("clinicA", "pac1", "notaX");
    expect(leido?.claveLocal).toBe(r.claveLocal);
  });

  it("devuelve null si no existe ningún registro", async () => {
    const leido = await obtenerBorradorLocalPorNotaId("clinicA", "pac-inexistente", "nota-inexistente");
    expect(leido).toBeNull();
  });

  it("buscarBorradorLocalPorPaciente encuentra el borrador vigente y no mezcla pacientes distintos", async () => {
    await guardarBorradorLocal(registro("clinicB", "pacUno", "notaUno"));
    await guardarBorradorLocal(registro("clinicB", "pacDos", "notaDos"));

    const deUno = await buscarBorradorLocalPorPaciente("clinicB", "pacUno");
    expect(deUno?.patientId).toBe("pacUno");

    const deDos = await buscarBorradorLocalPorPaciente("clinicB", "pacDos");
    expect(deDos?.patientId).toBe("pacDos");
  });

  it("no mezcla borradores de la misma clave de paciente entre clínicas distintas", async () => {
    await guardarBorradorLocal(registro("clinicC1", "pacCompartido", "notaC1"));
    await guardarBorradorLocal(registro("clinicC2", "pacCompartido", "notaC2"));

    const deC1 = await buscarBorradorLocalPorPaciente("clinicC1", "pacCompartido");
    expect(deC1?.clinicUid).toBe("clinicC1");
    expect(deC1?.notaId).toBe("notaC1");
  });

  it("ignora un borrador ya firmado al buscar por paciente", async () => {
    const r = registro("clinicD", "pacD", "notaFirmada");
    r.nota = { ...r.nota, estado: "firmada" };
    await guardarBorradorLocal(r);
    const encontrado = await buscarBorradorLocalPorPaciente("clinicD", "pacD");
    expect(encontrado).toBeNull();
  });

  it("buscarBorradorLocalPorCita encuentra el borrador de esa cita específica", async () => {
    await guardarBorradorLocal(registro("clinicE", "pacE", "notaConCita", "citaE1"));
    await guardarBorradorLocal(registro("clinicE", "pacE", "notaOtraCita", "citaE2"));

    const encontrado = await buscarBorradorLocalPorCita("clinicE", "citaE1");
    expect(encontrado?.notaId).toBe("notaConCita");
  });

  it("eliminarBorradorLocal borra el registro — no vuelve a aparecer después", async () => {
    await guardarBorradorLocal(registro("clinicF", "pacF", "notaBorrable"));
    await eliminarBorradorLocal("clinicF", "pacF", "notaBorrable");
    const leido = await obtenerBorradorLocalPorNotaId("clinicF", "pacF", "notaBorrable");
    expect(leido).toBeNull();
  });
});
