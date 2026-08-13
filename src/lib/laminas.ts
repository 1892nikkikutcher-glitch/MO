/** Láminas informativas de atención odontológica: material educativo que el
 * consultorio prepara para reforzar indicaciones con los pacientes (por
 * ejemplo, cuidados post-operatorios o técnica de cepillado) y que se puede
 * compartir por WhatsApp. */

export type Lamina = {
  id: string;
  titulo: string;
  categoria: string;
  contenido: string;
  /** Imagen opcional, guardada como data URL ya redimensionada en el
   * navegador para no exceder el límite de 1 MB por documento en Firestore. */
  imagenUrl?: string;
  creadoEn: string;
};

export const categoriaLaminaOptions = [
  "Higiene bucal",
  "Prevención",
  "Ortodoncia",
  "Cirugía y post-operatorio",
  "Odontopediatría",
  "Prótesis y rehabilitación",
  "Nutrición y salud bucal",
  "Otro",
];

/** Redimensiona una imagen en el navegador antes de guardarla, para que la
 * lámina quepa cómodamente dentro del límite de 1 MB por documento de
 * Firestore. Devuelve un data URL JPEG. */
export function redimensionarImagen(file: File, maxAncho = 1000, calidad = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error("No se pudo leer la imagen."));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo procesar la imagen."));
      img.onload = () => {
        const escala = Math.min(1, maxAncho / img.width);
        const ancho = Math.round(img.width * escala);
        const alto = Math.round(img.height * escala);
        const canvas = document.createElement("canvas");
        canvas.width = ancho;
        canvas.height = alto;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No se pudo procesar la imagen."));
        ctx.drawImage(img, 0, 0, ancho, alto);
        resolve(canvas.toDataURL("image/jpeg", calidad));
      };
      img.src = lector.result as string;
    };
    lector.readAsDataURL(file);
  });
}

/** Texto para compartir una lámina por WhatsApp cuando no lleva imagen (o
 * como complemento del título y contenido). */
export function buildLaminaTexto(lamina: Lamina): string {
  return `*${lamina.titulo}*\n\n${lamina.contenido}`;
}
