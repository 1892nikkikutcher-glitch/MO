/** Envía un PDF ya generado por WhatsApp: en móvil usa el share sheet nativo
 * (adjunta el archivo directamente); en escritorio no existe forma de
 * adjuntar un archivo a un chat de WhatsApp mediante un link, así que se
 * descarga el PDF y se abre WhatsApp con el texto para adjuntarlo a mano.
 *
 * `ventanaPrevia` debe venir de un `window.open("", "_blank")` disparado de
 * forma síncrona en el clic que originó el envío — abrirla después de
 * esperar la generación del PDF pierde el gesto de usuario y el navegador
 * la bloquea como pop-up. */
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
}): Promise<void> {
  const archivo = new File([blob], nombreArchivo, { type: "application/pdf" });

  if (navigator.canShare?.({ files: [archivo] })) {
    ventanaPrevia?.close(); // no se usa la pestaña — el share sheet nativo adjunta el PDF directamente
    try {
      await navigator.share({ files: [archivo], title: nombreArchivo, text: caption });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return; // el usuario canceló el share sheet
      throw err;
    }
    return;
  }

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);

  const telefonoLimpio = telefono?.replace(/\D/g, "");
  const destino = telefonoLimpio ? `/${telefonoLimpio}` : "/";
  const waUrl = `https://wa.me${destino}?text=${encodeURIComponent(`${caption}\n\n(Adjunta el PDF que se acaba de descargar)`)}`;
  if (ventanaPrevia) ventanaPrevia.location.href = waUrl;
  else window.open(waUrl, "_blank");
}
