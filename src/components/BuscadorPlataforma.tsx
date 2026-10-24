"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePatientData } from "@/context/PatientDataContext";
import { navItems } from "@/components/BottomNav";
import { ayudaPaginas } from "@/lib/ayudaPaginas";
import { buscarEnIndice, construirIndice, type ItemMenu } from "@/lib/buscadorPlataforma";
import { buscarPacientes } from "@/lib/buscarPacientes";
import { moduloVisibleParaRol } from "@/lib/permisosRol";

type Opcion = { clave: string; tipo: "pagina" | "paciente"; id: string; titulo: string; detalle: string; descripcion?: string };

function LupaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Cuadro de búsqueda de la barra de arriba: escribes lo que buscas ("colaboradores", "cómo cobro", el nombre de un
 * paciente…) y te lleva ahí. Sirve para cuando no recuerdas en qué menú está algo. */
export default function BuscadorPlataforma({ onNavigate }: { onNavigate: (pageId: string) => void }) {
  const { patients, miRol, irAExpediente } = usePatientData();
  const [consulta, setConsulta] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [caja, setCaja] = useState<{ left: number; top: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // Solo se busca en lo que este usuario puede ver (el Cirujano dentista no ve finanzas, por ejemplo).
  const indice = useMemo(() => {
    const menu: ItemMenu[] = navItems
      .filter((item) => moduloVisibleParaRol(miRol, item.id))
      .map((item) => ({
        id: item.id,
        label: item.label,
        children: ("children" in item && item.children ? item.children : []).filter((c) => moduloVisibleParaRol(miRol, c.id)),
      }));
    return construirIndice(menu, ayudaPaginas);
  }, [miRol]);

  const opciones: Opcion[] = useMemo(() => {
    if (!consulta.trim()) return [];
    const paginas = buscarEnIndice(indice, consulta, 6).map<Opcion>((r) => ({
      clave: `p-${r.id}`,
      tipo: "pagina",
      id: r.id,
      titulo: r.titulo,
      detalle: r.ruta,
      descripcion: r.descripcion,
    }));
    const pacientes =
      consulta.trim().length >= 2
        ? buscarPacientes(
            patients.filter((p) => !p.fusionadoEnId),
            consulta
          )
            .slice(0, 3)
            .map<Opcion>((p) => ({ clave: `x-${p.id}`, tipo: "paciente", id: p.id, titulo: p.name, detalle: "Paciente · abrir su expediente" }))
        : [];
    return [...paginas, ...pacientes];
  }, [consulta, indice, patients]);

  useEffect(() => setActivo(0), [consulta]);

  // La lista se dibuja fuera de la barra (que se desliza y recortaría lo que sobresale), pegada al cuadro.
  const medir = () => {
    const r = contenedorRef.current?.getBoundingClientRect();
    if (!r) return;
    const ancho = Math.min(400, window.innerWidth - 16);
    setCaja({ left: Math.max(8, Math.min(r.left, window.innerWidth - ancho - 8)), top: r.bottom + 6, width: ancho });
  };
  useEffect(() => {
    if (!abierto) return;
    medir();
    const cerrarAlHacerClicAfuera = (e: MouseEvent) => {
      const dentro = (e.target as HTMLElement).closest?.("[data-buscador]");
      if (!dentro) setAbierto(false);
    };
    window.addEventListener("resize", medir);
    document.addEventListener("mousedown", cerrarAlHacerClicAfuera);
    return () => {
      window.removeEventListener("resize", medir);
      document.removeEventListener("mousedown", cerrarAlHacerClicAfuera);
    };
  }, [abierto]);

  const elegir = (o: Opcion) => {
    setConsulta("");
    setAbierto(false);
    inputRef.current?.blur();
    if (o.tipo === "pagina") onNavigate(o.id);
    else irAExpediente(o.id);
  };

  const alTeclear = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setAbierto(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown" && opciones.length > 0) {
      e.preventDefault();
      setActivo((i) => (i + 1) % opciones.length);
    } else if (e.key === "ArrowUp" && opciones.length > 0) {
      e.preventDefault();
      setActivo((i) => (i - 1 + opciones.length) % opciones.length);
    } else if (e.key === "Enter" && opciones[activo]) {
      e.preventDefault();
      elegir(opciones[activo]);
    }
  };

  return (
    <div ref={contenedorRef} data-buscador className="relative shrink-0">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/50">
        <LupaIcon />
      </span>
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={abierto && consulta.trim().length > 0}
        aria-label="Buscar en la plataforma"
        value={consulta}
        onChange={(e) => {
          setConsulta(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onKeyDown={alTeclear}
        placeholder="Buscar en MO…"
        className="h-9 w-36 rounded-lg border border-edge/15 bg-field pl-8 pr-2 text-sm text-ink placeholder-ink/40 outline-none transition-[width] focus:w-56 focus:border-accent/60 sm:w-48 sm:focus:w-72"
      />
      {abierto &&
        consulta.trim().length > 0 &&
        caja &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-buscador
            role="listbox"
            style={{ position: "fixed", left: caja.left, top: caja.top, width: caja.width }}
            className="z-[70] max-h-[70vh] overflow-y-auto rounded-xl border border-edge/15 bg-modal-solid p-1.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55)]"
          >
            {opciones.length === 0 ? (
              <p className="px-3 py-3 text-sm text-ink/70">
                No encontré nada con «{consulta.trim()}». Prueba con otra palabra, por ejemplo: <span className="font-medium">pagos, citas, colaboradores, recetas</span>.
              </p>
            ) : (
              opciones.map((o, i) => (
                <button
                  key={o.clave}
                  role="option"
                  aria-selected={i === activo}
                  onMouseEnter={() => setActivo(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => elegir(o)}
                  className={`block w-full rounded-lg px-3 py-2 text-left transition-colors ${i === activo ? "bg-accent/15" : "hover:bg-surface"}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-ink">{o.titulo}</span>
                    {o.tipo === "pagina" && o.detalle !== o.titulo && <span className="shrink-0 text-[11px] text-ink/60">{o.detalle}</span>}
                  </div>
                  {o.tipo === "paciente" && <div className="text-[11px] text-ink/60">{o.detalle}</div>}
                  {o.descripcion && <div className="mt-0.5 line-clamp-1 text-xs text-ink/60">{o.descripcion}</div>}
                </button>
              ))
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
