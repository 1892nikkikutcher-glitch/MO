import jsPDF from "jspdf";
import { cargarImagen } from "./imagenesPdf";

/** Armador de documentos PDF de varias hojas (expediente, estados financieros…): encabezado con logo y
 * clínica, secciones, párrafos, pares etiqueta/valor y tablas que pasan de hoja repitiendo sus títulos.
 * Lo usan todos los PDF "largos"; los recibos y recetas siguen con su propio diseño. */

export type OpcionesPdf = {
  titulo: string;
  subtitulo?: string;
  clinicaNombre?: string;
  direccion?: string;
  logoUrl?: string;
  /** Texto del pie de cada hoja (junto al número de página). */
  pieDePagina?: string;
};

export type ColumnaTabla = { titulo: string; /** Peso relativo del ancho (default 1). */ ancho?: number; alinear?: "izquierda" | "derecha" | "centro" };
export type FilaTabla = string[] | { celdas: string[]; negrita?: boolean; relleno?: boolean };

/** Helvetica (la fuente estándar de PDF) no trae el signo menos ni las flechas: se cambian por lo más cercano. */
export function limpiarTextoPdf(texto: string): string {
  return texto
    .replace(/[−–]/g, "-")
    .replace(/→/g, "->")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[•●]/g, "-");
}

/** Dinero con dos decimales y signo antes del símbolo: $1,250.00 / -$300.00. */
export function dineroPdf(valor: number): string {
  const n = Math.round((Number(valor) || 0) * 100) / 100;
  const texto = Math.abs(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `-$${texto}` : `$${texto}`;
}

export function porcentajePdf(valor: number | null, decimales = 1): string {
  if (valor === null || !Number.isFinite(valor)) return "—";
  return `${(valor * 100).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: decimales })}%`;
}

export function fechaPdf(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** Nombre de archivo seguro (sin acentos, espacios ni símbolos) para descargar. */
export function nombreArchivoPdf(...partes: string[]): string {
  const limpio = partes
    .join("_")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${limpio || "documento"}.pdf`;
}

export class ConstructorPdf {
  private readonly doc: jsPDF;
  private readonly ancho: number;
  private readonly alto: number;
  private readonly margenX = 16;
  private readonly margenInferior = 18;
  private y = 0;
  private readonly opciones: OpcionesPdf;

  constructor(opciones: OpcionesPdf) {
    this.opciones = opciones;
    this.doc = new jsPDF({ unit: "mm", format: "letter" });
    this.ancho = this.doc.internal.pageSize.getWidth();
    this.alto = this.doc.internal.pageSize.getHeight();
  }

  private get anchoUtil() {
    return this.ancho - this.margenX * 2;
  }

  /** Dibuja el encabezado de la primera hoja. Aparte del constructor porque cargar el logo es asíncrono. */
  async encabezado(): Promise<void> {
    const { doc, margenX } = this;
    const logo = this.opciones.logoUrl ? await cargarImagen(this.opciones.logoUrl) : null;
    let y = 16;
    let xTexto = margenX;
    if (logo) {
      const escala = Math.min(22 / logo.ancho, 18 / logo.alto);
      try {
        doc.addImage(logo.dataUri, logo.formato, margenX, y - 2, logo.ancho * escala, logo.alto * escala);
        xTexto = margenX + 26;
      } catch {
        // formato que jsPDF no soporta: el documento sigue siendo válido sin el logo
      }
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(limpiarTextoPdf(this.opciones.titulo), xTexto, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    let yTexto = y + 10;
    if (this.opciones.subtitulo) {
      doc.text(limpiarTextoPdf(this.opciones.subtitulo), xTexto, yTexto);
      yTexto += 5;
    }
    if (this.opciones.clinicaNombre) {
      doc.setTextColor(90);
      doc.text(limpiarTextoPdf(this.opciones.clinicaNombre), xTexto, yTexto);
      doc.setTextColor(0);
      yTexto += 5;
    }
    if (this.opciones.direccion) {
      doc.setFontSize(8.5);
      doc.setTextColor(110);
      const lineas = doc.splitTextToSize(limpiarTextoPdf(this.opciones.direccion), this.ancho - xTexto - margenX);
      doc.text(lineas, xTexto, yTexto);
      yTexto += lineas.length * 4;
      doc.setTextColor(0);
    }
    y = Math.max(yTexto, y + 18) + 2;
    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.line(margenX, y, this.ancho - margenX, y);
    this.y = y + 7;
  }

  /** Si lo que sigue no cabe en lo que resta de la hoja, pasa a otra. */
  private asegurarEspacio(alto: number): void {
    if (this.y + alto > this.alto - this.margenInferior) {
      this.doc.addPage();
      this.y = 16;
    }
  }

  espacio(mm: number): this {
    this.y += mm;
    return this;
  }

  seccion(titulo: string): this {
    this.asegurarEspacio(16);
    const { doc, margenX } = this;
    this.y += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 60, 100);
    doc.text(limpiarTextoPdf(titulo).toUpperCase(), margenX, this.y);
    doc.setTextColor(0);
    this.y += 1.8;
    doc.setDrawColor(150);
    doc.setLineWidth(0.25);
    doc.line(margenX, this.y, this.ancho - margenX, this.y);
    this.y += 5;
    return this;
  }

  subseccion(titulo: string): this {
    this.asegurarEspacio(10);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10);
    this.doc.text(limpiarTextoPdf(titulo), this.margenX, this.y);
    this.y += 5;
    return this;
  }

  parrafo(texto: string, opciones: { negrita?: boolean; tamano?: number; gris?: boolean } = {}): this {
    const { doc, margenX } = this;
    doc.setFont("helvetica", opciones.negrita ? "bold" : "normal");
    const tamano = opciones.tamano ?? 9.5;
    doc.setFontSize(tamano);
    const interlinea = tamano * 0.47;
    const lineas: string[] = doc.splitTextToSize(limpiarTextoPdf(texto), this.anchoUtil);
    if (opciones.gris) doc.setTextColor(110);
    for (const linea of lineas) {
      this.asegurarEspacio(interlinea + 1);
      doc.text(linea, margenX, this.y);
      this.y += interlinea;
    }
    doc.setTextColor(0);
    this.y += 2;
    return this;
  }

  /** Pares etiqueta/valor en columnas. Los vacíos se omiten para no llenar la hoja de "—". */
  pares(filas: [string, string | undefined | null][], columnas: 1 | 2 = 2): this {
    const { doc, margenX } = this;
    const visibles = filas.filter(([, valor]) => valor !== undefined && valor !== null && String(valor).trim() !== "") as [string, string][];
    if (visibles.length === 0) return this;
    const anchoCol = this.anchoUtil / columnas;
    for (let i = 0; i < visibles.length; i += columnas) {
      const grupo = visibles.slice(i, i + columnas);
      const lineasPorCelda = grupo.map(([etiqueta, valor]) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        return doc.splitTextToSize(limpiarTextoPdf(valor), anchoCol - 4) as string[];
      });
      const alto = 4 + Math.max(...lineasPorCelda.map((l) => l.length)) * 4.2;
      this.asegurarEspacio(alto);
      grupo.forEach(([etiqueta], j) => {
        const x = margenX + j * anchoCol;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(110);
        doc.text(limpiarTextoPdf(etiqueta).toUpperCase(), x, this.y);
        doc.setTextColor(0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.text(lineasPorCelda[j], x, this.y + 4.2);
      });
      this.y += alto + 1.5;
    }
    this.y += 1;
    return this;
  }

  tabla(columnas: ColumnaTabla[], filas: FilaTabla[], opciones: { vacio?: string } = {}): this {
    const { doc, margenX } = this;
    if (filas.length === 0) {
      if (opciones.vacio) this.parrafo(opciones.vacio, { gris: true });
      return this;
    }
    const pesoTotal = columnas.reduce((a, c) => a + (c.ancho ?? 1), 0);
    const anchos = columnas.map((c) => ((c.ancho ?? 1) / pesoTotal) * this.anchoUtil);
    const relleno = 1.6;
    const interlinea = 3.8;

    const xDeColumna = (i: number) => margenX + anchos.slice(0, i).reduce((a, b) => a + b, 0);
    const textoEnCelda = (texto: string, i: number) => {
      const c = columnas[i];
      const x = c.alinear === "derecha" ? xDeColumna(i) + anchos[i] - relleno : c.alinear === "centro" ? xDeColumna(i) + anchos[i] / 2 : xDeColumna(i) + relleno;
      return { x, align: c.alinear === "derecha" ? ("right" as const) : c.alinear === "centro" ? ("center" as const) : ("left" as const) };
    };

    const dibujarTitulos = () => {
      this.asegurarEspacio(9);
      doc.setFillColor(232, 237, 244);
      doc.rect(margenX, this.y - 4, this.anchoUtil, 6.6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      columnas.forEach((c, i) => {
        const { x, align } = textoEnCelda(c.titulo, i);
        doc.text(limpiarTextoPdf(c.titulo), x, this.y, { align });
      });
      this.y += 5.2;
    };

    // Una tabla corta se queda entera en la hoja; solo las largas se parten (repitiendo sus títulos).
    if (filas.length <= 14) this.asegurarEspacio(filas.length * 6.5 + 12);
    dibujarTitulos();
    for (const fila of filas) {
      const celdas = Array.isArray(fila) ? fila : fila.celdas;
      const negrita = !Array.isArray(fila) && !!fila.negrita;
      const conRelleno = !Array.isArray(fila) && !!fila.relleno;
      doc.setFont("helvetica", negrita ? "bold" : "normal");
      doc.setFontSize(8.8);
      const lineas = celdas.map((t, i) => doc.splitTextToSize(limpiarTextoPdf(t ?? ""), anchos[i] - relleno * 2) as string[]);
      const alto = Math.max(...lineas.map((l) => l.length)) * interlinea + 2;
      if (this.y + alto > this.alto - this.margenInferior) {
        this.doc.addPage();
        this.y = 16;
        dibujarTitulos();
        doc.setFont("helvetica", negrita ? "bold" : "normal");
        doc.setFontSize(8.8);
      }
      if (conRelleno) {
        doc.setFillColor(244, 246, 250);
        doc.rect(margenX, this.y - 3.6, this.anchoUtil, alto, "F");
      }
      lineas.forEach((l, i) => {
        const { x, align } = textoEnCelda("", i);
        doc.text(l, x, this.y, { align });
      });
      this.y += alto;
      doc.setDrawColor(215);
      doc.setLineWidth(0.15);
      doc.line(margenX, this.y - 3.2, this.ancho - margenX, this.y - 3.2);
    }
    this.y += 4;
    return this;
  }

  /** Pone el pie en todas las hojas (fecha de generación y "Página x de y") y entrega el archivo. */
  finalizar(): Blob {
    const { doc } = this;
    const total = doc.getNumberOfPages();
    const generado = new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(120);
      const pie = this.opciones.pieDePagina ?? "Documento confidencial";
      doc.text(limpiarTextoPdf(`${pie} · Generado ${generado} con MO`), this.margenX, this.alto - 9);
      doc.text(`Página ${p} de ${total}`, this.ancho - this.margenX, this.alto - 9, { align: "right" });
      doc.setTextColor(0);
    }
    return doc.output("blob");
  }

  /** Solo para pruebas: cuántas hojas lleva hasta ahora. */
  get hojas(): number {
    return this.doc.getNumberOfPages();
  }
}

/** Descarga un archivo generado en el navegador. */
export function descargarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
