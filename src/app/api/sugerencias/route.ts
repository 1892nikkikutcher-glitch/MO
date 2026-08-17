import { NextRequest, NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebaseAdmin";
import { verificarSesion } from "@/lib/adminAuth";
import { categoriaSugerenciaOptions, type ClinicInfo, type ClinicMember, type SugerenciaPlataforma } from "@/lib/patientData";

/** Cualquier clínica puede mandar una sugerencia — el cliente solo manda
 * categoría y mensaje; clinicId/clinicNombre/autor los resuelve el
 * servidor a partir del token verificado, nunca de lo que mande el
 * cliente. La colección sugerenciasPlataforma está cerrada por completo a
 * lectura/escritura de cliente en firestore.rules. */
export async function POST(req: NextRequest) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;

  const body = await req.json();
  const categoria = body.categoria;
  const mensaje = typeof body.mensaje === "string" ? body.mensaje.trim() : "";

  if (!categoriaSugerenciaOptions.includes(categoria)) {
    return NextResponse.json({ error: "Categoría inválida." }, { status: 400 });
  }
  if (!mensaje || mensaje.length > 2000) {
    return NextResponse.json({ error: "El mensaje no puede estar vacío ni pasar de 2000 caracteres." }, { status: 400 });
  }

  const membroSnap = await dbAdmin
    .collection("clinicMembers")
    .where("uid", "==", sesion.uid)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (membroSnap.empty) {
    return NextResponse.json({ error: "No se encontró tu clínica." }, { status: 404 });
  }
  const miembro = membroSnap.docs[0].data() as ClinicMember;
  const clinicId = miembro.clinicId;

  const clinicSnap = await dbAdmin.collection("clinics").doc(clinicId).get();
  const clinic = (clinicSnap.exists ? clinicSnap.data() : null) as ClinicInfo | null;

  const nueva: Omit<SugerenciaPlataforma, "id"> = {
    clinicId,
    clinicNombre: clinic?.nombre || "(sin nombre)",
    autor: miembro.nombre || miembro.correo || sesion.email || "Desconocido",
    categoria,
    mensaje,
    estado: "nueva",
    fecha: new Date().toISOString(),
  };

  await dbAdmin.collection("sugerenciasPlataforma").add(nueva);

  return NextResponse.json({ ok: true });
}
