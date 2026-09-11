"use client";

/** Navegación principal de MO — antes una tira horizontal fija al fondo,
 * ahora una cápsula angosta flotando en el borde derecho (separada de los
 * tres bordes, no de borde a borde ni de alto completo — por eso no es una
 * barra lateral) en cualquier tamaño de pantalla. Se recorre arrastrando
 * VERTICAL, con el dedo o con mouse: el arrastre horizontal pegado al
 * borde inferior competía con el gesto del celular para cambiar de app.
 * Los módulos con submenú (Proveedores, Reportes, Administración) abren un
 * panel — como hoja que sube desde abajo en pantallas angostas, como panel
 * junto a la cápsula en pantallas anchas (`lg:`). */

import { useEffect, useRef, useState } from "react";

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
    id: "proveedores",
    label: "Proveedores",
    icon: (
      <path
        d="M3 21V10l9-6 9 6v11M3 21h18M7 21v-6h4v6M15 13h3M15 16h3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    children: [
      { id: "deposito-dental", label: "Depósito Dental" },
      { id: "laboratorio-dental", label: "Laboratorio Dental" },
      { id: "centro-radiodiagnostico", label: "Centro de Radiodiagnóstico" },
    ],
  },
  {
    id: "mo-conecta",
    label: "MO Conecta",
    icon: (
      <path
        d="M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.6 12.3l6.8-4.6M8.6 11.7l6.8 4.6"
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
      { id: "reportes-devoluciones", label: "Devoluciones" },
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
      { id: "administracion-historial-clinico", label: "Historial Clínico" },
      { id: "administracion-borrar-citas", label: "Borrar citas" },
      { id: "administracion-consultorio", label: "Consultorio" },
      { id: "administracion-comisiones", label: "Comisiones" },
      { id: "administracion-medicos-pacientes", label: "Médicos vs pacientes" },
      { id: "administracion-medicamentos", label: "Medicamentos" },
      { id: "administracion-marketing", label: "Marketing" },
      { id: "administracion-formatos-whatsapp", label: "Formatos WhatsApp" },
      { id: "administracion-catalogos", label: "Catálogos" },
      { id: "administracion-metas", label: "Metas" },
      { id: "administracion-perfil", label: "Perfil del Doctor" },
      { id: "administracion-colaboradores", label: "Colaboradores" },
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
    id: "regulacion-sanitaria",
    label: "Regulación Sanitaria",
    icon: (
      <path
        d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5l-8-3ZM9 12l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "rpbi",
    label: "RPBI",
    icon: (
      <path
        d="M4 7h16M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3m-9 0 1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M12 11v5M9.5 13.5h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "contabilidad",
    label: "Contabilidad",
    icon: (
      <path
        d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM14 2v6h6M8 13h8M8 17h5"
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

type NavItem = (typeof navItems)[number];

export default function BottomNav({ active, onNavigate }: { active: string; onNavigate: (id: string) => void }) {
  const [abierto, setAbierto] = useState<NavItem | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const arrastreRef = useRef({ activo: false, inicioY: 0, scrollInicio: 0, seMovio: false });

  function seleccionar(item: NavItem) {
    const hasChildren = "children" in item && !!item.children?.length;
    if (hasChildren) {
      setAbierto(item);
    } else {
      onNavigate(item.id);
    }
  }

  // Arrastrar VERTICAL con mouse para desplazar la cápsula — el dedo ya lo
  // hace nativo en celular/tablet; esto es para poder usarla con mouse en
  // computadora.
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const st = arrastreRef.current;
      if (!st.activo || !carouselRef.current) return;
      const dy = e.pageY - st.inicioY;
      if (Math.abs(dy) > 4) st.seMovio = true;
      carouselRef.current.scrollTop = st.scrollInicio - dy;
    }
    function onMouseUp() {
      arrastreRef.current.activo = false;
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!abierto) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [abierto]);

  return (
    <>
      {abierto && (
        <div onClick={() => setAbierto(null)} className="fixed inset-0 z-40 bg-black/60 print:hidden" />
      )}

      <nav
        aria-label="Navegación principal"
        className="fixed right-2.5 top-1/2 z-40 flex max-h-[62vh] w-[60px] -translate-y-1/2 flex-col rounded-[20px] border border-edge/10 bg-modal-solid/95 p-1.5 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6)] backdrop-blur-[10px] print:hidden lg:w-[84px] lg:p-2"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 rounded-t-[20px] bg-gradient-to-b from-modal-solid/95 to-transparent" />
        <div
          ref={carouselRef}
          onMouseDown={(e) => {
            arrastreRef.current = {
              activo: true,
              inicioY: e.pageY,
              scrollInicio: carouselRef.current?.scrollTop ?? 0,
              seMovio: false,
            };
          }}
          onClickCapture={(e) => {
            if (arrastreRef.current.seMovio) {
              e.stopPropagation();
              e.preventDefault();
            }
          }}
          className="flex min-h-0 flex-1 cursor-grab flex-col gap-0.5 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scroll-snap-type:y_proximity] [scrollbar-width:none] active:cursor-grabbing lg:gap-1 [&::-webkit-scrollbar]:hidden"
        >
          {navItems.map((item) => {
            const hasChildren = "children" in item && !!item.children?.length;
            const isActiveParent = hasChildren && item.children!.some((c) => c.id === active);
            const isActive = active === item.id || isActiveParent;
            return (
              <button
                key={item.id}
                onClick={() => seleccionar(item)}
                className={`flex w-full shrink-0 select-none scroll-my-1 flex-col items-center gap-[3px] rounded-xl px-0.5 py-2 text-center transition-colors [scroll-snap-align:start] lg:py-2.5 ${
                  isActive ? "bg-accent/10 text-accent" : "text-ink/50 hover:bg-surface hover:text-ink"
                }`}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" className="shrink-0 lg:h-[22px] lg:w-[22px]">
                  {item.icon}
                </svg>
                <span className="line-clamp-2 max-w-[44px] break-words text-[9px] font-semibold leading-tight lg:max-w-[68px] lg:text-[10px]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 rounded-b-[20px] bg-gradient-to-t from-modal-solid/95 to-transparent" />
      </nav>

      {abierto && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[65vh] flex-col rounded-t-2xl border-t border-edge/10 bg-modal-solid p-4 pb-6 lg:inset-x-auto lg:bottom-auto lg:left-auto lg:right-24 lg:top-1/2 lg:max-h-[80vh] lg:w-[420px] lg:max-w-[42vw] lg:-translate-y-1/2 lg:rounded-2xl lg:border"
        >
          <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-edge/20 lg:hidden" />
          <div className="mb-3 flex shrink-0 items-center gap-2 text-sm font-semibold text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-accent">
              {abierto.icon}
            </svg>
            {abierto.label}
            <button
              onClick={() => setAbierto(null)}
              className="ml-auto flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1 overflow-y-auto">
            {"children" in abierto &&
              abierto.children?.map((child) => (
                <button
                  key={child.id}
                  onClick={() => {
                    onNavigate(child.id);
                    setAbierto(null);
                  }}
                  className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    active === child.id ? "bg-accent/10 text-accent" : "text-ink/70 hover:bg-surface"
                  }`}
                >
                  {child.label}
                </button>
              ))}
          </div>
        </div>
      )}
    </>
  );
}
