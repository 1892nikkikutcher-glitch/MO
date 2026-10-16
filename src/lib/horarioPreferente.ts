/** Horario preferente de un paciente para sus citas (ej. "después de las 18:00 los lunes, miércoles y
 * viernes"), para saber cuándo proponerle una cita. Pura: sin Firestore ni pantalla. */

export type HorarioPreferente = {
  /** Días de la semana que le acomodan: 0 = domingo … 6 = sábado. Vacío = cualquier día. */
  dias: number[];
  /** Hora mínima de inicio ("HH:MM"), ej. "18:00" = después de las 6 de la tarde. */
  desde?: string;
  /** Hora máxima de inicio ("HH:MM"), ej. "13:00" = antes de la 1 de la tarde. */
  hasta?: string;
  nota?: string;
};

/** Orden de los días en pantalla: lunes a domingo. */
export const DIAS_EN_ORDEN = [1, 2, 3, 4, 5, 6, 0] as const;
export const DIA_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DIA_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const horaValida = (h: string | undefined): h is string => Boolean(h && HORA.test(h));

/** Limpia lo capturado: días únicos y válidos, horas válidas, sin textos vacíos. Devuelve `null` si no
 * quedó nada (así se guarda "sin preferencia" sin dejar un objeto vacío ni un `undefined` que Firestore
 * rechaza). */
export function normalizarHorarioPreferente(h: Partial<HorarioPreferente> | null | undefined): HorarioPreferente | null {
  if (!h) return null;
  const dias = Array.from(new Set((h.dias ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))).sort(
    (a, b) => DIAS_EN_ORDEN.indexOf(a as never) - DIAS_EN_ORDEN.indexOf(b as never)
  );
  const desde = horaValida(h.desde) ? h.desde : undefined;
  let hasta = horaValida(h.hasta) ? h.hasta : undefined;
  if (desde && hasta && hasta < desde) hasta = undefined; // un rango al revés no tiene sentido
  const nota = h.nota?.trim() || undefined;
  if (dias.length === 0 && !desde && !hasta && !nota) return null;
  return { dias, ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}), ...(nota ? { nota } : {}) };
}

function listaDeDias(dias: number[]): string {
  if (dias.length === 0) return "";
  if (dias.length === 7) return "todos los días";
  const nombres = dias.map((d) => DIA_LARGO[d]);
  const lista = nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
  return lista;
}

const horaLegible = (h: string) => h;

/** "Lunes, miércoles y viernes · después de las 18:00". Vacío si no hay preferencia. */
export function describirHorarioPreferente(h: HorarioPreferente | null | undefined): string {
  const n = normalizarHorarioPreferente(h);
  if (!n) return "";
  const partes: string[] = [];
  const dias = listaDeDias(n.dias);
  if (dias) partes.push(dias);
  if (n.desde && n.hasta) partes.push(`entre las ${horaLegible(n.desde)} y las ${horaLegible(n.hasta)}`);
  else if (n.desde) partes.push(`después de las ${horaLegible(n.desde)}`);
  else if (n.hasta) partes.push(`antes de las ${horaLegible(n.hasta)}`);
  const unido = partes.join(" · ");
  const base = unido.charAt(0).toUpperCase() + unido.slice(1);
  return n.nota ? (base ? `${base} (${n.nota})` : n.nota) : base;
}

/** ¿Una cita que empieza en `fecha` ("YYYY-MM-DD") a `horaInicio` ("HH:MM") cae en el horario preferente?
 * `null` si el paciente no tiene preferencia (no hay nada con qué comparar). */
export function citaEnHorarioPreferente(
  h: HorarioPreferente | null | undefined,
  fecha: string,
  horaInicio: string
): boolean | null {
  const n = normalizarHorarioPreferente(h);
  if (!n || (n.dias.length === 0 && !n.desde && !n.hasta)) return null;
  if (n.dias.length > 0) {
    const d = new Date(`${fecha}T00:00:00`);
    if (Number.isNaN(d.getTime()) || !n.dias.includes(d.getDay())) return false;
  }
  if (horaValida(horaInicio)) {
    if (n.desde && horaInicio < n.desde) return false;
    if (n.hasta && horaInicio > n.hasta) return false;
  }
  return true;
}

export type PropuestaDeCita = { fecha: string; hora: string; etiqueta: string };

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const aIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Las próximas fechas que le acomodan, a partir de `desde` (inclusive), con la hora más temprana que
 * prefiere ("desde") o, si solo dijo "antes de…", la hora que se pase en `horaPorDefecto`. Con solo
 * horas y sin días, propone los próximos días hábiles (lunes a sábado). */
export function proximasPropuestasDeCita(
  h: HorarioPreferente | null | undefined,
  desde: Date,
  cuantas = 3,
  horaPorDefecto = "09:00"
): PropuestaDeCita[] {
  const n = normalizarHorarioPreferente(h);
  if (!n || (n.dias.length === 0 && !n.desde && !n.hasta)) return [];
  const hora = n.desde ?? (n.hasta && n.hasta < horaPorDefecto ? n.hasta : horaPorDefecto);
  const dias = n.dias.length > 0 ? n.dias : [1, 2, 3, 4, 5, 6];
  const resultado: PropuestaDeCita[] = [];
  const cursor = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  for (let i = 0; i < 60 && resultado.length < cuantas; i++) {
    if (dias.includes(cursor.getDay())) {
      resultado.push({
        fecha: aIso(cursor),
        hora,
        etiqueta: `${DIA_CORTO[cursor.getDay()]} ${cursor.getDate()} ${MESES[cursor.getMonth()]} · ${hora}`,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return resultado;
}
