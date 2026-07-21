import { liquido, estaVencida } from "@/lib/receber/calculos";

test("liquido desconta a taxa e arredonda em 2 casas (igual ao trigger)", () => {
  expect(liquido(200, 10)).toBe(180);
  expect(liquido(100, 0)).toBe(100);
  expect(liquido(99.99, 3.5)).toBe(96.49); // 99.99 * 0.965 = 96.49035 -> 96.49
  expect(liquido(50, 100)).toBe(0);
});

test("estaVencida: passado vence; hoje/futuro/sem-vencimento nao", () => {
  expect(estaVencida("2026-07-19", "2026-07-20")).toBe(true);
  expect(estaVencida("2026-07-20", "2026-07-20")).toBe(false);
  expect(estaVencida("2026-07-21", "2026-07-20")).toBe(false);
  expect(estaVencida(null, "2026-07-20")).toBe(false);
});
