/** Orquestación real (dbAdmin + transacciones/lotes) de la migración de un
 * paciente local hacia el expediente clínico compartido (arquitectura MO
 * Conecta v3, §11) — envuelve la máquina de estados pura de
 * migracionExpedienteEstado.ts. Server-only, nunca se llama desde el
 * cliente.
 *
 * FASE 2 ("solo código y pruebas"): cada función de aquí abajo está escrita
 * y se apoya en lógica pura ya probada con Vitest (puedeContinuarHacia,
 * compararCandidatoPaciente, conciliarDocumentoUnico); ninguna se invoca
 * todavía contra un paciente real — no hay ninguna ruta de API que las
 * llame. Ningún paciente se migra en producción hasta que eso cambie
 * explícitamente (v3 §21).
 *
 * Cada función `avanzarA*` es un paso INDEPENDIENTE y reanudable: relee el
 * documento de migración, valida con `puedeContinuarHacia` si puede seguir
 * (avance fresco o reintento del mismo paso), hace su trabajo, y persiste
 * el nuevo estado — nunca asume que el paso anterior se hizo en la misma
 * invocación de proceso (v3 §11: "retomable en cualquier punto").
 *
 * Diferido a propósito en esta fase (documentado, no olvidado):
 * - Copia de `fotos` — vive en Storage, no en Firestore (v3 §11.2); queda
 *   marcada con error explícito en `progresoPorSeccion`, nunca se da por
 *   completada en silencio.
 * - Recuperación administrativa tras fallo posterior al congelamiento
 *   (v3 §11.4) — el estado `fallido_despues_congelamiento` ya existe en la
 *   máquina pura, pero no hay todavía una ruta de "reanudar" dedicada.
 * - Revisión humana de `VinculacionPosiblePaciente`/conflictos de
 *   conciliación — se generan y persisten los registros, pero no hay UI de
 *   administrador para confirmarlos/descartarlos todavía. */

import { Timestamp } from "firebase-admin/firestore";
import { dbAdmin } from "./firebaseAdmin";
import { ConectaError, sinIndefinidos } from "./conectaServer";
import {
  puedeContinuarHacia,
  type MigracionEstado,
  type MigracionExpediente,
  type ProgresoSeccionMigracion,
} from "./migracionExpedienteEstado";
import { normalizarTelefono, type PacienteGlobal } from "./pacienteGlobal";
import { idRelacionClinica, type RelacionClinica } from "./relacionClinica";
import {
  compararCandidatoPaciente,
  type CandidatoComparable,
  type VinculacionPosiblePaciente,
} from "./vinculacionPosiblePaciente";
import { idParticipacion, type Participacion } from "./participaciones";
import type { ExpedienteClinico } from "./expedienteClinico";
import type { ProcedenciaMigracion } from "./procedenciaMigracion";
import { conciliarDocumentoUnico, idDocumentoRepetibleMigrado } from "./conciliacionMigracion";
import type { Patient } from "./patientData";

// Ver nota de lectura del plan en conciliacionMigracion.ts sobre por qué
// "historiaClinica" es la única sección tratada como documento único.
const SUBCOLECCIONES_REPETIBLES = ["notasEvolucion", "diagnosticos", "planTratamiento", "recetas", "comparativas"] as const;
const SUBCOLECCION_UNICA = "historiaClinica";
const ID_DOC_UNICO = "respuestas";
const SECCION_FOTOS = "fotos";

function refPaciente(clinicaId: string, patientId: string) {
  return dbAdmin.collection("users").doc(clinicaId).collection("pacientes").doc(patientId);
}
function refMigracion(id: string) {
  return dbAdmin.collection("migracionesExpediente").doc(id);
}
export function idMigracion(clinicaOrigenId: string, patientIdOrigen: string): string {
  return `${clinicaOrigenId}_${patientIdOrigen}`;
}

async function leerMigracion(migracionId: string): Promise<MigracionExpediente> {
  const snap = await refMigracion(migracionId).get();
  if (!snap.exists) throw new ConectaError(404, "No existe esa migración.");
  return snap.data() as MigracionExpediente;
}

function validarPuedeContinuar(migracion: MigracionExpediente, destino: MigracionEstado): void {
  if (!puedeContinuarHacia(migracion.estado, destino)) {
    throw new ConectaError(409, `La migración está en "${migracion.estado}", no puede continuar hacia "${destino}".`);
  }
}

async function guardarCambiosMigracion(migracionId: string, cambios: Partial<MigracionExpediente>): Promise<void> {
  await refMigracion(migracionId).set(sinIndefinidos({ ...cambios, actualizadoEl: Timestamp.now() }), { merge: true });
}

// ---------------------------------------------------------------------------
// Paso 1: iniciar — .create() como candado de concurrencia, búsqueda de
// candidatos de identidad (v3 §11.1).
// ---------------------------------------------------------------------------

/** `iniciadoPorUid` se vuelve el responsable principal del expediente
 * canónico (ver `avanzarAPreparando`) — el plan no lo nombra explícitamente
 * porque asume implícito "la clínica remitente", pero crear la
 * participación y el expediente exige un uid concreto, así que se recibe
 * aquí, en el único punto donde de verdad se conoce (igual que
 * `crearInterconsulta(remitenteUid, input)`). */
export async function iniciarMigracion(
  clinicaOrigenId: string,
  patientIdOrigen: string,
  iniciadoPorUid: string
): Promise<MigracionExpediente> {
  const patientSnap = await refPaciente(clinicaOrigenId, patientIdOrigen).get();
  if (!patientSnap.exists) throw new ConectaError(404, "No existe ese paciente en esa clínica.");
  const patient = patientSnap.data() as Patient;

  if (patient.fusionadoEnId) {
    throw new ConectaError(
      409,
      "Este paciente fue fusionado localmente en otro expediente — migra el expediente sobreviviente, nunca este."
    );
  }

  const id = idMigracion(clinicaOrigenId, patientIdOrigen);
  const ahora = Timestamp.now();
  const migracionInicial: MigracionExpediente = {
    id,
    clinicaOrigenId,
    patientIdOrigen,
    iniciadoPorUid,
    estado: "iniciada",
    progresoPorSeccion: {},
    intentos: 1,
    creadoEl: ahora,
    actualizadoEl: ahora,
  };

  const ref = refMigracion(id);
  try {
    await ref.create(migracionInicial);
  } catch {
    // Ya existe — alguien más ganó la carrera de `.create()`, o esto es un
    // reintento legítimo. Nunca se reintroduce la carrera con un get()
    // previo al create() (v3 §11): la comprobación ES el intento real.
    const existente = await ref.get();
    if (existente.exists) return existente.data() as MigracionExpediente;
    throw new ConectaError(500, "No se pudo iniciar ni releer la migración.");
  }

  await buscarYRegistrarCandidatos(clinicaOrigenId, patientIdOrigen, patient);
  return migracionInicial;
}

/** Busca en `pacientesGlobales` por teléfono normalizado (única señal
 * consultable por igualdad, v3 §11.1 histórico) y registra un candidato de
 * revisión por cada coincidencia — nunca fusiona sola. Sin teléfono en el
 * paciente de origen, no hay con qué buscar y no se crea ningún candidato.
 * No recibe `migracionId`: `VinculacionPosiblePaciente` (v3 §3) se
 * relaciona por `clinicaOrigenId`+`patientIdOrigen`, no por migración —
 * `avanzarAPreparando` la busca con ese mismo par. */
async function buscarYRegistrarCandidatos(
  clinicaOrigenId: string,
  patientIdOrigen: string,
  patient: Patient
): Promise<void> {
  if (!patient.phone) return;
  const telefonoNormalizado = normalizarTelefono(patient.phone);
  if (!telefonoNormalizado) return;

  const candidatosSnap = await dbAdmin
    .collection("pacientesGlobales")
    .where("telefonoNormalizado", "==", telefonoNormalizado)
    .get();
  if (candidatosSnap.empty) return;

  const comparable: CandidatoComparable = {
    nombre: patient.name,
    telefonoNormalizado,
    fechaNacimiento: patient.birthDate,
    sexo: patient.sexo,
  };

  for (const candidatoDoc of candidatosSnap.docs) {
    const candidato = candidatoDoc.data() as PacienteGlobal;
    const resultado = compararCandidatoPaciente(comparable, {
      nombre: candidato.nombre,
      telefonoNormalizado: candidato.telefonoNormalizado,
      fechaNacimiento: candidato.fechaNacimiento,
      sexo: candidato.sexo,
    });

    const vinculacionRef = dbAdmin.collection("vinculacionesPosiblesPaciente").doc();
    const vinculacion: VinculacionPosiblePaciente = sinIndefinidos({
      id: vinculacionRef.id,
      pacienteGlobalIdSugerido: candidatoDoc.id,
      clinicaOrigenId,
      patientIdOrigen,
      estado: "sugerido",
      confianza: resultado.confianza,
      evidenciasCoincidentes: resultado.evidenciasCoincidentes,
      evidenciasContradictorias: resultado.evidenciasContradictorias,
      conflictoGrave: resultado.conflictoGrave,
      creadoEl: Timestamp.now(),
    });
    await vinculacionRef.set(vinculacion);
  }
}

// ---------------------------------------------------------------------------
// Paso 2: preparando — crea los documentos canónicos (una sola vez).
// ---------------------------------------------------------------------------

export async function avanzarAPreparando(migracionId: string): Promise<MigracionExpediente> {
  const migracion = await leerMigracion(migracionId);
  validarPuedeContinuar(migracion, "preparando");
  if (!migracion.iniciadoPorUid) throw new ConectaError(500, "La migración no registró quién la inició.");

  const pendientes = await dbAdmin
    .collection("vinculacionesPosiblesPaciente")
    .where("clinicaOrigenId", "==", migracion.clinicaOrigenId)
    .where("patientIdOrigen", "==", migracion.patientIdOrigen)
    .where("estado", "==", "sugerido")
    .get();
  if (!pendientes.empty) {
    throw new ConectaError(409, "Hay candidatos de vinculación sin revisar — confírmalos o descártalos antes de continuar.");
  }

  const confirmada = await dbAdmin
    .collection("vinculacionesPosiblesPaciente")
    .where("clinicaOrigenId", "==", migracion.clinicaOrigenId)
    .where("patientIdOrigen", "==", migracion.patientIdOrigen)
    .where("estado", "==", "confirmado")
    .limit(1)
    .get();

  const expedienteId: string =
    migracion.pacienteGlobalId ??
    (confirmada.docs[0]?.data() as VinculacionPosiblePaciente | undefined)?.pacienteGlobalIdSugerido ??
    dbAdmin.collection("pacientesGlobales").doc().id;

  const iniciadoPorUid = migracion.iniciadoPorUid;
  const patientRef = refPaciente(migracion.clinicaOrigenId, migracion.patientIdOrigen);

  await dbAdmin.runTransaction(async (tx) => {
    const patientSnap = await tx.get(patientRef);
    if (!patientSnap.exists) throw new ConectaError(404, "El paciente de origen ya no existe.");
    const patient = patientSnap.data() as Patient;
    if (patient.expedienteCanonicoId) return; // ya migrado por otra corrida — no-op seguro

    const pacienteGlobalRef = dbAdmin.collection("pacientesGlobales").doc(expedienteId);
    const expedienteRef = dbAdmin.collection("expedientesClinicos").doc(expedienteId);
    const participacionId = idParticipacion(expedienteId, iniciadoPorUid);
    const participacionRef = dbAdmin.collection("participaciones").doc(participacionId);

    // TODAS las lecturas antes de cualquier escritura (mismo patrón que
    // conectaEstado.ts/conectaAcceso.ts) — Firestore lo exige dentro de
    // una transacción.
    const [pacienteGlobalSnap, expedienteSnap, participacionSnap] = await Promise.all([
      tx.get(pacienteGlobalRef),
      tx.get(expedienteRef),
      tx.get(participacionRef),
    ]);

    const ahora = Timestamp.now();

    if (!pacienteGlobalSnap.exists) {
      const pacienteGlobal: PacienteGlobal = sinIndefinidos({
        id: expedienteId,
        nombre: patient.name,
        fechaNacimiento: patient.birthDate,
        sexo: patient.sexo,
        telefonoNormalizado: patient.phone ? normalizarTelefono(patient.phone) : undefined,
        creadoEl: ahora,
        actualizadoEl: ahora,
      });
      tx.set(pacienteGlobalRef, pacienteGlobal);
    }

    if (!expedienteSnap.exists) {
      const expediente: ExpedienteClinico = {
        id: expedienteId,
        responsablePrincipalUid: iniciadoPorUid,
        responsablePrincipalClinicaId: migracion.clinicaOrigenId,
        responsablePrincipalParticipacionId: participacionId,
        responsableDesde: ahora,
        responsabilidadVersion: 1,
        esquemaVersion: 1,
        creadoEl: ahora,
        actualizadoEl: ahora,
      };
      tx.set(expedienteRef, expediente);
    }

    const relacionRef = dbAdmin.collection("relacionesClinica").doc(idRelacionClinica(expedienteId, migracion.clinicaOrigenId));
    const relacion: RelacionClinica = {
      id: relacionRef.id,
      expedienteId,
      clinicaId: migracion.clinicaOrigenId,
      tipoRelacion: "origen_migracion",
      desde: ahora,
      estado: "activa",
    };
    tx.set(relacionRef, relacion, { merge: true });

    if (!participacionSnap.exists) {
      // Sin consentimientoId/solicitudAccesoId/interconsultaId a propósito
      // — esta es la única participación que no nace de la cadena
      // folio→solicitud→consentimiento (v3 §7): es la propia clínica dueña
      // del paciente, nunca alguien accediendo a un expediente ajeno (ver
      // el comentario en participaciones.ts).
      const participacion: Participacion = {
        id: participacionId,
        expedienteId,
        profesionalUid: iniciadoPorUid,
        clinicaId: migracion.clinicaOrigenId,
        rol: "responsable_principal",
        nivelAcceso: "lectura_escritura",
        alcance: "completo",
        desde: ahora,
        estado: "activa",
        createdBy: iniciadoPorUid,
      };
      tx.set(participacionRef, participacion);
    }
  });

  await guardarCambiosMigracion(migracionId, { estado: "preparando", pacienteGlobalId: expedienteId, expedienteId });
  return leerMigracion(migracionId);
}

// ---------------------------------------------------------------------------
// Paso 3/6: copiar subcolecciones clínicas — compartido entre "copiando"
// (primera pasada, origen todavía editable) y "sincronizando_final"
// (segunda pasada incremental, origen ya congelado).
// ---------------------------------------------------------------------------

/** Best-effort: distintas subcolecciones no comparten necesariamente el
 * mismo nombre de campo de fecha — se intentan los más comunes en este
 * proyecto antes de rendirse a "ahora". Nunca bloquea la copia por esto. */
function fechaOriginalDe(datos: FirebaseFirestore.DocumentData): Timestamp {
  const candidato = datos.fecha ?? datos.creadoEl ?? datos.createdAt;
  return candidato instanceof Timestamp ? candidato : Timestamp.now();
}

async function copiarSeccionRepetible(migracion: MigracionExpediente, seccion: string): Promise<ProgresoSeccionMigracion> {
  const { clinicaOrigenId, patientIdOrigen, expedienteId, id: migracionId } = migracion;
  if (!expedienteId) throw new ConectaError(500, "La migración no tiene expedienteId todavía.");

  const origenRef = refPaciente(clinicaOrigenId, patientIdOrigen).collection(seccion);
  const destinoRef = dbAdmin.collection("expedientesClinicos").doc(expedienteId).collection(seccion);

  const origenSnap = await origenRef.get();
  const total = origenSnap.size;
  let copiados = 0;

  const TAMANIO_LOTE = 400; // margen bajo el límite real de 500 escrituras por batch de Firestore
  const docs = origenSnap.docs;
  for (let i = 0; i < docs.length; i += TAMANIO_LOTE) {
    const lote = docs.slice(i, i + TAMANIO_LOTE);
    const batch = dbAdmin.batch();
    for (const doc of lote) {
      const datos = doc.data();
      const idDestino = idDocumentoRepetibleMigrado(migracionId, doc.id);
      const procedencia: ProcedenciaMigracion = {
        origenClinicaId: clinicaOrigenId,
        origenPatientId: patientIdOrigen,
        origenDocumentoId: doc.id,
        migracionId,
        autorOriginalUid: typeof datos.autorUid === "string" ? datos.autorUid : undefined,
        fechaOriginal: fechaOriginalDe(datos),
        importadoEl: Timestamp.now(),
      };
      // El id destino ya incluye migracionId — reintentar un lote ya
      // aplicado es un no-op seguro, nunca duplica (v3 §11.3).
      batch.set(destinoRef.doc(idDestino), sinIndefinidos({ ...datos, ...procedencia, id: idDestino }), { merge: true });
      copiados++;
    }
    await batch.commit();
  }

  return { copiados, total, estado: "completo" };
}

async function copiarSeccionUnica(migracion: MigracionExpediente): Promise<ProgresoSeccionMigracion> {
  const { clinicaOrigenId, patientIdOrigen, expedienteId, id: migracionId } = migracion;
  if (!expedienteId) throw new ConectaError(500, "La migración no tiene expedienteId todavía.");

  const origenRef = refPaciente(clinicaOrigenId, patientIdOrigen).collection(SUBCOLECCION_UNICA).doc(ID_DOC_UNICO);
  const destinoRef = dbAdmin.collection("expedientesClinicos").doc(expedienteId).collection(SUBCOLECCION_UNICA).doc(ID_DOC_UNICO);

  const [origenSnap, destinoSnap] = await Promise.all([origenRef.get(), destinoRef.get()]);
  if (!origenSnap.exists) return { copiados: 0, total: 0, estado: "completo" };

  const destinoDatos = destinoSnap.exists ? (destinoSnap.data() as Partial<ProcedenciaMigracion>) : undefined;
  const conciliacion = conciliarDocumentoUnico(
    destinoDatos?.origenClinicaId && destinoDatos?.migracionId
      ? { origenClinicaId: destinoDatos.origenClinicaId, migracionId: destinoDatos.migracionId }
      : undefined,
    clinicaOrigenId,
    migracionId
  );

  if (conciliacion.tipo === "conflicto") {
    return { copiados: 0, total: 1, estado: "error", error: conciliacion.motivo };
  }
  if (conciliacion.tipo === "ya_migrado_por_esta_clinica") {
    return { copiados: 1, total: 1, estado: "completo" };
  }

  const datos = origenSnap.data()!;
  const procedencia: ProcedenciaMigracion = {
    origenClinicaId: clinicaOrigenId,
    origenPatientId: patientIdOrigen,
    origenDocumentoId: origenSnap.id,
    migracionId,
    fechaOriginal: fechaOriginalDe(datos),
    importadoEl: Timestamp.now(),
  };
  await destinoRef.set(sinIndefinidos({ ...datos, ...procedencia }), { merge: true });
  return { copiados: 1, total: 1, estado: "completo" };
}

async function copiarTodasLasSubcolecciones(migracion: MigracionExpediente): Promise<Record<string, ProgresoSeccionMigracion>> {
  const progreso: Record<string, ProgresoSeccionMigracion> = {};
  progreso[SUBCOLECCION_UNICA] = await copiarSeccionUnica(migracion);
  for (const seccion of SUBCOLECCIONES_REPETIBLES) {
    progreso[seccion] = await copiarSeccionRepetible(migracion, seccion);
  }
  // Diferido a propósito (ver cabecera del archivo) — se deja constancia
  // explícita del pendiente en vez de omitir la sección en silencio, para
  // que avanzarAValidando nunca la dé por completa sin querer.
  progreso[SECCION_FOTOS] = {
    copiados: 0,
    total: 0,
    estado: "error",
    error: "Diferido — la copia de fotos requiere Storage, no implementada en esta fase (v3 §11.2).",
  };
  return progreso;
}

export async function avanzarACopiando(migracionId: string): Promise<MigracionExpediente> {
  const migracion = await leerMigracion(migracionId);
  validarPuedeContinuar(migracion, "copiando");

  const progresoPorSeccion = await copiarTodasLasSubcolecciones(migracion);
  await guardarCambiosMigracion(migracionId, { estado: "copiando", progresoPorSeccion });
  return leerMigracion(migracionId);
}

// ---------------------------------------------------------------------------
// Paso 4: validar — conteos origen vs. destino (fotos queda fuera, ver arriba).
// ---------------------------------------------------------------------------

export async function avanzarAValidando(migracionId: string): Promise<MigracionExpediente> {
  const migracion = await leerMigracion(migracionId);
  validarPuedeContinuar(migracion, "validando");
  if (!migracion.expedienteId) throw new ConectaError(500, "La migración no tiene expedienteId todavía.");

  const secciones: string[] = [SUBCOLECCION_UNICA, ...SUBCOLECCIONES_REPETIBLES];
  const discrepancias: string[] = [];

  for (const seccion of secciones) {
    const progreso = migracion.progresoPorSeccion[seccion];
    if (!progreso || progreso.estado !== "completo") {
      discrepancias.push(`${seccion}: no completada (estado actual: ${progreso?.estado ?? "sin copiar"})`);
      continue;
    }
    if (seccion === SUBCOLECCION_UNICA) continue; // es un solo documento, el conteo no aplica

    const [origenCount, destinoCount] = await Promise.all([
      refPaciente(migracion.clinicaOrigenId, migracion.patientIdOrigen).collection(seccion).count().get(),
      dbAdmin.collection("expedientesClinicos").doc(migracion.expedienteId).collection(seccion).count().get(),
    ]);
    if (origenCount.data().count !== destinoCount.data().count) {
      discrepancias.push(`${seccion}: origen tiene ${origenCount.data().count}, destino tiene ${destinoCount.data().count}`);
    }
  }

  if (discrepancias.length > 0) {
    // Nunca avanza con discrepancias — la migración permanece en su estado
    // actual ("copiando"), lista para reintentarse (v3 §11.3).
    throw new ConectaError(409, `Validación falló: ${discrepancias.join("; ")}`);
  }

  await guardarCambiosMigracion(migracionId, { estado: "validando" });
  return leerMigracion(migracionId);
}

// ---------------------------------------------------------------------------
// Paso 5: congelar — el bloqueo real de escritura clínica local (v3 §9/§12).
// ---------------------------------------------------------------------------

export async function avanzarACongelado(migracionId: string): Promise<MigracionExpediente> {
  const migracion = await leerMigracion(migracionId);
  validarPuedeContinuar(migracion, "congelado");

  // Escritura simple, no transaccional — este ES el punto real de
  // congelamiento: a partir de que se compromete este único campo,
  // escrituraClinicaLocalPermitida (firestore.rules) bloquea al origen.
  await refPaciente(migracion.clinicaOrigenId, migracion.patientIdOrigen).update({
    migracionEstado: "congelado",
  });

  await guardarCambiosMigracion(migracionId, { estado: "congelado" });
  return leerMigracion(migracionId);
}

// ---------------------------------------------------------------------------
// Paso 6: sincronización final — una pasada incremental más, origen ya de
// solo lectura por regla (cero carrera posible).
// ---------------------------------------------------------------------------

export async function avanzarASincronizandoFinal(migracionId: string): Promise<MigracionExpediente> {
  const migracion = await leerMigracion(migracionId);
  validarPuedeContinuar(migracion, "sincronizando_final");

  const progresoPorSeccion = await copiarTodasLasSubcolecciones(migracion);
  await guardarCambiosMigracion(migracionId, { estado: "sincronizando_final", progresoPorSeccion });
  return leerMigracion(migracionId);
}

// ---------------------------------------------------------------------------
// Paso 7: corte final — el paciente local pasa a leer/escribir por el
// expediente canónico.
// ---------------------------------------------------------------------------

export async function avanzarAMigrado(migracionId: string): Promise<MigracionExpediente> {
  const migracion = await leerMigracion(migracionId);
  validarPuedeContinuar(migracion, "migrado");
  if (!migracion.expedienteId) throw new ConectaError(500, "La migración no tiene expedienteId todavía.");

  await dbAdmin.runTransaction(async (tx) => {
    const patientRef = refPaciente(migracion.clinicaOrigenId, migracion.patientIdOrigen);
    const patientSnap = await tx.get(patientRef);
    if (!patientSnap.exists) throw new ConectaError(404, "El paciente de origen ya no existe.");
    tx.update(patientRef, { expedienteCanonicoId: migracion.expedienteId, migracionEstado: "migrado" });
  });

  await guardarCambiosMigracion(migracionId, { estado: "migrado" });
  return leerMigracion(migracionId);
}
