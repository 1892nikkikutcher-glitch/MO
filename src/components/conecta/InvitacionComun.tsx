"use client";

/** Piezas compartidas por las páginas públicas de invitación de MO Conecta
 * (interconsulta y calendario): contenedor, inicio de sesión/registro con aviso
 * de correo mal escrito y verificación de correo. */

import { useState, type FormEvent } from "react";
import LeyendaProteccion from "./LeyendaProteccion";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { sugerirCorreo } from "@/lib/correoSugerencia";
import AvisoCorreoSugerido from "@/components/AvisoCorreoSugerido";

export const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";
export const botonPrimario =
  "rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

export function Shell({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app p-4">
      <div className="w-full max-w-md rounded-2xl border border-edge/10 bg-modal p-6">
        <h1 className="mb-4 text-lg font-semibold text-ink">MO Conecta</h1>
        {error ? <p className="text-sm text-danger">{children}</p> : children}
        <LeyendaProteccion className="mt-5 border-t border-edge/10 pt-3" />
      </div>
    </div>
  );
}

export function AutenticacionInline() {
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sugerencia, setSugerencia] = useState<string | null>(null);
  const [ignorarSugerencia, setIgnorarSugerencia] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    // Crear cuenta con un correo mal escrito (…@gmail.con) deja a la persona
    // sin poder verificarlo ni reclamar la invitación: se avisa antes.
    if (modo === "registro" && !ignorarSugerencia) {
      const sugerido = sugerirCorreo(email);
      if (sugerido) {
        setSugerencia(sugerido);
        return;
      }
    }
    setEnviando(true);
    try {
      if (modo === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch {
      setError("No se pudo continuar — revisa tu correo y contraseña.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <p className="text-sm text-ink/70">
        {modo === "login" ? "Inicia sesión en MO para continuar." : "Crea tu cuenta en MO para continuar."}
      </p>
      <input
        type="email"
        required
        placeholder="Correo electrónico"
        className={inputClass}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setSugerencia(null);
          setIgnorarSugerencia(false);
        }}
      />
      {sugerencia && (
        <AvisoCorreoSugerido
          sugerencia={sugerencia}
          onUsar={() => {
            setEmail(sugerencia);
            setSugerencia(null);
          }}
          onContinuar={() => {
            setIgnorarSugerencia(true);
            setSugerencia(null);
          }}
        />
      )}
      <input
        type="password"
        required
        placeholder="Contraseña"
        className={inputClass}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={enviando} className={`${botonPrimario} w-full`}>
        {enviando ? "Un momento…" : modo === "login" ? "Iniciar sesión" : "Crear cuenta"}
      </button>
      <button
        type="button"
        onClick={() => setModo(modo === "login" ? "registro" : "login")}
        className="w-full text-center text-xs text-ink/50 hover:text-ink/80"
      >
        {modo === "login" ? "¿No tienes cuenta? Créala" : "¿Ya tienes cuenta? Inicia sesión"}
      </button>
    </form>
  );
}

export function VerificarCorreo({ user, renderListo }: { user: User; renderListo: () => React.ReactNode }) {
  const [enviado, setEnviado] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviarVerificacion() {
    setError(null);
    try {
      await sendEmailVerification(user);
      setEnviado(true);
    } catch {
      setError(
        sugerirCorreo(user.email ?? "")
          ? "No se pudo enviar el correo porque la dirección parece estar mal escrita."
          : "No se pudo enviar el correo — intenta de nuevo en un momento."
      );
    }
  }

  async function yaVerifique() {
    setVerificando(true);
    setError(null);
    try {
      await user.reload();
      setListo(auth.currentUser?.emailVerified ?? false);
    } catch {
      setError("No se pudo comprobar tu correo — intenta de nuevo en un momento.");
    } finally {
      setVerificando(false);
    }
  }

  if (listo) {
    return <>{renderListo()}</>;
  }

  const correoSugerido = user.email ? sugerirCorreo(user.email) : null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/70">
        Para reclamar esta invitación primero verifica tu correo ({user.email}).
      </p>
      {correoSugerido && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-ink/80" role="alert">
          Ese correo parece tener un error — quizá quisiste escribir <strong className="break-all">{correoSugerido}</strong>.
          Si es así, toca «Cierra sesión» aquí abajo y crea tu cuenta de nuevo con el correo correcto; la invitación
          sigue vigente.
        </div>
      )}
      <button onClick={enviarVerificacion} className={`${botonPrimario} w-full`}>
        {enviado ? "Reenviar correo de verificación" : "Enviar correo de verificación"}
      </button>
      {enviado && <p className="text-xs text-ink/50">Revisa tu correo, haz clic en el enlace y vuelve aquí.</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
      <button
        onClick={yaVerifique}
        disabled={verificando}
        className="w-full rounded-lg border border-edge/15 px-4 py-2 text-sm text-ink/80 hover:bg-surface"
      >
        {verificando ? "Comprobando…" : "Ya verifiqué, continuar"}
      </button>
      <button
        onClick={() => signOut(auth)}
        className="w-full text-center text-xs text-ink/50 hover:text-ink/80"
      >
        ¿Este correo está equivocado? Cierra sesión y crea tu cuenta con el correo correcto
      </button>
    </div>
  );
}
