// Siembra, ENCIMA de la cuenta de prueba (sembrar-emulador.mjs), una clínica grande y ordenada para
// probar a escala: 3 sedes, 8 médicos con sus bloques de atención, 60 pacientes, ~10 días de citas
// (con choques y citas fuera de bloque a propósito), pagos de todos los médicos y gastos por sede.
// Solo emuladores locales (nunca producción). Datos 100% inventados.
//
//   node scripts/sembrar-emulador.mjs
//   node scripts/sembrar-clinica-grande.mjs

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({ projectId: "demo-mo-local" });
const auth = getAuth();
const db = getFirestore();

const usuario = await auth.getUserByEmail("odontologa@mo.test");
const base = `users/${usuario.uid}`;

const hoy = new Date();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dmy = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
const mas = (dias) => {
  const d = new Date(hoy);
  d.setDate(d.getDate() + dias);
  return d;
};
const hh = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

const sedes = [
  { id: "s1", nombre: "Centro", direccion: "Av. Juárez 120, Centro" },
  { id: "s2", nombre: "Norte", direccion: "Calle Robles 45, Col. Norte" },
  { id: "s3", nombre: "Sur", direccion: "Blvd. del Sur 800" },
];
const bloque = (id, sedeId, dias, inicio, fin) => ({ id, sedeId, dias, inicio, fin });
const medicos = [
  { id: "m1", nombre: "Dr. Héctor Salinas", especialidad: "Odontología General", color: "#3FD3F3", bloques: [bloque("b1", "s1", [1, 2, 3, 4, 5], "09:00", "15:00")] },
  { id: "m2", nombre: "Dra. Lucía Fonseca", especialidad: "Endodoncia", color: "#FF6602", bloques: [bloque("b2", "s1", [1, 3, 5], "10:00", "18:00")] },
  { id: "m3", nombre: "Dr. Iván Betancourt", especialidad: "Ortodoncia", color: "#7E3AEC", bloques: [bloque("b3", "s2", [2, 4, 6], "09:00", "17:00")] },
  { id: "m4", nombre: "Dra. Mariana Ibarra", especialidad: "Odontopediatría", color: "#22C55E", bloques: [bloque("b4", "s2", [1, 2, 3, 4, 5], "11:00", "19:00")] },
  { id: "m5", nombre: "Dr. Rodrigo Pineda", especialidad: "Cirugía maxilofacial", color: "#EAB308", bloques: [bloque("b5", "s3", [1, 3, 5], "09:00", "14:00"), bloque("b5b", "s1", [2, 4], "09:00", "14:00")] },
  { id: "m6", nombre: "Dra. Paulina Cortés", especialidad: "Periodoncia", color: "#EC4899", bloques: [bloque("b6", "s3", [1, 2, 3, 4, 5], "14:00", "20:00")] },
  { id: "m7", nombre: "Dr. Gabriel Soto", especialidad: "Implantología", color: "#14B8A6", bloques: [bloque("b7", "s1", [2, 4, 6], "09:00", "15:00")] },
  { id: "m8", nombre: "Dra. Renata Quiroz", especialidad: "Odontología General", color: "#F97316", bloques: [bloque("b8", "s2", [1, 3, 5, 6], "09:00", "15:00")] },
].map((m) => ({ ...m, tipo: "medico", cedulaProfesional: `${9000000 + Number(m.id.slice(1))}` }));

const nombres = ["Alejandra", "Bruno", "Camila", "Diego", "Elena", "Fabián", "Gloria", "Hugo", "Irene", "Joaquín", "Karla", "Leonardo", "Mónica", "Nicolás", "Olivia", "Pablo", "Quetzal", "Rocío", "Sergio", "Tania"];
const apellidos = ["Aguilar", "Barrios", "Contreras", "Domínguez", "Escobar", "Figueroa", "Guerrero", "Hidalgo", "Ibáñez", "Juárez", "Lozano", "Maldonado"];
const pacientes = Array.from({ length: 60 }, (_, i) => ({
  id: `g${i + 1}`,
  name: `${nombres[i % nombres.length]} ${apellidos[(i * 7) % apellidos.length]} ${apellidos[(i * 5 + 3) % apellidos.length]}`,
  phone: `55 ${String(3000 + i * 53).padStart(4, "0")} ${String(5000 + i * 97).padStart(4, "0")}`,
  birthDate: `${1960 + (i % 45)}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
  createdAt: iso(mas(-60 + i)),
}));

const tratamientos = ["Limpieza dental", "Resina", "Endodoncia", "Extracción", "Corona", "Valoración", "Ortodoncia (control)", "Implante"];
const estatusCiclo = ["Confirmada", "Agendada", "Confirmada", "En espera", "Agendada", "Confirmada"];
const citas = [];
let c = 0;
for (let dia = -3; dia <= 7; dia++) {
  const fecha = mas(dia);
  const dow = fecha.getDay();
  for (const m of medicos) {
    for (const b of m.bloques) {
      if (!b.dias.includes(dow)) continue;
      const [ih, im] = b.inicio.split(":").map(Number);
      const [fh, fm] = b.fin.split(":").map(Number);
      let t = ih * 60 + im;
      let k = 0;
      while (t + 45 <= fh * 60 + fm) {
        if (k % 4 !== 3) {
          const p = pacientes[(c * 11) % pacientes.length];
          citas.push({
            id: `gc${c}`, folio: `${7000 + c}`, recursoId: m.id, medicoId: m.id, unidadId: null, sedeId: b.sedeId,
            patientId: p.id, paciente: p.name, tratamientos: [tratamientos[c % tratamientos.length]], comentarios: "",
            fecha: iso(fecha), horaInicio: hh(t), horaFin: hh(t + 45),
            estatus: dia < 0 ? "Atendida" : dia === 0 && t < 12 * 60 ? "Atendida" : estatusCiclo[c % estatusCiclo.length],
            recurrenciaId: null,
          });
          c++;
        }
        t += 60;
        k++;
      }
    }
  }
}
// Trampas a propósito: el mismo paciente en dos médicos a la misma hora, y una cita fuera del bloque del médico.
const dMan = iso(mas(1));
citas.push(
  { id: "gx1", folio: "9001", recursoId: "m1", medicoId: "m1", unidadId: null, sedeId: "s1", patientId: "g1", paciente: pacientes[0].name, tratamientos: ["Resina"], comentarios: "", fecha: dMan, horaInicio: "09:15", horaFin: "10:00", estatus: "Agendada", recurrenciaId: null },
  { id: "gx2", folio: "9002", recursoId: "m2", medicoId: "m2", unidadId: null, sedeId: "s1", patientId: "g1", paciente: pacientes[0].name, tratamientos: ["Endodoncia"], comentarios: "", fecha: dMan, horaInicio: "09:15", horaFin: "10:00", estatus: "Agendada", recurrenciaId: null },
  { id: "gx3", folio: "9003", recursoId: "m3", medicoId: "m3", unidadId: null, sedeId: "s2", patientId: "g2", paciente: pacientes[1].name, tratamientos: ["Ortodoncia (control)"], comentarios: "", fecha: iso(mas(2)), horaInicio: "07:00", horaFin: "07:45", estatus: "Agendada", recurrenciaId: null }
);

const formas = ["Efectivo", "Tarjeta", "Transferencia"];
const pagos = [];
const presupuestos = [];
for (let i = 0; i < 90; i++) {
  const p = pacientes[(i * 7) % pacientes.length];
  const m = medicos[i % medicos.length];
  const dia = -(i % 25);
  const monto = [600, 1200, 1800, 3800, 6500, 900, 2500][i % 7];
  const presId = `gb${i}`;
  presupuestos.push({
    pid: p.id,
    doc: {
      id: presId, folio: `${5000 + i}`, fecha: dmy(mas(dia - 1)), medico: m.nombre, tipoDePrecio: "Consultorio",
      especialidad: m.especialidad, diagnostico: "Plan de prueba.",
      items: [{ id: `gi${i}`, procedure: tratamientos[i % tratamientos.length], price: monto + (i % 3 === 0 ? 1000 : 0), teeth: [], note: "" }],
      total: monto + (i % 3 === 0 ? 1000 : 0), estado: "aceptado",
    },
  });
  pagos.push({
    pid: p.id,
    doc: {
      id: `gp${i}`, fecha: dmy(mas(dia)), medico: m.nombre, formaPago: formas[i % formas.length],
      lineas: [{ id: `gp${i}-l1`, tratamientoId: `gi${i}`, folio: `${5000 + i}`, label: tratamientos[i % tratamientos.length], monto }],
      total: monto, facturar: i % 5 === 0, firma: null,
    },
  });
}

const gastos = [
  { id: "gg1", concepto: "Renta sede Centro", categoria: "Renta", monto: 22000, fecha: iso(mas(-5)) },
  { id: "gg2", concepto: "Renta sede Norte", categoria: "Renta", monto: 18000, fecha: iso(mas(-5)) },
  { id: "gg3", concepto: "Renta sede Sur", categoria: "Renta", monto: 16000, fecha: iso(mas(-5)) },
  { id: "gg4", concepto: "Insumos (resinas, anestesia)", categoria: "Insumos", monto: 14500, fecha: iso(mas(-3)) },
  { id: "gg5", concepto: "Laboratorio dental", categoria: "Laboratorio", monto: 9800, fecha: iso(mas(-2)) },
];

async function escribir(items, ruta) {
  for (let i = 0; i < items.length; i += 400) {
    const batch = db.batch();
    items.slice(i, i + 400).forEach((x) => batch.set(db.doc(ruta(x)), x.doc ?? x));
    await batch.commit();
  }
}

await db.doc(`${base}/config/sedes`).set({ lista: sedes });
await escribir(medicos, (r) => `${base}/recursos/${r.id}`);
await escribir(pacientes, (p) => `${base}/pacientes/${p.id}`);
await escribir(citas, (x) => `${base}/citas/${x.id}`);
await escribir(presupuestos, (x) => `${base}/pacientes/${x.pid}/presupuestos/${x.doc.id}`);
await escribir(pagos, (x) => `${base}/pacientes/${x.pid}/pagos/${x.doc.id}`);
await escribir(
  pagos.map(({ pid, doc }) => ({
    id: doc.id, patientId: pid, patientName: pacientes.find((p) => p.id === pid).name, pago: doc,
    registradoEn: new Date().toISOString(), registradoPor: "odontologa@mo.test",
  })),
  (x) => `${base}/pagosRealizados/${x.id}`
);
await escribir(gastos, (g) => `${base}/gastos/${g.id}`);

console.log(`Listo: ${sedes.length} sedes, ${medicos.length} médicos, ${pacientes.length} pacientes, ${citas.length} citas, ${pagos.length} pagos, ${gastos.length} gastos.`);
process.exit(0);
