/** Recibos de pago compartidos por enlace: el administrador manda por WhatsApp una liga y el paciente descarga su
 * recibo en PDF sin tener cuenta. Lo que se guarda es solo lo necesario para dibujar el recibo (nunca teléfono,
 * correo ni datos clínicos), con un token al azar que nadie puede adivinar y una vigencia. Sin Firebase ni React aquí. */

import { z } from "zod";

/** Cuántos días sirve la liga de un recibo. */
export const DIAS_VIGENCIA_ENLACE_RECIBO = 90;

const texto = (max: number) => z.string().trim().max(max);

export const reciboCompartidoSchema = z
  .object({
    /** Clínica a la que pertenece el pago: el servidor comprueba que quien lo manda sea su administrador. */
    clinicaId: z.string().trim().min(1).max(200),
    pacienteNombre: texto(200),
    clinicaNombre: texto(200),
    logoClinicaUrl: texto(2000).default(""),
    direccionClinica: texto(1000).default(""),
    /** Próxima cita y saldo de Cashback, que van al pie del recibo. */
    notaPie: texto(1000).default(""),
    pago: z
      .object({
        id: texto(100).min(1),
        fecha: texto(40),
        medico: texto(200),
        formaPago: texto(100),
        total: z.number().finite().min(0).max(100_000_000),
        facturar: z.boolean().default(false),
        /** Firma del paciente (imagen); si es demasiado grande simplemente no viaja. */
        firma: z.string().max(400_000).nullable().default(null),
        lineas: z
          .array(
            z.object({
              id: texto(100),
              label: texto(500),
              monto: z.number().finite().min(0).max(100_000_000),
              tratamientoId: texto(100).nullable().optional(),
              folio: texto(50).nullable().optional(),
            })
          )
          .max(60),
      })
      .strict(),
  })
  .strict();

export type ReciboCompartidoEntrada = z.input<typeof reciboCompartidoSchema>;
export type ReciboCompartido = z.output<typeof reciboCompartidoSchema>;

/** Lo que ve quien abre la liga: el recibo sin la clínica de origen. */
export type ReciboPublico = Omit<ReciboCompartido, "clinicaId">;

export function urlRecibo(tokenCrudo: string, origen: string): string {
  return `${origen}/recibo/${tokenCrudo}`;
}

export function fechaDeVencimiento(ahora: Date, dias: number = DIAS_VIGENCIA_ENLACE_RECIBO): string {
  return new Date(ahora.getTime() + dias * 24 * 60 * 60 * 1000).toISOString();
}

export function enlaceVigente(venceEl: string | undefined, ahora: Date): boolean {
  if (!venceEl) return false;
  return new Date(venceEl).getTime() > ahora.getTime();
}

/** El token tiene que parecer uno nuestro antes de ir a buscarlo (evita consultas con basura). */
export function tokenReciboValido(token: string): boolean {
  return /^[a-f0-9]{48}$/.test(token);
}

/** Texto de WhatsApp: el mensaje ya armado del recibo más la liga para descargarlo. */
export function mensajeConEnlaceRecibo(mensaje: string, enlace: string): string {
  return `${mensaje.trim()}\n\nDescarga tu recibo en PDF aquí:\n${enlace}`;
}
