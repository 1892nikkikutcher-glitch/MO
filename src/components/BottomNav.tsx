"use client";

/** Navegación principal de MO. En computadora (`lg:`): la cápsula angosta
 * de siempre, flotando en el borde derecho, recorrida con arrastre
 * VERTICAL. En celular/tablet: un solo ícono flotante (como el stack de
 * Descargas en macOS) que no reserva espacio de la pantalla mientras está
 * cerrado — al tocarlo despliega los módulos en abanico, arrastrando en
 * círculo alrededor del ícono para ver el resto. Los módulos con submenú
 * (Proveedores, Reportes, Administración) abren un panel — como hoja que
 * sube desde abajo en pantallas angostas, como panel junto a la cápsula en
 * pantallas anchas (`lg:`). */

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
        d="M4 21V7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14M4 21h16M9 21v-4h6v4M7 10h2M11 10h2M15 10h2M7 14h2M11 14h2M15 14h2"
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

// Geometría del abanico (celular/tablet) — arco de ANGULO_INICIO (casi
// recto hacia arriba) a ANGULO_FIN (un poco más allá de la horizontal
// izquierda), separados PASO grados entre sí: con estos valores caben ~5
// módulos a la vez, suficientemente separados para leerse bien.
// FAN_ANGULO_INICIO nunca debe bajar de 90°: con ángulos menores a 90°,
// cos(ángulo) es positivo y el ítem se desplaza hacia la DERECHA del
// ícono (no hacia arriba en línea recta) — como el ícono ya está pegado
// al borde derecho, eso lo saca de pantalla. Arriba de 90° el desplazamiento
// es hacia la izquierda (seguro).
//
// Un radio fijo en píxeles ocupa una PROPORCIÓN distinta de pantalla en
// cada modelo (ej. se ve más grande/desparramado en un iPhone más chico
// que en un Pro Max) — por eso "corría diferente" entre un modelo y otro.
// En vez de calibrar contra un modelo específico (o mantener una lista de
// medidas de teléfonos, que se desactualiza con cada modelo nuevo), el
// radio se calcula en tiempo real como una PROPORCIÓN del lado más chico
// de la pantalla de quien sea que abra la app — automáticamente
// consistente en iPhone, Samsung, o cualquier otro dispositivo, sin
// conocer de antemano sus medidas. Un techo/piso lo mantienen dentro de
// un rango razonable, y nunca se sale de pantalla (ver useRadioDelAbanico).
const FAN_RADIO_PROPORCION = 0.55; // del lado más chico de la ventana
const FAN_RADIO_MIN = 140;
const FAN_RADIO_MAX = 260;
const FAN_ANGULO_INICIO = 100;
const FAN_ANGULO_FIN = 190;
const FAN_PASO = 32;
const FAN_ANCHOR_INSET_PX = 24; // right-6
const FAN_ANCHOR_BOTTOM_PX = 62; // bottom-[62px]
const FAN_ITEM_RADIO_PX = 40; // la mitad de h-20/w-20 (80px)

/** Radio del abanico: proporcional al tamaño REAL de la ventana (no un
 * modelo asumido), acotado entre un mínimo/máximo razonables y, sobre
 * todo, nunca más grande que lo que en verdad cabe sin salirse de
 * pantalla. Se recalcula en cada resize/rotación — funciona igual en
 * cualquier iPhone, Samsung, o modelo futuro, sin mantener una lista. */
function useRadioDelAbanico() {
  const [radio, setRadio] = useState(FAN_RADIO_MAX);
  useEffect(() => {
    function recalcular() {
      const cosFin = Math.abs(Math.cos((FAN_ANGULO_FIN * Math.PI) / 180));
      const senInicio = Math.abs(Math.sin((FAN_ANGULO_INICIO * Math.PI) / 180));
      const maxPorAncho = (window.innerWidth - FAN_ANCHOR_INSET_PX - FAN_ITEM_RADIO_PX) / cosFin;
      const maxPorAlto = (window.innerHeight - FAN_ANCHOR_BOTTOM_PX - FAN_ITEM_RADIO_PX) / senInicio;
      const proporcional = Math.min(window.innerWidth, window.innerHeight) * FAN_RADIO_PROPORCION;
      const acotado = Math.max(FAN_RADIO_MIN, Math.min(proporcional, FAN_RADIO_MAX));
      setRadio(Math.min(acotado, maxPorAncho, maxPorAlto));
    }
    recalcular();
    window.addEventListener("resize", recalcular);
    window.addEventListener("orientationchange", recalcular);
    return () => {
      window.removeEventListener("resize", recalcular);
      window.removeEventListener("orientationchange", recalcular);
    };
  }, []);
  return radio;
}

export default function BottomNav({
  active,
  onNavigate,
  fanAbierto,
  onFanAbiertoChange,
}: {
  active: string;
  onNavigate: (id: string) => void;
  /** El Asistente flotante necesita saber cuándo el abanico está abierto
   * para esconderse (comparten la misma esquina) — por eso este estado
   * vive controlado desde Dashboard en vez de manejarse solo aquí adentro. */
  fanAbierto: boolean;
  onFanAbiertoChange: (abierto: boolean) => void;
}) {
  const [abierto, setAbierto] = useState<NavItem | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const arrastreRef = useRef({ activo: false, inicioY: 0, scrollInicio: 0, seMovio: false });

  const setFanAbierto = onFanAbiertoChange;
  const fanRadio = useRadioDelAbanico();
  const [fanOffset, setFanOffset] = useState(0);
  const [fanArrastrando, setFanArrastrando] = useState(false);
  const fanTrackRef = useRef<HTMLDivElement>(null);
  const fanArrastreRef = useRef({
    activo: false,
    anguloAnterior: 0,
    anguloAcumulado: 0,
    offsetInicio: 0,
    seMovio: false,
  });
  const fanMaxOffset = navItems.length - 1;

  function seleccionar(item: NavItem) {
    const hasChildren = "children" in item && !!item.children?.length;
    if (hasChildren) {
      setAbierto(item);
    } else {
      onNavigate(item.id);
    }
    setFanAbierto(false);
  }

  function iniciarArrastreFan(clientX: number, clientY: number) {
    if (!fanAbierto) return;
    const r = fanTrackRef.current?.getBoundingClientRect();
    const anguloInicial = r ? (Math.atan2(-(clientY - r.top), clientX - r.left) * 180) / Math.PI : 0;
    fanArrastreRef.current = {
      activo: true,
      anguloAnterior: anguloInicial,
      anguloAcumulado: 0,
      offsetInicio: fanOffset,
      seMovio: false,
    };
    setFanArrastrando(true);
  }

  function anguloFanDelItem(i: number) {
    return FAN_ANGULO_INICIO + (i - fanOffset) * FAN_PASO;
  }

  // Posición de cada módulo del abanico: colapsado (o fuera del arco
  // visible) se queda encima del ícono, invisible, listo para "brotar" de
  // ahí — igual que un stack de macOS.
  function estiloFanItem(i: number): React.CSSProperties {
    const angulo = anguloFanDelItem(i);
    const enRango = angulo >= FAN_ANGULO_INICIO - FAN_PASO * 0.5 && angulo <= FAN_ANGULO_FIN + FAN_PASO * 0.5;
    if (!fanAbierto || !enRango) {
      return { transform: "translate(0px, 0px) scale(0.5)", opacity: 0, pointerEvents: "none" };
    }
    const rad = (angulo * Math.PI) / 180;
    const dx = Math.cos(rad) * fanRadio;
    const dy = -Math.sin(rad) * fanRadio;
    return { transform: `translate(${dx}px, ${dy}px) scale(1)`, opacity: 1 };
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

  // Arrastrar en cualquier dirección alrededor del ícono para girar el
  // abanico — sigue el ÁNGULO real del dedo/mouse respecto al centro (no
  // solo un eje), para que se sienta como girar una perilla sin importar en
  // qué parte del arco estés arrastrando.
  //
  // A diferencia de la cápsula (que se recorre con scroll nativo — el dedo
  // ya lo hace solo, sin JS), el abanico se posiciona con transform, así
  // que no hay ningún scroll nativo de por medio: necesita eventos de
  // touch de verdad. mousemove NO sirve para esto en un celular real — un
  // navegador móvil no dispara mousemove continuo mientras arrastras el
  // dedo, solo sintetiza mouse/click al soltar (por eso la maqueta y las
  // pruebas con mouse sí "funcionaban" pero en el iPhone no pasaba nada).
  useEffect(() => {
    function anguloDesdeCentro(clientX: number, clientY: number) {
      const el = fanTrackRef.current;
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return (Math.atan2(-(clientY - r.top), clientX - r.left) * 180) / Math.PI;
    }
    function mover(clientX: number, clientY: number) {
      const st = fanArrastreRef.current;
      if (!st.activo) return;
      const anguloActual = anguloDesdeCentro(clientX, clientY);
      let delta = anguloActual - st.anguloAnterior;
      if (delta > 180) delta -= 360; // no dejar que salte al cruzar +/-180°
      if (delta < -180) delta += 360;
      st.anguloAcumulado += delta;
      st.anguloAnterior = anguloActual;
      if (Math.abs(st.anguloAcumulado) > 3) st.seMovio = true;
      const next = Math.max(0, Math.min(fanMaxOffset, st.offsetInicio + st.anguloAcumulado / FAN_PASO));
      setFanOffset(next);
    }
    function terminar() {
      fanArrastreRef.current.activo = false;
      setFanArrastrando(false);
    }
    function onMouseMove(e: MouseEvent) {
      mover(e.clientX, e.clientY);
    }
    function onTouchMove(e: TouchEvent) {
      if (!fanArrastreRef.current.activo) return;
      const t = e.touches[0];
      if (!t) return;
      // Reclama el gesto — sin esto, el navegador podría interpretar el
      // arrastre como un desplazamiento de la página o (peor) el sistema
      // operativo como su propio gesto de regresar/cambiar de app, que es
      // justo lo que se quería evitar desde el principio con este rediseño.
      e.preventDefault();
      mover(t.clientX, t.clientY);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", terminar);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", terminar);
    window.addEventListener("touchcancel", terminar);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", terminar);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", terminar);
      window.removeEventListener("touchcancel", terminar);
    };
  }, [fanMaxOffset]);

  useEffect(() => {
    if (!abierto && !fanAbierto) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setAbierto(null);
      setFanAbierto(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [abierto, fanAbierto]);

  return (
    <>
      {abierto && (
        <div onClick={() => setAbierto(null)} className="fixed inset-0 z-40 bg-black/60 print:hidden" />
      )}

      <nav
        aria-label="Navegación principal"
        className="fixed right-2.5 top-1/2 z-40 hidden max-h-[62vh] w-[60px] -translate-y-1/2 flex-col rounded-[20px] border border-edge/10 bg-modal-solid/95 p-1.5 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6)] backdrop-blur-[10px] print:hidden lg:flex lg:w-[84px] lg:p-2"
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

      {fanAbierto && (
        <div
          onClick={() => {
            // Si el mouseup de un arrastre termina sobre el fondo (los
            // íconos ya rotaron a otra posición y el dedo/mouse quedó en
            // espacio vacío), no debe interpretarse como "tocar afuera
            // para cerrar" — solo cierra en un toque genuino.
            if (fanArrastreRef.current.seMovio) return;
            setFanAbierto(false);
          }}
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm print:hidden lg:hidden"
        />
      )}

      <button
        type="button"
        title="Navegación"
        onClick={() => setFanAbierto(!fanAbierto)}
        style={{ touchAction: "manipulation" }}
        className="fixed bottom-[62px] right-6 z-40 flex h-20 w-20 items-center justify-center rounded-full border border-ink/25 bg-modal-solid/70 text-accent shadow-[0_10px_26px_-8px_rgba(0,0,0,0.65)] backdrop-blur-xl transition-transform active:scale-95 print:hidden lg:hidden"
      >
        {fanAbierto ? (
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        ) : (
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="shrink-0">
            {(navItems.find((n) => n.id === active) ?? navItems[0]).icon}
          </svg>
        )}
      </button>

      <div
        ref={fanTrackRef}
        onMouseDown={(e) => iniciarArrastreFan(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) iniciarArrastreFan(t.clientX, t.clientY);
        }}
        onClickCapture={(e) => {
          if (fanArrastreRef.current.seMovio) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
        style={{ touchAction: "none" }}
        className="fixed bottom-[62px] right-6 z-40 h-px w-px cursor-grab active:cursor-grabbing lg:hidden"
      >
        {navItems.map((item, i) => {
          const hasChildren = "children" in item && !!item.children?.length;
          const isActiveParent = hasChildren && item.children!.some((c) => c.id === active);
          const isActive = active === item.id || isActiveParent;
          return (
            <button
              key={item.id}
              onClick={() => seleccionar(item)}
              style={estiloFanItem(i)}
              className={`absolute left-0 top-0 -ml-10 -mt-10 flex h-20 w-20 select-none flex-col items-center justify-center rounded-full border shadow-[0_8px_20px_-6px_rgba(0,0,0,0.55)] backdrop-blur-xl ${
                fanArrastrando ? "" : "transition-[transform,opacity] duration-[380ms] ease-[cubic-bezier(0.25,1.1,0.4,1)]"
              } ${
                isActive
                  ? "border-accent/60 bg-accent/20 text-accent"
                  : "border-ink/25 bg-modal-solid/70 text-ink/70"
              }`}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="shrink-0">
                {item.icon}
              </svg>
              <span
                className={`absolute -bottom-5 left-1/2 max-w-[70px] -translate-x-1/2 break-words rounded bg-modal-solid/80 px-1 text-center text-[9.5px] font-semibold leading-tight ${
                  isActive ? "text-accent" : "text-ink/60"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

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
