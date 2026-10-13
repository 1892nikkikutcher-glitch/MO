"use client";

/** Página pública de invitación de MO Conecta — fuera del Dashboard a
 * propósito (quien la abre puede no tener cuenta todavía). Autocontenida:
 * su propio mini inicio de sesión/registro, en vez de reusar page.tsx, para
 * no tener que hacer ida y vuelta a "/" y perder el token en el camino. Sin
 * recursos externos, Referrer-Policy: no-referrer (next.config.ts). */

import { use, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { obtenerInvitacionPublicaApi, reclamarInvitacionApi } from "@/lib/conectaApi";
import { AutenticacionInline, Shell, VerificarCorreo, botonPrimario } from "@/components/conecta/InvitacionComun";

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
      <p className="text-ink/70">
        <strong className="text-ink">{invitacion.remitenteNombre}</strong> te envió una interconsulta odontológica
        segura mediante MO.
      </p>
      <p className="mt-1 text-xs text-ink/40">
        Por privacidad, la información clínica solo estará disponible después de identificarte.
      </p>

      <div className="mt-6">
        {!user && <AutenticacionInline />}
        {user && !user.emailVerified && (
          <VerificarCorreo user={user} renderListo={() => <ReclamarInvitacion token={token} />} />
        )}
        {user && user.emailVerified && <ReclamarInvitacion token={token} />}
      </div>
    </Shell>
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
        <p className="text-sm text-success">Acceso otorgado — ya puedes ver este caso en MO.</p>
        <a href="/" className={`${botonPrimario} block w-full text-center`}>
          Ir a MO Conecta
        </a>
      </div>
    );
  }
  if (resultado?.tipo === "solicitud_creada") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-warning">
          Tu identidad no coincide exactamente con la que el remitente registró — se envió una solicitud de acceso.
          Espera su aprobación.
        </p>
        <p className="text-xs text-ink/50">
          Mientras esperas, puedes entrar a MO para completar tu perfil profesional u otras cosas — el acceso a
          este caso en particular aparecerá solo, en cuanto el remitente lo apruebe.
        </p>
        <a href="/" className={`${botonPrimario} block w-full text-center`}>
          Ir a MO
        </a>
        <button
          onClick={() => signOut(auth)}
          className="w-full text-center text-xs text-ink/50 hover:text-ink/80"
        >
          ¿Esta invitación era para otra cuenta tuya? Cierra sesión e identifícate de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-danger">{error}</p>}
      <button onClick={reclamar} disabled={reclamando} className={`${botonPrimario} w-full`}>
        {reclamando ? "Reclamando…" : "Reclamar interconsulta"}
      </button>
    </div>
  );
}
