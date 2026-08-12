"use client";

import { useState } from "react";

export const navItems = [
  {
    id: "inicio",
    label: "Inicio",
    icon: (
      <path
        d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "pacientes",
    label: "Pacientes",
    icon: (
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "agenda",
    label: "Agenda",
    icon: (
      <path
        d="M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "recetas",
    label: "Recetas",
    icon: (
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 2v6h6M9 13h6M9 17h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "material",
    label: "Material",
    icon: (
      <path
        d="M21 8 12 3 3 8l9 5 9-5ZM3 8v9l9 5M21 8v9l-9 5M12 13v9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "documentos",
    label: "Documentos",
    icon: (
      <path
        d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM14 4v6h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "educacion",
    label: "Educación",
    icon: (
      <path
        d="M22 10 12 5 2 10l10 5 10-5ZM6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "membresias",
    label: "Membresías",
    icon: (
      <path
        d="M12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.6 5.8 21 7 14 2 9.3 9 8.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "reportes",
    label: "Reportes",
    icon: (
      <path
        d="M3 3v18h18M8 17V10M13 17V6M18 17v-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    children: [
      { id: "reportes-pagos", label: "Pagos" },
      { id: "reportes-corte-caja", label: "Corte caja" },
      { id: "reportes-presupuestos", label: "Presupuestos" },
      { id: "reportes-saldos-pendientes", label: "Saldos pendientes" },
      { id: "reportes-aviso-privacidad", label: "Aviso de privacidad" },
      { id: "reportes-aseguradoras", label: "Aseguradoras" },
      { id: "reportes-ots", label: "OTs" },
      { id: "reportes-graficas", label: "Gráficas" },
      { id: "reportes-bitacora-citas", label: "Bitácora citas" },
      { id: "reportes-encuestas", label: "Encuestas" },
      { id: "reportes-clasificacion", label: "Clasificación" },
      { id: "reportes-corte-diario", label: "Corte diario" },
      { id: "reportes-seguimiento-asistencia", label: "Seguimiento asistencia" },
      { id: "reportes-recordatorios", label: "Recordatorios" },
      { id: "reportes-procedimientos", label: "Procedimientos" },
      { id: "reportes-cp", label: "C.P." },
      { id: "reportes-domiciliacion", label: "Domiciliación" },
    ],
  },
  {
    id: "administracion",
    label: "Administración",
    icon: (
      <path
        d="M12 2a1 1 0 0 1 1 1v1.1a7 7 0 0 1 2 .8l.8-.8a1 1 0 0 1 1.4 1.4l-.8.8a7 7 0 0 1 .8 2H18a1 1 0 0 1 1 1v0a1 1 0 0 1-1 1h-1.1a7 7 0 0 1-.8 2l.8.8a1 1 0 0 1-1.4 1.4l-.8-.8a7 7 0 0 1-2 .8V19a1 1 0 0 1-1 1h0a1 1 0 0 1-1-1v-1.1a7 7 0 0 1-2-.8l-.8.8a1 1 0 0 1-1.4-1.4l.8-.8a7 7 0 0 1-.8-2H6a1 1 0 0 1-1-1v0a1 1 0 0 1 1-1h1.1a7 7 0 0 1 .8-2l-.8-.8A1 1 0 0 1 8.5 5l.8.8a7 7 0 0 1 2-.8V4a1 1 0 0 1 1-1ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    children: [
      { id: "administracion-procedimientos", label: "Procedimientos" },
      { id: "administracion-personal", label: "Personal" },
      { id: "administracion-historial-clinico", label: "Historial Clínico" },
      { id: "administracion-borrar-citas", label: "Borrar citas" },
      { id: "administracion-consultorio", label: "Consultorio" },
      { id: "administracion-comisiones", label: "Comisiones" },
      { id: "administracion-medicos-pacientes", label: "Médicos vs pacientes" },
      { id: "administracion-medicamentos", label: "Medicamentos" },
      { id: "administracion-promociones", label: "Promociones" },
      { id: "administracion-formatos-whatsapp", label: "Formatos WhatsApp" },
      { id: "administracion-catalogos", label: "Catálogos" },
      { id: "administracion-metas", label: "Metas" },
      { id: "administracion-perfil", label: "Perfil del Doctor" },
    ],
  },
  {
    id: "asistencia",
    label: "Asistencia",
    icon: (
      <path
        d="M9 11l2.5 2.5L15 9M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "gastos",
    label: "Gastos",
    icon: (
      <path
        d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "contrasena",
    label: "Contraseña",
    icon: (
      <path
        d="M17 10V7a5 5 0 0 0-10 0v3M5 10h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1ZM12 15v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "planes",
    label: "Planes",
    icon: (
      <path
        d="M4 4h16v16H4V4ZM8 9h8M8 13h8M8 17h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
];

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M12 3v2M12 19v2M5 5l1.4 1.4M17.6 17.6 19 19M3 12h2M19 12h2M5 19l1.4-1.4M17.6 6.4 19 5M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className={`ml-auto shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Sidebar({
  active,
  onNavigate,
  theme,
  onToggleTheme,
  mobileOpen,
  onCloseMobile,
}: {
  active: string;
  onNavigate: (id: string) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const isLight = theme === "light";
  const activeParent = navItems.find((item) =>
    "children" in item && item.children?.some((c) => c.id === active)
  );
  const [expanded, setExpanded] = useState<string | null>(activeParent?.id ?? null);

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-edge/10 bg-surface transition-transform duration-200 print:hidden md:static md:translate-x-0 md:transition-[width] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "md:w-[4.5rem]" : "w-64"}`}
      >
      <div className="flex h-16 shrink-0 items-center justify-center border-b border-edge/10 px-4">
        <span className="bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-xl font-bold text-transparent">
          {collapsed ? "M" : "MO"}
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const hasChildren = "children" in item && !!item.children?.length;
          const isOpen = expanded === item.id;
          const isActiveParent = hasChildren && item.children!.some((c) => c.id === active);
          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (hasChildren) {
                    setExpanded((prev) => (prev === item.id ? null : item.id));
                    if (collapsed) setCollapsed(false);
                  } else {
                    onNavigate(item.id);
                    onCloseMobile();
                  }
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active === item.id || isActiveParent
                    ? "bg-accent/10 text-accent"
                    : "text-accent/50 hover:bg-app hover:text-accent"
                } ${collapsed ? "justify-center" : ""}`}
                style={
                  (active === item.id || isActiveParent) && !isLight
                    ? { textShadow: "0 0 10px rgba(251,146,60,0.8), 0 0 20px rgba(251,146,60,0.4)" }
                    : undefined
                }
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
                  {item.icon}
                </svg>
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && hasChildren && <ChevronIcon open={isOpen} />}
              </button>

              {!collapsed && hasChildren && isOpen && (
                <div className="ml-4 mt-1 space-y-0.5 border-l border-edge/10 pl-3">
                  {item.children!.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => {
                        onNavigate(child.id);
                        onCloseMobile();
                      }}
                      className={`block w-full rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                        active === child.id
                          ? "text-accent"
                          : "text-ink/50 hover:text-ink"
                      }`}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-edge/10 p-3">
        <button
          onClick={onToggleTheme}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink/50 transition-colors hover:bg-app hover:text-ink ${
            collapsed ? "justify-center" : ""
          }`}
          title={isLight ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
        >
          {isLight ? <SunIcon /> : <MoonIcon />}
          {!collapsed && <span>{isLight ? "Modo claro" : "Modo oscuro"}</span>}
        </button>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink/50 transition-colors hover:bg-app hover:text-ink ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            className={`shrink-0 transition-transform ${collapsed ? "rotate-180" : ""}`}
          >
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
            <path d="M9 4v16" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M14.5 9 11.5 12l3 3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {!collapsed && <span>Contraer</span>}
        </button>
      </div>
      </aside>
    </>
  );
}
