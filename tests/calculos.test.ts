import {
  intervaloRelatorio, mesAnterior, margemPct, variacaoPct, progressoMeta,
} from "@/lib/relatorio/calculos";

test("intervaloRelatorio: hoje/semana/mes/tudo", () => {
  expect(intervaloRelatorio("hoje", "2026-07-19")).toEqual({ de: "2026-07-19", ate: "2026-07-19" });
  expect(intervaloRelatorio("semana", "2026-07-19")).toEqual({ de: "2026-07-13", ate: "2026-07-19" });
  expect(intervaloRelatorio("mes", "2026-07-19")).toEqual({ de: "2026-07-01", ate: "2026-07-19" });
  expect(intervaloRelatorio(undefined, "2026-07-19")).toEqual({ de: "2026-07-01", ate: "2026-07-19" });
  expect(intervaloRelatorio("tudo", "2026-07-19")).toEqual({ de: "2000-01-01", ate: "2026-07-19" });
});

test("mesAnterior atravessa a virada do ano", () => {
  expect(mesAnterior("2026-01-10")).toEqual({ de: "2025-12-01", ate: "2025-12-31" });
});

test("margemPct", () => {
  expect(margemPct(1000, 400)).toBe(60);
  expect(margemPct(0, 0)).toBe(0);
});

test("variacaoPct (anterior 0 -> null)", () => {
  expect(variacaoPct(120, 100)).toBe(20);
  expect(variacaoPct(80, 100)).toBe(-20);
  expect(variacaoPct(50, 0)).toBeNull();
});

test("progressoMeta", () => {
  expect(progressoMeta(555, 3000)).toBe(19);
  expect(progressoMeta(5000, 3000)).toBe(100);
  expect(progressoMeta(100, 0)).toBe(0);
});
