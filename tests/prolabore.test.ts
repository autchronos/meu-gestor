import { mediaSemanal, restanteProLabore } from "@/lib/caixa/prolabore";

const R = (data: string, valor: number) => ({ data, valor });

test("mediaSemanal soma os últimos 28 dias e divide por 4", () => {
  // hoje 2026-07-28 -> janela começa em 2026-07-01
  const m = mediaSemanal([R("2026-07-10", 100), R("2026-07-20", 300), R("2026-05-01", 999)], "2026-07-28");
  expect(m).toBe(100); // (100+300)/4; a de maio fica fora
});

test("mediaSemanal sem retiradas é 0", () => {
  expect(mediaSemanal([], "2026-07-28")).toBe(0);
});

test("restanteProLabore dentro do limite", () => {
  expect(restanteProLabore(1000, 300)).toEqual({ restante: 700, excedente: 0 });
});

test("restanteProLabore ultrapassado", () => {
  expect(restanteProLabore(1000, 1200)).toEqual({ restante: 0, excedente: 200 });
});
