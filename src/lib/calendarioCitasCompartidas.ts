/** Calendario mensual de las citas que un colega comparte en MO Conecta. Puro
 * (sin React): arma la cuadrícula del mes (semana de lunes a domingo) y ubica
 * cada cita en su día. */

export type CitaCompartida = { fecha: string; hora: string; estatus: string; tratamientos: string[] };

export type DiaCalendario = { fecha: string; dia: number; citas: CitaCompartida[] };

const dosDigitos = (n: number) => String(n).padStart(2, "0");

/** Semanas del mes (`mes0` = 0 para enero); los huecos antes del día 1 y
 * después del último día son `null`. Las citas de cada día van por hora. */
export function semanasDelMes(anio: number, mes0: number, citas: CitaCompartida[]): (DiaCalendario | null)[][] {
  const diasEnMes = new Date(anio, mes0 + 1, 0).getDate();
  const huecosInicio = (new Date(anio, mes0, 1).getDay() + 6) % 7; // lunes = 0
  const celdas: (DiaCalendario | null)[] = Array.from({ length: huecosInicio }, () => null);
  for (let dia = 1; dia <= diasEnMes; dia++) {
    const fecha = `${anio}-${dosDigitos(mes0 + 1)}-${dosDigitos(dia)}`;
    celdas.push({
      fecha,
      dia,
      citas: citas.filter((c) => c.fecha.slice(0, 10) === fecha).sort((a, b) => a.hora.localeCompare(b.hora)),
    });
  }
  while (celdas.length % 7 !== 0) celdas.push(null);
  const semanas: (DiaCalendario | null)[][] = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));
  return semanas;
}

/** Mes que conviene mostrar al abrir: el de la próxima cita (hoy o después); si
 * ya no hay próximas, el de la última cita; sin citas, el de hoy. */
export function mesInicial(citas: CitaCompartida[], hoyISO: string): { anio: number; mes0: number } {
  const fechas = citas.map((c) => c.fecha.slice(0, 10)).filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f)).sort();
  const elegida = fechas.find((f) => f >= hoyISO) ?? fechas[fechas.length - 1] ?? hoyISO;
  return { anio: Number(elegida.slice(0, 4)), mes0: Number(elegida.slice(5, 7)) - 1 };
}

export type TonoEstatus = "exito" | "peligro" | "aviso" | "neutro";

/** Color de la cita según su estatus (Atendida, Confirmada, No asistió...). */
export function tonoDeEstatus(estatus: string): TonoEstatus {
  const e = estatus.toLowerCase();
  if (/atendid|complet/.test(e)) return "exito";
  if (/cancel|no asisti|no se present|inasist/.test(e)) return "peligro";
  if (/confirm/.test(e)) return "neutro";
  return "aviso";
}
