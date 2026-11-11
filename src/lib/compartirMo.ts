/** Enlaces para compartir MO por WhatsApp, redes sociales y correo. Todo
 * sale de un mismo texto y un mismo enlace, para que lo que se pega en
 * cualquier lado diga lo mismo. Instagram y TikTok no tienen una dirección web
 * de "compartir": ahí se usa el menú nativo del teléfono o el enlace copiado. */

export const TITULO_COMPARTIR_MO = "MO — Mi Odontólogo";

export const MENSAJE_COMPARTIR_MO =
  "Estoy usando MO, la plataforma para consultorios dentales: agenda, expedientes, recetas y cobros en un solo lugar. Conócela aquí:";

export type RedCompartir = "whatsapp" | "facebook" | "x" | "linkedin" | "telegram" | "correo";

export const REDES_COMPARTIR: { id: RedCompartir; nombre: string }[] = [
  { id: "whatsapp", nombre: "WhatsApp" },
  { id: "facebook", nombre: "Facebook" },
  { id: "x", nombre: "X" },
  { id: "linkedin", nombre: "LinkedIn" },
  { id: "telegram", nombre: "Telegram" },
  { id: "correo", nombre: "Correo" },
];

/** Quita la ruta, el query y el hash: se comparte la puerta de entrada de MO, nunca la pantalla interna donde estaba el usuario. */
export function enlaceParaCompartir(origen: string): string {
  try {
    return new URL(origen).origin;
  } catch {
    return origen;
  }
}

export function urlCompartir(red: RedCompartir, enlace: string): string {
  const url = encodeURIComponent(enlace);
  const mensaje = encodeURIComponent(MENSAJE_COMPARTIR_MO);
  switch (red) {
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(`${MENSAJE_COMPARTIR_MO} ${enlace}`)}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${mensaje}`;
    case "x":
      return `https://twitter.com/intent/tweet?text=${mensaje}&url=${url}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    case "telegram":
      return `https://t.me/share/url?url=${url}&text=${mensaje}`;
    case "correo":
      return `mailto:?subject=${encodeURIComponent(TITULO_COMPARTIR_MO)}&body=${encodeURIComponent(`${MENSAJE_COMPARTIR_MO}\n\n${enlace}`)}`;
  }
}
