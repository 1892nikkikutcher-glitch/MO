"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMoConecta } from "@/context/MoConectaContext";
import { useInvitacionesDeCasos } from "@/lib/useInvitacionesDeCasos";
import { capitalizarNombre } from "@/lib/textoNombre";
import {
  contactosDeInvitaciones,
  escribirContactosLocales,
  guardarContacto,
  idContacto,
  leerContactosLocales,
  mismoColega,
  telefonoLocal,
  unirContactos,
  type ContactoColega,
} from "@/lib/contactosColegas";

/** Tu agenda de colegas: se guarda en TU cuenta (users/{uid}/contactosColegas),
 * así aparece igual en el celular y en la computadora, con nombre, WhatsApp y
 * correo. Se suma a lo que ya se sabe de tus invitaciones anteriores y a la
 * copia de este dispositivo (lo que ya habías capturado antes se sube solo). */
export function useContactosColegas() {
  const { uid, casosEnviados } = useMoConecta();
  const invitaciones = useInvitacionesDeCasos(casosEnviados.filter((c) => !c.destinatarioUid).map((c) => c.id));
  const [locales, setLocales] = useState<ContactoColega[]>([]);
  const [nube, setNube] = useState<ContactoColega[] | null>(null);
  const migrado = useRef(false);

  useEffect(() => setLocales(leerContactosLocales()), []);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      collection(db, `users/${uid}/contactosColegas`),
      (snap) => setNube(snap.docs.map((d) => d.data() as ContactoColega)),
      (err) => {
        console.error("No se pudo leer tu agenda de colegas", err);
        setNube([]);
      }
    );
  }, [uid]);

  const contactos = useMemo(
    () => unirContactos(locales, nube ?? [], contactosDeInvitaciones(Object.values(invitaciones))),
    [locales, nube, invitaciones]
  );

  // Una sola vez: lo que ya estaba guardado solo en este dispositivo se sube a la cuenta.
  useEffect(() => {
    if (!uid || nube === null || migrado.current || locales.length === 0) return;
    migrado.current = true;
    locales
      .filter((l) => !nube.some((n) => mismoColega(n, l) && n.whatsapp === l.whatsapp && n.correo === l.correo))
      .forEach((l) => {
        void setDoc(doc(db, `users/${uid}/contactosColegas`, idContacto(l)), l, { merge: true }).catch((e) =>
          console.error("No se pudo subir un contacto", e)
        );
      });
  }, [uid, nube, locales]);

  const recordar = (datos: { nombre: string; whatsapp: string; correo: string }) => {
    const nuevo: ContactoColega = {
      nombre: capitalizarNombre(datos.nombre.trim()),
      whatsapp: datos.whatsapp.trim(),
      correo: datos.correo.trim(),
      ultimoUso: new Date().toISOString(),
    };
    if (!nuevo.nombre && !nuevo.correo && !telefonoLocal(nuevo.whatsapp)) return;
    // Se funde con lo que ya se sabía de ese colega (sin perder su correo o WhatsApp).
    const fusionado = unirContactos(contactos, [nuevo]).find((c) => mismoColega(c, nuevo)) ?? nuevo;
    const siguiente = guardarContacto(locales, fusionado);
    setLocales(siguiente);
    escribirContactosLocales(siguiente);
    if (uid) {
      void setDoc(doc(db, `users/${uid}/contactosColegas`, idContacto(fusionado)), fusionado, { merge: true }).catch((e) =>
        console.error("No se pudo guardar el contacto", e)
      );
    }
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
