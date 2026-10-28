import { describe, expect, it } from "vitest";
import { etiquetaDispositivo } from "../dispositivo";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID_REDUCIDO = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const XIAOMI_UA = "Mozilla/5.0 (Linux; Android 13; 23053RN02L Build/TP1A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

describe("etiquetaDispositivo", () => {
  it("reconoce un iPhone y un iPad", () => {
    expect(etiquetaDispositivo(IPHONE)).toBe("iPhone");
    expect(etiquetaDispositivo("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("iPad");
  });

  it("reconoce un Xiaomi por el modelo que manda Chrome aunque el user agent venga reducido", () => {
    expect(etiquetaDispositivo(ANDROID_REDUCIDO, "Redmi Note 12")).toBe("Xiaomi");
    expect(etiquetaDispositivo(ANDROID_REDUCIDO, "23053RN02L")).toBe("Xiaomi");
    expect(etiquetaDispositivo(ANDROID_REDUCIDO, "M2101K6G")).toBe("Xiaomi");
  });

  it("reconoce un Xiaomi por el user agent completo o por su navegador", () => {
    expect(etiquetaDispositivo(XIAOMI_UA)).toBe("Xiaomi");
    expect(etiquetaDispositivo("Mozilla/5.0 (Linux; U; Android 12; es-mx; Redmi 9) MiuiBrowser/17.0")).toBe("Xiaomi");
  });

  it("un Android de otra marca o sin modelo queda como Android", () => {
    expect(etiquetaDispositivo(ANDROID_REDUCIDO)).toBe("Android");
    expect(etiquetaDispositivo(ANDROID_REDUCIDO, "SM-S918B")).toBe("Android");
    expect(etiquetaDispositivo(ANDROID_REDUCIDO, "Pixel 8")).toBe("Android");
  });

  it("todo lo demás es computadora", () => {
    expect(etiquetaDispositivo(WINDOWS)).toBe("Computadora");
  });
});
