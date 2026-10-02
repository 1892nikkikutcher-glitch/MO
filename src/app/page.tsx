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
      <div
        className="flex h-60 w-60 items-center justify-center rounded-full border-2 border-premium"
        style={{ boxShadow: "0 0 28px 2px rgb(var(--premium-rgb) / 0.5)" }}
      >
        <h1 className="bg-gradient-to-r from-[#FF5757] via-[#D946EF] to-[#3B82F6] bg-clip-text text-7xl font-bold text-transparent">
          MO
        </h1>
      </div>
      <p className="mt-2 text-lg font-medium uppercase tracking-widest text-ink/50">
        Salud Bucal Universal
      </p>

      <div className="mt-12 w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-8">
        {view !== "forgot" && (
          <div className="mb-6 flex rounded-lg bg-inset p-1 text-sm font-medium">
            <button
              onClick={() => switchView("login")}
              className={`flex-1 rounded-md py-2 transition-colors ${
                view === "login" ? "bg-accent/15 text-accent" : "text-ink/50"
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => switchView("register")}
              className={`flex-1 rounded-md py-2 transition-colors ${
                view === "register" ? "bg-accent/15 text-accent" : "text-ink/50"
              }`}
            >
              Registrarse
            </button>
          </div>
        )}

        {(error || success) && (
          <div
            className={`mb-4 rounded-lg px-3 py-2 text-xs ${
              error ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
            }`}
          >
            {error || success}
          </div>
        )}

        {view === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs font-medium text-ink/60">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => switchView("forgot")}
                  className="text-xs font-medium text-accent hover:text-accent/80"
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
                className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isLoading ? "Ingresando..." : "Iniciar Sesión"}
            </button>
          </form>
        )}

        {view === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
            </button>
          </form>
        )}

        {view === "forgot" && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-ink">
                Restablecer contraseña
              </h2>
              <p className="mt-1 text-xs text-ink/50">
                Ingresa tu correo y te enviaremos instrucciones para
                restablecer tu contraseña.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isLoading ? "Enviando..." : "Enviar Instrucciones"}
            </button>

            <button
              type="button"
              onClick={() => switchView("login")}
              className="w-full text-center text-xs font-medium text-ink/50 hover:text-ink"
            >
              Volver a Iniciar Sesión
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
