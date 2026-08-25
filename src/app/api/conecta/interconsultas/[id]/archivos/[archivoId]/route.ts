import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { bucketAdmin } from "@/lib/firebaseAdmin";
import { autorizarDescargaArchivo } from "@/lib/conectaArchivos";
import { ConectaError } from "@/lib/conectaServer";

type Params = { params: Promise<{ id: string; archivoId: string }> };

function contentDisposition(nombreOriginalSaneado: string): string {
  const asciiFallback = nombreOriginalSaneado.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  const utf8 = encodeURIComponent(nombreOriginalSaneado);
  return `inline; filename="${asciiFallback}"; filename*=UTF-8''${utf8}`;
}

/** Proxy autenticado de descarga — NUNCA una URL firmada. Revisa
 * participante en el momento exacto de esta petición (§6 del plan): revocar
 * a alguien corta su siguiente intento de descarga de inmediato, sin
 * depender de un token/URL residual. */
export async function GET(req: NextRequest, { params }: Params) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  const { id, archivoId } = await params;

  try {
    const descarga = await autorizarDescargaArchivo(sesion.uid, id, archivoId);
    const [existeEnStorage] = await bucketAdmin.file(descarga.storagePath).exists();
    if (!existeEnStorage) {
      return NextResponse.json({ error: "El archivo ya no está disponible." }, { status: 404 });
    }

    const nodeStream = bucketAdmin.file(descarga.storagePath).createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": descarga.mimeType,
        "Content-Disposition": contentDisposition(descarga.nombreOriginalSaneado),
        "Referrer-Policy": "no-referrer",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
