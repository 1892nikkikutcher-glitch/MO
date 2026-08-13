export const gastoCategoriaOptions = [
  "Insumos",
  "Renta",
  "Nómina",
  "Servicios",
  "Laboratorio",
  "Marketing",
  "Otro",
] as const;
export type GastoCategoria = (typeof gastoCategoriaOptions)[number];

export type Gasto = {
  id: string;
  concepto: string;
  categoria: GastoCategoria;
  monto: number;
  /** Fecha ISO "YYYY-MM-DD". */
  fecha: string;
};
