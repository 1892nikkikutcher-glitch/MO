import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verificarSesion } from "@/lib/adminAuth";
import { esAdminDeClinica } from "@/lib/conectaServer";
import { dbAdmin } from "@/lib/firebaseAdmin";
import { ErrorPac, configuracionPac, timbrarCfdi } from "@/lib/facturamaServer";
import { etiquetaFolio, faltantesFiscales, folioRepetido, formaPagoDeGrupo, type DatosFiscales, type Factura } from "@/lib/facturacion";
import type { PagoRealizado } from "@/lib/pagosRealizados";
import { armarCfdi, faltantesConfigTimbrado, type ConfigTimbrado } from "@/lib/timbrado";

const cuerpoSchema = z.object({
  clinicaId: z.string().trim().min(1).max(200),
  facturaId: z.string().trim().min(1).max(100),
  patientId: z.string().trim().min(1).max(200),
  pagoIds: z.array(z.string().trim().min(1).max(200)).min(1).max(50),
  serie: z.string().trim().max(10).default(""),
  folio: z.string().trim().max(20).default(""),
  notas: z.string().trim().max(1000).default(""),
});

const error = (mensaje: string, estado: number) => NextResponse.json({ error: mensaje }, { status: estado });

/** Timbra ante el SAT (a través del PAC) una factura por los pagos elegidos y la guarda en `facturas`.
 * Todo lo que importa se vuelve a leer aquí desde la base (datos del consultorio, del paciente y los pagos):
 * del navegador solo se aceptan los ids y el folio, nunca montos ni datos fiscales. */
export async function POST(req: NextRequest) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;

  const parsed = cuerpoSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return error("Datos de la factura inválidos.", 400);
  const { clinicaId, facturaId, patientId, pagoIds, serie, folio, notas } = parsed.data;

  if (!(await esAdminDeClinica(sesion.uid, clinicaId))) return error("Solo el administrador de la clínica puede facturar.", 403);
  if (!configuracionPac()) return error("El timbrado todavía no está configurado: faltan las credenciales del PAC en Vercel.", 503);

  const base = dbAdmin.collection("users").doc(clinicaId);

  const clinica = (await dbAdmin.collection("clinics").doc(clinicaId).get()).data() as { rfc?: string; timbrado?: Partial<ConfigTimbrado> } | undefined;
  const faltaConfig = faltantesConfigTimbrado(clinica?.rfc, clinica?.timbrado);
  if (faltaConfig.length > 0) return error(`Faltan datos del consultorio para timbrar: ${faltaConfig.join(", ")}.`, 400);
  const config = clinica!.timbrado as ConfigTimbrado;

  const paciente = (await base.collection("pacientes").doc(patientId).get()).data() as { name?: string; datosFiscales?: DatosFiscales } | undefined;
  if (!paciente) return error("No se encontró al paciente.", 404);
  const faltaPaciente = faltantesFiscales(paciente.datosFiscales);
  if (faltaPaciente.length > 0) return error(`Faltan datos fiscales del paciente: ${faltaPaciente.join(", ")}.`, 400);

  const idsUnicos = [...new Set(pagoIds)];
  const snaps = await Promise.all(idsUnicos.map((id) => base.collection("pagosRealizados").doc(id).get()));
  const pagos = snaps.map((s) => s.data() as PagoRealizado | undefined);
  if (pagos.some((p) => !p || p.patientId !== patientId)) return error("Alguno de los pagos no existe o no es de este paciente.", 400);
  const pagosOk = pagos as PagoRealizado[];

  const existentes = (await base.collection("facturas").get()).docs.map((d) => d.data() as Factura);
  if (existentes.some((f) => f.id === facturaId)) return error("Esa factura ya existe.", 409);
  const vigentes = existentes.filter((f) => f.estado === "emitida");
  if (vigentes.some((f) => f.pagoIds.some((id) => idsUnicos.includes(id)))) return error("Alguno de los pagos ya tiene una factura vigente.", 409);
  if (folio && folioRepetido(vigentes, serie, folio)) return error("Ya existe una factura vigente con ese folio.", 409);

  const armado = armarCfdi({
    serie,
    folio,
    pagos: pagosOk.map((p) => ({ id: p.id, pago: p.pago })),
    receptor: paciente.datosFiscales as DatosFiscales,
    config,
    ahora: new Date(),
  });
  if ("error" in armado) return error(armado.error, 400);

  let timbrado;
  try {
    timbrado = await timbrarCfdi(armado.payload);
  } catch (e) {
    const estado = e instanceof ErrorPac && e.estado >= 400 && e.estado !== 401 ? e.estado : 502;
    return error(e instanceof Error ? e.message : "No se pudo timbrar la factura.", estado);
  }

  const receptor = paciente.datosFiscales as DatosFiscales;
  const factura: Factura = {
    id: facturaId,
    patientId,
    patientName: paciente.name ?? "",
    pagoIds: idsUnicos,
    rfc: receptor.rfc.trim().toUpperCase(),
    razonSocial: receptor.razonSocial.trim(),
    regimenFiscal: receptor.regimenFiscal,
    codigoPostal: receptor.codigoPostal.trim(),
    usoCfdi: receptor.usoCfdi,
    serie,
    folio,
    uuid: timbrado.uuid,
    fecha: (armado.payload.Date as string).slice(0, 10),
    total: timbrado.total || armado.total,
    formaPago: formaPagoDeGrupo(pagosOk),
    estado: "emitida",
    timbrada: true,
    cfdiId: timbrado.cfdiId,
    notas,
    registradaPor: sesion.email ?? "",
    creadoEn: new Date().toISOString(),
  };

  // Ya está timbrada ante el SAT: si guardarla falla, se reintenta y, si sigue fallando, se avisa el folio fiscal
  // para que no se pierda ni se vuelva a timbrar lo mismo.
  let guardada = false;
  for (let intento = 0; intento < 3 && !guardada; intento++) {
    try {
      await base.collection("facturas").doc(facturaId).set(factura);
      guardada = true;
    } catch {
      /* se reintenta */
    }
  }
  if (!guardada) {
    return error(
      `La factura ${etiquetaFolio(factura)} sí se timbró (folio fiscal ${timbrado.uuid}) pero no se pudo guardar en MO. NO la vuelvas a timbrar: regístrala a mano con ese folio fiscal.`,
      500
    );
  }
  return NextResponse.json({ factura });
}
