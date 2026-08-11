/** Lee archivos de pacientes exportados de otros sistemas (CMP y similares):
 * CSV o TXT delimitado por coma/punto y coma/tabulador, con encabezados en
 * español y cualquier orden de columnas — o un .json ya estructurado.
 * No requiere que el doctor prepare nada especial: sube el mismo archivo
 * que ya exporta su sistema anterior. */

export type RegistroImportado = {
  name: string;
  phone: string;
  birthDate: string;
  email?: string;
  notas?: string;
};

type TipoColumna = "name" | "birthDate" | "email" | "phone" | "skip";

/** Encabezados conocidos de exportaciones tipo CMP, normalizados (sin
 * acentos, minúsculas). Cualquier columna no listada aquí se conserva como
 * texto libre en `notas` para no perder información. */
const ALIAS_COLUMNAS: Record<string, TipoColumna> = {
  "nombre paciente": "name",
  "nombre del paciente": "name",
  "nombre completo": "name",
  nombre: "name",
  "fecha nacimiento": "birthDate",
  "fecha de nacimiento": "birthDate",
  "fecha nacim": "birthDate",
  "correo electronico": "email",
  "correo electronico de envio de facturas": "email",
  "email de envio de facturas": "email",
  correo: "email",
  email: "email",
  "telefono celular": "phone",
  "telefono celular2": "phone",
  "telefono celular 2": "phone",
  celular: "phone",
  "telefono casa": "phone",
  "telefono trabajo": "phone",
  telefono: "phone",
  edad: "skip",
  "foto paciente": "skip",
  "fotografia de identificacion": "skip",
};

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function esArchivoBinario(buffer: ArrayBuffer): "xlsx" | "xls-binario" | null {
  const b = new Uint8Array(buffer.slice(0, 4));
  if (b[0] === 0x50 && b[1] === 0x4b) return "xlsx";
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return "xls-binario";
  return null;
}

function decodificarBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.slice(3));
  }
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (utf8.includes("�")) {
    return new TextDecoder("windows-1252").decode(bytes);
  }
  return utf8;
}

function detectarDelimitador(primeraLinea: string): string {
  const candidatos = [",", ";", "\t"];
  let mejor = ",";
  let max = 0;
  for (const c of candidatos) {
    const n = primeraLinea.split(c).length - 1;
    if (n > max) {
      max = n;
      mejor = c;
    }
  }
  return mejor;
}

function parseDelimitado(texto: string, delim: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let enComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (enComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          enComillas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      enComillas = true;
    } else if (c === delim) {
      fila.push(campo);
      campo = "";
    } else if (c === "\n") {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else if (c === "\r") {
      // el \n siguiente cierra la fila
    } else {
      campo += c;
    }
  }
  if (campo.length > 0 || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas.filter((f) => f.some((v) => v.trim() !== ""));
}

function parseFecha(valor: string): string {
  const s = valor.trim();
  if (!s) return "";
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    return `${m[3]}-${mm}-${dd}`;
  }
  return "";
}

function esRegistroJsonValido(v: unknown): v is RegistroImportado {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as Record<string, unknown>).name === "string" &&
    (v as Record<string, unknown>).name !== ""
  );
}

export type ResultadoImportacion = {
  registros: RegistroImportado[];
  avisos: string[];
};

export function parseArchivoPacientes(buffer: ArrayBuffer, nombreArchivo: string): ResultadoImportacion {
  const tipoBinario = esArchivoBinario(buffer);
  if (tipoBinario) {
    throw new Error(
      'Este archivo es un Excel binario real y no se puede leer directamente. Ábrelo en Excel y usa "Guardar como" → CSV (delimitado por comas) o "CSV UTF-8", y sube ese archivo aquí.'
    );
  }

  const texto = decodificarBuffer(buffer);
  const textoTrim = texto.trim();

  if (nombreArchivo.toLowerCase().endsWith(".json") || textoTrim.startsWith("[")) {
    let data: unknown;
    try {
      data = JSON.parse(textoTrim);
    } catch {
      throw new Error("El archivo .json no se pudo leer — revisa que esté bien formado.");
    }
    if (!Array.isArray(data)) throw new Error("El archivo JSON debe ser una lista de pacientes.");
    const registros = data.filter(esRegistroJsonValido).map((v) => ({
      name: v.name,
      phone: v.phone ?? "",
      birthDate: v.birthDate ?? "",
      email: v.email ?? "",
      notas: v.notas ?? "",
    }));
    if (registros.length === 0) throw new Error("No se encontró ningún registro con al menos un nombre.");
    return { registros, avisos: construirAvisos(registros) };
  }

  const primeraLinea = texto.split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
  const delim = detectarDelimitador(primeraLinea);
  const filas = parseDelimitado(texto, delim);
  if (filas.length < 2) {
    throw new Error("El archivo no tiene datos reconocibles. Verifica que sea un .csv o .txt exportado de tu sistema.");
  }

  const encabezados = filas[0].map((h) => h.trim());
  const encabezadosNorm = encabezados.map(normalizar);
  const idxName = encabezadosNorm.findIndex((h) => ALIAS_COLUMNAS[h] === "name");
  if (idxName === -1) {
    throw new Error(
      `No encontré una columna de nombre del paciente. Encabezados detectados: ${encabezados.join(", ")}`
    );
  }

  const registros: RegistroImportado[] = [];
  for (let f = 1; f < filas.length; f++) {
    const fila = filas[f];
    const name = (fila[idxName] ?? "").trim();
    if (!name) continue;

    let birthDate = "";
    let email = "";
    const telefonos: string[] = [];
    const notasPartes: string[] = [];

    encabezadosNorm.forEach((hNorm, i) => {
      if (i === idxName) return;
      const valor = (fila[i] ?? "").trim();
      if (!valor) return;
      const tipo = ALIAS_COLUMNAS[hNorm];
      if (tipo === "skip") return;
      if (tipo === "birthDate") {
        if (!birthDate) birthDate = parseFecha(valor);
        return;
      }
      if (tipo === "email") {
        if (!email) email = valor;
        return;
      }
      if (tipo === "phone") {
        telefonos.push(valor);
        return;
      }
      notasPartes.push(`${encabezados[i]}: ${valor}`);
    });

    registros.push({
      name,
      phone: telefonos[0] ?? "",
      birthDate,
      email,
      notas: [...telefonos.slice(1).map((t) => `Otro teléfono: ${t}`), ...notasPartes].join("\n"),
    });
  }

  if (registros.length === 0) throw new Error("No se encontró ningún registro con nombre de paciente.");
  return { registros, avisos: construirAvisos(registros) };
}

function construirAvisos(registros: RegistroImportado[]): string[] {
  const avisos: string[] = [];
  const sinFecha = registros.filter((r) => !r.birthDate).length;
  if (sinFecha > 0) {
    avisos.push(`${sinFecha} paciente(s) sin fecha de nacimiento reconocible — puedes completarla luego en el expediente.`);
  }
  const dañados = registros.filter((r) => r.name.includes("?")).length;
  if (dañados > 0) {
    avisos.push(
      `${dañados} nombre(s) contienen "?" — probablemente texto dañado del sistema anterior. Revísalos después de importar.`
    );
  }
  return avisos;
}
