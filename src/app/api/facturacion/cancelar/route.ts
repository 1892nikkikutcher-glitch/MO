import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { verificarSesion } from "@/lib/adminAuth";
import { esAdminDeClinica } from "@/lib/conectaServer";
import { dbAdmin } from "@/lib/firebaseAdmin";
import { ErrorPac, cancelarCfdi, configuracionPac } from "@/lib/facturamaServer";
import { etiquetaFolio, folioFiscalValido, type Factura } from "@/lib/facturacion";
import { MOTIVOS_CANCELACION_SAT } from "@/lib/timbrado";

const cuerpoSchema = z.object({
  clinicaId: z.string().trim().min(1).max(200),
  facturaId: z.string().trim().min(1).max(100),
  motivo: z.enum(["01", "02", "03", "04"]),
  uuidSustitucion: z.string().trim().max(60).default(""),
});

const error = (mensaje: string, estado: number) => NextResponse.json({ error: mensaje }, { status: estado });

/** Cancela ante el SAT una factura que MO timbró. Si el SAT la cancela de inmediato, la factura queda cancelada y sus
 * pagos vuelven a «Por facturar»; si el cliente debe aceptar la cancelación, queda marcada como pendiente. */
export async function POST(req: NextRequest) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;

  const parsed = cuerpoSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return error("Datos de la cancelación inválidos.", 400);
  const { clinicaId, facturaId, motivo, uuidSustitucion } = parsed.data;

  if (!(await esAdminDeClinica(sesion.uid, clinicaId))) return error("Solo el administrador de la clínica puede cancelar facturas.", 403);
  if (!configuracionPac()) return error("El timbrado todavía no está configurado: faltan las credenciales del PAC en Vercel.", 503);
  if (motivo === "01" && !folioFiscalValido(uuidSustitucion)) return error("Con el motivo 01 hay que indicar el folio fiscal (UUID) de la factura que la sustituye.", 400);

  const ref = dbAdmin.collection("users").doc(clinicaId).collection("facturas").doc(facturaId);
  const factura = (await ref.get()).data() as Factura | undefined;
  if (!factura) return error("No se encontró la factura.", 404);
  if (!factura.timbrada || !factura.cfdiId) return error("Esta factura no se timbró desde MO: cancélala en el sistema donde la emitiste.", 400);
  if (factura.estado === "cancelada") return error("La factura ya está cancelada.", 409);

  let resultado;
  try {
    resultado = await cancelarCfdi(factura.cfdiId, motivo, uuidSustitucion);
  } catch (e) {
    const estado = e instanceof ErrorPac && e.estado >= 400 && e.estado !== 401 ? e.estado : 502;
    return error(e instanceof Error ? e.message : "No se pudo cancelar la factura.", estado);
  }

  const nombreMotivo = MOTIVOS_CANCELACION_SAT.find((m) => m.clave === motivo)?.nombre ?? motivo;
  if (resultado.estado === "canceled") {
    await ref.update({
      estado: "cancelada",
      canceladaEn: new Date().toISOString(),
      motivoCancelacion: `SAT · ${nombreMotivo}`,
      cancelacionPendiente: FieldValue.delete(),
    });
  } else if (resultado.estado === "pending") {
    await ref.update({ cancelacionPendiente: true });
  } else {
    return error(`El SAT no canceló la factura ${etiquetaFolio(factura)}${resultado.mensaje ? `: ${resultado.mensaje}` : "."}`, 409);
  }
  return NextResponse.json({ estado: resultado.estado, mensaje: resultado.mensaje });
}
