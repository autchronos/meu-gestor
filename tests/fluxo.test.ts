import { serieFluxoCaixa } from "@/lib/caixa/fluxo";

const L = (data: string, tipo: "entrada" | "saida", valor: number) => ({ data, tipo, valor });

test("reconstroi o saldo diario terminando no disponivel atual", () => {
  // disponivel hoje = 150; no periodo houve +100 (dia 2) e -50 (dia 3).
  const serie = serieFluxoCaixa(
    [L("2026-07-02", "entrada", 100), L("2026-07-03", "saida", 50)],
    150,
    new Date("2026-07-03T12:00:00"),
  );
  // abertura = 150 - (100 - 50) = 100
  expect(serie[0].saldo).toBe(100);            // 2026-06-04 (dia -29), sem mov
  expect(serie[serie.length - 1].saldo).toBe(150); // hoje
  expect(serie).toHaveLength(30);
});

test("dia da entrada sobe o saldo, dia da saida desce", () => {
  const serie = serieFluxoCaixa([L("2026-07-03", "entrada", 40)], 40, new Date("2026-07-03T12:00:00"));
  expect(serie[serie.length - 1].saldo).toBe(40);
  expect(serie[serie.length - 2].saldo).toBe(0); // vespera
});

test("lançamento com data futura não quebra o invariante (série fecha no disponível)", () => {
  // disponivel 150 já reflete uma entrada futura de 50; a série (até hoje) deve
  // terminar em 150 mesmo assim, sem descontar o futuro do meio.
  const serie = serieFluxoCaixa(
    [L("2026-07-08", "entrada", 50)],
    150,
    new Date("2026-07-03T12:00:00"),
  );
  expect(serie[serie.length - 1].saldo).toBe(150);
  expect(serie).toHaveLength(30);
});
