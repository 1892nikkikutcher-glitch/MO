import type { Metadata, Viewport } from "next";
import "./globals.css";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
