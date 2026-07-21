import { test, expect } from "vitest";
import { totalVenda, estaAcabando, descricaoItens } from "@/lib/estoque/calculos";

test("totalVenda soma quantidade × preço e arredonda", () => {
  expect(totalVenda([{ quantidade: 2, preco: 15 }])).toBe(30);
  expect(totalVenda([{ quantidade: 2, preco: 15 }, { quantidade: 1, preco: 20 }])).toBe(50);
  expect(totalVenda([{ quantidade: 3, preco: 3.33 }])).toBe(9.99);
  expect(totalVenda([])).toBe(0);
});

test("estaAcabando: só quando controla, tem mínimo e estoque ≤ mínimo", () => {
  expect(estaAcabando(2, 5, true)).toBe(true);
  expect(estaAcabando(5, 5, true)).toBe(true);
  expect(estaAcabando(6, 5, true)).toBe(false);
  expect(estaAcabando(-1, 5, true)).toBe(true);
  expect(estaAcabando(0, 0, true)).toBe(false); // sem mínimo definido
  expect(estaAcabando(2, 5, false)).toBe(false); // não controla
});

test("descricaoItens monta o resumo pt-BR", () => {
  expect(descricaoItens([{ quantidade: 2, nome: "Açaí 300ml" }, { quantidade: 1, nome: "Açaí 500ml" }]))
    .toBe("2× Açaí 300ml, 1× Açaí 500ml");
});
