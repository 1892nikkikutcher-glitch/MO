"use client";

import { useEffect, useMemo, useState } from "react";
import { useMoConecta } from "@/context/MoConectaContext";
import { useInvitacionesDeCasos } from "@/lib/useInvitacionesDeCasos";
import { capitalizarNombre } from "@/lib/textoNombre";
import {
  contactosDeInvitaciones,
  escribirContactosLocales,
  guardarContacto,
  leerContactosLocales,
  telefonoLocal,
  unirContactos,
  type ContactoColega,
} from "@/lib/contactosColegas";

/** Colegas que ya invitaste (invitaciones previas + agenda de este dispositivo),
 * para llenar de un toque su nombre, WhatsApp y correo en vez de volver a
 * capturarlos en cada interconsulta. */
export function useContactosColegas() {
  const { casosEnviados } = useMoConecta();
  const invitaciones = useInvitacionesDeCasos(casosEnviados.filter((c) => !c.destinatarioUid).map((c) => c.id));
  const [locales, setLocales] = useState<ContactoColega[]>([]);
  useEffect(() => setLocales(leerContactosLocales()), []);
  const contactos = useMemo(
    () => unirContactos(locales, contactosDeInvitaciones(Object.values(invitaciones))),
    [locales, invitaciones]
  );
  const recordar = (datos: { nombre: string; whatsapp: string; correo: string }) => {
    const siguiente = guardarContacto(locales, { ...datos, correo: datos.correo.trim(), ultimoUso: new Date().toISOString() });
    setLocales(siguiente);
    escribirContactosLocales(siguiente);
  };
  return { contactos, recordar };
}

/** Atajo arriba del formulario de invitación: colegas ya invitados y, en los
 * navegadores que lo permiten (Chrome en Android), los contactos del teléfono. */
export function AtajoColegas({
  contactos,
  onElegir,
}: {
  contactos: ContactoColega[];
  onElegir: (c: { nombre: string; whatsapp: string; correo: string }) => void;
}) {
  const hayContactosDelTelefono =
    typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;

  async function delTelefono() {
    try {
      const nav = navigator as Navigator & {
        contacts: { select: (props: string[], opts?: { multiple?: boolean }) => Promise<{ name?: string[]; tel?: string[] }[]> };
      };
      const [elegido] = await nav.contacts.select(["name", "tel"], { multiple: false });
      if (!elegido) return;
      onElegir({
        nombre: capitalizarNombre((elegido.name?.[0] ?? "").trim()),
        whatsapp: telefonoLocal(elegido.tel?.[0] ?? ""),
        correo: "",
      });
    } catch {
      // El usuario cerró el selector o el navegador lo bloqueó: no hay nada que hacer.
    }
  }

  if (contactos.length === 0 && !hayContactosDelTelefono) return null;
  return (
    <div className="rounded-xl border border-edge/10 bg-surface p-3">
      {contactos.length > 0 && (
        <>
          <p className="mb-2 text-xs text-ink/60">Colegas que ya invitaste — toca uno para llenar sus datos:</p>
          <div className="flex flex-wrap gap-2">
            {contactos.slice(0, 8).map((c) => (
              <button
                key={c.nombre + c.correo + c.whatsapp}
                type="button"
                onClick={() => onElegir({ nombre: c.nombre, whatsapp: c.whatsapp, correo: c.correo })}
                className="rounded-full border border-edge/15 px-3 py-1 text-xs text-ink/80 transition-colors hover:border-accent/50 hover:text-ink"
              >
                {c.nombre || c.correo}
              </button>
            ))}
          </div>
        </>
      )}
      {hayContactosDelTelefono && (
        <button type="button" onClick={delTelefono} className="mt-2 text-xs text-accent hover:underline">
          Elegir de los contactos de mi teléfono
        </button>
      )}
    </div>
  );
}
