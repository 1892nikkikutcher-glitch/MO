/** Búsqueda protegida por folio (arquitectura MO Conecta v3, §7/§15.2
 * histórico) — el primer eslabón de la cadena: conocer el folio nunca
 * revela nada, solo permite pedir acceso (o, si ya hay participación
 * vigente, ir directo a abrir sesión). Server-only.
 *
 * FASE 3 ("solo código y pruebas"): escrita, sin ninguna ruta de API que
 * la invoque — nadie puede buscar un folio real en producción todavía. */

import { Timestamp } from "firebase-admin/firestore";
import { dbAdmin } from "./firebaseAdmin";
import { ConectaError, aplicarRateLimit, sinIndefinidos } from "./conectaServer";
import { buscarPorFolio } from "./conectaFolioPaciente";
import { idParticipacion, participacionVigente, type Participacion } from "./participaciones";
import { registrarEventoExpediente } from "./conectaEventosExpediente";
import type { IntentoBusquedaFolio } from "./intentoBusquedaFolio";

export type ResultadoBusquedaFolio =
  | { tipo: "no_encontrado" }
  | { tipo: "acceso_ya_vigente"; expedienteId: string }
  | { tipo: "protegido"; expedienteId: string };

/** 20 intentos / 60 min por solicitante — mismo orden de magnitud que
 * `invitacion_reclamar` (30/60), algo más estricto porque aquí el costo de
 * un acierto es mayor (localiza un expediente clínico real). La defensa
 * principal contra fuerza bruta es este límite, no solo el HMAC (v3 §17). */
const LIMITE_INTENTOS = 20;
const VENTANA_MINUTOS = 60;

export async function buscarFolioProtegido(solicitanteUid: string, folioCrudo: string): Promise<ResultadoBusquedaFolio> {
  const permitido = await aplicarRateLimit(`folio_buscado_${solicitanteUid}`, LIMITE_INTENTOS, VENTANA_MINUTOS);
  if (!permitido) throw new ConectaError(429, "Demasiados intentos — espera antes de volver a intentar.");

  const resultado = await buscarPorFolio(folioCrudo);
  await registrarIntento(solicitanteUid, resultado?.codigo.expedienteId);

  if (!resultado) return { tipo: "no_encontrado" };
  const { expedienteId } = resultado.codigo;

  await registrarEventoExpediente(expedienteId, { tipo: "folio_buscado", uid: solicitanteUid });

  const participacionSnap = await dbAdmin
    .collection("participaciones")
    .doc(idParticipacion(expedienteId, solicitanteUid))
    .get();
  if (participacionSnap.exists) {
    const participacion = participacionSnap.data() as Participacion;
    if (participacionVigente(participacion, Timestamp.now())) {
      return { tipo: "acceso_ya_vigente", expedienteId };
    }
  }

  // Nunca nombre, responsable, ni ningún dato clínico — encontrar el folio
  // nunca revela más que "existe y está protegido" (v3 §15.2 histórico).
  return { tipo: "protegido", expedienteId };
}

async function registrarIntento(solicitanteUid: string, expedienteId: string | undefined): Promise<void> {
  const ref = dbAdmin.collection("intentosBusquedaFolio").doc();
  const intento: IntentoBusquedaFolio = sinIndefinidos({
    id: ref.id,
    solicitanteUid,
    resultado: expedienteId ? "encontrado" : "no_encontrado",
    expedienteId,
    fecha: Timestamp.now(),
  });
  await ref.set(intento);
}
