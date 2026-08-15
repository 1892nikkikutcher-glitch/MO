"use client";

import type { ReactNode } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { promocionVigente } from "@/lib/catalogosVarios";

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function IconDiente() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3c-2.2 0-3.3 1.1-4.5 1.1S5.2 3.3 3.9 4.2C2.6 5.1 2 6.8 2 8.5c0 2.6 1.3 4.4 1.8 6.8.4 1.9.6 5.2 2.3 5.7 1.6.5 1.8-2.3 2.4-3.8.4-1 .8-1.5 1.5-1.5s1.1.5 1.5 1.5c.6 1.5.8 4.3 2.4 3.8 1.7-.5 1.9-3.8 2.3-5.7.5-2.4 1.8-4.2 1.8-6.8 0-1.7-.6-3.4-1.9-4.3C15.8 3.3 14.2 4.1 13 4.1 12 4.1 12 3 12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPastilla() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="9" width="18" height="6" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 9v6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconEtiqueta() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M11.6 3H5a2 2 0 0 0-2 2v6.6c0 .5.2 1 .6 1.4l8.4 8.4a2 2 0 0 0 2.8 0l6.6-6.6a2 2 0 0 0 0-2.8L13 3.6c-.4-.4-.9-.6-1.4-.6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.3" fill="currentColor" />
    </svg>
  );
}

function IconEscudo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3 4.5 5.5v5.4c0 4.7 3.2 8.4 7.5 9.6 4.3-1.2 7.5-4.9 7.5-9.6V5.5L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Catalogos() {
  const { procedimientos, catalogoMedicamentos, promociones, aseguradoras, irAPagina } = usePatientData();

  const hoy = hoyIso();
  const promocionesVigentes = promociones.filter((p) => promocionVigente(p, hoy)).length;

  const tarjetas: {
    id: string;
    icono: ReactNode;
    titulo: string;
    descripcion: string;
    total: number;
    etiquetaTotal: string;
    totalSecundario?: number;
  }[] = [
    {
      id: "administracion-procedimientos",
      icono: <IconDiente />,
      titulo: "Procedimientos",
      descripcion: "Costos base al paciente y al consultorio para cada tratamiento.",
      total: procedimientos.length,
      etiquetaTotal: procedimientos.length === 1 ? "procedimiento" : "procedimientos",
    },
    {
      id: "administracion-medicamentos",
      icono: <IconPastilla />,
      titulo: "Medicamentos",
      descripcion: "Catálogo para el buscador de recetas, con dosis pediátrica.",
      total: catalogoMedicamentos.length,
      etiquetaTotal: catalogoMedicamentos.length === 1 ? "medicamento" : "medicamentos",
    },
    {
      id: "administracion-marketing",
      icono: <IconEtiqueta />,
      titulo: "Marketing",
      descripcion: "Promociones y cumpleaños del mes para tus pacientes.",
      total: promociones.length,
      etiquetaTotal: promociones.length === 1 ? "promoción" : "promociones",
      totalSecundario: promocionesVigentes,
    },
    {
      id: "reportes-aseguradoras",
      icono: <IconEscudo />,
      titulo: "Aseguradoras",
      descripcion: "Directorio de contactos de compañías de seguros.",
      total: aseguradoras.length,
      etiquetaTotal: aseguradoras.length === 1 ? "aseguradora" : "aseguradoras",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Catálogos</h3>
        <p className="mt-1 text-xs text-ink/40">
          Listas reutilizables que alimentan presupuestos, recetas y otras partes de la app.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tarjetas.map((t) => (
          <button
            key={t.id}
            onClick={() => irAPagina(t.id)}
            className="flex items-start gap-4 rounded-2xl border border-edge/10 bg-surface p-5 text-left transition-colors hover:border-accent/40 hover:bg-surface2"
          >
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-accent/10 text-accent">
              {t.icono}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                <h4 className="font-semibold text-ink">{t.titulo}</h4>
                <span className="flex-none text-xs font-medium text-ink/40">
                  {t.total} {t.etiquetaTotal}
                  {t.totalSecundario !== undefined && ` (${t.totalSecundario} vigentes)`}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink/50">{t.descripcion}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
