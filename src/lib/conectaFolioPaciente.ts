/** Envoltura real (crypto + dbAdmin) de la lógica pura de folioPaciente.ts
 * (arquitectura MO Conecta v3, §17) — server-only, nunca se llama desde el
 * cliente.
 *
 * FASE 2 ("solo código y pruebas"): escrita y con `calcularHashFolio`
 * (pura) probada con Vitest; `generarFolioPaciente`/`buscarPorFolio` NO se
 * invocan todavía contra Firestore real — no hay ninguna ruta de API que
 * las llame, y `FOLIO_HMAC_PEPPER` no está configurado en ningún entorno.
 * Ningún folio se genera en producción hasta que eso cambie explícitamente
 * (v3 §21). */

import { Timestamp } from "firebase-admin/firestore";
import { dbAdmin } from "./firebaseAdmin";
import { ConectaError } from "./conectaServer";
import {
  calcularHashFolio,
  normalizarFolio,
  formatoFolioValido,
  generarFolioCrudo,
  resolverFolioPorVersionDeClave,
  type CodigoPaciente,
} from "./folioPaciente";

type ClaveFolioHmac = { version: number; secreto: string };

/** La clave vigente (la de mayor versión) es la única que se usa para
 * GENERAR folios nuevos; cualquier versión anterior que siga autorizada
 * para BUSCAR se agregaría aquí durante una rotación (v3 §17, paso 5) —
 * nunca una clave ya retirada. Hoy solo hay una entrada porque ningún
 * folio real existe todavía. */
function clavesFolioAutorizadas(): ClaveFolioHmac[] {
  const secretoVigente = process.env.FOLIO_HMAC_PEPPER;
  if (!secretoVigente) {
    throw new ConectaError(500, "FOLIO_HMAC_PEPPER no está configurado — no se puede generar ni buscar folios todavía.");
  }
  return [{ version: 1, secreto: secretoVigente }];
}

/** Genera un folio nuevo y lo registra en `codigosPaciente` — el folio
 * crudo se devuelve UNA sola vez, aquí; el servidor nunca vuelve a poder
 * leerlo (v3 §17: "el folio crudo nunca aparece en logs, mensajes de
 * error, ni analítica"). `.create()` (nunca `.set()`) para que una
 * colisión de hash — improbable, pero gratis de comprobar — falle en vez
 * de sobrescribir el folio de otro paciente. */
export async function generarFolioPaciente(pacienteGlobalId: string, expedienteId: string): Promise<string> {
  const [{ version, secreto }] = clavesFolioAutorizadas();
  const folioCrudo = generarFolioCrudo();
  const hash = calcularHashFolio(normalizarFolio(folioCrudo), secreto);

  const doc: CodigoPaciente = {
    pacienteGlobalId,
    expedienteId,
    estado: "activo",
    hmacKeyVersion: version,
    createdAt: Timestamp.now(),
    version: 1,
  };
  try {
    await dbAdmin.collection("codigosPaciente").doc(hash).create(doc);
  } catch {
    // Colisión de hash — nunca se reintenta con el mismo folio crudo:
    // generar uno nuevo desde cero es más simple y no cambia ninguna
    // garantía de seguridad (v3 §17).
    throw new ConectaError(409, "Colisión generando el folio — inténtalo de nuevo.");
  }
  return folioCrudo;
}

/** Búsqueda con el algoritmo de rotación de v3 §17: calcula el hash del
 * folio con CADA clave autorizada en paralelo (nunca secuencial — con una
 * sola versión vigente hoy esto es un único `get()`, y durante una
 * rotación futura sigue siendo rápido), y deja que
 * `resolverFolioPorVersionDeClave` (pura, ya probada) decida cuál cuenta
 * como coincidencia real, en el orden correcto de más reciente a más
 * antigua. Un folio revocado o rotado se trata exactamente igual que uno
 * inexistente — misma forma de respuesta para las tres, nunca revela cuál
 * de ellas es (anti-enumeración, v3 §17). */
export async function buscarPorFolio(folioCrudo: string): Promise<{ codigo: CodigoPaciente; version: number } | null> {
  const folioNormalizado = normalizarFolio(folioCrudo);
  if (!formatoFolioValido(folioNormalizado)) return null;

  const claves = clavesFolioAutorizadas();
  const hashesPorVersion = new Map(claves.map((c) => [c.version, calcularHashFolio(folioNormalizado, c.secreto)] as const));

  const snapshots = await Promise.all(
    claves.map((c) => dbAdmin.collection("codigosPaciente").doc(hashesPorVersion.get(c.version)!).get())
  );
  const activosPorHash = new Map(
    snapshots
      .filter((s) => s.exists && (s.data() as CodigoPaciente).estado === "activo")
      .map((s) => [s.id, s.data() as CodigoPaciente] as const)
  );

  const resultado = resolverFolioPorVersionDeClave(
    folioNormalizado,
    claves.map((c) => c.version),
    (folio, version) => hashesPorVersion.get(version)!,
    (hash) => activosPorHash.get(hash) ?? null
  );
  return resultado ? { codigo: resultado.encontrado, version: resultado.version } : null;
}
