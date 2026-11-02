/** Facturación: datos fiscales del paciente, pagos que están pendientes de facturar y el registro de las facturas que
 * ya se emitieron. MO no timbra ante el SAT: la factura se emite en el sistema del contador o del proveedor de
 * facturación del consultorio y aquí se registra (serie, folio, folio fiscal y total) para que cada pago quede
 * ligado a su factura. Lógica pura: las pantallas solo guardan lo que aquí se calcula. */

import { fechaPagoAIso } from "./metas";
import type { PagoRealizado } from "./pagosRealizados";

export type DatosFiscales = {
  rfc: string;
  razonSocial: string;
  /** Clave del SAT, ej. "612". */
  regimenFiscal: string;
  /** Código postal del domicilio fiscal. */
  codigoPostal: string;
  /** Clave del SAT, ej. "D01". */
  usoCfdi: string;
  /** Correo al que se le envía la factura. */
  correo: string;
};

export const DATOS_FISCALES_VACIOS: DatosFiscales = { rfc: "", razonSocial: "", regimenFiscal: "", codigoPostal: "", usoCfdi: "D01", correo: "" };

export const REGIMENES_FISCALES: { clave: string; nombre: string }[] = [
  { clave: "601", nombre: "General de Ley Personas Morales" },
  { clave: "603", nombre: "Personas Morales con Fines no Lucrativos" },
  { clave: "605", nombre: "Sueldos y Salarios e Ingresos Asimilados a Salarios" },
  { clave: "606", nombre: "Arrendamiento" },
  { clave: "607", nombre: "Enajenación o Adquisición de Bienes" },
  { clave: "608", nombre: "Demás ingresos" },
  { clave: "610", nombre: "Residentes en el Extranjero sin Establecimiento Permanente en México" },
  { clave: "611", nombre: "Ingresos por Dividendos" },
  { clave: "612", nombre: "Personas Físicas con Actividades Empresariales y Profesionales" },
  { clave: "614", nombre: "Ingresos por intereses" },
  { clave: "615", nombre: "Régimen de los ingresos por obtención de premios" },
  { clave: "616", nombre: "Sin obligaciones fiscales" },
  { clave: "620", nombre: "Sociedades Cooperativas de Producción" },
  { clave: "621", nombre: "Incorporación Fiscal" },
  { clave: "622", nombre: "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras" },
  { clave: "623", nombre: "Opcional para Grupos de Sociedades" },
  { clave: "624", nombre: "Coordinados" },
  { clave: "625", nombre: "Actividades Empresariales con ingresos a través de Plataformas Tecnológicas" },
  { clave: "626", nombre: "Régimen Simplificado de Confianza" },
];

export const USOS_CFDI: { clave: string; nombre: string }[] = [
  { clave: "D01", nombre: "Honorarios médicos, dentales y gastos hospitalarios" },
  { clave: "D02", nombre: "Gastos médicos por incapacidad o discapacidad" },
  { clave: "G03", nombre: "Gastos en general" },
  { clave: "S01", nombre: "Sin efectos fiscales" },
  { clave: "CP01", nombre: "Pagos" },
];

export function nombreRegimen(clave: string): string {
  const r = REGIMENES_FISCALES.find((x) => x.clave === clave);
  return r ? `${r.clave} · ${r.nombre}` : clave;
}

export function nombreUsoCfdi(clave: string): string {
  const u = USOS_CFDI.find((x) => x.clave === clave);
  return u ? `${u.clave} · ${u.nombre}` : clave;
}

/** RFC de persona física (13 caracteres) o moral (12), más los genéricos del SAT (público en general y extranjeros). */
export function rfcValido(rfc: string): boolean {
  return /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc.trim().toUpperCase());
}

/** Folio fiscal (UUID) del CFDI: 8-4-4-4-12 caracteres hexadecimales. */
export function folioFiscalValido(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid.trim());
}

/** Qué le falta a los datos fiscales para poder facturar (vacío = completos). */
export function faltantesFiscales(d: Partial<DatosFiscales> | undefined | null): string[] {
  const faltan: string[] = [];
  if (!d?.rfc?.trim()) faltan.push("RFC");
  else if (!rfcValido(d.rfc)) faltan.push("RFC válido");
  if (!d?.razonSocial?.trim()) faltan.push("nombre o razón social");
  if (!d?.regimenFiscal?.trim()) faltan.push("régimen fiscal");
  if (!d?.codigoPostal || !/^\d{5}$/.test(d.codigoPostal.trim())) faltan.push("código postal fiscal");
  if (!d?.usoCfdi?.trim()) faltan.push("uso de CFDI");
  return faltan;
}

export type EstadoFactura = "emitida" | "cancelada";

export type Factura = {
  id: string;
  patientId: string;
  patientName: string;
  /** Pagos que cubre esta factura (ids de `Pago`). */
  pagoIds: string[];
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  codigoPostal: string;
  usoCfdi: string;
  serie: string;
  folio: string;
  /** Folio fiscal (UUID) que asigna el SAT al timbrar; puede quedar vacío. */
  uuid: string;
  /** Fecha ISO (AAAA-MM-DD) de la factura. */
  fecha: string;
  total: number;
  /** Forma de pago de los cobros que cubre ("Efectivo", "Tarjeta"…), o "Varias". */
  formaPago: string;
  estado: EstadoFactura;
  /** Solo si se canceló. */
  canceladaEn?: string;
  motivoCancelacion?: string;
  /** true cuando MO la timbró ante el SAT a través del PAC (el folio fiscal ya es real); ausente = registro manual. */
  timbrada?: boolean;
  /** Id del CFDI en el PAC: con él se descargan el PDF/XML y se cancela. */
  cfdiId?: string;
  /** Se pidió la cancelación ante el SAT pero el cliente aún debe aceptarla. */
  cancelacionPendiente?: boolean;
  notas: string;
  registradaPor: string;
  creadoEn: string;
};

export type PagoPendienteDeFacturar = {
  registro: PagoRealizado;
  /** Fecha del pago en ISO. */
  fechaISO: string;
  /** Días que han pasado desde el pago. */
  dias: number;
};

function diasEntre(desdeISO: string, hoy: Date): number {
  const [a, m, d] = desdeISO.split("-").map(Number);
  const inicio = new Date(a, m - 1, d);
  const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((fin.getTime() - inicio.getTime()) / 86_400_000);
}

/** Ids de los pagos que ya tienen una factura vigente (una factura cancelada libera sus pagos). */
export function pagosYaFacturados(facturas: Factura[]): Set<string> {
  const ids = new Set<string>();
  for (const f of facturas) if (f.estado !== "cancelada") f.pagoIds.forEach((id) => ids.add(id));
  return ids;
}

/** Pagos marcados «Activo para facturar» que todavía no tienen factura, del más antiguo al más reciente. */
export function pagosPendientesDeFacturar(realizados: PagoRealizado[], facturas: Factura[], hoy: Date): PagoPendienteDeFacturar[] {
  const facturados = pagosYaFacturados(facturas);
  return realizados
    .filter((r) => r.pago.facturar && !facturados.has(r.pago.id))
    .map((registro) => {
      const fechaISO = fechaPagoAIso(registro.pago.fecha) ?? "";
      return { registro, fechaISO, dias: fechaISO ? diasEntre(fechaISO, hoy) : 0 };
    })
    .sort((a, b) => a.fechaISO.localeCompare(b.fechaISO));
}

export function totalDePagos(pagos: { pago: { total: number } }[]): number {
  return Math.round(pagos.reduce((s, p) => s + (Number(p.pago.total) || 0), 0) * 100) / 100;
}

/** Forma de pago de un grupo de cobros: la de todos si coinciden, o "Varias". */
export function formaPagoDeGrupo(pagos: { pago: { formaPago: string } }[]): string {
  const formas = [...new Set(pagos.map((p) => p.pago.formaPago).filter(Boolean))];
  return formas.length === 1 ? formas[0] : formas.length === 0 ? "" : "Varias";
}

/** El siguiente folio de una serie: el mayor folio numérico que ya existe + 1 (o "1"). */
export function siguienteFolio(facturas: Factura[], serie: string): string {
  let mayor = 0;
  for (const f of facturas) {
    if (f.serie.trim().toUpperCase() !== serie.trim().toUpperCase()) continue;
    const n = parseInt(f.folio, 10);
    if (Number.isFinite(n) && n > mayor) mayor = n;
  }
  return String(mayor + 1);
}

/** ¿Ya existe una factura vigente con esa serie y folio? Sirve para no repetir un número. */
export function folioRepetido(facturas: Factura[], serie: string, folio: string, ignorarId?: string): boolean {
  const s = serie.trim().toUpperCase();
  const f = folio.trim();
  if (!f) return false;
  return facturas.some((x) => x.id !== ignorarId && x.estado !== "cancelada" && x.serie.trim().toUpperCase() === s && x.folio.trim() === f);
}

export type FiltroFacturas = { texto: string; desde: string; hasta: string; serie: string; estado: "todas" | EstadoFactura };

function normalizar(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function etiquetaFolio(f: Pick<Factura, "serie" | "folio">): string {
  return [f.serie, f.folio].filter(Boolean).join("-") || "(sin folio)";
}

/** Busca por folio, paciente, RFC, razón social o folio fiscal; filtra por fechas, serie y estado. Más recientes primero. */
export function filtrarFacturas(facturas: Factura[], filtro: FiltroFacturas): Factura[] {
  const q = normalizar(filtro.texto.trim());
  return facturas
    .filter((f) => {
      if (filtro.estado !== "todas" && f.estado !== filtro.estado) return false;
      if (filtro.desde && f.fecha < filtro.desde) return false;
      if (filtro.hasta && f.fecha > filtro.hasta) return false;
      if (filtro.serie && f.serie !== filtro.serie) return false;
      if (!q) return true;
      return normalizar([etiquetaFolio(f), f.patientName, f.rfc, f.razonSocial, f.uuid].join(" ")).includes(q);
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn));
}

export function resumenFacturas(facturas: Factura[]): { emitidas: number; totalFacturado: number; canceladas: number; totalCancelado: number } {
  const vigentes = facturas.filter((f) => f.estado !== "cancelada");
  const canceladas = facturas.filter((f) => f.estado === "cancelada");
  const suma = (l: Factura[]) => Math.round(l.reduce((s, f) => s + (Number(f.total) || 0), 0) * 100) / 100;
  return { emitidas: vigentes.length, totalFacturado: suma(vigentes), canceladas: canceladas.length, totalCancelado: suma(canceladas) };
}

/** Series que se han usado, para el filtro. */
export function seriesUsadas(facturas: Factura[]): string[] {
  return [...new Set(facturas.map((f) => f.serie).filter(Boolean))].sort();
}

export const ENCABEZADOS_CSV_FACTURAS = ["Serie", "Folio", "Folio fiscal", "Fecha", "Paciente", "RFC", "Razón social", "Régimen fiscal", "C.P.", "Uso CFDI", "Forma de pago", "Total", "Estado"];

export function filasCsvFacturas(facturas: Factura[]): (string | number)[][] {
  return facturas.map((f) => [
    f.serie, f.folio, f.uuid, f.fecha, f.patientName, f.rfc, f.razonSocial, f.regimenFiscal, f.codigoPostal, f.usoCfdi, f.formaPago, f.total, f.estado === "cancelada" ? "Cancelada" : "Emitida",
  ]);
}

function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d) return iso;
  return new Date(a, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

/** Mensaje de WhatsApp para pedirle al paciente lo que se necesita para facturarle. */
export function mensajeSolicitarDatosFiscales(args: { clinica: string; paciente: string; faltan: string[] }): string {
  const primer = args.paciente.trim().split(/\s+/)[0] ?? "";
  const lista = args.faltan.length > 0 ? args.faltan : ["RFC", "nombre o razón social", "régimen fiscal", "código postal fiscal", "uso de CFDI"];
  return (
    `Hola${primer ? ` ${primer}` : ""}, te escribimos ${args.clinica ? `de ${args.clinica}` : "del consultorio"}. Para emitir tu factura necesitamos tus datos fiscales: ` +
    `${lista.join(", ")}.\n\nLo más fácil es que nos mandes una foto o PDF de tu Constancia de Situación Fiscal (la descargas del SAT). ¡Gracias!`
  );
}

/** Mensaje de WhatsApp para avisarle al paciente que su factura ya está lista. */
export function mensajeFacturaLista(args: { clinica: string; factura: Pick<Factura, "serie" | "folio" | "fecha" | "total" | "patientName"> }): string {
  const primer = args.factura.patientName.trim().split(/\s+/)[0] ?? "";
  const total = args.factura.total.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  return (
    `Hola${primer ? ` ${primer}` : ""}, te escribimos ${args.clinica ? `de ${args.clinica}` : "del consultorio"}. Ya emitimos tu factura ${etiquetaFolio(args.factura)} ` +
    `del ${fechaLarga(args.factura.fecha)} por ${total}. Te la compartimos por este medio (PDF y XML). ¡Gracias por tu confianza!`
  );
}
