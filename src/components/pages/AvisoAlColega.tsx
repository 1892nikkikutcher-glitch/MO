"use client";

import { useEffect, useState } from "react";
import { mensajeAvisoCaso, urlWhatsApp } from "@/lib/avisoWhatsApp";
import {
  escribirContactosLocales,
  guardarContacto,
  leerContactosLocales,
  normalizarNombre,
  telefonoLocal,
} from "@/lib/contactosColegas";

/** Para quien envió un caso que el colega todavía no atiende: MO no le avisa
 * solo, así que aquí se abre WhatsApp con el aviso ya escrito. El número se
 * toma de los colegas que ya invitaste desde este dispositivo y se recuerda. */
export default function AvisoAlColega({ nombreColega }: { nombreColega: string }) {
  const [numero, setNumero] = useState("");

  useEffect(() => {
    const guardado = leerContactosLocales().find((c) => normalizarNombre(c.nombre) === normalizarNombre(nombreColega));
    if (guardado?.whatsapp) setNumero(guardado.whatsapp);
  }, [nombreColega]);

  function avisar() {
    if (telefonoLocal(numero)) {
      const lista = guardarContacto(leerContactosLocales(), {
        nombre: nombreColega,
        whatsapp: numero,
        correo: "",
        ultimoUso: new Date().toISOString(),
      });
      escribirContactosLocales(lista);
    }
    window.open(urlWhatsApp(numero, mensajeAvisoCaso(nombreColega)), "_blank");
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
