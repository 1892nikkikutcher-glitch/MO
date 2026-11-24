import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TRAZOS_SUBMODULOS, trazoSubmodulo } from "../iconosSubmodulos";

describe("iconos de submódulos", () => {
  it("cada submódulo del menú tiene su propio dibujo", () => {
    // BottomNav es un .tsx (las pruebas no lo importan): se leen los ids de los hijos del menú desde su código.
    const fuente = readFileSync(join(process.cwd(), "src/components/BottomNav.tsx"), "utf-8");
    const ids = [...fuente.matchAll(/\{ id: "([a-z-]+)", label: "[^"]+" \}/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(30);
    expect(ids.filter((id) => !TRAZOS_SUBMODULOS[id])).toEqual([]);
  });

  it("un submódulo nuevo sin dibujo propio usa el círculo de respaldo", () => {
    expect(trazoSubmodulo("no-existe")).toMatch(/^M12 15/);
  });
});
