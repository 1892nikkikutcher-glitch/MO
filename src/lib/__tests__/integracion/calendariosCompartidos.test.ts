/** Prueba de punta a punta (contra el emulador) de compartir un calendario por
 * MO Conecta: solo horarios ocupados/libres, solo para el colega elegido, y se
 * corta al dejar de compartir. Nunca toca producción. */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
});

vi.mock("../../firebaseAdmin", async () => {
  const { getApps, initializeApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const app = getApps()[0] ?? initializeApp({ projectId: "demo-mo-local" });
  return { dbAdmin: getFirestore(app) };
});

import { dbAdmin } from "../../firebaseAdmin";
import {
  compartirCalendario,
  dejarDeCompartirCalendario,
  invitarACalendario,
  listarCalendarios,
  obtenerInvitacionCalendarioPublica,
  ocupacionDeCalendario,
  reclamarInvitacionCalendario,
} from "../../conectaCalendarios";

const CLINICA = "clinica-cal-prueba";
const COLEGA = "uid-colega-cal";
const EXTRANO = "uid-extrano-cal";
const base = () => dbAdmin.collection("users").doc(CLINICA);

beforeAll(async () => {
  await base().collection("recursos").doc("r1").set({ id: "r1", nombre: "Dra. Prueba", tipo: "medico", color: "#fff" });
  await base().collection("config").doc("horario").set({ apertura: "09:00", cierre: "19:00", comidaInicio: "14:00", comidaFin: "15:00" });
  const citas = base().collection("citas");
  await citas.doc("c1").set({ id: "c1", patientId: "p-secreto", fecha: "2026-10-06", horaInicio: "09:00", horaFin: "10:00", estatus: "Confirmada", medicoId: "r1", costo: "$999", comentarios: "SECRETO" });
  await citas.doc("c2").set({ id: "c2", patientId: "p2", fecha: "2026-10-06", horaInicio: "11:00", horaFin: "12:00", estatus: "Cancelada", medicoId: "r1" });
  await citas.doc("c3").set({ id: "c3", patientId: "p3", fecha: "2026-10-06", horaInicio: "13:00", horaFin: "14:00", estatus: "Agendada", medicoId: "otro" });
  await dbAdmin.collection("perfilesProfesionalesPublicos").doc(COLEGA).set({ uid: COLEGA, nombreCompleto: "Dra. Colega" });
  await dbAdmin.collection("perfilesProfesionalesPublicos").doc(CLINICA).set({ uid: CLINICA, nombreCompleto: "Dueña Clínica" });
});

afterAll(async () => {
  await dbAdmin.recursiveDelete(base());
  const compartidos = await dbAdmin.collection("calendariosCompartidos").where("clinicaId", "==", CLINICA).get();
  await Promise.all(compartidos.docs.map((d) => d.ref.delete()));
  for (const k of [`calendario_compartir_${CLINICA}`, `calendario_invitar_${CLINICA}`, "calendario_reclamar_uid-nuevo", "calendario_reclamar_uid-otro", "calendario_reclamar_uid-sin-correo"]) {
    await dbAdmin.collection("rateLimitsConecta").doc(k).delete();
  }
  await dbAdmin.collection("perfilesProfesionalesPublicos").doc(COLEGA).delete();
  await dbAdmin.collection("perfilesProfesionalesPublicos").doc(CLINICA).delete();
});

describe("calendario compartido (servidor + emulador)", () => {
  it("comparte, el colega ve solo ocupado/libre en vivo y nadie más lo ve", async () => {
    const c = await compartirCalendario(CLINICA, { clinicaId: CLINICA, recursoId: "r1", destinatarioUid: COLEGA });
    expect(c).toMatchObject({ recursoNombre: "Dra. Prueba", destinatarioNombre: "Dra. Colega", estado: "activo" });

    // Idempotente: compartir otra vez no duplica.
    const otra = await compartirCalendario(CLINICA, { clinicaId: CLINICA, recursoId: "r1", destinatarioUid: COLEGA });
    expect(otra.id).toBe(c.id);

    const vista = await ocupacionDeCalendario(COLEGA, c.id, "2026-10-05", "2026-10-11");
    expect(vista.bloques).toEqual([{ fecha: "2026-10-06", inicio: "09:00", fin: "10:00" }]);
    expect(vista.horario).toMatchObject({ apertura: "09:00", cierre: "19:00" });
    const texto = JSON.stringify(vista);
    expect(texto).not.toContain("p-secreto");
    expect(texto).not.toContain("SECRETO");
    expect(texto).not.toContain("$999");

    // En vivo: una cita nueva aparece en la siguiente lectura, sin volver a compartir.
    await base().collection("citas").doc("c4").set({ id: "c4", patientId: "p4", fecha: "2026-10-07", horaInicio: "16:00", horaFin: "17:00", estatus: "Agendada", medicoId: "r1" });
    const despues = await ocupacionDeCalendario(COLEGA, c.id, "2026-10-05", "2026-10-11");
    expect(despues.bloques).toContainEqual({ fecha: "2026-10-07", inicio: "16:00", fin: "17:00" });

    await expect(ocupacionDeCalendario(EXTRANO, c.id, "2026-10-05", "2026-10-11")).rejects.toMatchObject({ status: 403 });
    await expect(ocupacionDeCalendario(COLEGA, c.id, "2026-01-01", "2026-12-31")).rejects.toMatchObject({ status: 400 });
  });

  it("lista lo que comparto y lo que comparten conmigo, y dejar de compartir lo corta", async () => {
    const { mios } = await listarCalendarios(CLINICA);
    const { conmigo } = await listarCalendarios(COLEGA);
    expect(mios).toHaveLength(1);
    expect(conmigo).toHaveLength(1);

    await expect(dejarDeCompartirCalendario(EXTRANO, mios[0].id)).rejects.toMatchObject({ status: 403 });
    await dejarDeCompartirCalendario(CLINICA, mios[0].id);

    await expect(ocupacionDeCalendario(COLEGA, mios[0].id, "2026-10-05", "2026-10-11")).rejects.toMatchObject({ status: 410 });
    expect((await listarCalendarios(COLEGA)).conmigo).toHaveLength(0);
  });

  it("no deja compartir un recurso ajeno, a uno mismo ni sin ser de la clínica", async () => {
    await expect(compartirCalendario(CLINICA, { clinicaId: CLINICA, recursoId: "no-existe", destinatarioUid: COLEGA })).rejects.toMatchObject({ status: 404 });
    await expect(compartirCalendario(CLINICA, { clinicaId: CLINICA, recursoId: "r1", destinatarioUid: CLINICA })).rejects.toMatchObject({ status: 400 });
    await expect(compartirCalendario(EXTRANO, { clinicaId: CLINICA, recursoId: "r1", destinatarioUid: COLEGA })).rejects.toMatchObject({ status: 403 });
  });
});

describe("invitar a un calendario por enlace (colega sin cuenta en MO)", () => {
  it("la invitación pendiente no da acceso hasta que se acepta con el correo correcto, y se usa una sola vez", async () => {
    const { calendario, tokenCrudo } = await invitarACalendario(CLINICA, {
      clinicaId: CLINICA,
      recursoId: "r1",
      destinatarioNombre: "Nuevo Colega",
      destinatarioCorreo: " Nuevo@Mail.com ",
    });
    expect(calendario.estado).toBe("pendiente");
    expect(JSON.stringify(calendario)).not.toContain("tokenHash");
    expect(JSON.stringify(calendario)).not.toContain(tokenCrudo);

    // Pública: solo datos genéricos.
    const publica = await obtenerInvitacionCalendarioPublica(tokenCrudo);
    expect(publica).toMatchObject({ estado: "disponible", recursoNombre: "Dra. Prueba", remitenteNombre: "Dueña Clínica" });
    expect(JSON.stringify(publica)).not.toContain("nuevo@mail.com");

    // Pendiente: nadie ve horarios todavía.
    await expect(ocupacionDeCalendario("uid-nuevo", calendario.id, "2026-10-05", "2026-10-11")).rejects.toMatchObject({ status: 410 });

    // Correo sin verificar, o de otra persona: no.
    await expect(reclamarInvitacionCalendario("uid-nuevo", "nuevo@mail.com", false, tokenCrudo)).rejects.toMatchObject({ status: 403 });
    await expect(reclamarInvitacionCalendario("uid-otro", "otro@mail.com", true, tokenCrudo)).rejects.toMatchObject({ status: 403 });
    // El dueño no puede aceptar su propio enlace.
    await expect(reclamarInvitacionCalendario(CLINICA, "duena@mail.com", true, tokenCrudo)).rejects.toMatchObject({ status: 400 });

    // El correo verificado correcto (sin importar mayúsculas) sí.
    await reclamarInvitacionCalendario("uid-nuevo", "NUEVO@mail.com", true, tokenCrudo);
    const vista = await ocupacionDeCalendario("uid-nuevo", calendario.id, "2026-10-05", "2026-10-11");
    expect(vista.bloques.length).toBeGreaterThan(0);
    const { conmigo } = await listarCalendarios("uid-nuevo");
    expect(conmigo).toHaveLength(1);
    expect(JSON.stringify(conmigo)).not.toContain("tokenHash");

    // Un solo uso: el enlace ya no sirve para nadie más.
    await expect(reclamarInvitacionCalendario("uid-otro", "nuevo@mail.com", true, tokenCrudo)).rejects.toMatchObject({ status: 404 });
    await expect(obtenerInvitacionCalendarioPublica(tokenCrudo)).rejects.toMatchObject({ status: 404 });
  });

  it("sin correo vale quien tenga el enlace, pero vence a los 7 días", async () => {
    const { calendario, tokenCrudo } = await invitarACalendario(CLINICA, { clinicaId: CLINICA, recursoId: "r1", destinatarioNombre: "Sin Correo" });
    await dbAdmin.collection("calendariosCompartidos").doc(calendario.id).set({ venceEl: "2020-01-01T00:00:00.000Z" }, { merge: true });
    expect(await obtenerInvitacionCalendarioPublica(tokenCrudo)).toMatchObject({ estado: "vencida" });
    await expect(reclamarInvitacionCalendario("uid-sin-correo", "x@y.com", true, tokenCrudo)).rejects.toMatchObject({ status: 410 });

    const nueva = await invitarACalendario(CLINICA, { clinicaId: CLINICA, recursoId: "r1", destinatarioNombre: "Sin Correo 2" });
    await reclamarInvitacionCalendario("uid-sin-correo", "x@y.com", true, nueva.tokenCrudo);
    expect((await listarCalendarios("uid-sin-correo")).conmigo).toHaveLength(1);
  });

  it("invitar otra vez al mismo colega cancela la invitación pendiente anterior", async () => {
    const a = await invitarACalendario(CLINICA, { clinicaId: CLINICA, recursoId: "r1", destinatarioNombre: "Repetido", destinatarioCorreo: "rep@mail.com" });
    const b = await invitarACalendario(CLINICA, { clinicaId: CLINICA, recursoId: "r1", destinatarioNombre: "Repetido", destinatarioCorreo: "rep@mail.com" });
    expect(await obtenerInvitacionCalendarioPublica(a.tokenCrudo)).toMatchObject({ estado: "cancelada" });
    expect(await obtenerInvitacionCalendarioPublica(b.tokenCrudo)).toMatchObject({ estado: "disponible" });
    const { mios } = await listarCalendarios(CLINICA);
    expect(mios.filter((c) => c.estado === "pendiente" && c.destinatarioNombre === "Repetido")).toHaveLength(1);
  });
});
