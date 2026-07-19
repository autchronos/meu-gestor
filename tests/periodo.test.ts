import { intervaloPeriodo } from "@/lib/caixa/periodo";

test("mês atual: do primeiro ao último dia", () => {
  expect(intervaloPeriodo(undefined, "2026-07-19")).toEqual({ de: "2026-07-01", ate: "2026-07-31" });
});

test("mês passado atravessa a virada do ano", () => {
  expect(intervaloPeriodo("mes_passado", "2026-01-10")).toEqual({ de: "2025-12-01", ate: "2025-12-31" });
});

test("últimos 30 dias termina hoje", () => {
  expect(intervaloPeriodo("ultimos_30", "2026-07-30")).toEqual({ de: "2026-07-01", ate: "2026-07-30" });
});

test("tudo não filtra", () => {
  expect(intervaloPeriodo("tudo", "2026-07-19")).toBeNull();
});

test("fevereiro bissexto termina em 29", () => {
  expect(intervaloPeriodo(undefined, "2024-02-10").ate).toBe("2024-02-29");
});
