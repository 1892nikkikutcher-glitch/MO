/** Autocompletado propio para las Notas de Evolución (formato PSOAP).
 *
 * El corrector ortográfico nativo del navegador/sistema operativo no se
 * puede reprogramar desde una página web — ninguna app web puede agregarle
 * palabras a su diccionario, por eso términos clínicos válidos como
 * "sistémico" salían marcados y se sugería reemplazarlos por palabras
 * genéricas ("sistemático"). Este módulo es la alternativa: un diccionario
 * dental propio + las palabras que la clínica más repite (aprendidas solas
 * al guardar cada nota), combinados en sugerencias de autocompletado. El
 * corrector nativo se apaga (`spellCheck={false}`) en los campos que usan
 * esto — ver NotasEvolucion.tsx.
 */

export type VocabularioNotas = {
  /** Palabra (en minúsculas, tal como se aprendió) → veces que se ha usado. */
  palabras: Record<string, number>;
};

export const vocabularioNotasInicial: VocabularioNotas = { palabras: {} };

/** Términos clínicos/dentales que un corrector genérico en español no suele
 * conocer — no pretende ser exhaustivo, solo cubrir el vocabulario que más
 * fricciona con el corrector nativo. Todo en minúsculas; los acentos se
 * ignoran al buscar coincidencias (ver `sinAcentos`), no al mostrarlas. */
export const DICCIONARIO_DENTAL: readonly string[] = [
  // Términos sistémicos/generales de exploración (los que más se confunden)
  "sistémico", "sistémica", "sistémicos", "sistémicas",
  "asintomático", "asintomática", "sintomatología", "comorbilidad", "comorbilidades",
  "afebril", "eupneico", "eupneica", "normocárdico", "normocárdica",
  "hemodinámicamente", "estable", "estables",
  // Anatomía y estructuras
  "odontología", "periodonto", "periodontal", "periodontales", "gingiva", "gingival",
  "encía", "encías", "esmalte", "dentina", "pulpa", "pulpar", "pulpares",
  "cemento", "radicular", "radiculares", "apical", "apice", "ápice", "conducto",
  "conductos", "raíz", "raíces", "corona", "coronal", "maxilar", "maxilares",
  "mandíbula", "mandibular", "mandibulares", "oclusión", "oclusal", "oclusales",
  "bucal", "labial", "lingual", "palatino", "vestibular", "interproximal",
  "cervical", "furca", "ligamento",
  // Especialidades
  "endodoncia", "endodóntico", "endodóntica", "periodoncia", "periodoncista",
  "ortodoncia", "ortodóntico", "ortodóntica", "odontopediatría", "odontopediátrico",
  "prostodoncia", "protésico", "protésica", "implantología", "implantológico",
  "maxilofacial", "cirugía", "quirúrgico", "quirúrgica",
  // Patología
  "caries", "cariogénico", "cariogénica", "gingivitis", "periodontitis",
  "maloclusión", "bruxismo", "halitosis", "absceso", "fístula", "necrosis",
  "hipersensibilidad", "dentinaria", "reabsorción", "pericoronitis",
  "sobremordida", "mordida", "cruzada", "abierta", "apiñamiento", "diastema",
  "diastemas", "impactado", "impactada", "retenido", "retenida", "erupción",
  "erupcionado", "erupcionada", "edéntulo", "edéntula", "movilidad",
  "sangrado", "supuración", "edema", "eritema", "hiperemia",
  // Procedimientos y materiales
  "profilaxis", "obturación", "obturaciones", "exodoncia", "curetaje",
  "raspado", "alisado", "resina", "incrustación", "incrustaciones",
  "férula", "blanqueamiento", "sellante", "sellantes", "ionómero",
  "hidróxido", "eugenol", "composite", "amalgama", "cofia", "carilla",
  "carillas", "provisional", "provisionales", "definitiva", "definitivo",
  "cementado", "grabado", "adhesivo", "impresión", "impresiones",
  "reline", "rebase", "biopsia", "sutura", "suturas", "anestesia",
  "anestésico", "infiltrativa", "troncular", "hemostasia",
  // Pronóstico / seguimiento
  "pronóstico", "reservado", "favorable", "desfavorable", "evolución",
  "satisfactoria", "recidiva", "cicatrización", "control", "seguimiento",
];

const PALABRAS_VACIAS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al",
  "y", "o", "u", "que", "con", "sin", "para", "por", "en", "se", "su", "sus",
  "es", "está", "están", "fue", "son", "no", "sí", "más", "menos", "muy",
  "este", "esta", "estos", "estas", "ese", "esa", "esos", "esas", "lo", "le",
  "les", "mi", "tu", "ha", "han", "he", "hay", "como", "cuando", "donde",
  "pero", "así", "también", "ya", "si", "a", "e", "durante", "sobre", "tras",
]);

/** Quita acentos/diacríticos para comparar sin importar cómo los tecleó —
 * "sistemico" debe encontrar "sistémico" igual que "sistémico". */
const RANGO_DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");

export function sinAcentos(texto: string): string {
  return texto.normalize("NFD").replace(RANGO_DIACRITICOS, "");
}

/** Separa un texto libre en palabras (letras/acentos, sin puntuación ni
 * números) — usado tanto para aprender frecuencias como para detectar la
 * palabra que se está escribiendo en un momento dado. */
export function extraerPalabras(texto: string): string[] {
  return texto.match(/[a-záéíóúñü]+/gi) ?? [];
}

/** Con base en el texto de una nota recién guardada, incrementa el contador
 * de cada palabra relevante (≥4 letras, no una palabra vacía) — pura, sin
 * tocar Firestore, para que sea fácil de probar y de llamar antes de
 * guardar. Nunca reduce ni elimina — el vocabulario solo crece. */
export function actualizarFrecuencias(
  actual: Record<string, number>,
  textoNota: string
): Record<string, number> {
  const siguiente = { ...actual };
  for (const palabra of extraerPalabras(textoNota)) {
    const normalizada = palabra.toLowerCase();
    if (normalizada.length < 4 || PALABRAS_VACIAS.has(normalizada)) continue;
    siguiente[normalizada] = (siguiente[normalizada] ?? 0) + 1;
  }
  return siguiente;
}

export type Sugerencia = { palabra: string; fuente: "clinica" | "diccionario" };

/** Sugerencias de autocompletado para el prefijo que se está escribiendo —
 * combina el vocabulario aprendido de la clínica (ordenado por frecuencia,
 * y con prioridad sobre el diccionario fijo porque ya sabemos que esta
 * clínica sí lo usa) con el diccionario dental incorporado. Ignora acentos
 * al comparar el prefijo, nunca al mostrar el resultado. */
export function sugerencias(
  prefijo: string,
  vocabularioClinica: Record<string, number>,
  maxResultados = 6
): Sugerencia[] {
  const p = sinAcentos(prefijo.toLowerCase());
  if (p.length < 2) return [];

  const vistos = new Set<string>();
  const resultado: Sugerencia[] = [];

  const candidatosClinica = Object.entries(vocabularioClinica)
    .filter(([palabra]) => sinAcentos(palabra).startsWith(p))
    .sort((a, b) => b[1] - a[1])
    .map(([palabra]) => palabra);

  for (const palabra of candidatosClinica) {
    if (palabra === prefijo.toLowerCase() || vistos.has(palabra)) continue;
    vistos.add(palabra);
    resultado.push({ palabra, fuente: "clinica" });
    if (resultado.length >= maxResultados) return resultado;
  }

  const candidatosDiccionario = DICCIONARIO_DENTAL.filter((palabra) => sinAcentos(palabra).startsWith(p));
  for (const palabra of candidatosDiccionario) {
    if (palabra === prefijo.toLowerCase() || vistos.has(palabra)) continue;
    vistos.add(palabra);
    resultado.push({ palabra, fuente: "diccionario" });
    if (resultado.length >= maxResultados) return resultado;
  }

  return resultado;
}
