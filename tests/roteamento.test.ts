import { nichoParaRamo } from "@/lib/auth/roteamento";

test("nicho da UI mapeia para o ramo do schema", () => {
  expect(nichoParaRamo("Vendas de produtos")).toBe("revenda");
  expect(nichoParaRamo("Alimentação")).toBe("alimentacao");
  expect(nichoParaRamo("Aluguéis")).toBe("locacao");
  expect(nichoParaRamo("Serviços")).toBe("servicos");
  expect(nichoParaRamo("Outro")).toBe("outro");
  expect(nichoParaRamo("qualquer coisa")).toBe("outro");
});
