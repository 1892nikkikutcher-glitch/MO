import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "MO",
};

// Sin esto, los navegadores móviles asumen un viewport de escritorio
// (~980px) y lo achican para que quepa — todo el diseño responsivo de
// Tailwind (sm:/md:/etc., calculado sobre el ancho real del dispositivo)
// queda desfasado como resultado. `width: "device-width"` le dice al
// navegador que use el ancho real del dispositivo como viewport.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Aplica el tema (data-theme en <html>) ANTES de que React hidrate, para
// que no haya un destello del tema por defecto al cargar — mismo mecanismo
// que usan librerías como next-themes. La clave "mo:tema" debe coincidir
// exactamente con CLAVE_TEMA en src/context/ThemeContext.tsx.
const scriptAntiDestello = `
(function () {
  try {
    var pref = localStorage.getItem("mo:tema");
    var tema =
      pref === "light" || pref === "dark"
        ? pref
        : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    document.documentElement.setAttribute("data-theme", tema);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptAntiDestello }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
