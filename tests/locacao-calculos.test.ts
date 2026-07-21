import { disponivelAluguel, estaAtrasada } from "@/lib/locacao/calculos";

test("disponivelAluguel = estoque − reservado (pode ficar negativo)", () => {
  expect(disponivelAluguel(3, 1)).toBe(2);
  expect(disponivelAluguel(3, 3)).toBe(0);
  expect(disponivelAluguel(3, 5)).toBe(-2);
});

test("estaAtrasada: aberta e vencida; devolvida ou no prazo não", () => {
  expect(estaAtrasada("2026-07-19", null, "2026-07-20")).toBe(true);
  expect(estaAtrasada("2026-07-20", null, "2026-07-20")).toBe(false);
  expect(estaAtrasada("2026-07-21", null, "2026-07-20")).toBe(false);
  expect(estaAtrasada("2026-07-19", "2026-07-19", "2026-07-20")).toBe(false); // já devolvida
});
