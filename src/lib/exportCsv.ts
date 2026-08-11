/** Exporta datos a un .csv que abre directamente en Excel, sin depender de
 * ninguna librería externa. El BOM UTF-8 asegura que los acentos y la Ñ se
 * vean bien al abrirlo. Pensado para que el usuario nunca dependa de MO para
 * tener sus datos: siempre puede sacarlos y llevarlos a otra plataforma. */
function escapeCelda(valor: string | number | undefined | null): string {
  const texto = valor === undefined || valor === null ? "" : String(valor);
  if (/[",\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export function exportarCsv(
  nombreArchivo: string,
  encabezados: string[],
  filas: (string | number | undefined | null)[][]
) {
  const lineas = [
    encabezados.map(escapeCelda).join(","),
    ...filas.map((fila) => fila.map(escapeCelda).join(",")),
  ];
  const contenido = "﻿" + lineas.join("\r\n");
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
