import { formatarBRL } from "@/lib/formato";

test("formata valor positivo no padrão brasileiro", () => {
  expect(formatarBRL(1234.56)).toBe("R$ 1.234,56");
});

test("formata valor negativo (saída)", () => {
  expect(formatarBRL(-200)).toBe("-R$ 200,00");
});

test("formata zero", () => {
  expect(formatarBRL(0)).toBe("R$ 0,00");
});
