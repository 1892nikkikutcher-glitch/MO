/** Lee la lista de precios que el odontólogo ya tiene en un documento de Office (Excel .xlsx/.xls o Word .docx) o en
 * texto delimitado (.csv/.txt) y la convierte en tratamientos con precio, sin que tenga que reacomodar nada: las columnas
 * se reconocen por su encabezado en cualquier orden, y los renglones de título ("ORTODONCIA") se toman como la especialidad
 * de lo que sigue. También clasifica cada renglón contra el catálogo de la clínica para no duplicar ni pisar nada.
 * Lógica pura: sin React ni Firestore. */

import * as XLSX from "xlsx";
import { unzipSync } from "fflate";
import { decodificarBuffer, detectarDelimitador, parseDelimitado } from "./importPacientes";
import { especialidadesPredefinidas, type Procedimiento } from "./procedimientos";
import { similitudNombres } from "./importarCatalogoRecomendado";

export type FilaPrecio = {
  nombre: string;
  precio: number;
  especialidad: string;
  /** Solo si el documento trae una columna de duración. */
  duracionMinutos?: number;
};

export type ResultadoListaPrecios = { filas: FilaPrecio[]; avisos: string[] };

const ESPECIALIDAD_POR_DEFECTO = "Odontología General";
const MAX_FILAS = 500;
const DURACION_POR_DEFECTO = 30;

const DIACRITICOS = /[̀-ͯ]/g;
function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(DIACRITICOS, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- Precios y nombres ----------

/** "$1,200.00", "1200", "1.200,50", "$ 850 MXN" → número. Null si no parece un precio. */
export function parsePrecio(valor: string): number | null {
  const limpio = valor
    .replace(/mxn|m\.n\.|pesos?/gi, "")
    .replace(/\$/g, "")
    .replace(/\s/g, "");
  if (!/^\d[\d.,]*$/.test(limpio)) return null;
  const tienePunto = limpio.includes(".");
  const tieneComa = limpio.includes(",");
  let n = limpio;
  if (tienePunto && tieneComa) {
    // El último separador es el decimal; el otro agrupa miles.
    n = limpio.lastIndexOf(".") > limpio.lastIndexOf(",") ? limpio.replace(/,/g, "") : limpio.replace(/\./g, "").replace(",", ".");
  } else if (tieneComa) {
    n = /^\d{1,3}(,\d{3})+$/.test(limpio) ? limpio.replace(/,/g, "") : limpio.replace(",", ".");
  } else if (tienePunto && /^\d{1,3}(\.\d{3})+$/.test(limpio)) {
    n = limpio.replace(/\./g, "");
  }
  const numero = Number(n);
  return Number.isFinite(numero) ? Math.round(numero * 100) / 100 : null;
}

function limpiarNombre(texto: string): string {
  let s = texto.replace(/\s+/g, " ").trim().replace(/^[-•*·]\s*/, "");
  // Un nombre todo en mayúsculas se pasa a "Limpieza dental".
  if (s.length > 3 && /[A-ZÁÉÍÓÚÑ]/.test(s) && s === s.toUpperCase()) s = s.charAt(0) + s.slice(1).toLowerCase();
  return s;
}

function resolverEspecialidad(texto: string): string {
  const t = normalizar(texto);
  if (!t) return ESPECIALIDAD_POR_DEFECTO;
  const conocida = especialidadesPredefinidas.find((e) => {
    const n = normalizar(e);
    return n === t || (t.length >= 5 && (n.startsWith(t) || n.endsWith(t)));
  });
  if (conocida) return conocida;
  const limpio = limpiarNombre(texto);
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

// ---------- Encabezados ----------

type TipoColumna = "nombre" | "precio" | "especialidad" | "duracion" | "ignorar";

const EXCLUIR_PRECIO = /\b(odontologo|doctor|medico|interno|laboratorio|comision|insumos?|material(es)?|promocion(al)?|descuento|produccion|aseguradora|seguro)\b/;

function tipoDeEncabezado(encabezado: string): TipoColumna {
  const h = normalizar(encabezado);
  if (!h) return "ignorar";
  // «Grupo tratamiento», «Tipo costo tratamiento», «Clasificación»: agrupan, no son ni el nombre ni el precio.
  if (/\b(grupo|tipo|clasificacion|categoria|area|rubro|familia|departamento|especialidad)\b/.test(h)) return "especialidad";
  if (/\b(codigo|clave|folio|numero|eventos?)\b/.test(h)) return "ignorar";
  if (/\b(precio|costo|importe|tarifa|monto|cuota|honorarios)\b/.test(h)) return EXCLUIR_PRECIO.test(h) ? "ignorar" : "precio";
  if (/\b(tratamientos?|procedimientos?|conceptos?|servicios?|descripcion|nombre)\b/.test(h)) return "nombre";
  if (/\b(duracion|tiempo|minutos)\b/.test(h)) return "duracion";
  return "ignorar";
}

function buscarEncabezado(matriz: string[][]): { fila: number; tipos: TipoColumna[] } | null {
  for (let i = 0; i < Math.min(matriz.length, 20); i++) {
    const tipos = matriz[i].map(tipoDeEncabezado);
    if (tipos.includes("nombre") && tipos.includes("precio")) return { fila: i, tipos };
  }
  return null;
}

/** Sin encabezados: el nombre es la columna con más texto y el precio la que más veces parece un precio. */
function adivinarColumnas(matriz: string[][]): { nombre: number; precio: number } | null {
  const columnas = Math.max(0, ...matriz.map((f) => f.length));
  let mejorNombre = { col: -1, cuenta: 0 };
  let mejorPrecio = { col: -1, cuenta: 0 };
  for (let c = 0; c < columnas; c++) {
    let texto = 0;
    let precios = 0;
    for (const fila of matriz.slice(0, 60)) {
      const v = (fila[c] ?? "").trim();
      if (!v) continue;
      if (parsePrecio(v) !== null) precios++;
      else if (/[a-záéíóúñ]/i.test(v)) texto++;
    }
    if (texto > mejorNombre.cuenta) mejorNombre = { col: c, cuenta: texto };
    if (precios > mejorPrecio.cuenta) mejorPrecio = { col: c, cuenta: precios };
  }
  if (mejorNombre.col < 0 || mejorPrecio.col < 0 || mejorNombre.col === mejorPrecio.col) return null;
  return { nombre: mejorNombre.col, precio: mejorPrecio.col };
}

// ---------- De una tabla de celdas a tratamientos ----------

type Contexto = { especialidadInicial?: string };
type Lectura = { filas: FilaPrecio[]; sinPrecio: number; repetidos: number; avisos: string[] };

export function filasDeMatriz(matriz: string[][], contexto: Contexto = {}): Lectura {
  const avisos: string[] = [];
  const encabezado = buscarEncabezado(matriz);
  let idxNombre: number;
  let idxPrecio: number;
  let idxEspecialidad = -1;
  let idxDuracion = -1;
  let primeraDeDatos = 0;

  if (encabezado) {
    const { tipos, fila } = encabezado;
    primeraDeDatos = fila + 1;
    const datos = matriz.slice(primeraDeDatos);
    const indicesDe = (tipo: TipoColumna) => tipos.flatMap((t, i) => (t === tipo ? [i] : []));
    const encabezadoNormalizado = (i: number) => normalizar(matriz[fila][i] ?? "");

    // El nombre: la columna que se llama «Nombre …»; si no hay, la primera de tratamiento/concepto/servicio.
    const nombres = indicesDe("nombre");
    idxNombre = nombres.find((i) => /\bnombre\b/.test(encabezadoNormalizado(i))) ?? nombres[0];

    // El precio: si el documento trae varias columnas de dinero, la que de verdad trae precios (los renglones en $0 no
    // cuentan: «Precio paciente» suele venir vacío mientras el precio real está en «Costo tratamiento»).
    const conPrecio = (i: number) => datos.filter((f) => (parsePrecio((f[i] ?? "").trim()) ?? 0) > 0).length;
    const precios = indicesDe("precio").map((i) => ({
      i,
      cuenta: conPrecio(i),
      preferida: /\b(paciente|publico)\b/.test(encabezadoNormalizado(i)) ? 1 : 0,
    }));
    precios.sort((a, b) => b.cuenta - a.cuenta || b.preferida - a.preferida || a.i - b.i);
    idxPrecio = precios[0].i;

    // La especialidad: la columna de agrupación con más variedad (una que dice lo mismo en todos los renglones no sirve).
    const variedad = (i: number) => new Set(datos.map((f) => normalizar(f[i] ?? "")).filter(Boolean)).size;
    idxEspecialidad = indicesDe("especialidad").sort((a, b) => variedad(b) - variedad(a) || a - b)[0] ?? -1;
    idxDuracion = tipos.indexOf("duracion");
    const otrosPrecios = precios.filter((x) => x.i !== idxPrecio && x.cuenta > 0).map((x) => matriz[fila][x.i].trim());
    if (otrosPrecios.length > 0) {
      avisos.push(`Usé la columna «${matriz[fila][idxPrecio].trim()}» como precio. El documento también trae: ${otrosPrecios.join(", ")}.`);
    }
  } else {
    const adivinadas = adivinarColumnas(matriz);
    if (!adivinadas) return { filas: [], sinPrecio: 0, repetidos: 0, avisos };
    idxNombre = adivinadas.nombre;
    idxPrecio = adivinadas.precio;
    avisos.push("El documento no trae encabezados: tomé la columna con más texto como el tratamiento y la de números como el precio. Revisa que sea correcto.");
  }

  let especialidadActual = contexto.especialidadInicial ?? ESPECIALIDAD_POR_DEFECTO;
  const filas: FilaPrecio[] = [];
  const vistos = new Set<string>();
  let sinPrecio = 0;
  let repetidos = 0;

  for (const fila of matriz.slice(primeraDeDatos)) {
    const nombre = limpiarNombre(fila[idxNombre] ?? "");
    const precio = parsePrecio((fila[idxPrecio] ?? "").trim());
    const restoVacio = fila.every((celda, i) => i === idxNombre || !celda.trim());
    if (!nombre) continue;
    if (precio === null || precio <= 0) {
      // Un renglón con solo texto y corto es un título de sección: la especialidad de lo que sigue.
      if (restoVacio && precio === null && nombre.length <= 45) especialidadActual = resolverEspecialidad(nombre);
      else sinPrecio++;
      continue;
    }
    const especialidad = idxEspecialidad >= 0 && (fila[idxEspecialidad] ?? "").trim() ? resolverEspecialidad(fila[idxEspecialidad]) : especialidadActual;
    const clave = `${normalizar(nombre)}|${normalizar(especialidad)}`;
    if (vistos.has(clave)) {
      repetidos++;
      continue;
    }
    vistos.add(clave);
    const duracion = idxDuracion >= 0 ? Number((fila[idxDuracion] ?? "").replace(/[^\d.]/g, "")) : NaN;
    filas.push({
      nombre,
      precio,
      especialidad,
      ...(Number.isFinite(duracion) && duracion >= 5 && duracion <= 600 ? { duracionMinutos: Math.round(duracion) } : {}),
    });
  }
  // Los encabezados no sirvieron (nada con precio): se intenta adivinar las columnas por su contenido antes de rendirse.
  if (encabezado && filas.length === 0) {
    const intento = filasDeMatriz(matriz.slice(primeraDeDatos), contexto);
    if (intento.filas.length > 0) return intento;
  }
  return { filas, sinPrecio, repetidos, avisos };
}

// ---------- Excel ----------

function matrizDeHoja(hoja: XLSX.WorkSheet): string[][] {
  const filas: unknown[][] = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: true, defval: "" });
  return filas
    .map((fila) => fila.map((celda) => (celda === null || celda === undefined ? "" : typeof celda === "number" ? String(celda) : String(celda).trim())))
    .filter((fila) => fila.some((v) => v !== ""));
}

// ---------- Word (.docx) ----------

const ENTIDADES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };
function decodificarXml(s: string): string {
  return s
    .replace(/&(amp|lt|gt|quot|apos);/g, (m) => ENTIDADES[m])
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
}

function textoDeParrafo(parrafoXml: string): string {
  const conTabs = parrafoXml.replace(/<w:tab\s*\/>/g, "<w:t> </w:t>");
  const trozos = [...conTabs.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => decodificarXml(m[1]));
  return trozos.join("").replace(/\s+/g, " ").trim();
}

function parrafosDe(xml: string): string[] {
  return (xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []).map(textoDeParrafo);
}

/** Cada tabla de Word como una matriz de celdas de texto. */
function tablasDeDocx(xml: string): string[][][] {
  const tablas = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) ?? [];
  return tablas.map((tabla) =>
    (tabla.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) ?? [])
      .map((fila) => (fila.match(/<w:tc>[\s\S]*?<\/w:tc>/g) ?? []).map((celda) => parrafosDe(celda).filter(Boolean).join(" ")))
      .filter((fila) => fila.some((v) => v !== ""))
  );
}

/** Si el documento de Word no usa tablas: renglones tipo "Limpieza dental ........ $500" o "Resina: $800". */
function matrizDeParrafos(xml: string): string[][] {
  const sinTablas = xml.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, "");
  const filas: string[][] = [];
  for (const linea of parrafosDe(sinTablas)) {
    const m = linea.match(/^(.+?)\s*[:\-–—.…]{1,}\s*\$?\s*(\d[\d.,]*)\s*(?:mxn|m\.n\.|pesos)?$/i) ?? linea.match(/^(.+?)\s+\$\s*(\d[\d.,]*)\s*(?:mxn|m\.n\.|pesos)?$/i);
    if (m) filas.push([m[1].replace(/[.…\s]+$/, ""), m[2]]);
  }
  return filas.length > 0 ? [["Tratamiento", "Precio"], ...filas] : [];
}

// ---------- Entrada principal ----------

function leerBytes(buffer: ArrayBuffer): { esZip: boolean; esOle: boolean; esPdf: boolean } {
  const b = new Uint8Array(buffer.slice(0, 5));
  return {
    esZip: b[0] === 0x50 && b[1] === 0x4b,
    esOle: b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0,
    esPdf: b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  };
}

export function leerListaPrecios(buffer: ArrayBuffer, nombreArchivo: string): ResultadoListaPrecios {
  const { esZip, esOle, esPdf } = leerBytes(buffer);
  const lecturas: Lectura[] = [];

  if (esPdf) {
    throw new Error("Los PDF no se pueden leer. Si tienes la lista en Excel o en Word, sube ese archivo; si no, guárdala como Excel o escribe los precios directo en el catálogo.");
  }

  if (esZip) {
    const archivos = unzipSync(new Uint8Array(buffer), { filter: (f) => f.name === "word/document.xml" });
    const documento = archivos["word/document.xml"];
    if (documento) {
      const xml = new TextDecoder("utf-8").decode(documento);
      const tablas = tablasDeDocx(xml);
      for (const tabla of tablas) lecturas.push(filasDeMatriz(tabla));
      if (lecturas.every((l) => l.filas.length === 0)) {
        const matriz = matrizDeParrafos(xml);
        if (matriz.length > 0) lecturas.push(filasDeMatriz(matriz));
      }
      // Es un documento de Word: si no trajo nada, no se intenta leer como Excel.
      if (lecturas.length === 0) lecturas.push({ filas: [], sinPrecio: 0, repetidos: 0, avisos: [] });
    }
  }

  if (lecturas.length === 0 && (esZip || esOle)) {
    if (esOle && /\.(doc|dot)$/i.test(nombreArchivo)) {
      throw new Error("Los documentos de Word antiguos (.doc) no se pueden leer. Ábrelo en Word y guárdalo como .docx (Archivo → Guardar como), o súbelo en Excel.");
    }
    const libro = XLSX.read(buffer, { type: "array" });
    for (const nombreHoja of libro.SheetNames) {
      const matriz = matrizDeHoja(libro.Sheets[nombreHoja]);
      if (matriz.length === 0) continue;
      // Una hoja por especialidad ("Ortodoncia", "Endodoncia"…) aporta esa especialidad a lo que trae.
      const esp = resolverEspecialidad(nombreHoja);
      const especialidadInicial = (especialidadesPredefinidas as readonly string[]).includes(esp) ? esp : undefined;
      lecturas.push(filasDeMatriz(matriz, { especialidadInicial }));
    }
  } else if (lecturas.length === 0) {
    const texto = decodificarBuffer(buffer);
    const primera = texto.split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
    lecturas.push(filasDeMatriz(parseDelimitado(texto, detectarDelimitador(primera)).map((f) => f.map((c) => c.trim()))));
  }

  let filas = lecturas.flatMap((l) => l.filas);
  const avisos = lecturas.flatMap((l) => l.avisos);
  const sinPrecio = lecturas.reduce((s, l) => s + l.sinPrecio, 0);
  const repetidos = lecturas.reduce((s, l) => s + l.repetidos, 0);

  if (filas.length === 0) {
    throw new Error("No encontré tratamientos con precio. Revisa que el documento tenga una columna con el nombre del tratamiento y otra con su precio.");
  }
  if (sinPrecio > 0) avisos.push(`${sinPrecio} renglón(es) sin un precio válido no se tomaron en cuenta.`);
  if (repetidos > 0) avisos.push(`${repetidos} renglón(es) repetidos se tomaron una sola vez.`);
  if (filas.length > MAX_FILAS) {
    avisos.push(`El documento trae ${filas.length} tratamientos; solo se muestran los primeros ${MAX_FILAS}. Puedes volver a subirlo después con el resto.`);
    filas = filas.slice(0, MAX_FILAS);
  }
  return { filas, avisos };
}

// ---------- Contra el catálogo de la clínica ----------

export type ClasificacionPrecio = "nuevo" | "igual" | "cambia_precio" | "posible_duplicado";

export type ItemListaPrecios = {
  fila: FilaPrecio;
  clasificacion: ClasificacionPrecio;
  /** El procedimiento que ya tiene la clínica (mismo nombre, o uno parecido). */
  existente?: Procedimiento;
};

const UMBRAL_PARECIDO = 0.85;

const palabrasClave = (s: string) => normalizar(s).split(" ").filter((p) => p.length >= 4);

/** Cada renglón contra lo que la clínica ya tiene: mismo nombre (se puede actualizar su precio), parecido (se avisa, sin
 * tocarlo) o nuevo. Nada se pisa por sí solo: quien importa elige qué precios actualizar. */
export function clasificarListaPrecios(filas: FilaPrecio[], existentes: Procedimiento[]): ItemListaPrecios[] {
  const porNombre = new Map<string, Procedimiento>();
  for (const p of existentes) {
    const clave = normalizar(p.nombre);
    if (!porNombre.has(clave)) porNombre.set(clave, p);
  }
  const palabrasDeExistentes = existentes.map((p) => ({ p, palabras: new Set(palabrasClave(p.nombre)) }));

  return filas.map((fila): ItemListaPrecios => {
    const exacto = porNombre.get(normalizar(fila.nombre));
    if (exacto) {
      return { fila, existente: exacto, clasificacion: exacto.costoPaciente === fila.precio ? "igual" : "cambia_precio" };
    }
    const mias = palabrasClave(fila.nombre);
    let mejor: { p: Procedimiento; sim: number } | null = null;
    for (const { p, palabras } of palabrasDeExistentes) {
      if (!mias.some((w) => palabras.has(w))) continue; // sin ninguna palabra en común no se parecen
      const sim = similitudNombres(fila.nombre, p.nombre);
      if (sim >= UMBRAL_PARECIDO && (!mejor || sim > mejor.sim)) mejor = { p, sim };
    }
    return mejor ? { fila, existente: mejor.p, clasificacion: "posible_duplicado" } : { fila, clasificacion: "nuevo" };
  });
}

/** El procedimiento nuevo que se crea desde un renglón de la lista: con su precio al paciente y el costo al odontólogo
 * sin configurar (la lista de precios no lo trae). */
export function procedimientoDesdeFila(fila: FilaPrecio, id: string, ahoraIso: string): Procedimiento {
  return {
    id,
    nombre: fila.nombre,
    especialidad: fila.especialidad,
    costoPaciente: fila.precio,
    costoOdontologo: 0,
    costoSinConfigurar: true,
    duracionMinutos: fila.duracionMinutos ?? DURACION_POR_DEFECTO,
    activo: true,
    visibilidad: "interna",
    creadoEl: ahoraIso,
    actualizadoEl: ahoraIso,
  };
}
