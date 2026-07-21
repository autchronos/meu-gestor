import {
  intervaloRelatorio, mesAnterior, margemPct, variacaoPct, progressoMeta,
} from "@/lib/relatorio/calculos";
import { mesesRestantes, deveAlertarSaldo } from "@/lib/relatorio/calculos";

test("intervaloRelatorio: hoje/semana/mes/tudo", () => {
  expect(intervaloRelatorio("hoje", "2026-07-19")).toEqual({ de: "2026-07-19", ate: "2026-07-19" });
  expect(intervaloRelatorio("semana", "2026-07-19")).toEqual({ de: "2026-07-13", ate: "2026-07-19" });
  expect(intervaloRelatorio("mes", "2026-07-19")).toEqual({ de: "2026-07-01", ate: "2026-07-19" });
  expect(intervaloRelatorio(undefined, "2026-07-19")).toEqual({ de: "2026-07-01", ate: "2026-07-19" });
  expect(intervaloRelatorio("tudo", "2026-07-19")).toEqual({ de: "2000-01-01", ate: "2026-07-19" });
});

test("mesAnterior: janela comparavel (1o ate o mesmo dia) e virada do ano", () => {
  expect(mesAnterior("2026-01-10")).toEqual({ de: "2025-12-01", ate: "2025-12-10" });
});

test("mesAnterior: trava no ultimo dia quando o mes anterior e mais curto", () => {
  expect(mesAnterior("2026-03-31")).toEqual({ de: "2026-02-01", ate: "2026-02-28" });
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
  expect(progressoMeta(-50, 3000)).toBe(0); // nunca negativo
});

test("intervaloRelatorio: semana atravessa a virada do mês", () => {
  expect(intervaloRelatorio("semana", "2026-08-03")).toEqual({ de: "2026-07-28", ate: "2026-08-03" });
});

test("mesesRestantes: futuro, ajuste por dia, passado e nulo", () => {
  expect(mesesRestantes("2026-12-01", "2026-07-20")).toBe(4); // 5 meses, mas dia 1 < 20 -> 4
  expect(mesesRestantes("2026-12-30", "2026-07-20")).toBe(5);
  expect(mesesRestantes("2026-01-01", "2026-07-20")).toBe(0); // passado -> 0
  expect(mesesRestantes(null, "2026-07-20")).toBeNull();
});

test("deveAlertarSaldo: so quando ha minimo definido e o caixa cai abaixo", () => {
  expect(deveAlertarSaldo(300, 500)).toBe(true);
  expect(deveAlertarSaldo(500, 500)).toBe(false);
  expect(deveAlertarSaldo(300, 0)).toBe(false);
});
