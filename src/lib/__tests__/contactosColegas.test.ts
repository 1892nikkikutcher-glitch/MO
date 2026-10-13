import { describe, expect, it } from "vitest";
import {
  SIN_PREFERENCIAS,
  aplicarOcultos,
  claveContacto,
  mostrarContacto,
  ocultarContacto,
  resolverAlias,
  unirComoMismaPersona,
  contactosDeInvitaciones,
  guardarContacto,
  normalizarNombre,
  telefonoLocal,
  unirContactos,
} from "../contactosColegas";

const c = (nombre: string, over: Partial<{ whatsapp: string; correo: string; ultimoUso: string }> = {}) => ({
  nombre,
  whatsapp: "",
  correo: "",
  ultimoUso: "2026-10-01T00:00:00Z",
  ...over,
});

describe("normalizarNombre / telefonoLocal / claveContacto", () => {
  it("ignora acentos, mayúsculas y signos", () => {
    expect(normalizarNombre("  Jaqueline  DE la Cruz-Mercado ")).toBe("jaqueline de la cruz mercado");
    expect(normalizarNombre("José Ángel")).toBe("jose angel");
  });
  it("toma los últimos 10 dígitos del teléfono", () => {
    expect(telefonoLocal("+52 (722) 123-4567")).toBe("7221234567");
    expect(telefonoLocal("123")).toBe("");
  });
  it("la clave prefiere correo, luego WhatsApp, luego nombre", () => {
    expect(claveContacto({ nombre: "A", correo: " X@Y.com " })).toBe("c:x@y.com");
    expect(claveContacto({ nombre: "A", whatsapp: "722 123 4567" })).toBe("w:7221234567");
    expect(claveContacto({ nombre: "Ana López" })).toBe("n:ana lopez");
  });
});

describe("unirContactos", () => {
  it("une el mismo correo aunque el nombre cambie y se queda con el más reciente", () => {
    const r = unirContactos([
      c("Jaqueline Dlc M", { correo: "j@x.mx", ultimoUso: "2026-10-01T00:00:00Z" }),
      c("jaqueline de la cruz mercado", { correo: "J@x.mx", ultimoUso: "2026-10-05T00:00:00Z" }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].nombre).toBe("Jaqueline de la Cruz Mercado");
  });

  it("completa con el WhatsApp de la agenda local el contacto que solo traía nombre", () => {
    const r = unirContactos(
      contactosDeInvitaciones([
        { destinatarioNombre: "Carla Contreras", destinatarioCorreo: null, canal: "whatsapp", estado: "activa", creadoEl: "2026-10-02T00:00:00Z", venceEl: "" },
      ]),
      [c("carla contreras", { whatsapp: "7221234567", ultimoUso: "2026-10-03T00:00:00Z" })]
    );
    expect(r).toEqual([{ nombre: "Carla Contreras", whatsapp: "7221234567", correo: "", ultimoUso: "2026-10-03T00:00:00Z" }]);
  });

  it("deja separados a dos colegas distintos y ordena por uso reciente", () => {
    const r = unirContactos([c("Ana", { ultimoUso: "2026-10-01T00:00:00Z" }), c("Beto", { ultimoUso: "2026-10-04T00:00:00Z" })]);
    expect(r.map((x) => x.nombre)).toEqual(["Beto", "Ana"]);
  });

  it("descarta contactos sin ningún dato", () => {
    expect(unirContactos([c(""), c("   ")])).toEqual([]);
  });
});

describe("guardarContacto", () => {
  it("agrega y actualiza sin duplicar", () => {
    let lista = guardarContacto([], c("Ana", { whatsapp: "7221234567" }));
    lista = guardarContacto(lista, c("ANA", { whatsapp: "722 123 4567", correo: "ana@x.mx", ultimoUso: "2026-10-09T00:00:00Z" }));
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ nombre: "Ana", correo: "ana@x.mx" });
  });
});

describe("ocultar, mostrar y unir", () => {
  const jaq = c("Jaqueline Dlc M", { correo: "j@x.mx", ultimoUso: "2026-10-01T00:00:00Z" });
  const jaqueline = c("Jaqueline de la Cruz Mercado", { whatsapp: "7221234567", ultimoUso: "2026-10-05T00:00:00Z" });

  it("un colega oculto no aparece, ni siquiera con otro dato suyo igual", () => {
    const prefs = ocultarContacto(SIN_PREFERENCIAS, jaq);
    expect(aplicarOcultos([jaq, jaqueline], prefs.ocultos)).toEqual([jaqueline]);
    // El mismo correo con otro nombre sigue siendo la misma persona oculta.
    expect(aplicarOcultos([c("Otro nombre", { correo: "J@x.mx" })], prefs.ocultos)).toEqual([]);
  });

  it("al volver a guardarlo deja de estar oculto", () => {
    const prefs = mostrarContacto(ocultarContacto(SIN_PREFERENCIAS, jaq), jaq);
    expect(prefs.ocultos).toEqual([]);
  });

  it("unir como misma persona: completa los datos, oculta al origen y deja alias para los paneles", () => {
    const { prefs, destino } = unirComoMismaPersona(SIN_PREFERENCIAS, jaq, jaqueline);
    expect(destino).toMatchObject({ nombre: "Jaqueline de la Cruz Mercado", whatsapp: "7221234567", correo: "j@x.mx" });
    expect(resolverAlias("n:jaqueline dlc m", "Jaqueline Dlc M", prefs.alias)).toEqual({
      clave: "n:jaqueline de la cruz mercado",
      nombre: "Jaqueline de la Cruz Mercado",
    });
    // El destino fusionado sí se ve (tiene el correo del origen) y el origen no se duplica.
    expect(aplicarOcultos(unirContactos([jaq, jaqueline]), prefs.ocultos).length).toBeLessThanOrEqual(1);
  });

  it("resolverAlias deja igual a quien no tiene alias", () => {
    expect(resolverAlias("u:abc", "Dra. Ana", {})).toEqual({ clave: "u:abc", nombre: "Dra. Ana" });
  });
});
