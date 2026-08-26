import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/adminAuth";
import { dbAdmin, bucketAdmin } from "@/lib/firebaseAdmin";
import type { PerfilProfesionalPrivado } from "@/lib/moConecta";

type Params = { params: Promise<{ uid: string }> };

/** Proxy de descarga de la evidencia de cédula subida para verificación —
 * mismo criterio que los archivos de interconsultas: nunca una URL, siempre
 * un stream autenticado en el momento de la lectura, y aquí exclusivo del
 * superadministrador. */
export async function GET(req: NextRequest, { params }: Params) {
  const sesion = await verificarAdmin(req);
  if (sesion instanceof NextResponse) return sesion;
  const { uid } = await params;

  const privadoSnap = await dbAdmin.collection("perfilesProfesionalesPrivados").doc(uid).get();
  const storagePath = (privadoSnap.data() as PerfilProfesionalPrivado | undefined)?.evidenciaVerificacionStoragePath;
  if (!storagePath) return NextResponse.json({ error: "No hay evidencia subida para este perfil." }, { status: 404 });

  const [existe] = await bucketAdmin.file(storagePath).exists();
  if (!existe) return NextResponse.json({ error: "El archivo ya no está disponible." }, { status: 404 });

  const [metadata] = await bucketAdmin.file(storagePath).getMetadata();
  const nodeStream = bucketAdmin.file(storagePath).createReadStream();
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": metadata.contentType || "application/octet-stream",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
