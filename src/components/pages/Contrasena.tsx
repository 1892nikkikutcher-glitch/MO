"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { usePatientData } from "@/context/PatientDataContext";

export default function Contrasena() {
  const { userEmail } = usePatientData();
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  const enviarCorreo = async () => {
    setEnviando(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, userEmail);
      setEnviado(true);
    } catch {
      setError("No se pudo enviar el correo. Intenta de nuevo en unos minutos.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-md space-y-6">
      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Cambiar Contraseña
        </h3>
        <p className="mt-2 text-sm text-ink/60">
          Por seguridad, el cambio de contraseña se hace por correo electrónico. Te enviaremos un
          enlace a <span className="font-semibold text-ink">{userEmail}</span> para que elijas una
          contraseña nueva.
        </p>

        {enviado ? (
          <div className="mt-4 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
            Listo — revisa tu correo ({userEmail}) y sigue el enlace para elegir tu nueva
            contraseña. Si no lo ves en unos minutos, revisa también tu carpeta de Spam o Correo
            no deseado.
          </div>
        ) : (
          <button
            onClick={enviarCorreo}
            disabled={enviando}
            className="mt-4 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {enviando ? "Enviando..." : "Enviar correo para cambiar mi contraseña"}
          </button>
        )}

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}
