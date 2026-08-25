import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { archivoIniciarSchema, archivoSubirSchema } from "@/lib/conectaSchemas";
import { completarSubidaArchivo, iniciarSubidaArchivo } from "@/lib/conectaArchivos";
import { ConectaError } from "@/lib/conectaServer";

type Params = { params: Promise<{ id: string }> };

/** Fase 1 — el servidor decide dónde vivirá el archivo en Storage. */
export async function POST(req: NextRequest, { params }: Params) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await params;

  const parsed = archivoIniciarSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Tipo de archivo no permitido." }, { status: 400 });

  try {
    const resultado = await iniciarSubidaArchivo(sesion.uid, id, parsed.data.mimeType);
    return NextResponse.json(resultado);
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

/** Fase 2 — el cliente manda los bytes completos (base64); el servidor
 * valida la firma real ANTES de escribir a Storage (§6 del plan). */
export async function PATCH(req: NextRequest, { params }: Params) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await params;

  const parsed = archivoSubirSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de subida inválidos.", detalles: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const archivo = await completarSubidaArchivo(sesion.uid, id, parsed.data);
    return NextResponse.json({ archivo });
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
