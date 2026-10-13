"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMoConecta } from "@/context/MoConectaContext";
import { useInvitacionesDeCasos } from "@/lib/useInvitacionesDeCasos";
import { capitalizarNombre, manejarCambioNombre } from "@/lib/textoNombre";
import {
  SIN_PREFERENCIAS,
  aplicarOcultos,
  clavesDeContacto,
  contactosDeInvitaciones,
  escribirContactosLocales,
  guardarContacto,
  idContacto,
  leerContactosLocales,
  mismoColega,
  mostrarContacto,
  ocultarContacto,
  telefonoLocal,
  unirComoMismaPersona,
  unirContactos,
  type ContactoColega,
  type PreferenciasContactos,
} from "@/lib/contactosColegas";

const ID_PREFERENCIAS = "__preferencias";

type ContactoNube = ContactoColega & { id: string };

/** Tu agenda de colegas: se guarda en TU cuenta (users/{uid}/contactosColegas),
 * así aparece igual en el celular y en la computadora, con nombre, WhatsApp y
 * correo. Se suma a lo que ya se sabe de tus invitaciones anteriores y a la
 * copia de este dispositivo (lo que ya habías capturado antes se sube solo).
 * También guarda tus preferencias: a quién quitaste y quién es "la misma persona". */
export function useContactosColegas() {
  const { uid, casosEnviados } = useMoConecta();
  const invitaciones = useInvitacionesDeCasos(casosEnviados.filter((c) => !c.destinatarioUid).map((c) => c.id));
  const [locales, setLocales] = useState<ContactoColega[]>([]);
  const [nube, setNube] = useState<ContactoNube[] | null>(null);
  const [preferencias, setPreferencias] = useState<PreferenciasContactos>(SIN_PREFERENCIAS);
  const migrado = useRef(false);

  useEffect(() => setLocales(leerContactosLocales()), []);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      collection(db, `users/${uid}/contactosColegas`),
      (snap) => {
        const lista: ContactoNube[] = [];
        let prefs = SIN_PREFERENCIAS;
        snap.docs.forEach((d) => {
          if (d.id === ID_PREFERENCIAS) {
            const p = d.data() as Partial<PreferenciasContactos>;
            prefs = { ocultos: p.ocultos ?? [], alias: p.alias ?? {} };
          } else {
            lista.push({ ...(d.data() as ContactoColega), id: d.id });
          }
        });
        setNube(lista);
        setPreferencias(prefs);
      },
      (err) => {
        console.error("No se pudo leer tu agenda de colegas", err);
        setNube([]);
      }
    );
  }, [uid]);

  const contactos = useMemo(
    () =>
      aplicarOcultos(
        unirContactos(locales, nube ?? [], contactosDeInvitaciones(Object.values(invitaciones))),
        preferencias.ocultos
      ),
    [locales, nube, invitaciones, preferencias.ocultos]
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

  const guardarPreferencias = (p: PreferenciasContactos) => {
    setPreferencias(p);
    if (uid) {
      void setDoc(doc(db, `users/${uid}/contactosColegas`, ID_PREFERENCIAS), p).catch((e) =>
        console.error("No se pudieron guardar tus preferencias", e)
      );
    }
  };

  /** Borra de la nube y de este dispositivo todo lo que sea de ese colega. */
  const borrarRegistros = (c: ContactoColega) => {
    if (uid) {
      (nube ?? [])
        .filter((n) => mismoColega(n, c))
        .forEach((n) => void deleteDoc(doc(db, `users/${uid}/contactosColegas`, n.id)).catch((e) => console.error(e)));
    }
    const restantes = locales.filter((l) => !mismoColega(l, c));
    setLocales(restantes);
    escribirContactosLocales(restantes);
  };

  const escribirContacto = (c: ContactoColega) => {
    const siguiente = guardarContacto(locales, c);
    setLocales(siguiente);
    escribirContactosLocales(siguiente);
    if (uid) {
      void setDoc(doc(db, `users/${uid}/contactosColegas`, idContacto(c)), c, { merge: true }).catch((e) =>
        console.error("No se pudo guardar el contacto", e)
      );
    }
  };

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
    escribirContacto(fusionado);
    // Si lo habías quitado y vuelves a usarlo, reaparece.
    const prefs = mostrarContacto(preferencias, fusionado);
    if (prefs.ocultos.length !== preferencias.ocultos.length) guardarPreferencias(prefs);
  };

  /** Quita al colega de tu agenda (y de los atajos), aunque venga de invitaciones viejas. */
  const quitar = (c: ContactoColega) => {
    borrarRegistros(c);
    guardarPreferencias(ocultarContacto(preferencias, c));
  };

  /** Corrige nombre, WhatsApp o correo de un colega. */
  const editar = (original: ContactoColega, cambios: { nombre: string; whatsapp: string; correo: string }) => {
    const nuevo: ContactoColega = {
      nombre: capitalizarNombre(cambios.nombre.trim()),
      whatsapp: cambios.whatsapp.trim(),
      correo: cambios.correo.trim(),
      ultimoUso: new Date().toISOString(),
    };
    borrarRegistros(original);
    escribirContacto(nuevo);
    // Lo viejo (de invitaciones) se oculta, salvo lo que sigue siendo del colega corregido.
    guardarPreferencias(mostrarContacto(ocultarContacto(preferencias, original, clavesDeContacto(nuevo)), nuevo));
  };

  /** "Es la misma persona": junta `origen` con `destino` en agenda y paneles. */
  const unir = (origen: ContactoColega, destino: ContactoColega) => {
    const { prefs, destino: fusionado } = unirComoMismaPersona(preferencias, origen, destino);
    borrarRegistros(origen);
    escribirContacto({ ...fusionado, ultimoUso: new Date().toISOString() });
    guardarPreferencias(prefs);
  };

  return { contactos, recordar, quitar, editar, unir, preferencias };
}

/** Pantalla "Mis colegas": corregir datos, quitar a quien no quieres ver y juntar
 * a quien se guardó dos veces con nombres distintos. */
export function AdministrarColegas({ onClose }: { onClose: () => void }) {
  const { contactos, quitar, editar, unir } = useContactosColegas();
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: "", whatsapp: "", correo: "" });
  const [uniendo, setUniendo] = useState<string | null>(null);

  const clave = (c: ContactoColega) => idContacto(c);
  const inputClass =
    "w-full rounded-lg border border-edge/10 bg-field px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/60";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Mis colegas</h2>
          <button onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink">
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-ink/50">
          Tus contactos de MO Conecta, guardados en tu cuenta. Corrige sus datos, quita a quien no quieras ver o junta a
          quien aparece dos veces con nombres distintos.
        </p>

        {contactos.length === 0 && <p className="py-4 text-center text-sm text-ink/50">Todavía no tienes colegas guardados.</p>}

        <ul className="space-y-2">
          {contactos.map((c) => {
            const k = clave(c);
            const otros = contactos.filter((o) => clave(o) !== k);
            return (
              <li key={k} className="rounded-xl border border-edge/10 p-3">
                {editando === k ? (
                  <div className="space-y-2">
                    <input className={inputClass} value={form.nombre} onChange={(e) => manejarCambioNombre(e, (v) => setForm((f) => ({ ...f, nombre: v })))} placeholder="Nombre" />
                    <input className={inputClass} type="tel" value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} placeholder="WhatsApp (10 dígitos)" />
                    <input className={inputClass} type="email" value={form.correo} onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))} placeholder="Correo (opcional)" />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          editar(c, form);
                          setEditando(null);
                        }}
                        disabled={!form.nombre.trim()}
                        className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-50"
                      >
                        Guardar
                      </button>
                      <button onClick={() => setEditando(null)} className="rounded-lg border border-edge/10 px-3 py-1.5 text-sm text-ink/70">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-ink">{c.nombre || c.correo}</p>
                    <p className="text-xs text-ink/50">
                      {[c.whatsapp ? `WhatsApp ${c.whatsapp}` : "Sin WhatsApp", c.correo || "Sin correo"].join(" · ")}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      <button
                        onClick={() => {
                          setEditando(k);
                          setForm({ nombre: c.nombre, whatsapp: c.whatsapp, correo: c.correo });
                        }}
                        className="text-accent hover:underline"
                      >
                        Editar
                      </button>
                      {otros.length > 0 && (
                        <button onClick={() => setUniendo(uniendo === k ? null : k)} className="text-accent hover:underline">
                          Es la misma persona que…
                        </button>
                      )}
                      <button
                        onClick={() => window.confirm(`¿Quitar a ${c.nombre || c.correo} de tu agenda de colegas?`) && quitar(c)}
                        className="text-danger hover:underline"
                      >
                        Quitar
                      </button>
                    </div>
                    {uniendo === k && (
                      <div className="mt-2 flex gap-2">
                        <select
                          className={inputClass}
                          defaultValue=""
                          onChange={(e) => {
                            const destino = otros.find((o) => clave(o) === e.target.value);
                            if (destino && window.confirm(`Se junta «${c.nombre}» con «${destino.nombre}» y quedará solo «${destino.nombre}». ¿Continuar?`)) {
                              unir(c, destino);
                            }
                            setUniendo(null);
                          }}
                        >
                          <option value="" disabled>
                            Elige a quién…
                          </option>
                          {otros.map((o) => (
                            <option key={clave(o)} value={clave(o)}>
                              {o.nombre || o.correo}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="rounded-lg border border-edge/10 bg-surface px-4 py-2 text-sm text-ink/70 hover:text-ink">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
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
  const [administrando, setAdministrando] = useState(false);

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
      <div className="mt-2 flex flex-wrap gap-4">
        {hayContactosDelTelefono && (
          <button type="button" onClick={delTelefono} className="text-xs text-accent hover:underline">
            Elegir de los contactos de mi teléfono
          </button>
        )}
        {contactos.length > 0 && (
          <button type="button" onClick={() => setAdministrando(true)} className="text-xs text-accent hover:underline">
            Administrar mis colegas
          </button>
        )}
      </div>
      {administrando && <AdministrarColegas onClose={() => setAdministrando(false)} />}
    </div>
  );
}
