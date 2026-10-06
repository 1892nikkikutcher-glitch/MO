// SOLO EMULADORES. Llena el expediente de la paciente p1 (Brenda) de la cuenta de
// prueba con datos clínicos para compartir por MO Conecta, y con datos PRIVADOS
// (teléfono, dirección, borrador, nota administrativa, costo, comentario) para
// comprobar que el colega nunca los ve.
//
//   node scripts/sembrar-expediente-conecta.mjs

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= "127.0.0.1:9199";

const { initializeApp } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");
const { getFirestore } = await import("firebase-admin/firestore");
const { getStorage } = await import("firebase-admin/storage");

const app = initializeApp({ projectId: "demo-mo-local", storageBucket: "demo-mo-local.appspot.com" });
const uid = (await getAuth(app).getUserByEmail("odontologa@mo.test")).uid;
const db = getFirestore(app);
const bucket = getStorage(app).bucket();
const paciente = db.doc(`users/${uid}/pacientes/p1`);

await paciente.set(
  { phone: "55 1234 5678", direccion: "CALLE PRIVADA 99, Toluca", birthDate: "1992-03-14", sexo: "F" },
  { merge: true }
);
await db.doc(`users/${uid}/config/historiaClinicaTemplate`).set({
  secciones: [
    {
      id: "s1",
      titulo: "Antecedentes",
      preguntas: [
        { id: "dm", tipo: "sino", etiqueta: "¿Diabetes?", mostrarDetalle: true },
        { id: "hta", tipo: "sino", etiqueta: "¿Hipertensión?" },
        { id: "od", tipo: "odontograma", etiqueta: "Odontograma" },
      ],
    },
  ],
});
await paciente.collection("historiaClinica").doc("respuestas").set({
  alergias: "Penicilina",
  porPregunta: {
    dm: "No",
    hta: "Sí",
    od: [
      { id: "d1", dientes: [36], diagnostico: "Caries clase II", fecha: "2026-10-01", estado: "confirmado" },
      { id: "d2", dientes: [11], diagnostico: "Apiñamiento leve", fecha: "2026-10-01", estado: "confirmado" },
    ],
  },
});
await paciente.collection("diagnosticos").doc("dx1").set({
  id: "dx1", dientes: [36], diagnostico: "Pulpitis irreversible", estado: "definitivo", creadoEn: "2026-10-01", origen: "nuevo",
});
await paciente.collection("planTratamiento").doc("pl1").set({
  id: "pl1", dientes: [36], tratamiento: "Endodoncia", prioridad: "alta", destino: "tratamiento_clinica", estadoClinico: "activo",
  presupuestosVinculados: [],
});
const nota = (id, estado, texto, creadoEn) => ({
  id, version: 2, estado, creadoEn, encabezado: { medico: "Dra. Ana Mendoza", patientId: "p1" }, narrativa: { texto, editadaManualmente: false },
});
await paciente.collection("notasEvolucion").doc("n1").set(nota("n1", "firmada", "Paciente refiere dolor al frío en OD 36. Se indica endodoncia.", "2026-10-02T10:00:00Z"));
await paciente.collection("notasEvolucion").doc("n2").set(nota("n2", "borrador", "BORRADOR PRIVADO (no debe verse)", "2026-10-03T10:00:00Z"));
await paciente.collection("notasEvolucion").doc("n3").set({
  id: "n3", tipo: "administrativa", creadoEn: "2026-10-04T10:00:00Z", motivo: "no_asistio", notaLibre: "NOTA ADMINISTRATIVA PRIVADA",
});
// Comentario y costo privados en las citas de Brenda.
const citas = await db.collection(`users/${uid}/citas`).where("patientId", "==", "p1").get();
await Promise.all(citas.docs.map((d) => d.ref.set({ comentarios: "COMENTARIO PRIVADO DE LA CITA", costo: "$777" }, { merge: true })));

// Fotos: una extraoral y una de INE (esta última nunca debe compartirse).
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2048, 7)]);
const subir = async (carpeta, nombre) => {
  const path = `users/${uid}/pacientes/p1/fotos/${carpeta}/${nombre}`;
  await bucket.file(path).save(JPEG, { contentType: "image/jpeg" });
  return path;
};
await paciente.collection("fotos").doc("datos").set({
  ineFrente: { id: "ine.jpg", url: "u", name: "ine.jpg", fecha: "2026-10-05", path: await subir("ine", "ine.jpg") },
  extraorales: [{ id: "e1.jpg", url: "u", name: "frente.jpg", fecha: "2026-10-03", path: await subir("extraorales", "e1.jpg") }],
  intraorales: [{ id: "i1.jpg", url: "u", name: "oclusal.jpg", fecha: "2026-10-02", path: await subir("intraorales", "i1.jpg") }],
});
console.log("Listo: expediente de prueba de Brenda con datos clínicos y privados.");
process.exit(0);
