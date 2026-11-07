"use client";

/** Cliente de /api/cursos (lectura, cualquier clínica) y /api/admin/cursos
 * (alta, edición y baja, solo el dueño). Mismo patrón que conectaApi.ts:
 * adjunta el ID token de la sesión, nunca toca Firestore directo. */

import { auth } from "./firebase";
import type { CursoEditable, CursoPlataforma } from "./cursos";

async function llamar(path: string, options: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token ?? ""}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Ocurrió un error.");
  return data;
}

export async function listarCursosApi(): Promise<CursoPlataforma[]> {
  const { cursos } = await llamar("/api/cursos");
  return cursos;
}

export async function crearCursoApi(curso: CursoEditable): Promise<CursoPlataforma> {
  const { curso: creado } = await llamar("/api/admin/cursos", { method: "POST", body: JSON.stringify(curso) });
  return creado;
}

export async function editarCursoApi(id: string, cambios: Partial<CursoEditable>): Promise<CursoPlataforma> {
  const { curso } = await llamar(`/api/admin/cursos/${id}`, { method: "PATCH", body: JSON.stringify(cambios) });
  return curso;
}

export async function eliminarCursoApi(id: string): Promise<void> {
  await llamar(`/api/admin/cursos/${id}`, { method: "DELETE" });
}
