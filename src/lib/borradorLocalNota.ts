/** Respaldo local (IndexedDB) de los borradores de "Registrar atención de
 * hoy" — la capa impura del autoguardado de 3 niveles (ver
 * borradorLocalNotaPuro.ts para la lógica pura y el porqué de IndexedDB en
 * vez de localStorage). Cada operación es independiente y de bajo nivel;
 * quien orquesta el ciclo React→IndexedDB→Firestore es el componente
 * `RegistrarAtencionHoy.tsx` (o el hook que lo respalde). */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { RegistroBorradorLocal } from "./borradorLocalNotaPuro";

const DB_NOMBRE = "mo-notas-borrador";
const DB_VERSION = 1;
const STORE = "borradores";

interface BorradorNotaDB extends DBSchema {
  borradores: {
    key: string;
    value: RegistroBorradorLocal;
    indexes: {
      porPaciente: [string, string]; // [clinicUid, patientId]
      porCita: [string, string]; // [clinicUid, citaId]
    };
  };
}

let dbPromise: Promise<IDBPDatabase<BorradorNotaDB>> | null = null;

function getDB(): Promise<IDBPDatabase<BorradorNotaDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BorradorNotaDB>(DB_NOMBRE, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE, { keyPath: "claveLocal" });
        store.createIndex("porPaciente", ["clinicUid", "patientId"]);
        store.createIndex("porCita", ["clinicUid", "citaId"]);
      },
    });
  }
  return dbPromise;
}

export async function guardarBorradorLocal(registro: RegistroBorradorLocal): Promise<void> {
  const db = await getDB();
  await db.put(STORE, registro);
}

export async function obtenerBorradorLocalPorNotaId(
  clinicUid: string,
  patientId: string,
  notaId: string
): Promise<RegistroBorradorLocal | null> {
  const db = await getDB();
  const claveLocal = `${clinicUid}:${patientId}:${notaId}`;
  const registro = await db.get(STORE, claveLocal);
  return registro ?? null;
}

/** El borrador `estado !== "firmada"` más recientemente editado de ese
 * paciente — nunca mezcla borradores de pacientes distintos (filtra por
 * `clinicUid`+`patientId` vía índice, no solo por `patientId`, para no
 * cruzar clínicas si el mismo navegador se usa para más de una). */
export async function buscarBorradorLocalPorPaciente(
  clinicUid: string,
  patientId: string
): Promise<RegistroBorradorLocal | null> {
  const db = await getDB();
  const registros = await db.getAllFromIndex(STORE, "porPaciente", [clinicUid, patientId]);
  const vigentes = registros.filter((r) => r.nota.estado !== "firmada");
  if (vigentes.length === 0) return null;
  vigentes.sort((a, b) => b.metadataLocal.ultimoCambioLocalEn.localeCompare(a.metadataLocal.ultimoCambioLocalEn));
  return vigentes[0];
}

export async function buscarBorradorLocalPorCita(clinicUid: string, citaId: string): Promise<RegistroBorradorLocal | null> {
  const db = await getDB();
  const registros = await db.getAllFromIndex(STORE, "porCita", [clinicUid, citaId]);
  const vigentes = registros.filter((r) => r.nota.estado !== "firmada");
  if (vigentes.length === 0) return null;
  vigentes.sort((a, b) => b.metadataLocal.ultimoCambioLocalEn.localeCompare(a.metadataLocal.ultimoCambioLocalEn));
  return vigentes[0];
}

export async function eliminarBorradorLocal(clinicUid: string, patientId: string, notaId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, `${clinicUid}:${patientId}:${notaId}`);
}

/** Revisión defensiva al cargar la app: borra respaldos locales de notas
 * que Firestore ya confirma como firmadas — cubre el caso de que el paso
 * final de `firmarNota()` no haya podido eliminar el respaldo local a
 * tiempo (ej. el navegador se cerró en ese instante exacto). Nunca borra
 * un borrador legítimo por antigüedad. */
export async function limpiarBorradoresYaFirmados(
  clinicUid: string,
  patientId: string,
  notasFirmadasIds: Set<string>
): Promise<void> {
  const db = await getDB();
  const registros = await db.getAllFromIndex(STORE, "porPaciente", [clinicUid, patientId]);
  for (const registro of registros) {
    if (notasFirmadasIds.has(registro.notaId)) {
      await db.delete(STORE, registro.claveLocal);
    }
  }
}
