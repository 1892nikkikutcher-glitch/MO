/** Compartir el expediente "vivo" (contra el emulador): mientras esté activo el colega ve el
 * expediente al día; al desactivarlo se borra todo lo compartido. Nunca toca producción. */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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

import { FieldValue } from "firebase-admin/firestore";
import { dbAdmin, bucketAdmin } from "../../firebaseAdmin";
import { crearInterconsulta } from "../../conectaInterconsultas";
import { configurarCompartirExpediente, refrescarExpedienteCompartido } from "../../conectaCompartirExpediente";
import type { Interconsulta } from "../../moConecta";

const CLINICA = "clinica-prueba-vivo";
const REMITENTE = "uid-remitente-vivo";
const COLEGA = "uid-colega-vivo";
const AJENO = "uid-ajeno-vivo";
const PACIENTE = "p-vivo";
const paciente = () => dbAdmin.collection("users").doc(CLINICA).collection("pacientes").doc(PACIENTE);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2048, 7)]);
const casoIds: string[] = [];

async function subirFoto(nombre: string) {
  const path = `users/${CLINICA}/pacientes/${PACIENTE}/fotos/extraorales/${nombre}`;
  await bucketAdmin.file(path).save(JPEG, { contentType: "image/jpeg" });
  return path;
}
const fotoDoc = (nombre: string, fecha: string, path: string) => ({ id: nombre, url: "u", name: nombre, fecha, path });

beforeAll(async () => {
  await dbAdmin.collection("clinicMembers").doc(`${CLINICA}_${REMITENTE}`).set({ clinicId: CLINICA, uid: REMITENTE, role: "odontologo", status: "active" });
  await paciente().set({ id: PACIENTE, name: "Paciente Vivo", birthDate: "1990-05-10", sexo: "F" });
  await dbAdmin.collection("users").doc(CLINICA).collection("config").doc("historiaClinicaTemplate").set({
    secciones: [{ id: "s1", titulo: "Odontograma", preguntas: [{ id: "od", tipo: "odontograma", etiqueta: "Odontograma" }] }],
  });
  await paciente().collection("historiaClinica").doc("respuestas").set({
    porPregunta: { od: [{ id: "d1", dientes: [46], diagnostico: "Caries inicial", fecha: "2026-10-01", color: "rojo" }] },
  });
  await paciente().collection("fotos").doc("datos").set({ extraorales: [fotoDoc("e1.jpg", "2026-10-03", await subirFoto("e1.jpg"))] });
});

afterAll(async () => {
  await dbAdmin.recursiveDelete(dbAdmin.collection("users").doc(CLINICA));
  await dbAdmin.collection("clinicMembers").doc(`${CLINICA}_${REMITENTE}`).delete();
  const casos = await dbAdmin.collection("interconsultas").where("clinicaRemitenteId", "==", CLINICA).get();
  await Promise.all(casos.docs.map((d) => dbAdmin.recursiveDelete(d.ref)));
  const cons = await dbAdmin.collection("consentimientosInterconsulta").where("clinicaId", "==", CLINICA).get();
  await Promise.all(cons.docs.map((d) => d.ref.delete()));
  await dbAdmin.collection("rateLimitsConecta").doc(`compartir_expediente_${REMITENTE}`).delete();
  await bucketAdmin.deleteFiles({ prefix: `users/${CLINICA}/` }).catch(() => {});
  await bucketAdmin.deleteFiles({ prefix: "interconsultas/" }).catch(() => {});
});

const entrada = {
  clinicaRemitenteId: CLINICA,
  pacienteId: PACIENTE,
  prioridad: "ordinaria" as const,
  tipoInterconsulta: "aislado_con_retorno" as const,
  destinatarioUid: COLEGA,
  consentimiento: {
    destinatarioTipo: "odontologo_registrado" as const,
    destinatarioId: COLEGA,
    finalidad: "Prueba.",
    informacionCompartida: ["Resumen"],
  },
};

const leer = async (id: string) => (await dbAdmin.collection("interconsultas").doc(id).get()).data() as Interconsulta;
const envejecer = (id: string) =>
  dbAdmin.collection("interconsultas").doc(id).set({ compartirExpediente: { actualizadoEl: "2020-01-01T00:00:00.000Z" } }, { merge: true });
const existe = async (path: string) => (await bucketAdmin.file(path).exists())[0];

describe("compartir el expediente al día y apagarlo", () => {
  it("un caso enviado con expediente queda con el compartir activo", async () => {
    const caso = await crearInterconsulta(REMITENTE, { ...entrada, seccionesCompartidas: ["odontograma", "fotos_radiografias"] });
    casoIds.push(caso.id);
    expect(caso.compartirExpediente).toMatchObject({ activo: true, secciones: ["odontograma", "fotos_radiografias"] });
    expect(caso.archivos).toHaveLength(1);
    expect(caso.archivos[0].origenPath).toContain("/fotos/extraorales/e1.jpg");
  });

  it("al cambiar el expediente, el colega lo ve al día sin duplicar fotos; antes de tiempo no revisa", async () => {
    const id = casoIds[0];
    const antes = await leer(id);
    // Cambios del remitente: otro hallazgo pintado y una foto nueva.
    await paciente().collection("historiaClinica").doc("respuestas").set({
      porPregunta: {
        od: [
          { id: "d2", dientes: [11], diagnostico: "Resina", fecha: "2026-10-05", color: "azul" },
          { id: "d1", dientes: [46], diagnostico: "Caries inicial", fecha: "2026-10-01", color: "rojo" },
        ],
      },
    });
    await paciente().collection("fotos").doc("datos").set({
      extraorales: [
        fotoDoc("e1.jpg", "2026-10-03", `users/${CLINICA}/pacientes/${PACIENTE}/fotos/extraorales/e1.jpg`),
        fotoDoc("e2.jpg", "2026-10-06", await subirFoto("e2.jpg")),
      ],
    });

    // Recién revisado: el servidor no vuelve a leer (limita las lecturas).
    expect(await refrescarExpedienteCompartido(COLEGA, id)).toEqual({ actualizado: false });
    expect((await leer(id)).expedienteCompartido?.odontograma).toHaveLength(1);

    await envejecer(id);
    expect(await refrescarExpedienteCompartido(COLEGA, id)).toEqual({ actualizado: true });
    const despues = await leer(id);
    expect(despues.expedienteCompartido?.odontograma?.map((o) => o.diente)).toEqual([11, 46]);
    expect(despues.expedienteCompartido?.odontogramaHallazgos?.[0]).toMatchObject({ dientes: [11], color: "azul" });
    // La foto que ya estaba conserva su copia (mismo id); solo se copió la nueva.
    expect(despues.archivos).toHaveLength(2);
    expect(despues.archivos.map((a) => a.id)).toContain(antes.archivos[0].id);
    expect(despues.expedienteCompartido?.fotosArchivoIds).toEqual(despues.archivos.map((a) => a.id));
  });

  it("al cambiar el tipo o la nota de una radiografía ya compartida, el colega ve el cambio sin que se duplique la copia", async () => {
    const id = casoIds[0];
    const rutaRx = `users/${CLINICA}/pacientes/${PACIENTE}/fotos/radiografias/rx1.jpg`;
    await bucketAdmin.file(rutaRx).save(JPEG, { contentType: "image/jpeg" });
    const rx = (tipo: string, nota: string) => [{ id: "rx1.jpg", url: "u", name: "IMG_1.jpg", fecha: "2026-10-07", path: rutaRx, tipo, nota }];

    await paciente().collection("fotos").doc("datos").set({ radiografias: rx("Periapical", "uno") }, { merge: true });
    await envejecer(id);
    expect(await refrescarExpedienteCompartido(COLEGA, id)).toEqual({ actualizado: true });
    const primera = (await leer(id)).archivos.find((a) => a.origenPath === rutaRx)!;
    expect(primera.categoriaClinica).toBe("radiografia");
    expect(primera.descripcion).toBe("Periapical — uno");
    const total = (await leer(id)).archivos.length;

    // Solo cambia el tipo y la nota: el archivo es el mismo, pero la copia del colega se pone al día.
    await paciente().collection("fotos").doc("datos").set({ radiografias: rx("Panorámica", "dos") }, { merge: true });
    await envejecer(id);
    expect(await refrescarExpedienteCompartido(COLEGA, id)).toEqual({ actualizado: true });
    const despues = await leer(id);
    const segunda = despues.archivos.find((a) => a.origenPath === rutaRx)!;
    expect(segunda.id).toBe(primera.id);
    expect(segunda.descripcion).toBe("Panorámica — dos");
    expect(segunda.nombreOriginalSaneado).toBe("Radiografía Panorámica (2026-10-07).jpg");
    expect(despues.archivos).toHaveLength(total);

    // Si se vacían el tipo y la nota, también se quitan en la copia.
    await paciente().collection("fotos").doc("datos").set({ radiografias: [{ id: "rx1.jpg", url: "u", name: "IMG_1.jpg", fecha: "2026-10-07", path: rutaRx }] }, { merge: true });
    await envejecer(id);
    await refrescarExpedienteCompartido(COLEGA, id);
    const sinDatos = (await leer(id)).archivos.find((a) => a.origenPath === rutaRx)!;
    expect(sinDatos.descripcion).toBeUndefined();
    expect(sinDatos.nombreOriginalSaneado).toBe("IMG_1.jpg");

    // Se deja el caso como estaba para las pruebas que siguen: sin radiografías.
    await paciente().collection("fotos").doc("datos").update({ radiografias: FieldValue.delete() });
    await envejecer(id);
    await refrescarExpedienteCompartido(COLEGA, id);
    expect((await leer(id)).archivos.some((a) => a.origenPath === rutaRx)).toBe(false);
  });

  it("anota cuándo el colega abre el caso (aunque no toque revisar), y no cuenta si abre quien comparte", async () => {
    const id = casoIds[0];
    await dbAdmin.collection("interconsultas").doc(id).set({ compartirExpediente: { vistoPorColegaEl: FieldValue.delete() } }, { merge: true });
    expect((await leer(id)).compartirExpediente?.vistoPorColegaEl).toBeUndefined();

    // Quien comparte abre el caso: no cuenta como "lo vio el colega".
    await envejecer(id);
    await refrescarExpedienteCompartido(REMITENTE, id);
    expect((await leer(id)).compartirExpediente?.vistoPorColegaEl).toBeUndefined();

    // El colega abre el caso justo después (la revisión del expediente aún está reciente, no toca): se anota igual.
    expect(await refrescarExpedienteCompartido(COLEGA, id)).toEqual({ actualizado: false });
    const vista = (await leer(id)).compartirExpediente?.vistoPorColegaEl;
    expect(vista).toBeTruthy();

    // Otra apertura inmediata no vuelve a escribir (se limita a una por minuto).
    await refrescarExpedienteCompartido(COLEGA, id);
    expect((await leer(id)).compartirExpediente?.vistoPorColegaEl).toBe(vista);
  });

  it("alguien ajeno al caso no puede actualizarlo ni apagarlo; el colega tampoco apagarlo", async () => {
    const id = casoIds[0];
    await expect(refrescarExpedienteCompartido(AJENO, id)).rejects.toMatchObject({ status: 403 });
    await expect(configurarCompartirExpediente(COLEGA, id, { activo: false })).rejects.toMatchObject({ status: 403 });
    await expect(configurarCompartirExpediente(AJENO, id, { activo: false })).rejects.toMatchObject({ status: 403 });
  });

  it("al desactivar se borra lo compartido (datos y copias de fotos) y deja de actualizarse", async () => {
    const id = casoIds[0];
    const antes = await leer(id);
    expect(antes.archivos.length).toBe(2);

    await configurarCompartirExpediente(REMITENTE, id, { activo: false });
    const d = await leer(id);
    expect(d.expedienteCompartido).toBeUndefined();
    expect(d.archivos).toEqual([]);
    expect(d.compartirExpediente).toMatchObject({ activo: false, secciones: ["odontograma", "fotos_radiografias"] });
    expect(d.compartirExpediente?.desactivadoEl).toBeTruthy();
    for (const a of antes.archivos) expect(await existe(a.storagePath)).toBe(false);
    // La foto original del paciente no se toca.
    expect(await existe(`users/${CLINICA}/pacientes/${PACIENTE}/fotos/extraorales/e1.jpg`)).toBe(true);

    await envejecer(id);
    expect(await refrescarExpedienteCompartido(COLEGA, id)).toEqual({ actualizado: false });
    expect((await leer(id)).expedienteCompartido).toBeUndefined();
  });

  it("volver a activar exige el consentimiento y deja todo como al principio", async () => {
    const id = casoIds[0];
    await expect(configurarCompartirExpediente(REMITENTE, id, { activo: true })).rejects.toMatchObject({ status: 400 });
    await configurarCompartirExpediente(REMITENTE, id, { activo: true, consentimientoPaciente: true });
    const d = await leer(id);
    expect(d.compartirExpediente).toMatchObject({ activo: true, secciones: ["odontograma", "fotos_radiografias"] });
    expect(d.compartirExpediente).not.toHaveProperty("desactivadoEl");
    expect(d.compartirExpediente).not.toHaveProperty("vistoPorColegaEl"); // al volver a activar se empieza de cero
    expect(d.expedienteCompartido?.odontograma).toHaveLength(2);
    expect(d.archivos).toHaveLength(2);
    const eventos = await dbAdmin.collection("interconsultas").doc(id).collection("eventos").where("tipo", "==", "expediente_compartir_activado").get();
    expect(eventos.size).toBe(1);
  });

  it("un caso con foto fija anterior (sin el campo nuevo) también se puede apagar", async () => {
    const caso = await crearInterconsulta(REMITENTE, { ...entrada, seccionesCompartidas: ["fotos_radiografias"] });
    casoIds.push(caso.id);
    const ref = dbAdmin.collection("interconsultas").doc(caso.id);
    // Como quedaban los casos antes: sin `compartirExpediente` y sin `origenPath` en las fotos.
    await ref.update({
      compartirExpediente: (await import("firebase-admin/firestore")).FieldValue.delete(),
      archivos: caso.archivos.map(({ origenPath: _o, ...resto }) => resto),
    });
    await configurarCompartirExpediente(REMITENTE, caso.id, { activo: false });
    const d = await leer(caso.id);
    expect(d.expedienteCompartido).toBeUndefined();
    expect(d.archivos).toEqual([]);
    expect(await existe(caso.archivos[0].storagePath)).toBe(false);
  });

  it("un caso concluido ya no se actualiza ni se puede volver a activar", async () => {
    const caso = await crearInterconsulta(REMITENTE, { ...entrada, seccionesCompartidas: ["odontograma"] });
    casoIds.push(caso.id);
    await dbAdmin.collection("interconsultas").doc(caso.id).set({ estado: "closed" }, { merge: true });
    await envejecer(caso.id);
    expect(await refrescarExpedienteCompartido(COLEGA, caso.id)).toEqual({ actualizado: false });
    await configurarCompartirExpediente(REMITENTE, caso.id, { activo: false });
    await expect(
      configurarCompartirExpediente(REMITENTE, caso.id, { activo: true, consentimientoPaciente: true, secciones: ["odontograma"] })
    ).rejects.toMatchObject({ status: 409 });
  });

  it("si se revocó el consentimiento, la siguiente actualización deja de compartir", async () => {
    const caso = await crearInterconsulta(REMITENTE, { ...entrada, seccionesCompartidas: ["odontograma"] });
    casoIds.push(caso.id);
    await dbAdmin.collection("consentimientosInterconsulta").doc(caso.consentimientoId).set({ estado: "revocado" }, { merge: true });
    await envejecer(caso.id);
    await refrescarExpedienteCompartido(COLEGA, caso.id);
    const d = await leer(caso.id);
    expect(d.expedienteCompartido).toBeUndefined();
    expect(d.compartirExpediente?.activo).toBe(false);
  });
});
