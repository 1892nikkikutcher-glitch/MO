/** `navigator.canShare` no basta para decidir "usar el share sheet nativo":
 * Safari de escritorio (macOS) también lo soporta, pero su share sheet solo
 * ofrece AirDrop/Mensajes/Notas/Freeform — WhatsApp no aparece ahí, así que
 * usar `navigator.share` en Mac deja al doctor sin forma de completar el
 * envío. Solo en iOS/Android el share sheet nativo SÍ incluye WhatsApp como
 * destino. Se detecta con userAgent (no con `canShare`) — un iPad en modo
 * escritorio se reporta a sí mismo como "Macintosh" y por lo tanto cae
 * (correctamente, de forma conservadora) en el flujo de descarga + wa.me,
 * que sigue funcionando ahí, solo sin el atajo de un toque. */
function esMovilConWhatsappEnShareSheet(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPod/i.test(navigator.userAgent);
}

/** Resultado de `enviarPdfPorWhatsapp`. En móvil, el share sheet nativo ya
 * mandó el archivo — no queda nada más que hacer. En escritorio, redirigir
 * automáticamente una pestaña pre-abierta a wa.me resultó NO ser confiable
 * en Safari/Mac (el archivo se descarga bien, pero la navegación
 * automática de la pestaña se pierde silenciosamente) — así que en vez de
 * intentarlo, se devuelve el link para que la UI lo muestre como un botón
 * "Abrir WhatsApp" que el propio doctor hace clic (un clic fresco y directo
 * nunca lo bloquea un popup blocker, a diferencia de una redirección
 * programática después de esperar la generación del PDF). */
export type ResultadoEnvioWhatsapp =
  | { requiereAbrirManualmente: false }
  | { requiereAbrirManualmente: true; waUrl: string };

/** Envía un PDF ya generado por WhatsApp: en móvil usa el share sheet nativo
 * (adjunta el archivo directamente); en escritorio no existe forma de
 * adjuntar un archivo a un chat de WhatsApp mediante un link, así que se
 * descarga el PDF y se devuelve el link de WhatsApp para que la UI lo
 * ofrezca como botón (ver `ResultadoEnvioWhatsapp`).
 *
 * `ventanaPrevia` debe venir de un `window.open("", "_blank")` disparado de
 * forma síncrona en el clic que originó el envío — sigue sirviendo para el
 * share sheet nativo (se cierra sin usarse) y como respaldo si en algún
 * momento se retoma la navegación automática, pero ya no es el mecanismo
 * principal para abrir WhatsApp en escritorio. */
export async function enviarPdfPorWhatsapp({
  blob,
  nombreArchivo,
  telefono,
  caption,
  ventanaPrevia,
}: {
  blob: Blob;
  nombreArchivo: string;
  telefono?: string;
  caption: string;
  ventanaPrevia: Window | null;
}): Promise<ResultadoEnvioWhatsapp> {
  const archivo = new File([blob], nombreArchivo, { type: "application/pdf" });

  if (esMovilConWhatsappEnShareSheet() && navigator.canShare?.({ files: [archivo] })) {
    ventanaPrevia?.close(); // no se usa la pestaña — el share sheet nativo adjunta el PDF directamente
    try {
      // Deliberadamente SIN `text`/`title`: al compartir archivo + texto
      // juntos, la extensión de compartir de WhatsApp en iOS puede quedarse
      // solo con el texto y descartar el PDF en silencio (confirmado — el
      // mensaje llega, el archivo no). Compartiendo solo el archivo se
      // garantiza que WhatsApp reciba el documento; el doctor escribe el
      // mensaje a mano una vez ahí.
      await navigator.share({ files: [archivo] });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return { requiereAbrirManualmente: false }; // el usuario canceló el share sheet
      throw err;
    }
    return { requiereAbrirManualmente: false };
  }

  ventanaPrevia?.close();

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);

  const telefonoLimpio = telefono?.replace(/\D/g, "");
  const destino = telefonoLimpio ? `/${telefonoLimpio}` : "/";
  const waUrl = `https://wa.me${destino}?text=${encodeURIComponent(`${caption}\n\n(Adjunta el PDF que se acaba de descargar)`)}`;
  return { requiereAbrirManualmente: true, waUrl };
}
