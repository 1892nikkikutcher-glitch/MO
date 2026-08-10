"use client";

import { useState } from "react";
import Sidebar, { navItems } from "./Sidebar";
import Inicio from "./pages/Inicio";
import Pacientes from "./pages/Pacientes";
import Agenda from "./pages/Agenda";
import Recetas from "./pages/Recetas";
import GlobalAgregarPago from "./GlobalAgregarPago";
import { PatientDataProvider } from "@/context/PatientDataContext";

const quickActions = [
  { key: "pacientes", pageId: "pacientes", label: "Nuevo Paciente", color: "amber" },
  { key: "agenda", pageId: "agenda", label: "Agenda", color: "amber" },
  { key: "nueva-cita", pageId: "agenda", label: "Nueva Cita", color: "amber", badge: "+" },
  { key: "material", pageId: "material", label: "Nuevo Material", color: "amber" },
  { key: "membresias", pageId: "membresias", label: "Nueva Membresía", color: "amber" },
  { key: "gastos", pageId: "gastos", label: "Registrar Pago", color: "green" },
] as const;

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
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const isLight = theme === "light";
  const activeLabel =
    navItems.find((item) => item.id === activePage)?.label ??
    navItems.flatMap((item) => ("children" in item ? item.children ?? [] : [])).find(
      (child) => child.id === activePage
    )?.label ??
    "";

  return (
    <PatientDataProvider uid={uid} onIrAPagina={setActivePage}>
    <div data-theme={theme} className="flex min-h-screen bg-app text-ink">
      <Sidebar
        active={activePage}
        onNavigate={setActivePage}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      />

      <main className="flex-1">
        <header className="flex h-16 items-center gap-4 border-b border-edge/10 px-6 print:hidden">
          <div className="flex flex-1 items-center justify-between">
            {quickActions.map((action) => {
              const icon = navItems.find((item) => item.id === action.pageId)?.icon;
              const badge = "badge" in action ? action.badge : undefined;
              return (
                <button
                  key={action.key}
                  onClick={() =>
                    action.key === "gastos" ? setShowRegistrarPago(true) : setActivePage(action.pageId)
                  }
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

          <span className="h-6 w-px bg-edge/10" />

          <span className="text-sm text-ink/50">{userEmail}</span>
          <button
            onClick={onLogout}
            className="rounded-lg border border-edge/10 bg-surface px-3 py-1.5 text-xs text-ink/70 transition-colors hover:text-ink"
          >
            Cerrar sesión
          </button>
        </header>

        <div className="px-6 py-8">
          <h1 className="mb-6 text-2xl font-semibold print:hidden">
            {activePage === "inicio" ? "Dashboard Principal" : activeLabel}
          </h1>
          {activePage === "inicio" && <Inicio />}
          {activePage === "pacientes" && <Pacientes />}
          {activePage === "agenda" && <Agenda />}
          {activePage === "recetas" && <Recetas />}
        </div>
      </main>

      {showRegistrarPago && (
        <GlobalAgregarPago onClose={() => setShowRegistrarPago(false)} />
      )}
    </div>
    </PatientDataProvider>
  );
}
