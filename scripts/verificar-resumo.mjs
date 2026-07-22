// Verifica o resumo_dashboard COMO USUARIO AUTENTICADO (membro do negocio),
// porque a RPC exige e_membro. Cria usuario/negocio temporarios e limpa no fim.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!svc) { console.error("service_role vazia no .env.local"); process.exit(1); }

const admin = createClient(url, svc, { auth: { persistSession: false } });
function assert(c, m) { if (!c) { console.error("FALHOU:", m); process.exit(1); } console.log("ok:", m); }

const ts = Date.now();
const email = `resumo_${ts}@autchronos.test`;
const { data: u, error: eUser } = await admin.auth.admin.createUser({ email, password: "senha123", email_confirm: true });
assert(!eUser && u?.user?.id, `criou usuario de teste${eUser ? " (" + eUser.message + ")" : ""}`);
const cli = createClient(url, anon, { auth: { persistSession: false } });
const { error: eLogin } = await cli.auth.signInWithPassword({ email, password: "senha123" });
assert(!eLogin, `login do usuario de teste${eLogin ? " (" + eLogin.message + ")" : ""}`);

const { data: negId, error: eRpc } = await cli.rpc("criar_negocio", { p_nome: "Resumo", p_ramo: "outro" });
assert(!eRpc && negId, `criar_negocio devolveu id${eRpc ? " (" + eRpc.message + ")" : ""}`);
const { error: eIns } = await cli.from("lancamentos").insert([
  { negocio_id: negId, tipo: "entrada", descricao: "venda", valor: 300, carteira: "empresa", eh_retirada: false },
  { negocio_id: negId, tipo: "saida", descricao: "retirada", valor: 100, carteira: "empresa", eh_retirada: true },
]);
assert(!eIns, "inseriu os lancamentos de teste");

const { data: resumo, error } = await cli.rpc("resumo_dashboard", { p_negocio_id: negId });
assert(!error, "resumo_dashboard executa para o membro");
assert(Number(resumo.disponivel) === 200, `disponivel = 300 - 100(retirada) = 200 (veio ${resumo?.disponivel})`);
assert(Number(resumo.entradas_mes) === 300, `entradas_mes = 300 (veio ${resumo?.entradas_mes})`);
assert(Number(resumo.saidas_mes) === 0, `saidas_mes ignora a retirada (veio ${resumo?.saidas_mes})`);

// Fase 3B: retirado_mes reflete a retirada (100); apos definir limite, retorna 300.
assert(Number(resumo.retirado_mes) === 100, `retirado_mes = 100 (veio ${resumo?.retirado_mes})`);
await cli.from("metas").update({ limite_prolabore: 300 }).eq("negocio_id", negId);
const { data: resumo2 } = await cli.rpc("resumo_dashboard", { p_negocio_id: negId });
assert(Number(resumo2.limite_prolabore) === 300, `limite_prolabore = 300 (veio ${resumo2?.limite_prolabore})`);

// Fase 3C: relatorio (faturamento = entradas; custos = saidas nao-retirada).
const { error: eDesp } = await cli.from("lancamentos").insert({
  negocio_id: negId, tipo: "saida", descricao: "despesa", valor: 50, carteira: "empresa", eh_retirada: false,
});
assert(!eDesp, "inseriu a despesa de teste");
const hojeIso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const { data: rel, error: eRel } = await cli.rpc("relatorio", { p_negocio_id: negId, p_de: "2000-01-01", p_ate: hojeIso });
assert(!eRel, "relatorio executa");
assert(Number(rel.faturamento) === 300, `faturamento = 300 (veio ${rel?.faturamento})`);
assert(Number(rel.custos) === 50, `custos = 50 (retirada fora; veio ${rel?.custos})`);

// Fase 4: conta a receber -> marcar pago -> entrada LIQUIDA no caixa.
const { data: cli4, error: eCli4 } = await cli.from("clientes")
  .insert({ negocio_id: negId, nome: "Fulano Teste", tipo: "pessoa" }).select("id").single();
assert(!eCli4 && cli4?.id, "criou cliente de teste");
const { data: rec, error: eRec } = await cli.from("receber")
  .insert({ negocio_id: negId, cliente_id: cli4.id, descricao: "venda a prazo", valor: 200, taxa: 10 })
  .select("id").single();
assert(!eRec && rec?.id, "criou conta a receber (200, taxa 10)");
await cli.from("receber").update({ pago: true }).eq("id", rec.id);
const { data: lanc4 } = await cli.from("lancamentos").select("valor, tipo").eq("receber_id", rec.id).maybeSingle();
assert(lanc4 && Number(lanc4.valor) === 180 && lanc4.tipo === "entrada", `pago gera entrada liquida 180 (veio ${lanc4?.valor})`);
await cli.from("receber").update({ pago: false }).eq("id", rec.id);
const { count: nLanc } = await cli.from("lancamentos").select("id", { count: "exact", head: true }).eq("receber_id", rec.id);
assert((nLanc ?? 0) === 0, "desmarcar pago apaga o lancamento");

// Fase 5A: venda baixa estoque; excluir devolve.
const { data: it5, error: eIt5 } = await cli.from("itens")
  .insert({ negocio_id: negId, nome: "Produto Teste", preco: 10, tipo: "venda", controla_estoque: true, estoque: 40 })
  .select("id").single();
assert(!eIt5 && it5?.id, "criou item com estoque 40");
const { data: v5, error: eV5 } = await cli.from("lancamentos")
  .insert({ negocio_id: negId, tipo: "entrada", descricao: "venda itens", valor: 20, carteira: "empresa", eh_retirada: false })
  .select("id").single();
assert(!eV5 && v5?.id, "criou lancamento da venda");
await cli.from("lancamento_itens").insert({ lancamento_id: v5.id, item_id: it5.id, quantidade: 2, preco_unitario: 10 });
const { data: it5b } = await cli.from("itens").select("estoque").eq("id", it5.id).maybeSingle();
assert(Number(it5b.estoque) === 38, `venda de 2 baixou estoque 40->38 (veio ${it5b?.estoque})`);
await cli.from("lancamentos").delete().eq("id", v5.id);
const { data: it5c } = await cli.from("itens").select("estoque").eq("id", it5.id).maybeSingle();
assert(Number(it5c.estoque) === 40, `excluir a venda devolveu o estoque para 40 (veio ${it5c?.estoque})`);

// Fase 5B: locacao (recebido) cria entrada; reserva sobe; devolucao limpa.
const { data: itAl, error: eItAl } = await cli.from("itens")
  .insert({ negocio_id: negId, nome: "Furadeira", preco: 80, tipo: "aluguel", estoque: 3 }).select("id").single();
assert(!eItAl && itAl?.id, "criou item de aluguel (estoque 3)");
const { data: cliLoc } = await cli.from("clientes").insert({ negocio_id: negId, nome: "Locatario Teste", tipo: "pessoa" }).select("id").single();
const { data: loc, error: eLoc } = await cli.from("locacoes")
  .insert({ negocio_id: negId, item_id: itAl.id, cliente_id: cliLoc.id, quantidade: 1, valor: 80, devolucao_prevista: "2999-01-01" }).select("id").single();
assert(!eLoc && loc?.id, "registrou locacao (qtd 1)");
const { data: abertas } = await cli.from("locacoes").select("quantidade").eq("item_id", itAl.id).is("devolvido_em", null);
const reservado = (abertas ?? []).reduce((a, x) => a + Number(x.quantidade), 0);
assert(reservado === 1, `reserva do item = 1 (veio ${reservado})`);
const hojeIso2 = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
await cli.from("locacoes").update({ devolvido_em: hojeIso2 }).eq("id", loc.id);
const { data: abertas2 } = await cli.from("locacoes").select("id").eq("item_id", itAl.id).is("devolvido_em", null);
assert((abertas2 ?? []).length === 0, "apos devolucao, item sem locacao aberta");

// Fase 5.8: suporte (usuario insere e le a propria mensagem via RLS own-row).
const { error: eSup } = await cli.from("suporte").insert({ negocio_id: negId, tipo: "sugestao", mensagem: "teste de suporte" });
assert(!eSup, "inseriu mensagem de suporte");
const { data: sup } = await cli.from("suporte").select("id, tipo").eq("negocio_id", negId);
assert((sup ?? []).length === 1 && sup[0].tipo === "sugestao", `le a propria mensagem (veio ${sup?.length})`);

await admin.from("negocios").delete().eq("id", negId);
await admin.auth.admin.deleteUser(u.user.id);
console.log("RESUMO OK");
