import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { sincronizarCopiasDeCorreo } from "@/lib/cuentaCorreo";

/** Después de que alguien confirma su correo nuevo y vuelve a entrar, pone al
 * día las copias del correo que MO guarda (equipo de la clínica y contacto).
 *
 * El correo sale del TOKEN verificado, nunca del cuerpo de la petición: nadie
 * puede usar esto para escribir un correo que no es el de su cuenta. */
export async function POST(req: NextRequest) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  if (!sesion.email) return NextResponse.json({ ok: true, membresiasActualizadas: 0, clinicasActualizadas: 0 });

  const resultado = await sincronizarCopiasDeCorreo(sesion.uid, sesion.email);
  return NextResponse.json({ ok: true, ...resultado });
}
