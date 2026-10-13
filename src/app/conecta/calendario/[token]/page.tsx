"use client";

/** Página pública para aceptar un calendario compartido por WhatsApp — fuera del
 * Dashboard a propósito (quien la abre puede no tener cuenta todavía). Muestra
 * solo quién comparte y qué calendario; el colega ve únicamente horarios
 * ocupados y libres, nunca datos de pacientes. */

import { use, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { calendarioInvitacionPublicaApi, reclamarCalendarioApi } from "@/lib/conectaApi";
import { AutenticacionInline, Shell, VerificarCorreo, botonPrimario } from "@/components/conecta/InvitacionComun";

type InvitacionPublica = {
  remitenteNombre: string;
  recursoNombre: string;
  destinatarioNombre: string | null;
  estado: "disponible" | "vencida" | "usada" | "cancelada" | "revocado";
};

export default function CalendarioInvitacionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [invitacion, setInvitacion] = useState<InvitacionPublica | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [revisandoSesion, setRevisandoSesion] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setRevisandoSesion(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    calendarioInvitacionPublicaApi(token)
      .then(setInvitacion)
      .catch((err) => setError(err instanceof Error ? err.message : "Invitación no encontrada."))
      .finally(() => setCargando(false));
  }, [token]);

  if (cargando || revisandoSesion) return <Shell>Cargando invitación…</Shell>;
  if (error || !invitacion) return <Shell error>{error ?? "Invitación no encontrada."}</Shell>;
  if (invitacion.estado !== "disponible") {
    const mensaje: Record<string, string> = {
      vencida: "Esta invitación venció. Pídele a quien te la envió que te mande una nueva.",
      usada: "Esta invitación ya fue utilizada.",
      cancelada: "Esta invitación fue cancelada.",
      revocado: "Esta invitación fue cancelada.",
    };
    return <Shell error>{mensaje[invitacion.estado] ?? "Esta invitación ya no está disponible."}</Shell>;
  }

  return (
    <Shell>
      <p className="text-ink/70">
        <strong className="text-ink">{invitacion.remitenteNombre}</strong> quiere compartirte su calendario{" "}
        <strong className="text-ink">«{invitacion.recursoNombre}»</strong> en MO.
      </p>
      <p className="mt-1 text-xs text-ink/50">
        Solo verás horarios ocupados y libres — nunca nombres de pacientes ni tratamientos. Puede dejar de compartirlo
        cuando quiera.
      </p>
      <div className="mt-6">
        {!user && <AutenticacionInline />}
        {user && !user.emailVerified && <VerificarCorreo user={user} renderListo={() => <Aceptar token={token} />} />}
        {user && user.emailVerified && <Aceptar token={token} />}
      </div>
    </Shell>
  );
}

function Aceptar({ token }: { token: string }) {
  const [aceptando, setAceptando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function aceptar() {
    setAceptando(true);
    setError(null);
    try {
      await reclamarCalendarioApi(token);
      setListo(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aceptar la invitación.");
    } finally {
      setAceptando(false);
    }
  }

  if (listo) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-success">Listo: ya puedes ver este calendario.</p>
        <p className="text-xs text-ink/50">Entra a MO → MO Conecta → Calendarios.</p>
        <a href="/" className={`${botonPrimario} block w-full text-center`}>
          Ir a MO
        </a>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-danger">{error}</p>}
      <button onClick={aceptar} disabled={aceptando} className={`${botonPrimario} w-full`}>
        {aceptando ? "Aceptando…" : "Aceptar calendario"}
      </button>
      <button onClick={() => signOut(auth)} className="w-full text-center text-xs text-ink/50 hover:text-ink/80">
        ¿Esta invitación era para otra cuenta tuya? Cierra sesión e identifícate de nuevo
      </button>
    </div>
  );
}
