"use client";

import { useEffect, useState } from "react";
import { mensajeAvisoCaso, urlWhatsApp } from "@/lib/avisoWhatsApp";
import { normalizarNombre } from "@/lib/contactosColegas";
import { useContactosColegas } from "./ContactosColegas";

/** Para quien envió un caso que el colega todavía no atiende: MO no le avisa
 * solo, así que aquí se abre WhatsApp con el aviso ya escrito. El número se
 * toma de los colegas que ya invitaste desde este dispositivo y se recuerda. */
export default function AvisoAlColega({ nombreColega, cantidad = 1 }: { nombreColega: string; cantidad?: number }) {
  const [numero, setNumero] = useState("");
  const { contactos, recordar } = useContactosColegas();

  useEffect(() => {
    if (numero) return;
    const guardado = contactos.find((c) => c.whatsapp && normalizarNombre(c.nombre) === normalizarNombre(nombreColega));
    if (guardado) setNumero(guardado.whatsapp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactos, nombreColega]);

  function avisar() {
    recordar({ nombre: nombreColega, whatsapp: numero, correo: "" });
    window.open(urlWhatsApp(numero, mensajeAvisoCaso(nombreColega, cantidad)), "_blank");
  }

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4">
      <p className="text-sm font-medium text-ink">Avísale a {nombreColega}</p>
      <p className="mt-0.5 text-xs text-ink/60">
        MO no le manda aviso solo: toca el botón y se abre WhatsApp con el mensaje listo (sin datos del paciente).
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="tel"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="WhatsApp (10 dígitos), opcional"
          className="min-w-0 flex-1 rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
        />
        <button
          onClick={avisar}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Avisar por WhatsApp
        </button>
      </div>
    </div>
  );
}
