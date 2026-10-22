import type { Metadata } from "next";

// La liga de un recibo es privada: que ningún buscador la indexe ni la guarde.
export const metadata: Metadata = {
  title: "Recibo de pago",
  robots: { index: false, follow: false, nocache: true },
};

export default function ReciboLayout({ children }: { children: React.ReactNode }) {
  return children;
}
