"use client";

import { useId } from "react";
import {
  COLUMNAS_VALORACION_DIENTES,
  DIENTES_VALORACION,
  conCeldaValoracion,
  dientesConValoracion,
  type ColumnaValoracionDientes,
  type ValoracionDientes,
} from "@/lib/historiaClinica";

/** Color del pronóstico para que se lea de un vistazo al recorrer el cuadro. */
function claseDePronostico(texto: string): string {
  const t = texto.trim().toLowerCase();
  if (t.startsWith("bueno")) return "text-success";
  if (t.startsWith("malo") || t.startsWith("desahuc") || t.startsWith("sin esperanza")) return "text-danger";
  if (t.startsWith("regular") || t.startsWith("reservado") || t.startsWith("cuestionable")) return "text-warning";
  return "text-ink";
}

/** Cuadro por diente del formato de valoración periodontal y pronóstico: una fila
 * por cada uno de los 32 dientes permanentes y una columna por cada dato. Cada celda
 * es texto libre con sugerencias — así se captura rápido sin limitar lo que el doctor
 * quiera anotar. Controlado: el padre guarda el valor (Historia Clínica ya autoguarda). */
export default function ValoracionPorDiente({
  valor,
  onChange,
}: {
  valor: ValoracionDientes;
  onChange: (siguiente: ValoracionDientes) => void;
}) {
  const idBase = useId();
  const conDatos = dientesConValoracion(valor).length;

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink/40">
        Anota solo lo que aplique a cada diente; las celdas vacías no se guardan. Las sugerencias aparecen al tocar la celda,
        pero puedes escribir lo que necesites.{" "}
        <span className="font-semibold text-ink/60">
          {conDatos === 0 ? "Aún sin datos." : `${conDatos} ${conDatos === 1 ? "diente con datos" : "dientes con datos"}.`}
        </span>
      </p>

      <div className="max-h-[70vh] overflow-auto rounded-xl border border-edge/10">
        <table className="w-full min-w-[920px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 w-16 border-b border-r border-edge/10 bg-modal-solid px-2 py-2 text-left font-semibold text-ink/70">
                Diente
              </th>
              {COLUMNAS_VALORACION_DIENTES.map((col) => (
                <th
                  key={col.id}
                  className="sticky top-0 z-20 min-w-[112px] border-b border-edge/10 bg-modal-solid px-2 py-2 text-left font-semibold leading-tight text-ink/70"
                >
                  {col.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DIENTES_VALORACION.map((diente, i) => {
              // Raya más marcada al empezar cada cuadrante (cada 8 dientes) para no perderse.
              const inicioCuadrante = i % 8 === 0 && i !== 0;
              const fila = valor[String(diente)] ?? {};
              return (
                <tr key={diente} className={inicioCuadrante ? "[&>*]:border-t-2 [&>*]:border-t-edge/20" : ""}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-b border-r border-edge/10 bg-modal-solid px-2 py-1 text-left font-semibold text-accent"
                  >
                    {diente}
                  </th>
                  {COLUMNAS_VALORACION_DIENTES.map((col) => {
                    const texto = fila[col.id as ColumnaValoracionDientes] ?? "";
                    const listaId = `${idBase}-${col.id}`;
                    return (
                      <td key={col.id} className="border-b border-edge/10 p-0">
                        <input
                          type="text"
                          list={listaId}
                          value={texto}
                          aria-label={`${col.titulo}, diente ${diente}`}
                          onChange={(e) => onChange(conCeldaValoracion(valor, diente, col.id as ColumnaValoracionDientes, e.target.value))}
                          className={`w-full bg-transparent px-2 py-1.5 outline-none focus:bg-accent/10 ${
                            col.id === "pronostico" ? `font-semibold ${claseDePronostico(texto)}` : "text-ink"
                          }`}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {COLUMNAS_VALORACION_DIENTES.map((col) => (
        <datalist key={col.id} id={`${idBase}-${col.id}`}>
          {col.sugerencias.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ))}
    </div>
  );
}
