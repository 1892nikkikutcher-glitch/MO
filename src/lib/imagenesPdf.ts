/** Carga una imagen (data URI ya lista, o una URL remota) al formato que
 * jsPDF necesita para incrustarla en un PDF — compartido entre los
 * generadores de Recetas y Presupuestos. */

export type ImagenCargada = { dataUri: string; formato: string; ancho: number; alto: number };

function formatoDesdeDataUri(dataUri: string): string {
  const match = dataUri.match(/^data:image\/(\w+);/i);
  const tipo = (match?.[1] ?? "png").toUpperCase();
  return tipo === "JPG" ? "JPEG" : tipo;
}

export async function cargarImagen(src: string): Promise<ImagenCargada | null> {
  if (!src) return null;
  try {
    let dataUri = src;
    if (!src.startsWith("data:")) {
      const res = await fetch(src, { mode: "cors" });
      const blob = await res.blob();
      dataUri = await new Promise<string>((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(lector.result as string);
        lector.onerror = () => reject(new Error("No se pudo leer la imagen"));
        lector.readAsDataURL(blob);
      });
    }
    const { ancho, alto } = await new Promise<{ ancho: number; alto: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ ancho: img.naturalWidth, alto: img.naturalHeight });
      img.onerror = () => reject(new Error("Imagen inválida"));
      img.src = dataUri;
    });
    return { dataUri, formato: formatoDesdeDataUri(dataUri), ancho, alto };
  } catch {
    // Logo remoto no disponible (CORS, link roto, etc.) — el PDF se genera sin él.
    return null;
  }
}
