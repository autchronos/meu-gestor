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

await admin.from("negocios").delete().eq("id", negId);
await admin.auth.admin.deleteUser(u.user.id);
console.log("RESUMO OK");
