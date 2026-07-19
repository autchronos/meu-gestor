import { resolverLancamento } from "@/lib/caixa/lancamento";

test("entrada mantem tipo e carteira, sem retirada", () => {
  expect(resolverLancamento("entrada", "pessoal")).toEqual({ tipo: "entrada", carteira: "pessoal", eh_retirada: false });
});

test("saida mantem tipo e carteira", () => {
  expect(resolverLancamento("saida", "empresa")).toEqual({ tipo: "saida", carteira: "empresa", eh_retirada: false });
});

test("retirada forca saida/empresa/eh_retirada", () => {
  expect(resolverLancamento("retirada", "pessoal")).toEqual({ tipo: "saida", carteira: "empresa", eh_retirada: true });
});
