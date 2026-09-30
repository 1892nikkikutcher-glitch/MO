"use client";

/** Preferencia de tema (Claro/Oscuro/Sistema) — dato de este navegador, no
 * de la clínica, así que vive en localStorage, nunca en Firestore (a
 * diferencia de PrivacidadContext, que sí es por-clínica). El script
 * bloqueante en layout.tsx ya aplica data-theme sobre <html> antes de
 * hidratar (sin esto habría un destello del tema por defecto al cargar) —
 * este contexto solo mantiene a React al tanto de ese valor y expone cómo
 * cambiarlo. */

import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react";

export type TemaPreferencia = "light" | "dark" | "system";
type TemaResuelto = "light" | "dark";

const CLAVE_TEMA = "mo:tema";

function leerPreferenciaGuardada(): TemaPreferencia | null {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    if (guardado === "light" || guardado === "dark" || guardado === "system") return guardado;
    return null;
  } catch {
    return null;
  }
}

function guardarPreferencia(valor: TemaPreferencia) {
  try {
    localStorage.setItem(CLAVE_TEMA, valor);
  } catch {
    // localStorage inaccesible (modo privado, almacenamiento deshabilitado) — no es crítico, solo no persiste.
  }
}

function prefiereSistemaOscuro(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolver(preferencia: TemaPreferencia): TemaResuelto {
  if (preferencia === "system") return prefiereSistemaOscuro() ? "dark" : "light";
  return preferencia;
}

type ThemeContextValue = {
  preferencia: TemaPreferencia;
  resuelto: TemaResuelto;
  setPreferencia: (valor: TemaPreferencia) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preferencia, setPreferenciaState] = useState<TemaPreferencia>(
    () => leerPreferenciaGuardada() ?? "system"
  );
  // Lee el data-theme que el script inline de layout.tsx ya aplicó sobre
  // <html> — nunca se recalcula desde cero aquí, para no producir un
  // segundo destello si llegara a diferir.
  const [resuelto, setResuelto] = useState<TemaResuelto>(() => {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  });

  const aplicar = (siguiente: TemaResuelto) => {
    document.documentElement.setAttribute("data-theme", siguiente);
    setResuelto(siguiente);
  };

  // Autocorrectivo: en dev, el overlay/HotReload de Next.js a veces limpia
  // el data-theme que puso el script anti-destello justo después de
  // hidratar (observado ~100ms después, antes de que React llegue a
  // pintar) — este efecto lo reafirma en cuanto el estado se asienta, sin
  // importar qué lo haya quitado. Es un no-op cuando ya coincide.
  useLayoutEffect(() => {
    if (document.documentElement.getAttribute("data-theme") !== resuelto) {
      document.documentElement.setAttribute("data-theme", resuelto);
    }
  });

  const setPreferencia = (valor: TemaPreferencia) => {
    setPreferenciaState(valor);
    guardarPreferencia(valor);
    aplicar(resolver(valor));
  };

  // Mientras la preferencia sea "system", sigue el tema del SO en vivo sin
  // necesitar recargar la página.
  useEffect(() => {
    if (preferencia !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => aplicar(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferencia]);

  return <ThemeContext.Provider value={{ preferencia, resuelto, setPreferencia }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
