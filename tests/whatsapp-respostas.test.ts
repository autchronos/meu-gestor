import {
  mensagemAjuda, mensagemRegistrado, mensagemSaldo, mensagemEstoque,
  mensagemEstoqueDesativado, mensagemConectado, mensagemCodigoInvalido, mensagemNaoReconhecido,
} from "@/lib/whatsapp/respostas";

test("registrado mostra tipo, valor, descrição e saldo", () => {
  const s = mensagemRegistrado("entrada", 50, "bolo", 1234.5);
  expect(s).toContain("Entrada");
  expect(s).toContain("bolo");
  expect(s).toContain("R$"); // via formatarBRL
});

test("registrado sem descrição não quebra", () => {
  expect(() => mensagemRegistrado("saida", 30, "", 0)).not.toThrow();
});

test("saldo mostra disponível e movimento do dia", () => {
  const s = mensagemSaldo(1000, 200, 50);
  expect(s.toLowerCase()).toContain("saldo");
});

test("estoque lista itens; vazio dá mensagem própria", () => {
  expect(mensagemEstoque([{ nome: "Bolo", estoque: 8 }], null)).toContain("Bolo");
  expect(mensagemEstoque([], "bolo").toLowerCase()).toContain("nenhum");
});

test("mensagens fixas não são vazias", () => {
  for (const s of [mensagemAjuda(), mensagemEstoqueDesativado(), mensagemConectado("Padaria X"), mensagemCodigoInvalido(), mensagemNaoReconhecido()]) {
    expect(s.length).toBeGreaterThan(0);
  }
  expect(mensagemConectado("Padaria X")).toContain("Padaria X");
});

test("ajuda cita os comandos principais", () => {
  const s = mensagemAjuda().toLowerCase();
  expect(s).toContain("+50");
  expect(s).toContain("saldo");
  expect(s).toContain("estoque");
});
