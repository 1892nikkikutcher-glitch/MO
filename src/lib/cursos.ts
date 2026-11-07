/** Cursos, posgrados y escuelas que el dueño de la plataforma recomienda a los
 * doctores. Es un catálogo ÚNICO de MO (colección `cursosPlataforma`): lo
 * escribe solo el administrador vía /api/admin/cursos y lo leen todas las
 * clínicas vía /api/cursos — nunca desde el cliente directo. */

import { z } from "zod";
import { urlWhatsApp } from "./avisoWhatsApp";

export const modalidadesCurso = ["Presencial", "En línea", "Mixto"] as const;
export type ModalidadCurso = (typeof modalidadesCurso)[number];

export const areasCurso = [
  "Endodoncia",
  "Ortodoncia",
  "Implantología",
  "Periodoncia",
  "Cirugía oral y maxilofacial",
  "Odontopediatría",
  "Rehabilitación oral y prótesis",
  "Estética dental",
  "Odontología digital",
  "Administración de consultorio",
  "Otra",
] as const;

export type CursoPlataforma = {
  id: string;
  /** Nombre del curso, diplomado o maestría. */
  nombre: string;
  /** Escuela, instituto o academia que lo ofrece. */
  institucion: string;
  area: string;
  modalidad: ModalidadCurso;
  /** Quién lo imparte, tal como se quiere mostrar ("Dr. Jaffet B y Dra. Susy"). */
  imparten: string;
  descripcion: string;
  /** Datos para inscribirse. */
  contactoNombre: string;
  contactoTelefono: string;
  contactoCorreo: string;
  enlace: string;
  /** Texto libre: "Sede CDMX · inicia marzo 2027 · $45,000". */
  detalles: string;
  /** Imagen opcional como data URL ya redimensionada. */
  imagenUrl: string;
  creadoEn: string;
};

export type CursoEditable = Omit<CursoPlataforma, "id" | "creadoEn">;

/** Solo campos que el administrador puede mandar — `.strict()` rechaza
 * cualquier otro en vez de ignorarlo. */
export const cursoSchema = z
  .object({
    nombre: z.string().trim().min(1).max(200),
    institucion: z.string().trim().min(1).max(200),
    area: z.string().trim().min(1).max(100),
    modalidad: z.enum(modalidadesCurso),
    imparten: z.string().trim().max(300),
    descripcion: z.string().trim().max(2000),
    contactoNombre: z.string().trim().max(200),
    contactoTelefono: z.string().trim().max(30),
    contactoCorreo: z.string().trim().max(200),
    enlace: z.string().trim().max(500),
    detalles: z.string().trim().max(500),
    // Un data URL JPEG de 1000 px pesa ~150 KB; el tope deja holgura y deja
    // fuera archivos que se acerquen al límite de 1 MB por documento.
    imagenUrl: z.string().max(600_000),
  })
  .strict();

export const cursoParcialSchema = cursoSchema.partial().strict();

const sinEspacios = (s: string) => s.trim();

/** Mensaje para que un doctor recomiende el curso a un colega por WhatsApp. */
export function mensajeRecomendarCurso(curso: CursoPlataforma): string {
  const lineas = [
    `Hola, este es el curso en ${curso.area.toLowerCase()} que te recomendé, se llama *${curso.nombre}*` +
      (curso.institucion ? ` (${curso.institucion})` : "") +
      (curso.imparten ? `, impartido por ${curso.imparten}.` : "."),
  ];
  if (curso.detalles) lineas.push(curso.detalles);

  const contacto: string[] = [];
  if (curso.contactoNombre) contacto.push(curso.contactoNombre);
  if (curso.contactoTelefono) contacto.push(`WhatsApp: ${curso.contactoTelefono}`);
  if (curso.contactoCorreo) contacto.push(curso.contactoCorreo);
  if (contacto.length > 0) lineas.push(`Este es su contacto para inscripciones: ${contacto.join(" · ")}`);

  const sitio = enlaceSeguro(curso.enlace);
  if (sitio) lineas.push(sitio);
  return lineas.join("\n\n");
}

/** Mensaje de quien quiere inscribirse, dirigido al contacto del curso. */
export function mensajeInteresCurso(curso: CursoPlataforma): string {
  return `Hola, vi el curso *${curso.nombre}* en MO y me gustaría información para inscribirme.`;
}

/** WhatsApp para recomendar a un colega: sin número, WhatsApp deja elegir contacto. */
export function urlRecomendarCurso(curso: CursoPlataforma): string {
  return urlWhatsApp("", mensajeRecomendarCurso(curso));
}

/** WhatsApp directo al contacto de inscripciones, o null si el curso no trae teléfono. */
export function urlInscribirmeCurso(curso: CursoPlataforma): string | null {
  const digitos = curso.contactoTelefono.replace(/\D/g, "");
  if (digitos.length < 10) return null;
  return urlWhatsApp(digitos, mensajeInteresCurso(curso));
}

/** El enlace del sitio solo se muestra si es http(s): nunca `javascript:` ni otros esquemas. */
export function enlaceSeguro(enlace: string): string | null {
  const limpio = sinEspacios(enlace);
  if (!limpio) return null;
  const conEsquema = /^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`;
  try {
    const url = new URL(conEsquema);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Quita lo que no debe llegar al cliente ni se guarda como `undefined`. */
export function cursoDesdeDoc(id: string, data: Partial<CursoPlataforma>): CursoPlataforma {
  return {
    id,
    nombre: data.nombre ?? "",
    institucion: data.institucion ?? "",
    area: data.area ?? "Otra",
    modalidad: data.modalidad ?? "Presencial",
    imparten: data.imparten ?? "",
    descripcion: data.descripcion ?? "",
    contactoNombre: data.contactoNombre ?? "",
    contactoTelefono: data.contactoTelefono ?? "",
    contactoCorreo: data.contactoCorreo ?? "",
    enlace: data.enlace ?? "",
    detalles: data.detalles ?? "",
    imagenUrl: data.imagenUrl ?? "",
    creadoEn: data.creadoEn ?? "",
  };
}
