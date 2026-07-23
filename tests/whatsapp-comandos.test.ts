import { interpretar, parseValor } from "@/lib/whatsapp/comandos";

test("parseValor entende vírgula decimal e R$", () => {
  expect(parseValor("50")).toBe(50);
  expect(parseValor("50,50")).toBe(50.5);
  expect(parseValor("R$ 15,90")).toBe(15.9);
  expect(parseValor("1.234,56")).toBe(1234.56);
  expect(Number.isNaN(parseValor("abc"))).toBe(true);
});

test("entrada por símbolo e por extenso", () => {
  expect(interpretar("+50 bolo")).toEqual({ tipo: "entrada", valor: 50, descricao: "bolo" });
  expect(interpretar("entrada 50 bolo")).toEqual({ tipo: "entrada", valor: 50, descricao: "bolo" });
  expect(interpretar("+120 conserto de geladeira")).toEqual({ tipo: "entrada", valor: 120, descricao: "conserto de geladeira" });
});

test("saída por símbolo e por extenso, com e sem acento", () => {
  expect(interpretar("-30 gasolina")).toEqual({ tipo: "saida", valor: 30, descricao: "gasolina" });
  expect(interpretar("saida 30 gasolina")).toEqual({ tipo: "saida", valor: 30, descricao: "gasolina" });
  expect(interpretar("saída 30 gasolina")).toEqual({ tipo: "saida", valor: 30, descricao: "gasolina" });
});

test("valor com vírgula e sem descrição", () => {
  expect(interpretar("+15,50")).toEqual({ tipo: "entrada", valor: 15.5, descricao: "" });
});

test("valor ausente ou zero vira ajuda", () => {
  expect(interpretar("+0 bolo")).toEqual({ tipo: "ajuda" });
  expect(interpretar("+ bolo")).toEqual({ tipo: "ajuda" });
  expect(interpretar("entrada bolo")).toEqual({ tipo: "ajuda" });
});

test("consulta saldo por saldo/resumo/hoje", () => {
  expect(interpretar("saldo")).toEqual({ tipo: "consulta_saldo" });
  expect(interpretar("RESUMO")).toEqual({ tipo: "consulta_saldo" });
  expect(interpretar(" hoje ")).toEqual({ tipo: "consulta_saldo" });
});

test("consulta estoque com e sem filtro", () => {
  expect(interpretar("estoque")).toEqual({ tipo: "consulta_estoque", filtro: null });
  expect(interpretar("estoque bolo")).toEqual({ tipo: "consulta_estoque", filtro: "bolo" });
});

test("verificação casa código de 4 a 6 dígitos", () => {
  expect(interpretar("AUTCHRONOS 4823")).toEqual({ tipo: "verificacao", codigo: "4823" });
  expect(interpretar("autchronos 123456")).toEqual({ tipo: "verificacao", codigo: "123456" });
});

test("ajuda e texto não reconhecido caem em ajuda", () => {
  expect(interpretar("ajuda")).toEqual({ tipo: "ajuda" });
  expect(interpretar("menu")).toEqual({ tipo: "ajuda" });
  expect(interpretar("oi tudo bem?")).toEqual({ tipo: "ajuda" });
  expect(interpretar("")).toEqual({ tipo: "ajuda" });
});
