import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { dbAdmin, bucketAdmin } from "@/lib/firebaseAdmin";
import { evidenciaVerificacionIniciarSchema, evidenciaVerificacionSubirSchema } from "@/lib/conectaSchemas";
import { validarFirmaArchivo, TAMANIO_MAXIMO_ARCHIVO_BYTES } from "@/lib/archivosConecta";
import { nowISO } from "@/lib/conectaServer";

type Params = { params: Promise<{ uid: string }> };

const EXTENSION_POR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

/** Fase 1 — el servidor decide la ruta de Storage donde vivirá la evidencia
 * (nunca la elige el cliente); todavía no se escribe nada. */
export async function POST(req: NextRequest, { params }: Params) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  const { uid } = await params;
  if (uid !== sesion.uid) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const parsed = evidenciaVerificacionIniciarSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Tipo de archivo no permitido." }, { status: 400 });

  const extension = EXTENSION_POR_MIME[parsed.data.mimeType];
  const storagePath = `perfilesProfesionalesPrivados/${uid}/evidencia-verificacion/${randomUUID()}.${extension}`;
  return NextResponse.json({ storagePath });
}

/** Fase 2 — el cliente manda los bytes completos (base64); el servidor
 * valida la firma real del archivo ANTES de escribirlo a Storage con el
 * Admin SDK (§6 del plan: nunca confiar solo en el mimeType declarado). */
export async function PATCH(req: NextRequest, { params }: Params) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  const { uid } = await params;
  if (uid !== sesion.uid) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const parsed = evidenciaVerificacionSubirSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Datos de subida inválidos." }, { status: 400 });
  const { storagePath, mimeType, contenidoBase64 } = parsed.data;

  const prefijoEsperado = `perfilesProfesionalesPrivados/${uid}/evidencia-verificacion/`;
  if (!storagePath.startsWith(prefijoEsperado)) {
    return NextResponse.json({ error: "Ruta de archivo inválida." }, { status: 400 });
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(contenidoBase64, "base64");
  } catch {
    return NextResponse.json({ error: "Contenido de archivo inválido." }, { status: 400 });
  }
  if (bytes.byteLength === 0 || bytes.byteLength > TAMANIO_MAXIMO_ARCHIVO_BYTES) {
    return NextResponse.json({ error: "El archivo excede el tamaño máximo permitido (10 MB)." }, { status: 400 });
  }
  if (!validarFirmaArchivo(bytes, mimeType)) {
    return NextResponse.json({ error: "El contenido del archivo no corresponde al tipo declarado." }, { status: 400 });
  }

  await bucketAdmin.file(storagePath).save(bytes, { contentType: mimeType });

  const privadoRef = dbAdmin.collection("perfilesProfesionalesPrivados").doc(uid);
  await privadoRef.set({ evidenciaVerificacionStoragePath: storagePath }, { merge: true });

  // Evidencia nueva reabre la revisión — evita que quede atorado en
  // "rechazado" si el odontólogo ya corrigió y volvió a subir.
  const publicoRef = dbAdmin.collection("perfilesProfesionalesPublicos").doc(uid);
  const publicoSnap = await publicoRef.get();
  if (publicoSnap.exists && publicoSnap.data()?.estadoVerificacion !== "verificado") {
    await publicoRef.set({ estadoVerificacion: "pendiente", actualizadoEl: nowISO() }, { merge: true });
  }

  return NextResponse.json({ ok: true });
}
