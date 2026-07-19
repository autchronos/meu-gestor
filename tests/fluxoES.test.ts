import { serieEntradaSaida } from "@/lib/caixa/fluxoES";

const L = (data: string, tipo: "entrada" | "saida", valor: number) => ({ data, tipo, valor });

test("agrega entradas e saídas por dia, 30 pontos terminando hoje", () => {
  const s = serieEntradaSaida(
    [L("2026-07-03", "entrada", 100), L("2026-07-03", "saida", 40), L("2026-07-02", "entrada", 20)],
    new Date("2026-07-03T12:00:00"),
  );
  expect(s).toHaveLength(30);
  expect(s[s.length - 1]).toEqual({ dia: "03/07", entrada: 100, saida: 40 });
  expect(s[s.length - 2]).toEqual({ dia: "02/07", entrada: 20, saida: 0 });
});

test("ignora lançamentos fora da janela de 30 dias", () => {
  const s = serieEntradaSaida([L("2026-05-01", "entrada", 999)], new Date("2026-07-03T12:00:00"));
  expect(s.reduce((a, p) => a + p.entrada, 0)).toBe(0);
});
