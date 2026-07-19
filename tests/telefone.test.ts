import { normalizarTelefone } from "@/lib/telefone";

test("remove máscara e prefixa 55 quando falta o código do país", () => {
  expect(normalizarTelefone("(11) 99999-9999")).toBe("5511999999999");
  expect(normalizarTelefone("11999999999")).toBe("5511999999999");
});

test("telefone fixo (10 dígitos) também recebe 55", () => {
  expect(normalizarTelefone("11 3232-3232")).toBe("551132323232");
});

test("número já com código do país é mantido", () => {
  expect(normalizarTelefone("5511999999999")).toBe("5511999999999");
});
