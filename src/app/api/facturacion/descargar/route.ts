import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { esAdminDeClinica } from "@/lib/conectaServer";
import { dbAdmin } from "@/lib/firebaseAdmin";
import { ErrorPac, configuracionPac, descargarCfdi } from "@/lib/facturamaServer";
import { etiquetaFolio, type Factura } from "@/lib/facturacion";

const error = (mensaje: string, estado: number) => NextResponse.json({ error: mensaje }, { status: estado });

/** Entrega el PDF o el XML de una factura timbrada desde MO. Solo el administrador de la clínica. */
export async function GET(req: NextRequest) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;

  const clinicaId = req.nextUrl.searchParams.get("clinicaId") ?? "";
  const facturaId = req.nextUrl.searchParams.get("facturaId") ?? "";
  const formato = req.nextUrl.searchParams.get("formato");
  if (!clinicaId || !facturaId || (formato !== "pdf" && formato !== "xml")) return error("Datos inválidos.", 400);

  if (!(await esAdminDeClinica(sesion.uid, clinicaId))) return error("Solo el administrador de la clínica puede descargar facturas.", 403);
  if (!configuracionPac()) return error("El timbrado todavía no está configurado: faltan las credenciales del PAC en Vercel.", 503);

  const factura = (await dbAdmin.collection("users").doc(clinicaId).collection("facturas").doc(facturaId).get()).data() as Factura | undefined;
  if (!factura?.cfdiId) return error("Esta factura no se timbró desde MO, así que no hay archivo que descargar.", 404);

  try {
    const archivo = await descargarCfdi(factura.cfdiId, formato);
    const nombre = `factura-${etiquetaFolio(factura).replace(/[^A-Za-z0-9_-]/g, "") || factura.id}.${formato}`;
    return new NextResponse(new Uint8Array(archivo), {
      headers: {
        "Content-Type": formato === "pdf" ? "application/pdf" : "application/xml",
        "Content-Disposition": `attachment; filename="${nombre}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const estado = e instanceof ErrorPac && e.estado >= 400 && e.estado !== 401 ? e.estado : 502;
    return error(e instanceof Error ? e.message : "No se pudo descargar el archivo.", estado);
  }
}
