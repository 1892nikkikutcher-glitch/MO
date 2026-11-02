import { FORMA_PAGO_CASHBACK } from "./cashback";
import { rfcValido, type DatosFiscales } from "./facturacion";
import type { Pago } from "./patientData";

/** Timbrado de facturas (CFDI 4.0) con un PAC. Aquí vive todo lo que NO toca la red: cómo se arma el CFDI a partir
 * de los pagos, cómo se lee la respuesta del PAC y qué datos del consultorio hacen falta. Las llamadas al PAC
 * (con las credenciales, que solo existen en el servidor) están en `facturamaServer.ts`. */

export type TratamientoIva = "noObjeto" | "tasa16";

export const TRATAMIENTOS_IVA: { clave: TratamientoIva; nombre: string; ayuda: string }[] = [
  { clave: "noObjeto", nombre: "Sin IVA (no objeto de impuesto)", ayuda: "El monto cobrado se factura tal cual, sin desglosar IVA." },
  { clave: "tasa16", nombre: "IVA 16% incluido en el precio", ayuda: "El monto cobrado ya trae el IVA: se separa en subtotal + 16%." },
];

/** Datos del consultorio (emisor) que el CFDI necesita además del RFC y el nombre. Se guardan en `clinics/{id}.timbrado`. */
export type ConfigTimbrado = {
  /** Razón social EXACTAMENTE como aparece en la Constancia de Situación Fiscal del consultorio, sin régimen societario. */
  razonSocial: string;
  regimenFiscal: string;
  /** Código postal del domicilio fiscal: es el lugar de expedición. */
  codigoPostal: string;
  /** Clave de producto o servicio del SAT (8 dígitos) para los conceptos. */
  claveProdServ: string;
  tratamientoIva: TratamientoIva;
};

/** 85122001 = «Dentistas» en el catálogo c_ClaveProdServ. Cada consultorio debe confirmar con su contador cuál le corresponde. */
export const CONFIG_TIMBRADO_INICIAL: ConfigTimbrado = {
  razonSocial: "",
  regimenFiscal: "",
  codigoPostal: "",
  claveProdServ: "85122001",
  tratamientoIva: "noObjeto",
};

export function faltantesConfigTimbrado(rfc: string | undefined, c: Partial<ConfigTimbrado> | undefined | null): string[] {
  const f: string[] = [];
  if (!rfc || !rfcValido(rfc)) f.push("RFC del consultorio (Administración → Consultorio)");
  if (!c?.razonSocial?.trim()) f.push("razón social");
  if (!c?.regimenFiscal?.trim()) f.push("régimen fiscal");
  if (!/^\d{5}$/.test(c?.codigoPostal?.trim() ?? "")) f.push("código postal fiscal");
  if (!/^\d{8}$/.test(c?.claveProdServ?.trim() ?? "")) f.push("clave de producto o servicio (8 dígitos)");
  return f;
}

/** Clave SAT (c_FormaPago) de cada forma de pago de MO. `null` = no hay equivalencia (p. ej. cashback). */
export function claveFormaPagoSat(forma: string): string | null {
  switch (forma) {
    case "Efectivo":
      return "01";
    case "Cheque":
      return "02";
    case "Transferencia":
      return "03";
    case "Tarjeta de crédito":
      return "04";
    case "Tarjeta de débito":
      return "28";
    default:
      return null;
  }
}

export type PagoParaCfdi = { id: string; pago: Pick<Pago, "formaPago" | "lineas" | "total"> };

/** Forma de pago del CFDI: la de los pagos; si hay varias, la que más dinero representa. `error` si alguna no tiene clave SAT. */
export function formaPagoDelCfdi(pagos: PagoParaCfdi[]): { clave: string } | { error: string } {
  const porForma = new Map<string, number>();
  for (const p of pagos) {
    if (p.pago.formaPago === FORMA_PAGO_CASHBACK || claveFormaPagoSat(p.pago.formaPago) === null) {
      return { error: `La forma de pago «${p.pago.formaPago}» no tiene clave del SAT. Factura ese pago aparte o regístralo a mano.` };
    }
    porForma.set(p.pago.formaPago, (porForma.get(p.pago.formaPago) ?? 0) + p.pago.total);
  }
  const mayor = [...porForma.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!mayor) return { error: "No hay pagos que facturar." };
  return { clave: claveFormaPagoSat(mayor[0]) as string };
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export type ConceptoCfdi = {
  ProductCode: string;
  Description: string;
  Unit: string;
  UnitCode: string;
  UnitPrice: number;
  Quantity: number;
  Subtotal: number;
  TaxObject: "01" | "02";
  Taxes?: { Total: number; Name: string; Base: number; Rate: number; IsRetention: boolean }[];
  Total: number;
};

/** Un concepto por cada línea del pago; si las líneas no suman el total del pago, un solo concepto por el total. */
export function conceptosDePago(p: PagoParaCfdi): { descripcion: string; monto: number }[] {
  const lineas = p.pago.lineas.filter((l) => l.monto > 0);
  const suma = r2(lineas.reduce((s, l) => s + l.monto, 0));
  if (lineas.length > 0 && Math.abs(suma - r2(p.pago.total)) <= 0.01) {
    return lineas.map((l) => ({ descripcion: l.label.trim() || "Servicio dental", monto: r2(l.monto) }));
  }
  const etiqueta = lineas.map((l) => l.label.trim()).filter(Boolean).join(", ");
  return [{ descripcion: etiqueta || "Servicio dental", monto: r2(p.pago.total) }];
}

export function conceptoCfdi(descripcion: string, monto: number, config: Pick<ConfigTimbrado, "claveProdServ" | "tratamientoIva">): ConceptoCfdi {
  const base = {
    ProductCode: config.claveProdServ,
    Description: descripcion,
    Unit: "Servicio",
    UnitCode: "E48",
    Quantity: 1,
  };
  if (config.tratamientoIva === "tasa16") {
    const subtotal = r2(monto / 1.16);
    const iva = r2(subtotal * 0.16);
    return {
      ...base,
      UnitPrice: subtotal,
      Subtotal: subtotal,
      TaxObject: "02",
      Taxes: [{ Total: iva, Name: "IVA", Base: subtotal, Rate: 0.16, IsRetention: false }],
      Total: r2(subtotal + iva),
    };
  }
  return { ...base, UnitPrice: r2(monto), Subtotal: r2(monto), TaxObject: "01", Total: r2(monto) };
}

/** "AAAA-MM-DDTHH:mm:ss" en hora de la Ciudad de México, dos minutos atrás para no caer en «fecha futura» por diferencia de relojes. */
export function fechaCfdi(ahora: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ahora.getTime() - 2 * 60_000));
  const g = (t: string) => partes.find((x) => x.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}:${g("second")}`;
}

export type SolicitudCfdi = {
  serie: string;
  folio: string;
  pagos: PagoParaCfdi[];
  receptor: DatosFiscales;
  config: ConfigTimbrado;
  ahora: Date;
};

export type CfdiArmado = { payload: Record<string, unknown>; subtotal: number; total: number; claveFormaPago: string };

/** Arma el cuerpo que se manda al PAC (formato de Facturama, API Web `POST /3/cfdis`). El emisor no va en el cuerpo: es el RFC cuyo CSD está cargado en la cuenta del PAC. */
export function armarCfdi(s: SolicitudCfdi): CfdiArmado | { error: string } {
  const forma = formaPagoDelCfdi(s.pagos);
  if ("error" in forma) return forma;
  const items = s.pagos.flatMap((p) => conceptosDePago(p).map((c) => conceptoCfdi(c.descripcion, c.monto, s.config)));
  if (items.length === 0) return { error: "No hay conceptos que facturar." };
  const subtotal = r2(items.reduce((a, i) => a + i.Subtotal, 0));
  const total = r2(items.reduce((a, i) => a + i.Total, 0));
  const payload: Record<string, unknown> = {
    NameId: "1",
    CfdiType: "I",
    PaymentForm: forma.clave,
    PaymentMethod: "PUE",
    ExpeditionPlace: s.config.codigoPostal,
    Currency: "MXN",
    Date: fechaCfdi(s.ahora),
    ...(s.serie.trim() ? { Serie: s.serie.trim() } : {}),
    ...(s.folio.trim() ? { Folio: s.folio.trim() } : {}),
    Receiver: {
      Rfc: s.receptor.rfc.trim().toUpperCase(),
      Name: s.receptor.razonSocial.trim(),
      CfdiUse: s.receptor.usoCfdi,
      FiscalRegime: s.receptor.regimenFiscal,
      TaxZipCode: s.receptor.codigoPostal.trim(),
    },
    Items: items,
  };
  return { payload, subtotal, total, claveFormaPago: forma.clave };
}

export type CfdiTimbrado = { cfdiId: string; uuid: string; total: number; fecha: string };

type RespuestaFacturama = {
  Id?: string;
  Total?: number;
  Date?: string;
  Complement?: { TaxStamp?: { Uuid?: string; Date?: string } };
};

export function leerRespuestaTimbrado(r: unknown): CfdiTimbrado | { error: string } {
  const x = (r ?? {}) as RespuestaFacturama;
  const uuid = x.Complement?.TaxStamp?.Uuid;
  if (!x.Id || !uuid) return { error: "El PAC respondió sin folio fiscal (UUID); revisa la factura en su panel antes de volver a intentar." };
  return { cfdiId: x.Id, uuid, total: typeof x.Total === "number" ? x.Total : 0, fecha: (x.Complement?.TaxStamp?.Date ?? x.Date ?? "").slice(0, 10) };
}

/** Convierte un error del PAC (`{ Message, ModelState: { campo: [mensajes] } }`) en una frase para mostrar. */
export function mensajeErrorPac(cuerpo: unknown, estado: number): string {
  const c = (cuerpo ?? {}) as { Message?: string; ModelState?: Record<string, string[] | string> };
  const detalles = Object.values(c.ModelState ?? {})
    .flat()
    .filter((m): m is string => typeof m === "string" && m.length > 0);
  if (detalles.length > 0) return detalles.join(" · ");
  if (c.Message) return c.Message;
  if (estado === 401) return "El PAC rechazó las credenciales: revisa FACTURAMA_USUARIO y FACTURAMA_CONTRASENA en Vercel.";
  return `El PAC respondió con error ${estado}.`;
}

export const MOTIVOS_CANCELACION_SAT: { clave: "01" | "02" | "03" | "04"; nombre: string; ayuda: string }[] = [
  { clave: "02", nombre: "02 · Comprobante emitido con errores sin relación", ayuda: "La más común: la cancelas y la vuelves a emitir sin relacionarla." },
  { clave: "01", nombre: "01 · Comprobante emitido con errores con relación", ayuda: "Ya emitiste la factura que la sustituye: pega su folio fiscal (UUID)." },
  { clave: "03", nombre: "03 · No se llevó a cabo la operación", ayuda: "El servicio no se realizó." },
  { clave: "04", nombre: "04 · Operación nominativa en la factura global", ayuda: "Solo aplica si la operación estaba en una factura global." },
];

export type EstadoCancelacionPac = "canceled" | "pending" | "active";

export function leerRespuestaCancelacion(r: unknown): { estado: EstadoCancelacionPac; mensaje: string } {
  const x = (r ?? {}) as { Status?: string; Message?: string; IsCancelable?: string };
  const estado: EstadoCancelacionPac = x.Status === "canceled" ? "canceled" : x.Status === "pending" ? "pending" : "active";
  return { estado, mensaje: x.Message || x.IsCancelable || "" };
}
