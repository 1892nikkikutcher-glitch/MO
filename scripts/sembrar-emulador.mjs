// Siembra una cuenta y una clínica de PRUEBA en los emuladores locales de
// Firebase (nunca en producción: sin la variable *_EMULATOR_HOST el SDK de
// administrador no tiene a dónde conectarse, y este script las fija a
// 127.0.0.1 antes de importar nada). Datos 100% inventados.
//
//   npm run emuladores          (otra terminal, antes)
//   node scripts/sembrar-emulador.mjs
//   npm run dev:emulador        -> http://localhost:3000, entrar con la cuenta de abajo
//
// La clínica y su catálogo de procedimientos NO se siembran aquí: los crea la
// propia app en el primer inicio de sesión de una cuenta nueva (igual que en
// producción), así se prueba también ese camino.

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Mismo proyecto "demo-" que usa el cliente en modo emuladores (src/lib/firebase.ts).
initializeApp({ projectId: "demo-mo-local" });

export const CORREO_PRUEBA = "odontologa@mo.test";
export const CLAVE_PRUEBA = "prueba-local-1234";

const auth = getAuth();
const db = getFirestore();

let usuario;
try {
  usuario = await auth.getUserByEmail(CORREO_PRUEBA);
} catch {
  usuario = await auth.createUser({ email: CORREO_PRUEBA, password: CLAVE_PRUEBA, emailVerified: true });
}
const uid = usuario.uid;
const base = `users/${uid}`;

const hoy = new Date();
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const mas = (dias) => {
  const d = new Date(hoy);
  d.setDate(d.getDate() + dias);
  return d;
};
const dmy = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

const recursos = [
  { id: "r1", nombre: "Dra. Ana Mendoza", color: "#3FD3F3", tipo: "medico" },
  { id: "r2", nombre: "Dr. Luis Ortega", color: "#FF6602", tipo: "medico" },
  { id: "u1", nombre: "Unidad 1", color: "#7E3AEC", tipo: "unidad" },
];

const nombres = [
  ["Brenda Ivonne Cruz", "1992-03-14"],
  ["Carlos Alberto Ramírez", "1985-11-02"],
  ["Ana Sofía Torres", "2001-07-25"],
  ["Jorge Iván Mendoza", "1978-01-30"],
  ["Paola Guadalupe Ríos", "1995-09-14"],
  ["María Fernanda López", "1990-04-12"],
  ["Luis Enrique Salazar", "1969-12-05"],
  ["Daniela Itzel Vargas", "2014-06-21"],
  ["Roberto Carlos Núñez", "1982-08-09"],
  ["Fernanda Montserrat Gil", "1999-02-27"],
  ["Miguel Ángel Herrera", "1974-10-18"],
  ["Valeria Sofía Castro", "2008-05-03"],
];
const pacientes = nombres.map(([name, birthDate], i) => ({
  id: `p${i + 1}`,
  name,
  phone: `55 ${String(1000 + i * 137).padStart(4, "0")} ${String(2000 + i * 211).padStart(4, "0")}`,
  birthDate,
  createdAt: iso(mas(-30 - i)),
}));

const estatus = ["Confirmada", "En espera", "Atendida", "Agendada", "Confirmada", "Agendada", "Cancelada", "Reagendada"];
const tratamientos = [["Limpieza dental"], ["Resina"], ["Endodoncia"], ["Valoración"], ["Corona"], ["Extracción"], ["Ortodoncia (control)"], ["Blanqueamiento"]];
const citas = [];
let n = 0;
for (const dia of [0, 1, 2, -1]) {
  for (let k = 0; k < 4; k++) {
    const paciente = pacientes[(n * 3) % pacientes.length];
    const medico = recursos[n % 2];
    const hora = 9 + k * 2 + (n % 2);
    citas.push({
      id: `c${n + 1}`,
      folio: `${3000 + n}`,
      recursoId: medico.id,
      medicoId: medico.id,
      unidadId: "u1",
      patientId: paciente.id,
      paciente: paciente.name,
      tratamientos: tratamientos[n % tratamientos.length],
      comentarios: "",
      fecha: iso(mas(dia)),
      horaInicio: `${String(hora).padStart(2, "0")}:00`,
      horaFin: `${String(hora).padStart(2, "0")}:45`,
      estatus: dia < 0 ? "Atendida" : estatus[n % estatus.length],
      recurrenciaId: null,
    });
    n++;
  }
}

const presupuestos = [
  { pid: "p1", id: "b1", folio: "1001", items: [["Limpieza dental", 600], ["Resina OD 36", 1200]], estado: "pendiente" },
  { pid: "p2", id: "b2", folio: "1002", items: [["Endodoncia OD 46", 3800], ["Corona de zirconia", 6500]], estado: "aceptado" },
  { pid: "p3", id: "b3", folio: "1003", items: [["Ortodoncia (mensualidad)", 1500]], estado: "pendiente" },
].map((p) => ({
  pid: p.pid,
  doc: {
    id: p.id,
    folio: p.folio,
    fecha: dmy(mas(-3)),
    medico: "Dra. Ana Mendoza",
    tipoDePrecio: "Consultorio",
    especialidad: "Odontología General",
    diagnostico: "Caries y necesidad de rehabilitación.",
    items: p.items.map(([procedure, price], i) => ({ id: `item-${p.id}-${i}`, procedure, price, teeth: [], note: "" })),
    total: p.items.reduce((s, [, precio]) => s + precio, 0),
    estado: p.estado,
  },
}));

const pagos = [
  {
    pid: "p1",
    doc: {
      id: "pg1",
      fecha: dmy(mas(-2)),
      medico: "Dra. Ana Mendoza",
      formaPago: "Efectivo",
      lineas: [{ id: "pg1-l1", tratamientoId: "item-b1-0", folio: "1001", label: "Limpieza dental", monto: 600 }],
      total: 600,
      facturar: false,
      firma: null,
    },
  },
  {
    pid: "p2",
    doc: {
      id: "pg2",
      fecha: dmy(mas(-1)),
      medico: "Dr. Luis Ortega",
      formaPago: "Tarjeta",
      lineas: [{ id: "pg2-l1", tratamientoId: "item-b2-0", folio: "1002", label: "Endodoncia OD 46", monto: 3800 }],
      total: 3800,
      facturar: true,
      firma: null,
    },
  },
];

const gastos = [
  { id: "g1", concepto: "Renta del consultorio", categoria: "Renta", monto: 12000, fecha: iso(mas(-4)) },
  { id: "g2", concepto: "Resinas y adhesivo", categoria: "Insumos", monto: 2350, fecha: iso(mas(-3)) },
  { id: "g3", concepto: "Laboratorio dental (coronas)", categoria: "Laboratorio", monto: 3100, fecha: iso(mas(-2)) },
  { id: "g4", concepto: "Luz e internet", categoria: "Servicios", monto: 1480, fecha: iso(mas(-1)) },
];

// --- Casos de "saldos falsos" (para probar Reportes → Saldos pendientes) ---
// p4: cita CANCELADA con su presupuesto automático sin pagar (nadie lo puede pagar).
// p5: cita confirmada con presupuesto sin pagar + el mismo trabajo cobrado como pago
//     "extra" (presupuesto automático ya pagado) -> mismo trabajo dos veces.
const citaFalsa = (id, patientId, paciente, estatus) => ({
  id, folio: id, recursoId: "r1", medicoId: "r1", unidadId: "u1", patientId, paciente,
  tratamientos: ["Resina"], comentarios: "", costo: "$1,000", fecha: iso(mas(1)), horaInicio: "17:00", horaFin: "17:45",
  estatus, recurrenciaId: null,
});
const presCita = (citaId, total) => ({
  id: `pres-cita-${citaId}`, folio: citaId.slice(-6), fecha: dmy(mas(-1)), medico: "Dra. Ana Mendoza", tipoDePrecio: "Consultorio",
  especialidad: "Odontología General", diagnostico: "Generado automáticamente a partir de una cita agendada.",
  items: [{ id: `item-cita-${citaId}-0`, procedure: "Resina", price: total, teeth: [], note: "" }], total,
});
citas.push(citaFalsa("c-fx1", "p4", "Jorge Iván Mendoza", "Cancelada"), citaFalsa("c-fx2", "p5", "Paola Guadalupe Ríos", "Confirmada"));
// p6: cita de HOY pendiente con su presupuesto sin pagar — sirve para probar que al marcar
// "No llega" desde la nota el presupuesto automático se quita.
citas.push({ ...citaFalsa("c-fx3", "p6", "María Fernanda López", "Agendada"), fecha: iso(mas(0)), horaInicio: "08:00", horaFin: "08:45" });
presupuestos.push(
  { pid: "p4", doc: presCita("c-fx1", 800) },
  { pid: "p6", doc: presCita("c-fx3", 900) },
  { pid: "p5", doc: presCita("c-fx2", 1000) },
  {
    pid: "p5",
    doc: {
      id: "pres-pg-fx2", folio: "pg-fx2", fecha: dmy(mas(0)), medico: "Dra. Ana Mendoza", tipoDePrecio: "Consultorio",
      especialidad: "Odontología General", diagnostico: "Generado automáticamente a partir de un pago sin presupuesto previo.",
      items: [{ id: "item-pg-fx2-l1", procedure: "Resina", price: 1000, teeth: [], note: "" }], total: 1000,
    },
  }
);
pagos.push({
  pid: "p5",
  doc: {
    id: "pg-fx2", fecha: dmy(mas(0)), medico: "Dra. Ana Mendoza", formaPago: "Efectivo",
    lineas: [{ id: "pg-fx2-l1", tratamientoId: "item-pg-fx2-l1", folio: "pg-fx2", label: "Resina", monto: 1000, generarPresupuesto: true }],
    total: 1000, facturar: false, firma: null,
  },
});

// Controles de ortodoncia convertidos en presupuesto por error (ver controlesPorError.ts).
// p7: tratamiento principal + un control sin pagar + un control ya pagado.
// p8: un control pagado y NINGÚN presupuesto principal -> "revisar a mano".
const presControl = (citaId, total) => ({
  id: `pres-cita-${citaId}`, folio: citaId.slice(-6), fecha: dmy(mas(-1)), medico: "Dra. Ana Mendoza", tipoDePrecio: "Consultorio",
  especialidad: "Ortodoncia", diagnostico: "Generado automáticamente a partir de una cita agendada.",
  items: [{ id: `item-cita-${citaId}-0`, procedure: "Control de ortodoncia", price: total, teeth: [], note: "" }], total,
});
presupuestos.push(
  {
    pid: "p7",
    doc: {
      id: "b-orto", folio: "1500", fecha: dmy(mas(-60)), medico: "Dra. Ana Mendoza", tipoDePrecio: "Consultorio",
      especialidad: "Ortodoncia", diagnostico: "Maloclusión clase II.",
      items: [{ id: "item-b-orto-0", procedure: "Ortodoncia (tratamiento completo)", price: 18000, teeth: [], note: "" }],
      total: 18000, estado: "aceptado",
    },
  },
  { pid: "p7", doc: presControl("c-ct1", 500) },
  { pid: "p7", doc: presControl("c-ct2", 500) },
  { pid: "p8", doc: presControl("c-ct3", 600) }
);
const pagoSimple = (id, trat, folio, label, monto) => ({
  id, fecha: dmy(mas(-1)), medico: "Dra. Ana Mendoza", formaPago: "Efectivo",
  lineas: [{ id: `${id}-l1`, tratamientoId: trat, folio, label, monto }], total: monto, facturar: false, firma: null,
});
pagos.push(
  { pid: "p7", doc: pagoSimple("pg-o1", "item-b-orto-0", "1500", "Ortodoncia (tratamiento completo)", 3000) },
  { pid: "p7", doc: pagoSimple("pg-ct2", "item-cita-c-ct2-0", "c-ct2", "Control de ortodoncia", 500) },
  { pid: "p8", doc: pagoSimple("pg-ct3", "item-cita-c-ct3-0", "c-ct3", "Control de ortodoncia", 600) }
);

const batch = db.batch();
recursos.forEach((r) => batch.set(db.doc(`${base}/recursos/${r.id}`), r));
pacientes.forEach((p) => batch.set(db.doc(`${base}/pacientes/${p.id}`), p));
citas.forEach((c) => batch.set(db.doc(`${base}/citas/${c.id}`), c));
presupuestos.forEach(({ pid, doc }) => batch.set(db.doc(`${base}/pacientes/${pid}/presupuestos/${doc.id}`), doc));
pagos.forEach(({ pid, doc }) => batch.set(db.doc(`${base}/pacientes/${pid}/pagos/${doc.id}`), doc));
gastos.forEach((g) => batch.set(db.doc(`${base}/gastos/${g.id}`), g));
await batch.commit();

console.log(`Listo: cuenta ${CORREO_PRUEBA} (uid ${uid}) con ${pacientes.length} pacientes, ${citas.length} citas, ${presupuestos.length} presupuestos, ${pagos.length} pagos y ${gastos.length} gastos.`);
process.exit(0);
