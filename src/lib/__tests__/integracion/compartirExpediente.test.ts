/** Prueba de punta a punta (contra el emulador) de "compartir parte del
 * expediente" en MO Conecta: se siembra un paciente con datos reales, se
 * ejecuta `crearInterconsulta` EXACTAMENTE como la llama la ruta de la API, y
 * se revisa lo que recibe el colega. Nunca toca producción: el SDK de admin
 * se apunta a 127.0.0.1 antes de que nadie lo importe. */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";

// Los imports se evalúan ANTES que el resto del archivo: el apuntado al
// emulador tiene que ir en vi.hoisted para que ya esté puesto cuando el SDK de
// admin se carga (si no, intenta usar credenciales reales).
vi.hoisted(() => {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? "127.0.0.1:9199";
});

vi.mock("../../firebaseAdmin", async () => {
  const { getApps, initializeApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const { getStorage } = await import("firebase-admin/storage");
  const app = getApps()[0] ?? initializeApp({ projectId: "demo-mo-local", storageBucket: "demo-mo-local.appspot.com" });
  return { dbAdmin: getFirestore(app), bucketAdmin: getStorage(app).bucket() };
});

import { dbAdmin, bucketAdmin } from "../../firebaseAdmin";
import { crearInterconsulta } from "../../conectaInterconsultas";
import { seccionesCompartibles } from "../../expedienteCompartido";

const CLINICA = "clinica-prueba-compartir";
const REMITENTE = "uid-remitente-prueba";
const COLEGA = "uid-colega-prueba";
const PACIENTE = "p-prueba";
const OTRO_PACIENTE = "p-otro";
const base = () => dbAdmin.collection("users").doc(CLINICA).collection("pacientes").doc(PACIENTE);

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2048, 7)]);

async function subirFoto(carpeta: string, nombre: string) {
  const path = `users/${CLINICA}/pacientes/${PACIENTE}/fotos/${carpeta}/${nombre}`;
  await bucketAdmin.file(path).save(JPEG, { contentType: "image/jpeg" });
  return path;
}

beforeAll(async () => {
  await dbAdmin.collection("clinicMembers").doc(`${CLINICA}_${REMITENTE}`).set({
    clinicId: CLINICA, uid: REMITENTE, role: "odontologo", status: "active",
  });
  await dbAdmin.collection("users").doc(CLINICA).collection("pacientes").doc(PACIENTE).set({
    id: PACIENTE, name: "Paciente de Prueba", phone: "55 0000 0000", birthDate: "1990-05-10", sexo: "F",
    direccion: "Calle Secreta 123",
  });
  await base().collection("historiaClinica").doc("respuestas").set({
    alergias: "Penicilina",
    porPregunta: {
      od: [
        { id: "d1", dientes: [46], diagnostico: "Caries clase I", fecha: "2026-10-01", estado: "confirmado" },
        { id: "d2", dientes: [18], diagnostico: "Ya no aplica", fecha: "2026-10-01", estado: "descartado" },
      ],
    },
  });
  await dbAdmin.collection("users").doc(CLINICA).collection("config").doc("historiaClinicaTemplate").set({
    secciones: [
      {
        id: "s1", titulo: "Antecedentes",
        preguntas: [
          { id: "dm", tipo: "sino", etiqueta: "¿Diabetes?", mostrarDetalle: true },
          { id: "od", tipo: "odontograma", etiqueta: "Odontograma" },
        ],
      },
    ],
  });
  await base().collection("historiaClinica").doc("respuestas").set(
    { porPregunta: { dm: "Sí", dm__detalle: "controlada" } },
    { merge: true }
  );
  await base().collection("diagnosticos").doc("dx1").set({
    id: "dx1", dientes: [16], diagnostico: "Pulpitis", estado: "definitivo", creadoEn: "2026-10-01", origen: "nuevo",
  });
  await base().collection("planTratamiento").doc("pl1").set({
    id: "pl1", dientes: [16], tratamiento: "Endodoncia", prioridad: "alta", destino: "tratamiento_clinica", estadoClinico: "activo",
    presupuestosVinculados: [{ presupuestoId: "x", fecha: "2026-10-01", prioridad: "alta", budgetItemId: "i" }],
  });
  await base().collection("notasEvolucion").doc("n1").set({
    id: "n1", version: 2, estado: "firmada", creadoEn: "2026-10-02T10:00:00Z",
    encabezado: { medico: "Dra. Mendoza", patientId: PACIENTE },
    narrativa: { texto: "Nota firmada visible.", editadaManualmente: false },
  });
  await base().collection("notasEvolucion").doc("n2").set({
    id: "n2", version: 2, estado: "borrador", creadoEn: "2026-10-03T10:00:00Z",
    encabezado: { medico: "Dra. Mendoza", patientId: PACIENTE },
    narrativa: { texto: "BORRADOR SECRETO", editadaManualmente: false },
  });
  await base().collection("notasEvolucion").doc("n3").set({
    id: "n3", tipo: "administrativa", creadoEn: "2026-10-04T10:00:00Z", motivo: "no_asistio", notaLibre: "ADMIN SECRETA",
  });
  const col = dbAdmin.collection("users").doc(CLINICA).collection("citas");
  await col.doc("c1").set({ id: "c1", patientId: PACIENTE, fecha: "2026-10-20", horaInicio: "10:00", estatus: "Confirmada", tratamientos: ["Endodoncia"], costo: "$5,000", comentarios: "COMENTARIO PRIVADO" });
  await col.doc("c2").set({ id: "c2", patientId: OTRO_PACIENTE, fecha: "2026-10-21", horaInicio: "11:00", estatus: "Agendada", tratamientos: ["Ajeno"] });
  const fotos = {
    perfil: { id: "perfil.jpg", url: "u", name: "perfil.jpg", fecha: "2026-10-05", path: await subirFoto("perfil", "perfil.jpg") },
    ineFrente: { id: "ine.jpg", url: "u", name: "ine.jpg", fecha: "2026-10-05", path: await subirFoto("ine", "ine.jpg") },
    extraorales: [
      { id: "e1.jpg", url: "u", name: "frente.jpg", fecha: "2026-10-03", path: await subirFoto("extraorales", "e1.jpg") },
      { id: "e2.jpg", url: "u", name: "perfil-cara.jpg", fecha: "2026-10-04", path: await subirFoto("extraorales", "e2.jpg") },
    ],
    intraorales: [{ id: "i1.jpg", url: "u", name: "oclusal.jpg", fecha: "2026-10-02", path: await subirFoto("intraorales", "i1.jpg") }],
  };
  await base().collection("fotos").doc("datos").set(fotos);
});

afterAll(async () => {
  await dbAdmin.recursiveDelete(dbAdmin.collection("users").doc(CLINICA));
  await dbAdmin.collection("clinicMembers").doc(`${CLINICA}_${REMITENTE}`).delete();
  const casos = await dbAdmin.collection("interconsultas").where("clinicaRemitenteId", "==", CLINICA).get();
  await Promise.all(casos.docs.map((d) => d.ref.delete()));
  const cons = await dbAdmin.collection("consentimientosInterconsulta").where("clinicaId", "==", CLINICA).get();
  await Promise.all(cons.docs.map((d) => d.ref.delete()));
  await bucketAdmin.deleteFiles({ prefix: `users/${CLINICA}/` }).catch(() => {});
  await bucketAdmin.deleteFiles({ prefix: "interconsultas/" }).catch(() => {});
});

const entradaBase = {
  clinicaRemitenteId: CLINICA,
  pacienteId: PACIENTE,
  prioridad: "ordinaria" as const,
  tipoInterconsulta: "aislado_con_retorno" as const,
  destinatarioUid: COLEGA,
  consentimiento: {
    destinatarioTipo: "odontologo_registrado" as const,
    destinatarioId: COLEGA,
    finalidad: "Interconsulta de prueba.",
    informacionCompartida: ["Resumen de historia clínica"],
  },
};

describe("compartir parte del expediente (servidor + emulador)", () => {
  it("sin secciones: solo el resumen mínimo, sin expediente ni archivos", async () => {
    const caso = await crearInterconsulta(REMITENTE, entradaBase);
    expect(caso.expedienteCompartido).toBeUndefined();
    expect(caso.archivos).toEqual([]);
    expect(caso.resumenPaciente.nombre).toBe("Paciente de Prueba");
  });

  it("con las 6 secciones: arma la foto fija completa y copia solo fotos clínicas", async () => {
    const caso = await crearInterconsulta(REMITENTE, { ...entradaBase, seccionesCompartidas: [...seccionesCompartibles] });
    const exp = caso.expedienteCompartido!;
    expect(exp.secciones).toHaveLength(6);

    // Historia clínica: respuestas con detalle, alergias, sin la pregunta de odontograma
    expect(exp.historiaClinica?.[0]).toEqual({ titulo: "Alergias", items: [{ pregunta: "Alergias", respuesta: "Penicilina" }] });
    expect(JSON.stringify(exp.historiaClinica)).toContain("Sí — controlada");

    // Diagnósticos y plan, sin datos de presupuesto
    expect(exp.diagnosticos).toEqual([{ dientes: "OD 16", diagnostico: "Pulpitis", estado: "Definitivo" }]);
    expect(exp.planTratamiento?.[0]).toMatchObject({ tratamiento: "Endodoncia", prioridad: "Alta" });
    expect(JSON.stringify(exp.planTratamiento)).not.toContain("presupuesto");

    // Odontograma sin diagnósticos descartados
    expect(exp.odontograma).toEqual([{ diente: 46, diagnosticos: ["Caries clase I"] }]);

    // Notas: solo la firmada
    expect(exp.notas).toHaveLength(1);
    expect(exp.notas?.[0].texto).toBe("Nota firmada visible.");
    expect(JSON.stringify(exp)).not.toContain("BORRADOR SECRETO");
    expect(JSON.stringify(exp)).not.toContain("ADMIN SECRETA");

    // Citas: solo de ESTE paciente y sin costo ni comentarios
    expect(exp.citas).toEqual([{ fecha: "2026-10-20", hora: "10:00", estatus: "Confirmada", tratamientos: ["Endodoncia"] }]);
    expect(JSON.stringify(exp)).not.toMatch(/COMENTARIO PRIVADO|5,000|Ajeno/);

    // Datos que jamás deben salir
    const todo = JSON.stringify(caso);
    expect(todo).not.toContain("Calle Secreta");
    expect(todo).not.toContain("55 0000 0000");

    // Fotos: 3 clínicas copiadas (nunca perfil ni INE), existen en Storage
    expect(caso.archivos).toHaveLength(3);
    expect(caso.archivos.map((a) => a.categoriaClinica)).toEqual(["fotografia", "fotografia", "fotografia"]);
    expect(exp.fotosArchivoIds).toEqual(caso.archivos.map((a) => a.id));
    for (const a of caso.archivos) {
      expect(a.storagePath.startsWith(`interconsultas/${caso.id}/archivos/`)).toBe(true);
      const [existe] = await bucketAdmin.file(a.storagePath).exists();
      expect(existe).toBe(true);
    }

    // El consentimiento queda por escrito con lo que se compartió
    const cons = await dbAdmin.collection("consentimientosInterconsulta").doc(caso.consentimientoId).get();
    const compartido = (cons.data() as { informacionCompartida: string[] }).informacionCompartida;
    expect(compartido).toContain("Odontograma");
    expect(compartido).toContain("Citas del paciente (calendario)");

    // Lo que ve el colega: el documento guardado (se exporta para revisarlo en pantalla)
    const guardado = (await dbAdmin.collection("interconsultas").doc(caso.id).get()).data();
    expect(guardado?.participantesAutorizados).toEqual([REMITENTE, COLEGA]);
    if (process.env.SALIDA_PRUEBA) writeFileSync(process.env.SALIDA_PRUEBA, JSON.stringify(guardado, null, 2));
  });

  it("un usuario que no es de la clínica no puede compartir ese expediente", async () => {
    await expect(crearInterconsulta("uid-ajeno", { ...entradaBase, seccionesCompartidas: ["historia_clinica"] })).rejects.toThrow(
      /No perteneces a esa clínica/
    );
  });
});
