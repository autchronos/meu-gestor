import { ehIOS, estaEmModoStandalone } from "@/lib/instalacao";

test("detecta iPhone", () => {
  expect(ehIOS("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true);
});

test("detecta iPad", () => {
  expect(ehIOS("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe(true);
});

test("Android não é iOS", () => {
  expect(ehIOS("Mozilla/5.0 (Linux; Android 13)")).toBe(false);
});

describe("estaEmModoStandalone", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("true quando o display-mode é standalone", () => {
    vi.stubGlobal("matchMedia", (consulta: string) => ({
      matches: consulta.includes("standalone"),
    }));
    expect(estaEmModoStandalone()).toBe(true);
  });

  test("true quando navigator.standalone (iOS já instalado)", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    Object.defineProperty(window.navigator, "standalone", {
      value: true,
      configurable: true,
    });
    expect(estaEmModoStandalone()).toBe(true);
    delete (window.navigator as { standalone?: boolean }).standalone;
  });

  test("false num navegador comum", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    expect(estaEmModoStandalone()).toBe(false);
  });
});
