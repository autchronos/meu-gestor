import { formatarBRL, parseValorBRL } from "@/lib/formato";

test("formata valor positivo no padrão brasileiro", () => {
  expect(formatarBRL(1234.56)).toBe("R$ 1.234,56");
});

test("formata valor negativo (saída)", () => {
  expect(formatarBRL(-200)).toBe("-R$ 200,00");
});

test("formata zero", () => {
  expect(formatarBRL(0)).toBe("R$ 0,00");
});

test("parseValorBRL entende milhar e decimal brasileiros", () => {
  expect(parseValorBRL("1.234,56")).toBe(1234.56);
  expect(parseValorBRL("45")).toBe(45);
  expect(parseValorBRL("1.000")).toBe(1000);
});

test("parseValorBRL trata entrada inválida ou não positiva como 0", () => {
  expect(parseValorBRL("0,00")).toBe(0);
  expect(parseValorBRL("abc")).toBe(0);
  expect(parseValorBRL("")).toBe(0);
});
