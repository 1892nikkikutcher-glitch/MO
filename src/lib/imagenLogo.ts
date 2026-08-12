/** Convierte un archivo de imagen (logo subido desde el navegador) en un
 * data URI PNG comprimido, para guardarlo directamente como texto en el
 * perfil del doctor (sin depender de Firebase Storage). Se limita el lado
 * más largo para que el documento de Firestore nunca se acerque a su
 * límite de 1 MB aunque el doctor suba una foto pesada. */
export function archivoAImagenComprimida(file: File, maxLado = 240): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error("No se pudo leer el archivo"));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("El archivo no es una imagen válida"));
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
        const ancho = Math.max(1, Math.round(img.width * escala));
        const alto = Math.max(1, Math.round(img.height * escala));
        const canvas = document.createElement("canvas");
        canvas.width = ancho;
        canvas.height = alto;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo procesar la imagen"));
          return;
        }
        ctx.drawImage(img, 0, 0, ancho, alto);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = lector.result as string;
    };
    lector.readAsDataURL(file);
  });
}
