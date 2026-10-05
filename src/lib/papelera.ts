/** Papelera — copia de seguridad de TODO lo que se elimina desde la app.
 *
 * Toda eliminación de un registro (cita, presupuesto, pago, receta, gasto,
 * catálogo...) pasa por `syncFirestoreList` en PatientDataContext, que ya no
 * borra el documento a secas: antes de borrarlo escribe una copia exacta en
 * `users/{clinicUid}/papelera/{id}` dentro del MISMO batch (o se guardan los
 * dos, o no se hace nada — nunca se pierde el registro por un fallo a medias).
 * Este archivo es la parte pura de eso: tipos, cómo se llama cada cosa en
 * pantalla y cómo se arma la entrada — sin tocar Firestore, para poder
 * probarla sin emulador.
 *
 * Nada se purga solo ni desde la app: la información clínica y financiera
 * es valiosa (y la NOM-004 pide conservar el expediente clínico al menos
 * 5 años desde el último acto médico). */

export type DatosRegistro = Record<string, unknown>;

export type GrupoPapelera =
  | "agenda"
  | "expediente"
  | "finanzas"
  | "catalogos"
  | "proveedores"
  | "seguimiento"
  | "equipo"
  | "bitacoras";

export const etiquetaGrupoPapelera: Record<GrupoPapelera, string> = {
  agenda: "Agenda",
  expediente: "Expediente del paciente",
  finanzas: "Finanzas",
  catalogos: "Catálogos",
  proveedores: "Proveedores",
  seguimiento: "Seguimiento",
  equipo: "Equipo",
  bitacoras: "Bitácoras",
};

/** Cuántos documentos entran en un solo batch de Firestore al archivar —
 * cada registro usa 2 operaciones (copia + borrado) y el límite del batch es
 * 500, así que 200 deja margen de sobra. */
export const REGISTROS_POR_LOTE = 200;

export type EntradaPapelera = {
  id: string;
  /** Ruta completa de la colección donde vivía, ej.
   * "users/{uid}/pacientes/{pid}/presupuestos" — con esto y `docId` se
   * sabe exactamente a dónde regresarlo. */
  rutaOrigen: string;
  /** Nombre de la colección de origen (último tramo de la ruta), ej.
   * "citas", "presupuestos", "fotos". Decide cómo se llama en pantalla. */
  tipo: string;
  docId: string;
  /** Solo si vivía dentro de un paciente (subcolección). */
  pacienteId: string | null;
  /** Texto corto para reconocerlo en la lista — se calcula al eliminar para
   * que siga siendo legible aunque el catálogo de etiquetas cambie. */
  etiqueta: string;
  /** Copia exacta del documento tal como estaba al eliminarse. */
  datos: DatosRegistro;
  /** Solo para elementos que viven DENTRO de otro documento (fotos): en
   * qué campo estaban ("perfil", "extraorales"...). */
  campo?: string;
  /** ISO datetime. */
  eliminadoEl: string;
  eliminadoPorUid: string;
  eliminadoPorEmail: string;
  /** Presente cuando varios registros se eliminaron en una misma operación
   * (ej. Borrar citas por filtro) — para poder restaurarlos todos juntos. */
  loteId?: string;
  loteTamano?: number;
  /** Se llena al restaurarlo. La entrada NO se borra: queda como historial. */
  restauradoEl?: string | null;
  restauradoPorEmail?: string | null;
};

export type OrigenPapelera = {
  clinicUid: string;
  coleccion: string;
  pacienteId: string | null;
  /** Ruta sin "users/{uid}/", ej. "pacientes/p1/presupuestos". */
  relativa: string;
};

/** Desarma la ruta de una colección de la clínica. Devuelve null si no
 * tiene la forma `users/{uid}/...` (nunca debería pasar — todas las rutas
 * de MO cuelgan de ahí). */
export function analizarRutaOrigen(ruta: string): OrigenPapelera | null {
  const partes = ruta.split("/").filter(Boolean);
  if (partes.length < 3 || partes[0] !== "users") return null;
  const resto = partes.slice(2);
  return {
    clinicUid: partes[1],
    coleccion: resto[resto.length - 1],
    pacienteId: resto[0] === "pacientes" && resto.length === 3 ? resto[1] : null,
    relativa: resto.join("/"),
  };
}

// ---------------------------------------------------------------------------
// Texto en pantalla
// ---------------------------------------------------------------------------

function texto(valor: unknown): string {
  if (typeof valor === "string") return valor.trim();
  if (typeof valor === "number" && Number.isFinite(valor)) return String(valor);
  return "";
}

function dinero(valor: unknown): string {
  return typeof valor === "number" && Number.isFinite(valor) ? `$${valor.toLocaleString("es-MX")}` : "";
}

/** "2026-10-12" o "2026-10-12T16:35:00Z" -> "12/10/2026". Cualquier otra
 * cosa (ya viene en otro formato) se deja tal cual. */
function fechaCorta(valor: unknown): string {
  const t = texto(valor);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : t;
}

function unir(...partes: string[]): string {
  return partes.filter(Boolean).join(" · ");
}

function primero(datos: DatosRegistro, claves: string[]): string {
  for (const clave of claves) {
    const t = texto(datos[clave]);
    if (t) return t;
  }
  return "";
}

const CLAVES_GENERICAS = [
  "nombre",
  "name",
  "titulo",
  "concepto",
  "descripcion",
  "diagnostico",
  "tratamiento",
  "procedimiento",
  "trabajo",
  "laboratorio",
  "empresa",
  "texto",
  "folio",
  "motivo",
  "patientName",
  "paciente",
];

type DefinicionTipo = {
  singular: string;
  grupo: GrupoPapelera;
  etiqueta?: (d: DatosRegistro) => string;
};

const tiposPapelera: Record<string, DefinicionTipo> = {
  // Agenda
  citas: {
    singular: "Cita",
    grupo: "agenda",
    etiqueta: (d) => unir(texto(d.paciente) || "Cita sin paciente", fechaCorta(d.fecha), texto(d.horaInicio)),
  },
  recursos: {
    singular: "Médico / unidad de Agenda",
    grupo: "agenda",
    etiqueta: (d) => unir(texto(d.nombre) || "Sin nombre", d.tipo === "unidad" ? "Unidad" : d.tipo === "medico" ? "Médico" : ""),
  },

  // Expediente del paciente
  pacientes: { singular: "Paciente", grupo: "expediente" },
  presupuestos: {
    singular: "Presupuesto",
    grupo: "expediente",
    etiqueta: (d) => unir(texto(d.folio) ? `Folio ${texto(d.folio)}` : "Presupuesto", fechaCorta(d.fecha), dinero(d.total)),
  },
  recetas: {
    singular: "Receta",
    grupo: "expediente",
    etiqueta: (d) => unir(texto(d.folio) ? `Folio ${texto(d.folio)}` : "Receta", fechaCorta(d.fecha), texto(d.medico)),
  },
  diagnosticos: {
    singular: "Diagnóstico",
    grupo: "expediente",
    etiqueta: (d) => texto(d.diagnostico) || "Diagnóstico",
  },
  planTratamiento: {
    singular: "Plan de tratamiento",
    grupo: "expediente",
    etiqueta: (d) => texto(d.tratamiento) || texto(d.diagnosticoTexto) || "Plan de tratamiento",
  },
  comparativas: {
    singular: "Comparativa de rehabilitación",
    grupo: "expediente",
    etiqueta: (d) => unir(texto(d.titulo) || "Comparativa", fechaCorta(d.fecha)),
  },
  laboratorios: {
    singular: "Orden de laboratorio",
    grupo: "expediente",
    etiqueta: (d) => unir(texto(d.laboratorio), texto(d.trabajo), fechaCorta(d.fechaEnvio)) || "Orden de laboratorio",
  },
  notasEvolucion: {
    singular: "Nota de evolución",
    grupo: "expediente",
    etiqueta: (d) => unir("Nota", fechaCorta(d.fecha), texto(d.medico)),
  },
  membresias: {
    singular: "Membresía del paciente",
    grupo: "expediente",
    etiqueta: (d) =>
      unir(
        texto(d.planNombre) || "Membresía",
        texto(d.fechaInicio) && texto(d.fechaFin) ? `${fechaCorta(d.fechaInicio)} – ${fechaCorta(d.fechaFin)}` : ""
      ),
  },
  fotos: { singular: "Fotografía", grupo: "expediente" },

  // Finanzas
  pagos: {
    singular: "Pago",
    grupo: "finanzas",
    etiqueta: (d) => unir(dinero(d.total) || "Pago", fechaCorta(d.fecha), texto(d.formaPago)),
  },
  gastos: {
    singular: "Gasto",
    grupo: "finanzas",
    etiqueta: (d) => unir(texto(d.concepto) || "Gasto", dinero(d.monto), fechaCorta(d.fecha)),
  },

  // Catálogos
  procedimientos: { singular: "Procedimiento", grupo: "catalogos" },
  medicamentos: { singular: "Medicamento", grupo: "catalogos" },
  membresiaPlanes: {
    singular: "Plan de membresía",
    grupo: "catalogos",
    etiqueta: (d) => unir(texto(d.nombre) || "Plan de membresía", dinero(d.precio)),
  },
  laminas: { singular: "Lámina educativa", grupo: "catalogos" },
  promociones: { singular: "Promoción", grupo: "catalogos" },
  aseguradoras: { singular: "Aseguradora", grupo: "catalogos" },
  empresasRpbi: { singular: "Empresa de RPBI", grupo: "catalogos" },
  contadores: { singular: "Contador", grupo: "catalogos" },

  // Proveedores
  depositosDentales: { singular: "Depósito dental", grupo: "proveedores" },
  articulosFaltantes: { singular: "Faltante por surtir", grupo: "proveedores" },
  articulosCaducidad: { singular: "Artículo por caducar", grupo: "proveedores" },
  centrosRadiodiagnostico: { singular: "Centro de radiodiagnóstico", grupo: "proveedores" },
  laboratoriosDentales: { singular: "Laboratorio dental", grupo: "proveedores" },

  // Seguimiento
  encuestas: { singular: "Encuesta", grupo: "seguimiento" },
  domiciliaciones: { singular: "Domiciliación", grupo: "seguimiento" },
  pendientes: { singular: "Pendiente del consultorio", grupo: "seguimiento" },

  // Equipo
  personalAsistencia: { singular: "Persona del equipo (asistencia)", grupo: "equipo" },
  registrosAsistencia: {
    singular: "Registro de asistencia",
    grupo: "equipo",
    etiqueta: (d) => unir("Asistencia", fechaCorta(d.fecha), texto(d.entrada) ? `entrada ${texto(d.entrada)}` : ""),
  },

  // Bitácoras (registros que se llenan solos; se guardan igual)
  pagosEliminados: { singular: "Registro de pago eliminado", grupo: "bitacoras" },
  pagosRealizados: { singular: "Registro de pago realizado", grupo: "bitacoras" },
  presupuestosLog: { singular: "Registro de presupuesto", grupo: "bitacoras" },
  recetasLog: { singular: "Registro de receta", grupo: "bitacoras" },
  otsLog: { singular: "Registro de orden de laboratorio", grupo: "bitacoras" },
};

export function singularDeTipo(tipo: string): string {
  return tiposPapelera[tipo]?.singular ?? "Registro";
}

export function grupoDeTipo(tipo: string): GrupoPapelera {
  return tiposPapelera[tipo]?.grupo ?? "bitacoras";
}

/** Tipos conocidos, agrupados — para el filtro de la pantalla Papelera. */
export function tiposPorGrupo(): { grupo: GrupoPapelera; tipos: { tipo: string; singular: string }[] }[] {
  const mapa = new Map<GrupoPapelera, { tipo: string; singular: string }[]>();
  Object.entries(tiposPapelera).forEach(([tipo, def]) => {
    const lista = mapa.get(def.grupo) ?? [];
    lista.push({ tipo, singular: def.singular });
    mapa.set(def.grupo, lista);
  });
  return (Object.keys(etiquetaGrupoPapelera) as GrupoPapelera[])
    .filter((g) => mapa.has(g))
    .map((g) => ({ grupo: g, tipos: mapa.get(g)! }));
}

export const camposFoto = ["perfil", "ineFrente", "ineReverso", "extraorales", "intraorales"] as const;
export type CampoFoto = (typeof camposFoto)[number];

export const etiquetaCampoFoto: Record<CampoFoto, string> = {
  perfil: "Foto de perfil",
  ineFrente: "INE (frente)",
  ineReverso: "INE (reverso)",
  extraorales: "Fotografía extraoral",
  intraorales: "Fotografía intraoral",
};

/** Texto corto para reconocer un registro en la lista. Nunca lanza: si algo
 * raro viene en los datos, cae a un texto genérico. */
export function etiquetaDeRegistro(tipo: string, datos: DatosRegistro, docId: string, campo?: string): string {
  try {
    if (tipo === "fotos") {
      const base = etiquetaCampoFoto[campo as CampoFoto] ?? "Fotografía";
      return unir(base, texto(datos.name), fechaCorta(datos.fecha));
    }
    const definicion = tiposPapelera[tipo];
    const propia = definicion?.etiqueta?.(datos);
    if (propia) return propia.slice(0, 140);
    return (primero(datos, CLAVES_GENERICAS) || `${singularDeTipo(tipo)} ${docId}`).slice(0, 140);
  } catch {
    return `${singularDeTipo(tipo)} ${docId}`;
  }
}

// ---------------------------------------------------------------------------
// Armado de la entrada
// ---------------------------------------------------------------------------

/** FNV-1a de 32 bits — no es criptográfico, solo ayuda a que dos eliminaciones
 * distintas del mismo documento (contenido distinto) no compartan id. */
export function hashTexto(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function trocear<T>(lista: T[], tamano: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < lista.length; i += tamano) lotes.push(lista.slice(i, i + tamano));
  return lotes;
}

export type UsuarioPapelera = { uid: string; email: string };

/** Id de la entrada: ruta + id del documento + marca de tiempo + huella del
 * contenido. Lleva la hora a propósito (no solo el contenido): así restaurar
 * algo y volver a eliminarlo igual deja una entrada NUEVA en vez de intentar
 * sobrescribir la anterior — los colaboradores solo pueden CREAR entradas, no
 * modificarlas (ver firestore.rules). Si React llegara a repetir la misma
 * eliminación en el mismo instante, el id coincide y el segundo intento es
 * inofensivo. */
export function idEntradaPapelera(relativa: string, docId: string, datos: DatosRegistro, ahora: Date): string {
  const ruta = relativa.replace(/\//g, "~");
  return `${ruta}__${docId}__${ahora.getTime().toString(36)}${hashTexto(JSON.stringify(datos))}`;
}

export function construirEntradaPapelera(args: {
  ruta: string;
  item: { id: string } & DatosRegistro;
  usuario: UsuarioPapelera;
  ahora: Date;
  lote?: { id: string; tamano: number };
  campo?: string;
}): { id: string; entrada: EntradaPapelera } | null {
  const origen = analizarRutaOrigen(args.ruta);
  if (!origen) return null;
  const { item, usuario, ahora, lote, campo } = args;
  const entrada: EntradaPapelera = {
    id: "",
    rutaOrigen: args.ruta,
    tipo: origen.coleccion,
    docId: item.id,
    pacienteId: origen.pacienteId,
    etiqueta: etiquetaDeRegistro(origen.coleccion, item, item.id, campo),
    datos: item,
    eliminadoEl: ahora.toISOString(),
    eliminadoPorUid: usuario.uid,
    eliminadoPorEmail: usuario.email,
  };
  if (campo) entrada.campo = campo;
  if (lote && lote.tamano > 1) {
    entrada.loteId = lote.id;
    entrada.loteTamano = lote.tamano;
  }
  const id = idEntradaPapelera(origen.relativa, item.id, item, ahora);
  entrada.id = id;
  return { id, entrada };
}

/** Resumen de un grupo de entradas que se eliminaron juntas. */
export type GrupoLote = { loteId: string; tamano: number; entradas: EntradaPapelera[] };

/** Separa las entradas sueltas de las que vienen de una eliminación masiva
 * (mismo `loteId`), conservando el orden de aparición. */
export function agruparPorLote(entradas: EntradaPapelera[]): (EntradaPapelera | GrupoLote)[] {
  const resultado: (EntradaPapelera | GrupoLote)[] = [];
  const porLote = new Map<string, GrupoLote>();
  entradas.forEach((e) => {
    if (!e.loteId || (e.loteTamano ?? 0) < 2) {
      resultado.push(e);
      return;
    }
    let grupo = porLote.get(e.loteId);
    if (!grupo) {
      grupo = { loteId: e.loteId, tamano: e.loteTamano ?? 0, entradas: [] };
      porLote.set(e.loteId, grupo);
      resultado.push(grupo);
    }
    grupo.entradas.push(e);
  });
  return resultado;
}

export function esGrupoLote(x: EntradaPapelera | GrupoLote): x is GrupoLote {
  return "loteId" in x && "entradas" in x;
}
