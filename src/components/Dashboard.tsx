"use client";

import { useState } from "react";
import Sidebar, { navItems } from "./Sidebar";
import Inicio from "./pages/Inicio";
import Pacientes from "./pages/Pacientes";
import Agenda from "./pages/Agenda";
import Recetas from "./pages/Recetas";
import PerfilDoctor from "./pages/PerfilDoctor";
import Colaboradores from "./pages/Colaboradores";
import Metas from "./pages/Metas";
import Membresias from "./pages/Membresias";
import Asistencia from "./pages/Asistencia";
import Procedimientos from "./pages/Procedimientos";
import HistorialClinicoAdmin from "./pages/HistorialClinicoAdmin";
import Medicamentos from "./pages/Medicamentos";
import FormatosWhatsApp from "./pages/FormatosWhatsApp";
import Planes from "./pages/Planes";
import Documentos from "./pages/Documentos";
import Gastos from "./pages/Gastos";
import RegulacionSanitaria from "./pages/RegulacionSanitaria";
import Educacion from "./pages/Educacion";
import GlobalAgregarPago from "./GlobalAgregarPago";
import GlobalNuevoPaciente from "./GlobalNuevoPaciente";
import { PatientDataProvider, usePatientData } from "@/context/PatientDataContext";

const quickActions = [
  { key: "pacientes", pageId: "pacientes", label: "Nuevo Paciente", color: "amber" },
  { key: "agenda", pageId: "agenda", label: "Agenda", color: "amber" },
  { key: "nueva-cita", pageId: "agenda", label: "Nueva Cita", color: "amber", badge: "+" },
  { key: "material", pageId: "material", label: "Nuevo Material", color: "amber" },
  { key: "membresias", pageId: "membresias", label: "Nueva Membresía", color: "amber" },
  { key: "gastos", pageId: "gastos", label: "Registrar Pago", color: "green" },
] as const;

function InvitePrompt() {
  const { pendingInvite, aceptarInvite, rechazarInvite } = usePatientData();
  const [enviando, setEnviando] = useState(false);
  if (!pendingInvite) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6 text-center">
        <h3 className="text-base font-semibold text-ink">Invitación de clínica</h3>
        <p className="mt-2 text-sm text-ink/70">
          Te invitaron a colaborar en{" "}
          <span className="font-semibold text-accent">
            {pendingInvite.nombreClinica || "una clínica"}
          </span>{" "}
          como <span className="capitalize">{pendingInvite.role}</span>.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={rechazarInvite}
            className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Ahora no
          </button>
          <button
            onClick={async () => {
              setEnviando(true);
              await aceptarInvite();
              setEnviando(false);
            }}
            disabled={enviando}
            className="flex-1 rounded-lg bg-gradient-to-r from-accent to-orange-500 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {enviando ? "Uniendo…" : "Unirme"}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickActionsBar({
  isLight,
  onNavigate,
  onOpenPago,
  onOpenNuevoPaciente,
}: {
  isLight: boolean;
  onNavigate: (pageId: string) => void;
  onOpenPago: () => void;
  onOpenNuevoPaciente: () => void;
}) {
  const { puedeVerFinanzas, abrirNuevaCitaDesdeInicio } = usePatientData();
  const visibles = quickActions.filter((action) => action.key !== "gastos" || puedeVerFinanzas);

  const manejarClick = (key: (typeof quickActions)[number]["key"], pageId: string) => {
    if (key === "gastos") return onOpenPago();
    if (key === "pacientes") return onOpenNuevoPaciente();
    if (key === "nueva-cita") return abrirNuevaCitaDesdeInicio();
    return onNavigate(pageId);
  };

  return (
    <div className="flex items-center gap-1 sm:flex-1 sm:justify-between sm:gap-0">
      {visibles.map((action) => {
        const icon = navItems.find((item) => item.id === action.pageId)?.icon;
        const badge = "badge" in action ? action.badge : undefined;
        return (
          <button
            key={action.key}
            onClick={() => manejarClick(action.key, action.pageId)}
            title={action.label}
            className={`relative flex h-12 w-12 items-center justify-center rounded-xl transition-colors hover:bg-surface ${
              action.color === "green"
                ? "text-success/80 hover:text-success"
                : "text-accent/70 hover:text-accent"
            }`}
            style={
              isLight
                ? undefined
                : {
                    textShadow:
                      action.color === "green"
                        ? "0 0 8px rgba(52,211,153,0.4)"
                        : "0 0 8px rgba(251,146,60,0.4)",
                  }
            }
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="shrink-0">
              {icon}
            </svg>
            {badge && (
              <span
                className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold leading-none text-black"
                style={{ boxShadow: "0 0 6px rgba(251,146,60,0.7)" }}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function Dashboard({
  uid,
  userEmail,
  onLogout,
}: {
  uid: string;
  userEmail: string;
  onLogout: () => void;
}) {
  const [activePage, setActivePage] = useState("inicio");
  const [showRegistrarPago, setShowRegistrarPago] = useState(false);
  const [showNuevoPaciente, setShowNuevoPaciente] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isLight = theme === "light";
  const activeLabel =
    navItems.find((item) => item.id === activePage)?.label ??
    navItems.flatMap((item) => ("children" in item ? item.children ?? [] : [])).find(
      (child) => child.id === activePage
    )?.label ??
    "";

  return (
    <PatientDataProvider uid={uid} userEmail={userEmail} onIrAPagina={setActivePage}>
    <InvitePrompt />
    <div data-theme={theme} className="flex min-h-screen bg-app text-ink">
      <Sidebar
        active={activePage}
        onNavigate={setActivePage}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <main className="min-w-0 flex-1">
        <header className="flex h-16 items-center gap-2 border-b border-edge/10 px-3 print:hidden sm:gap-4 sm:px-6">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink/70 hover:bg-surface hover:text-ink md:hidden"
            title="Abrir menú"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <div className="min-w-0 flex-1 overflow-x-auto">
            <QuickActionsBar
              isLight={isLight}
              onNavigate={setActivePage}
              onOpenPago={() => setShowRegistrarPago(true)}
              onOpenNuevoPaciente={() => setShowNuevoPaciente(true)}
            />
          </div>

          <span className="hidden h-6 w-px bg-edge/10 sm:block" />

          <span className="hidden truncate text-sm text-ink/50 sm:inline">{userEmail}</span>
          <button
            onClick={onLogout}
            className="shrink-0 rounded-lg border border-edge/10 bg-surface px-2.5 py-1.5 text-xs text-ink/70 transition-colors hover:text-ink sm:px-3"
          >
            Cerrar sesión
          </button>
        </header>

        <div className="px-3 py-6 sm:px-6 sm:py-8">
          <h1 className="mb-6 text-2xl font-semibold print:hidden">
            {activePage === "inicio" ? "Dashboard Principal" : activeLabel}
          </h1>
          {activePage === "inicio" && <Inicio />}
          {activePage === "pacientes" && <Pacientes />}
          {activePage === "agenda" && <Agenda />}
          {activePage === "recetas" && <Recetas />}
          {activePage === "administracion-perfil" && <PerfilDoctor />}
          {activePage === "administracion-colaboradores" && <Colaboradores />}
          {activePage === "administracion-metas" && <Metas />}
          {activePage === "administracion-formatos-whatsapp" && <FormatosWhatsApp />}
          {activePage === "membresias" && <Membresias />}
          {activePage === "asistencia" && <Asistencia />}
          {activePage === "administracion-procedimientos" && <Procedimientos />}
          {activePage === "administracion-historial-clinico" && <HistorialClinicoAdmin />}
          {activePage === "administracion-medicamentos" && <Medicamentos />}
          {activePage === "planes" && <Planes />}
          {activePage === "documentos" && <Documentos />}
          {activePage === "gastos" && <Gastos />}
          {activePage === "regulacion-sanitaria" && <RegulacionSanitaria />}
          {activePage === "educacion" && <Educacion />}
        </div>
      </main>

      {showRegistrarPago && (
        <GlobalAgregarPago onClose={() => setShowRegistrarPago(false)} />
      )}
      {showNuevoPaciente && (
        <GlobalNuevoPaciente onClose={() => setShowNuevoPaciente(false)} />
      )}
    </div>
    </PatientDataProvider>
  );
}
