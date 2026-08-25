"use client";

/** Página pública de invitación de MO Conecta — fuera del Dashboard a
 * propósito (quien la abre puede no tener cuenta todavía). Autocontenida:
 * su propio mini inicio de sesión/registro, en vez de reusar page.tsx, para
 * no tener que hacer ida y vuelta a "/" y perder el token en el camino. Sin
 * recursos externos, Referrer-Policy: no-referrer (next.config.ts). */

import { use, useEffect, useState, type FormEvent } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { obtenerInvitacionPublicaApi, reclamarInvitacionApi } from "@/lib/conectaApi";

const inputClass =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/60";
const botonPrimario =
  "rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

type InvitacionPublica = {
  remitenteNombre: string;
  destinatarioNombre: string | null;
  canal: string;
  estado: "activa" | "reclamada" | "vencida" | "cancelada";
};

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [invitacion, setInvitacion] = useState<InvitacionPublica | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setCheckingSession(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    obtenerInvitacionPublicaApi(token)
      .then(setInvitacion)
      .catch((err) => setError(err instanceof Error ? err.message : "Invitación no encontrada."))
      .finally(() => setCargando(false));
  }, [token]);

  if (cargando || checkingSession) {
    return <Shell>Cargando invitación…</Shell>;
  }

  if (error || !invitacion) {
    return <Shell error>{error ?? "Invitación no encontrada."}</Shell>;
  }

  if (invitacion.estado !== "activa") {
    const mensaje = {
      reclamada: "Esta invitación ya fue utilizada.",
      vencida: "Esta invitación venció.",
      cancelada: "Esta invitación fue cancelada.",
    }[invitacion.estado];
    return <Shell error>{mensaje}</Shell>;
  }

  return (
    <Shell>
      <p className="text-white/70">
        <strong className="text-white">{invitacion.remitenteNombre}</strong> te envió una interconsulta odontológica
        segura mediante MO.
      </p>
      <p className="mt-1 text-xs text-white/40">
        Por privacidad, la información clínica solo estará disponible después de identificarte.
      </p>

      <div className="mt-6">
        {!user && <AutenticacionInline />}
        {user && !user.emailVerified && <VerificarCorreo user={user} token={token} />}
        {user && user.emailVerified && <ReclamarInvitacion token={token} />}
      </div>
    </Shell>
  );
}

function Shell({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0d12] p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="mb-4 text-lg font-semibold text-white">MO Conecta</h1>
        {error ? <p className="text-sm text-red-400">{children}</p> : children}
      </div>
    </div>
  );
}

function AutenticacionInline() {
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
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
      <p className="text-sm text-white/70">
        {modo === "login" ? "Inicia sesión en MO para continuar." : "Crea tu cuenta en MO para continuar."}
      </p>
      <input
        type="email"
        required
        placeholder="Correo electrónico"
        className={inputClass}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        required
        placeholder="Contraseña"
        className={inputClass}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={enviando} className={`${botonPrimario} w-full`}>
        {enviando ? "Un momento…" : modo === "login" ? "Iniciar sesión" : "Crear cuenta"}
      </button>
      <button
        type="button"
        onClick={() => setModo(modo === "login" ? "registro" : "login")}
        className="w-full text-center text-xs text-white/50 hover:text-white/80"
      >
        {modo === "login" ? "¿No tienes cuenta? Créala" : "¿Ya tienes cuenta? Inicia sesión"}
      </button>
    </form>
  );
}

function VerificarCorreo({ user, token }: { user: User; token: string }) {
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
      setError("No se pudo enviar el correo — intenta de nuevo en un momento.");
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
    return <ReclamarInvitacion token={token} />;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-white/70">
        Para reclamar esta invitación primero verifica tu correo ({user.email}).
      </p>
      <button onClick={enviarVerificacion} className={`${botonPrimario} w-full`}>
        {enviado ? "Reenviar correo de verificación" : "Enviar correo de verificación"}
      </button>
      {enviado && <p className="text-xs text-white/50">Revisa tu correo, haz clic en el enlace y vuelve aquí.</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        onClick={yaVerifique}
        disabled={verificando}
        className="w-full rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
      >
        {verificando ? "Comprobando…" : "Ya verifiqué, continuar"}
      </button>
    </div>
  );
}

function ReclamarInvitacion({ token }: { token: string }) {
  const [reclamando, setReclamando] = useState(false);
  const [resultado, setResultado] = useState<{ tipo: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reclamar() {
    setReclamando(true);
    setError(null);
    try {
      const r = await reclamarInvitacionApi(token);
      setResultado(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reclamar la invitación.");
    } finally {
      setReclamando(false);
    }
  }

  if (resultado?.tipo === "acceso_otorgado") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-emerald-400">Acceso otorgado — ya puedes ver este caso en MO.</p>
        <a href="/" className={`${botonPrimario} block w-full text-center`}>
          Ir a MO Conecta
        </a>
      </div>
    );
  }
  if (resultado?.tipo === "solicitud_creada") {
    return (
      <p className="text-sm text-amber-300">
        Tu identidad no coincide exactamente con la que el remitente registró — se envió una solicitud de acceso.
        Espera su aprobación.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button onClick={reclamar} disabled={reclamando} className={`${botonPrimario} w-full`}>
        {reclamando ? "Reclamando…" : "Reclamar interconsulta"}
      </button>
    </div>
  );
}
