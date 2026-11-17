"use client";

import { useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { usePatientData } from "@/context/PatientDataContext";
import { correoValido, mensajeErrorCambioCorreo, normalizarCorreo } from "@/lib/cambioCorreo";

function CambiarCorreo({ userEmail }: { userEmail: string }) {
  const [correoNuevo, setCorreoNuevo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviadoA, setEnviadoA] = useState("");
  const [error, setError] = useState("");

  // Solo las cuentas con contraseña pueden cambiar su correo desde aquí.
  const conContrasena = auth.currentUser?.providerData.some((p) => p.providerId === "password") ?? true;

  const enviar = async () => {
    setError("");
    const nuevo = normalizarCorreo(correoNuevo);
    if (!correoValido(nuevo)) {
      setError("El correo nuevo no parece válido. Revisa que tenga @ y un dominio.");
      return;
    }
    if (nuevo === normalizarCorreo(userEmail)) {
      setError("Ese ya es el correo de tu cuenta.");
      return;
    }
    if (!contrasena) {
      setError("Escribe tu contraseña actual para confirmar que eres tú.");
      return;
    }
    const usuario = auth.currentUser;
    if (!usuario?.email) {
      setError("No hay una sesión activa. Vuelve a iniciar sesión.");
      return;
    }
    setEnviando(true);
    try {
      await reauthenticateWithCredential(usuario, EmailAuthProvider.credential(usuario.email, contrasena));
      await verifyBeforeUpdateEmail(usuario, nuevo);
      setEnviadoA(nuevo);
      setContrasena("");
    } catch (err) {
      setError(mensajeErrorCambioCorreo((err as { code?: string })?.code));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Cambiar mi correo</h3>
      <p className="mt-2 text-sm text-ink/60">
        Tu correo actual es <span className="font-semibold text-ink">{userEmail}</span>. Si lo cambias, todo tu
        expediente, tus pacientes y tu equipo se quedan exactamente igual: solo cambia el correo con el que
        entras.
      </p>

      {!conContrasena ? (
        <p className="mt-4 text-sm text-ink/60">
          Tu cuenta entra con otro método y no con contraseña, así que este cambio no se puede hacer desde aquí.
          Escríbenos desde Sugerencias y te ayudamos.
        </p>
      ) : enviadoA ? (
        <div className="mt-4 space-y-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
          <p>
            Te enviamos un enlace a <span className="font-semibold">{enviadoA}</span>. Ábrelo para confirmar el
            cambio; mientras no lo abras, sigues entrando con <span className="font-semibold">{userEmail}</span>.
          </p>
          <p>
            Cuando lo confirmes, entra con el correo nuevo y la misma contraseña (puede que MO te pida iniciar
            sesión otra vez). Si no lo ves en unos minutos, revisa Spam o Correo no deseado.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="text-ink/60">Correo nuevo</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="off"
              value={correoNuevo}
              onChange={(e) => setCorreoNuevo(e.target.value)}
              placeholder="nuevo@correo.com"
              className="mt-1 w-full rounded-lg border border-edge/15 bg-inset px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-accent/60 focus:outline-none"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink/60">Tu contraseña actual</span>
            <input
              type="password"
              autoComplete="current-password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              className="mt-1 w-full rounded-lg border border-edge/15 bg-inset px-3 py-2 text-sm text-ink focus:border-accent/60 focus:outline-none"
            />
          </label>
          <button
            onClick={enviar}
            disabled={enviando}
            className="rounded-lg border border-accent/60 bg-accent/15 px-5 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:opacity-40"
          >
            {enviando ? "Enviando..." : "Enviar enlace de confirmación"}
          </button>
          <p className="text-xs text-ink/50">
            ¿Ya no tienes acceso a tu correo actual? Escríbenos desde Sugerencias: verificamos que eres tú y lo
            cambiamos nosotros.
          </p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}

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
            className="mt-4 rounded-lg border border-accent/60 bg-accent/15 px-5 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:opacity-40"
          >
            {enviando ? "Enviando..." : "Enviar correo para cambiar mi contraseña"}
          </button>
        )}

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </div>

      <CambiarCorreo userEmail={userEmail} />
    </div>
  );
}
