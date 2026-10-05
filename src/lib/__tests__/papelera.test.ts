import { describe, expect, it } from "vitest";
import {
  agruparPorLote,
  analizarRutaOrigen,
  construirEntradaPapelera,
  esGrupoLote,
  etiquetaDeRegistro,
  grupoDeTipo,
  hashTexto,
  idEntradaPapelera,
  singularDeTipo,
  tiposPorGrupo,
  trocear,
  type EntradaPapelera,
} from "../papelera";

const usuario = { uid: "u1", email: "doc@clinica.mx" };
const ahora = new Date("2026-10-12T22:35:00.000Z");

describe("analizarRutaOrigen", () => {
  it("reconoce una colección de primer nivel de la clínica", () => {
    expect(analizarRutaOrigen("users/CLI/citas")).toEqual({
      clinicUid: "CLI",
      coleccion: "citas",
      pacienteId: null,
      relativa: "citas",
    });
  });

  it("reconoce una subcolección de un paciente y devuelve su id", () => {
    expect(analizarRutaOrigen("users/CLI/pacientes/p123/presupuestos")).toEqual({
      clinicUid: "CLI",
      coleccion: "presupuestos",
      pacienteId: "p123",
      relativa: "pacientes/p123/presupuestos",
    });
  });

  it("la colección de pacientes en sí no se confunde con una subcolección de paciente", () => {
    expect(analizarRutaOrigen("users/CLI/pacientes")?.pacienteId).toBeNull();
  });

  it("devuelve null con rutas que no cuelgan de users/{uid}/", () => {
    expect(analizarRutaOrigen("clinics/CLI")).toBeNull();
    expect(analizarRutaOrigen("users/CLI")).toBeNull();
    expect(analizarRutaOrigen("")).toBeNull();
  });
});

describe("etiquetaDeRegistro", () => {
  it("cita: paciente, fecha dd/mm/aaaa y hora", () => {
    const e = etiquetaDeRegistro(
      "citas",
      { paciente: "Brenda Ivonne Cruz", fecha: "2026-10-12", horaInicio: "16:30" },
      "c1"
    );
    expect(e).toBe("Brenda Ivonne Cruz · 12/10/2026 · 16:30");
  });

  it("presupuesto: folio, fecha y total con separador de miles", () => {
    const e = etiquetaDeRegistro("presupuestos", { folio: "A12", fecha: "2026-10-01", total: 12500 }, "b1");
    expect(e).toBe("Folio A12 · 01/10/2026 · $12,500");
  });

  it("pago: monto, fecha y forma de pago", () => {
    const e = etiquetaDeRegistro("pagos", { total: 800, fecha: "2026-09-30", formaPago: "Efectivo" }, "pg1");
    expect(e).toBe("$800 · 30/09/2026 · Efectivo");
  });

  it("foto: usa el campo para decir de qué foto era", () => {
    const e = etiquetaDeRegistro("fotos", { name: "IMG_01.jpg", fecha: "2026-10-12T10:00:00.000Z" }, "f1", "ineFrente");
    expect(e).toBe("INE (frente) · IMG_01.jpg · 12/10/2026");
  });

  it("tipo sin etiqueta propia usa el primer campo de texto conocido", () => {
    expect(etiquetaDeRegistro("procedimientos", { id: "x", nombre: "Limpieza dental", precio: 600 }, "x")).toBe(
      "Limpieza dental"
    );
  });

  it("registro sin ningún campo reconocible cae a '<tipo> <id>'", () => {
    expect(etiquetaDeRegistro("laminas", { foo: 1 }, "lam9")).toBe("Lámina educativa lam9");
  });

  it("tipo desconocido no truena", () => {
    expect(etiquetaDeRegistro("algoNuevo", { foo: 1 }, "z")).toBe("Registro z");
  });

  it("datos raros (total como texto, null) no truenan ni imprimen 'undefined'", () => {
    const e = etiquetaDeRegistro("presupuestos", { folio: null, fecha: undefined, total: "abc" }, "b2");
    expect(e).toBe("Presupuesto");
    expect(e).not.toContain("undefined");
  });

  it("recorta etiquetas larguísimas", () => {
    const e = etiquetaDeRegistro("procedimientos", { nombre: "x".repeat(500) }, "p");
    expect(e.length).toBe(140);
  });
});

describe("idEntradaPapelera", () => {
  const datos = { id: "c1", paciente: "Ana" };

  it("no contiene '/' (no es válido en un id de documento de Firestore)", () => {
    const id = idEntradaPapelera("pacientes/p1/presupuestos", "pres-1", datos, ahora);
    expect(id).not.toContain("/");
    expect(id.startsWith("pacientes~p1~presupuestos__pres-1__")).toBe(true);
  });

  it("es determinista: mismos datos y mismo instante dan el mismo id", () => {
    expect(idEntradaPapelera("citas", "c1", datos, ahora)).toBe(idEntradaPapelera("citas", "c1", datos, ahora));
  });

  it("dos eliminaciones del mismo documento en momentos distintos no comparten id", () => {
    const despues = new Date(ahora.getTime() + 60_000);
    expect(idEntradaPapelera("citas", "c1", datos, ahora)).not.toBe(idEntradaPapelera("citas", "c1", datos, despues));
  });

  it("contenido distinto en el mismo instante tampoco comparte id", () => {
    expect(idEntradaPapelera("citas", "c1", datos, ahora)).not.toBe(
      idEntradaPapelera("citas", "c1", { ...datos, paciente: "Beatriz" }, ahora)
    );
  });

  it("nunca tiene la forma reservada __algo__ que Firestore prohíbe", () => {
    const id = idEntradaPapelera("citas", "c1", datos, ahora);
    expect(/^__.*__$/.test(id)).toBe(false);
  });
});

describe("construirEntradaPapelera", () => {
  const item = { id: "c1", paciente: "Ana López", fecha: "2026-10-12", horaInicio: "09:00" };

  it("copia el documento completo y registra quién y cuándo", () => {
    const r = construirEntradaPapelera({ ruta: "users/CLI/citas", item, usuario, ahora });
    expect(r).not.toBeNull();
    expect(r!.entrada).toMatchObject({
      rutaOrigen: "users/CLI/citas",
      tipo: "citas",
      docId: "c1",
      pacienteId: null,
      datos: item,
      eliminadoEl: "2026-10-12T22:35:00.000Z",
      eliminadoPorUid: "u1",
      eliminadoPorEmail: "doc@clinica.mx",
    });
    expect(r!.entrada.id).toBe(r!.id);
    expect(r!.entrada.etiqueta).toBe("Ana López · 12/10/2026 · 09:00");
  });

  it("registra el paciente cuando el registro vivía dentro de uno", () => {
    const r = construirEntradaPapelera({
      ruta: "users/CLI/pacientes/p7/recetas",
      item: { id: "r1", folio: "9", fecha: "2026-10-01", medico: "Dra. Pérez" },
      usuario,
      ahora,
    });
    expect(r!.entrada.pacienteId).toBe("p7");
    expect(r!.entrada.tipo).toBe("recetas");
  });

  it("no marca lote cuando se elimina un solo registro", () => {
    const r = construirEntradaPapelera({ ruta: "users/CLI/citas", item, usuario, ahora, lote: { id: "L", tamano: 1 } });
    expect(r!.entrada.loteId).toBeUndefined();
    expect(r!.entrada.loteTamano).toBeUndefined();
  });

  it("marca el lote cuando se eliminan varios juntos", () => {
    const r = construirEntradaPapelera({ ruta: "users/CLI/citas", item, usuario, ahora, lote: { id: "L", tamano: 40 } });
    expect(r!.entrada.loteId).toBe("L");
    expect(r!.entrada.loteTamano).toBe(40);
  });

  it("guarda el campo contenedor de una foto", () => {
    const r = construirEntradaPapelera({
      ruta: "users/CLI/pacientes/p7/fotos",
      item: { id: "9.jpg", url: "https://x", path: "users/CLI/pacientes/p7/fotos/ine/9.jpg", name: "ine.jpg", fecha: "2026-10-12" },
      usuario,
      ahora,
      campo: "ineReverso",
    });
    expect(r!.entrada.campo).toBe("ineReverso");
    expect(r!.entrada.etiqueta).toContain("INE (reverso)");
  });

  it("devuelve null si la ruta no es de una clínica", () => {
    expect(construirEntradaPapelera({ ruta: "otraCosa/x", item, usuario, ahora })).toBeNull();
  });

  it("no incluye campos opcionales vacíos (Firestore no los necesita)", () => {
    const r = construirEntradaPapelera({ ruta: "users/CLI/citas", item, usuario, ahora });
    expect("campo" in r!.entrada).toBe(false);
    expect("loteId" in r!.entrada).toBe(false);
  });
});

describe("trocear", () => {
  it("parte en lotes del tamaño pedido, con el último más chico", () => {
    expect(trocear([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it("lista vacía da cero lotes", () => {
    expect(trocear([], 200)).toEqual([]);
  });
  it("450 registros caben en 3 lotes de 200", () => {
    const lotes = trocear(Array.from({ length: 450 }, (_, i) => i), 200);
    expect(lotes.map((l) => l.length)).toEqual([200, 200, 50]);
  });
});

describe("agruparPorLote", () => {
  const base = (id: string, loteId?: string, loteTamano?: number): EntradaPapelera => ({
    id,
    rutaOrigen: "users/CLI/citas",
    tipo: "citas",
    docId: id,
    pacienteId: null,
    etiqueta: id,
    datos: { id },
    eliminadoEl: "2026-10-12T22:35:00.000Z",
    eliminadoPorUid: "u1",
    eliminadoPorEmail: "doc@clinica.mx",
    loteId,
    loteTamano,
  });

  it("las entradas sin lote quedan sueltas y las de un lote se juntan en un grupo", () => {
    const r = agruparPorLote([base("a"), base("b", "L1", 2), base("c"), base("d", "L1", 2)]);
    expect(r).toHaveLength(3);
    expect(esGrupoLote(r[0])).toBe(false);
    expect(esGrupoLote(r[1])).toBe(true);
    expect(esGrupoLote(r[2])).toBe(false);
    const grupo = r[1];
    if (esGrupoLote(grupo)) {
      expect(grupo.entradas.map((e) => e.id)).toEqual(["b", "d"]);
      expect(grupo.tamano).toBe(2);
    }
  });

  it("un lote de tamaño 1 se trata como entrada suelta", () => {
    const r = agruparPorLote([base("a", "L9", 1)]);
    expect(esGrupoLote(r[0])).toBe(false);
  });
});

describe("catálogo de tipos", () => {
  it("todo tipo conocido tiene nombre en singular y grupo", () => {
    tiposPorGrupo().forEach(({ tipos }) =>
      tipos.forEach(({ tipo, singular }) => {
        expect(singular.length).toBeGreaterThan(0);
        expect(singularDeTipo(tipo)).toBe(singular);
      })
    );
  });

  it("cubre las colecciones que hoy se pueden eliminar desde la app", () => {
    const todos = new Set(tiposPorGrupo().flatMap((g) => g.tipos.map((t) => t.tipo)));
    [
      "citas", "recursos", "presupuestos", "pagos", "recetas", "diagnosticos", "planTratamiento", "comparativas",
      "laboratorios", "notasEvolucion", "membresias", "fotos", "gastos", "procedimientos", "medicamentos",
      "membresiaPlanes", "laminas", "promociones", "aseguradoras", "empresasRpbi", "contadores",
      "depositosDentales", "articulosFaltantes", "articulosCaducidad", "centrosRadiodiagnostico",
      "laboratoriosDentales", "encuestas", "domiciliaciones", "pendientes", "personalAsistencia",
      "registrosAsistencia", "pagosEliminados", "pagosRealizados", "presupuestosLog", "recetasLog", "otsLog",
    ].forEach((t) => expect(todos.has(t), t).toBe(true));
  });

  it("un tipo desconocido cae en Bitácoras y 'Registro'", () => {
    expect(grupoDeTipo("loQueSea")).toBe("bitacoras");
    expect(singularDeTipo("loQueSea")).toBe("Registro");
  });
});

describe("hashTexto", () => {
  it("es estable y distingue textos distintos", () => {
    expect(hashTexto("hola")).toBe(hashTexto("hola"));
    expect(hashTexto("hola")).not.toBe(hashTexto("hola!"));
  });
});
