"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import Dashboard from "@/components/Dashboard";

type View = "login" | "register" | "forgot";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Home() {
  const [view, setView] = useState<View>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setCheckingSession(false);
    });
    return unsubscribe;
  }, []);

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const switchView = (v: View) => {
    resetMessages();
    setPassword("");
    setView(v);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!EMAIL_RE.test(email)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setSuccess("¡Bienvenido de nuevo!");
    } catch (err: any) {
      setError(
        err.code === "auth/invalid-credential"
          ? "Correo o contraseña incorrectos. Si aún no tienes cuenta, regístrate primero."
          : "No se pudo iniciar sesión. Inténtalo de nuevo."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!EMAIL_RE.test(email)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setSuccess("¡Cuenta creada con éxito!");
    } catch (err: any) {
      setError(
        err.code === "auth/email-already-in-use"
          ? "Ya existe una cuenta con ese correo."
          : "No se pudo crear la cuenta. Inténtalo de nuevo."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!EMAIL_RE.test(email)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Revisa tu correo para restablecer tu contraseña.");
    } catch (err: any) {
      setError("No se pudo enviar el correo. Verifica la dirección e inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSession) {
    return <main className="bg-app flex min-h-screen items-center justify-center" />;
  }

  if (user) {
    return (
      <Dashboard
        uid={user.uid}
        userEmail={user.email ?? ""}
        onLogout={() => {
          auth.signOut();
          setEmail("");
          setPassword("");
          switchView("login");
        }}
      />
    );
  }

  return (
    <main className="bg-app flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-8xl font-bold text-transparent">
        MO
      </h1>
      <p className="mt-2 bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-lg font-medium uppercase tracking-widest text-transparent">
        Gestión Odontológica
      </p>

      <div
        className="mt-12 w-full max-w-sm rounded-2xl border border-amber-400/40 bg-modal p-8"
        style={{
          boxShadow:
            "0 0 15px 2px rgba(251,146,60,0.55), 0 0 40px 10px rgba(251,146,60,0.3), 0 0 80px 20px rgba(251,146,60,0.12)",
        }}
      >
        {view !== "forgot" && (
          <div className="mb-6 flex rounded-lg bg-white/5 p-1 text-sm font-medium">
            <button
              onClick={() => switchView("login")}
              className={`flex-1 rounded-md py-2 transition-colors ${
                view === "login" ? "bg-white/10 text-white" : "text-white/50"
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => switchView("register")}
              className={`flex-1 rounded-md py-2 transition-colors ${
                view === "register" ? "bg-white/10 text-white" : "text-white/50"
              }`}
            >
              Registrarse
            </button>
          </div>
        )}

        {(error || success) && (
          <div
            className={`mb-4 rounded-lg px-3 py-2 text-xs ${
              error
                ? "bg-red-500/10 text-red-300"
                : "bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {error || success}
          </div>
        )}

        {view === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-amber-400/60"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs font-medium text-white/60">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => switchView("forgot")}
                  className="text-xs font-medium text-amber-400 hover:text-amber-300"
                >
                  ¿Olvidé mi contraseña?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-amber-400/60"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
            >
              {isLoading ? "Ingresando..." : "Iniciar Sesión"}
            </button>
          </form>
        )}

        {view === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-amber-400/60"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-amber-400/60"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
            >
              {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
            </button>
          </form>
        )}

        {view === "forgot" && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Restablecer contraseña
              </h2>
              <p className="mt-1 text-xs text-white/50">
                Ingresa tu correo y te enviaremos instrucciones para
                restablecer tu contraseña.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-amber-400/60"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
            >
              {isLoading ? "Enviando..." : "Enviar Instrucciones"}
            </button>

            <button
              type="button"
              onClick={() => switchView("login")}
              className="w-full text-center text-xs font-medium text-white/50 hover:text-white"
            >
              Volver a Iniciar Sesión
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
