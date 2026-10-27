/** Buscador de la plataforma: escribes una frase ("colaboradores", "cómo cobro", "exportar a google") y te lleva a la
 * sección donde está. Busca en los nombres del menú, en palabras clave que la gente usa para llamar a cada cosa y en
 * el texto de ayuda de cada pantalla. Tolera acentos, plurales y una letra mal escrita. Lógica pura. */

export type ItemMenu = { id: string; label: string; children?: readonly { id: string; label: string }[] };

export type EntradaBusqueda = {
  id: string;
  titulo: string;
  /** "Administración › Colaboradores" */
  ruta: string;
  /** Una línea para reconocerla (de la ayuda de esa pantalla). */
  descripcion: string;
  tituloNorm: string;
  rutaNorm: string;
  clavesNorm: string;
  cuerpoNorm: string;
};

export type ResultadoBusqueda = EntradaBusqueda & { puntaje: number };

/** Palabras con las que la gente llama a cada sección, además de su nombre en el menú. */
export const PALABRAS_CLAVE: Record<string, string> = {
  inicio: "dashboard resumen principal indicadores kpi ingresos hoy pendientes requieren atención fondos sobres",
  pacientes: "expediente expedientes historia clinica odontograma notas de evolucion fotos radiografias consentimientos nuevo paciente buscar paciente datos del paciente presupuesto plan de tratamiento",
  agenda: "citas calendario agendar google calendar exportar sedes bloques recursos medicos unidades semana dia vista recordatorios whatsapp confirmar",
  recetas: "receta medicamentos prescripcion indicaciones",
  "deposito-dental": "material insumos tienda deposito compras",
  "laboratorio-dental": "laboratorio protesis trabajos coronas ordenes",
  "centro-radiodiagnostico": "radiografias tomografia estudios imagen",
  "mo-conecta": "interconsulta colegas especialistas referir casos invitar compartir expediente",
  documentos: "consentimientos informados constancias hojas de indicaciones contrato ortodoncia",
  educacion: "material educativo videos pacientes",
  membresias: "membresia planes beneficios suscripcion pacientes afiliados",
  cashback: "saldo sonrie cashback recompensas puntos monedero lealtad vigencia transferir descuentos",
  "reportes-pagos": "cobros recibos editar pago eliminar pago pagos realizados eliminados descargar pdf",
  "reportes-devoluciones": "reembolso devolver dinero devolucion",
  "reportes-corte-caja": "corte de caja formas de pago efectivo tarjeta comision medicos ingresos del dia",
  "reportes-corte-diario": "corte del dia cobros diarios ingresos",
  "reportes-cierre-del-dia": "confirmar citas siguiente dia espacios libres pendientes material",
  "reportes-evaluacion-semanal": "bloques ocupacion puntualidad cancelaciones horas atendidas costos directos",
  "reportes-presupuestos": "presupuestos creados aceptados pendientes cierre",
  "reportes-saldos-pendientes": "deudas adeudos cuentas por cobrar pacientes que deben saldo pendiente",
  "reportes-aviso-privacidad": "privacidad datos personales arco",
  "reportes-graficas": "graficas estadisticas",
  "reportes-bitacora-citas": "historial cambios de citas auditoria",
  "reportes-recordatorios": "avisos whatsapp recordar citas",
  "reportes-procedimientos": "tratamientos realizados cuantos",
  "administracion-colaboradores": "colaboradores usuarios accesos permisos roles invitar claudia asistente recepcion cirujano dentista cuentas personal equipo",
  "administracion-perfil": "medicos recetas cedula profesional firma especialista especialidad logo escuela datos del doctor",
  "administracion-consultorio": "clinica consultorio datos direccion logo ciudad nombre administrador encabezado",
  "administracion-metas": "meta mensual dias de atencion objetivo ventas",
  "administracion-presupuesto-gastos": "sobres gastos fijos variables presupuesto de gastos categorias",
  "administracion-procedimientos": "costos precios tratamientos catalogo procedimientos utilidad",
  "administracion-papelera": "restaurar eliminados borrados recuperar",
  "administracion-formatos-whatsapp": "mensajes plantillas textos whatsapp recibo confirmacion",
  "administracion-comisiones": "comision medicos porcentaje pago a doctores",
  "administracion-historial-clinico": "plantilla preguntas historia clinica antecedentes",
  "administracion-medicamentos": "catalogo medicamentos recetas",
  "administracion-borrar-citas": "eliminar citas masivo",
  "administracion-medicos-pacientes": "medicos pacientes atendidos relacion",
  "administracion-marketing": "campanas promociones redes mensajes",
  "administracion-catalogos": "catalogos listas opciones",
  "administracion-contrato-ortodoncia": "contrato ortodoncia mensualidades",
  facturacion: "facturas cfdi sat timbrar factura fiscal rfc datos fiscales activo para facturar",
  gastos: "egresos compras renta nomina insumos inversion impuestos categoria pagos de la clinica",
  contabilidad: "finanzas indicadores utilidad margen fondos regla de sobres balance flujo de efectivo estados financieros punto de equilibrio contador capital de trabajo endeudamiento",
  asistencia: "checada entrada salida horario personal puntualidad empleados",
  "regulacion-sanitaria": "cofepris aviso de funcionamiento licencia sanitaria normas",
  rpbi: "residuos peligrosos biologico infecciosos bitacora",
  contrasena: "cambiar contrasena seguridad clave acceso",
  planes: "plan suscripcion pago prueba precio",
};

/** Palabras que no ayudan a encontrar nada ("dónde está lo de los colaboradores"). */
const PALABRAS_VACIAS = new Set([
  "a", "al", "de", "del", "la", "las", "el", "los", "lo", "un", "una", "unos", "unas", "en", "y", "o", "u", "que", "para", "por", "con", "sin", "mi", "mis", "su", "sus", "se", "es",
  "como", "donde", "cual", "cuales", "esta", "estan", "ver", "quiero", "puedo", "hacer", "hago", "buscar", "busco", "necesito", "dime", "me", "te", "ir", "abrir", "mostrar", "muestrame", "acerca", "sobre", "quien", "quienes", "cuanto", "cuantos", "cuando", "donde",
]);

export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Quita el plural más común para que "colaboradores" y "colaborador" sean la misma palabra. */
function raiz(palabra: string): string {
  if (palabra.length > 5 && palabra.endsWith("es")) return palabra.slice(0, -2);
  if (palabra.length > 4 && palabra.endsWith("s")) return palabra.slice(0, -1);
  return palabra;
}

function distancia(a: string, b: string, maximo: number): number {
  if (Math.abs(a.length - b.length) > maximo) return maximo + 1;
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let anterior = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
      anterior = temp;
    }
  }
  return fila[b.length];
}

function prefijoComun(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

type Ayuda = { titulo: string; resumen: string; puntos: string[] };

/** Arma el índice de búsqueda con el menú, las palabras clave y la ayuda de cada pantalla. */
export function construirIndice(menu: readonly ItemMenu[], ayudas: Record<string, Ayuda>, claves: Record<string, string> = PALABRAS_CLAVE): EntradaBusqueda[] {
  const entradas: EntradaBusqueda[] = [];
  const agregar = (id: string, titulo: string, ruta: string) => {
    const ayuda = ayudas[id];
    const descripcion = ayuda?.resumen ?? "";
    entradas.push({
      id,
      titulo,
      ruta,
      descripcion,
      tituloNorm: normalizarTexto(titulo),
      rutaNorm: normalizarTexto(ruta),
      clavesNorm: normalizarTexto(claves[id] ?? ""),
      cuerpoNorm: normalizarTexto([ayuda?.titulo, ayuda?.resumen, ...(ayuda?.puntos ?? [])].filter(Boolean).join(" ")),
    });
  };
  for (const item of menu) {
    agregar(item.id, item.label, item.label);
    for (const hijo of item.children ?? []) agregar(hijo.id, hijo.label, `${item.label} › ${hijo.label}`);
  }
  return entradas;
}

function palabrasDe(texto: string): string[] {
  return texto.split(" ").filter(Boolean);
}

/** Cuánto coincide una palabra de la consulta con un texto: 0 si nada. Prefijo y raíz cuentan; una letra mal escrita cuenta menos. */
function coincidencia(token: string, texto: string, palabras: string[], pesoExacto: number, pesoParcial: number, pesoTypo: number): number {
  if (!texto) return 0;
  const r = raiz(token);
  if (palabras.some((p) => p === token || raiz(p) === r)) return pesoExacto;
  if (token.length >= 3 && palabras.some((p) => p.startsWith(token) || raiz(p).startsWith(r))) return pesoParcial;
  if (token.length >= 4 && texto.includes(token)) return pesoParcial * 0.7;
  if (token.length >= 5 && palabras.some((p) => p.length >= 4 && distancia(raiz(p), r, 1) <= 1)) return pesoTypo;
  // Otra conjugación o forma de la misma palabra ("exporto" y "exportar" comparten "export").
  if (token.length >= 6 && palabras.some((p) => p.length >= 6 && prefijoComun(p, token) >= Math.max(5, token.length - 2))) return pesoTypo;
  return 0;
}

/** Las mejores secciones para una frase. Cada palabra que escribes debe encontrar algo; las que no ayudan (de, la, quiero…) se ignoran. */
export function buscarEnIndice(indice: EntradaBusqueda[], consulta: string, limite = 8): ResultadoBusqueda[] {
  const completa = normalizarTexto(consulta);
  const tokens = palabrasDe(completa).filter((t) => !PALABRAS_VACIAS.has(t));
  if (tokens.length === 0) return [];

  const resultados: ResultadoBusqueda[] = [];
  for (const e of indice) {
    const pTitulo = palabrasDe(e.tituloNorm);
    const pRuta = palabrasDe(e.rutaNorm);
    const pClaves = palabrasDe(e.clavesNorm);
    const pCuerpo = palabrasDe(e.cuerpoNorm);
    let puntaje = 0;
    let encontradas = 0;
    for (const t of tokens) {
      const s = Math.max(
        coincidencia(t, e.tituloNorm, pTitulo, 12, 9, 6),
        coincidencia(t, e.rutaNorm, pRuta, 6, 4, 3),
        coincidencia(t, e.clavesNorm, pClaves, 7, 5, 4),
        coincidencia(t, e.cuerpoNorm, pCuerpo, 3, 2, 1.5)
      );
      if (s > 0) {
        encontradas += 1;
        puntaje += s;
      }
    }
    if (encontradas < tokens.length) continue; // cada palabra tiene que encontrarse en algún lado
    if (completa && e.tituloNorm === completa) puntaje += 8; // escribiste el nombre exacto
    resultados.push({ ...e, puntaje });
  }
  return resultados.sort((a, b) => b.puntaje - a.puntaje || a.titulo.length - b.titulo.length || a.titulo.localeCompare(b.titulo)).slice(0, limite);
}
