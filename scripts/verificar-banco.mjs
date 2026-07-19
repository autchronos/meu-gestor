// Verifica, com a service_role, que os deltas do 0005 estao aplicados e que o
// trigger lanca o valor liquido. Cria dados temporarios e os remove no fim.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// carrega .env.local de forma simples
for (const linha of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = linha.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY vazia no .env.local — preencha antes.");
  process.exit(1);
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

function assert(cond, msg) {
  if (!cond) {
    console.error("FALHOU:", msg);
    process.exit(1);
  }
  console.log("ok:", msg);
}

// 1) colunas novas existem (insere linha com carteira/eh_retirada)
const { data: neg } = await sb
  .from("negocios")
  .insert({ nome: "VERIF_TMP", ramo: "outro" })
  .select()
  .single();
assert(neg?.id, "criou negocio temporario");

const { error: eLanc } = await sb.from("lancamentos").insert({
  negocio_id: neg.id,
  tipo: "saida",
  descricao: "retirada teste",
  valor: 100,
  carteira: "empresa",
  eh_retirada: true,
});
assert(!eLanc, "lancamentos aceita carteira + eh_retirada");

// 2) trigger liquido: receber com taxa 10% -> caixa recebe 90
const { data: cli } = await sb
  .from("clientes")
  .insert({ negocio_id: neg.id, nome: "Cliente teste" })
  .select()
  .single();
const { data: rec } = await sb
  .from("receber")
  .insert({
    negocio_id: neg.id,
    cliente_id: cli.id,
    descricao: "venda cartao",
    valor: 100,
    taxa: 10,
  })
  .select()
  .single();
await sb.from("receber").update({ pago: true }).eq("id", rec.id);
const { data: lanc } = await sb
  .from("lancamentos")
  .select("valor")
  .eq("receber_id", rec.id)
  .single();
assert(Number(lanc.valor) === 90, `trigger lancou liquido 90 (veio ${lanc?.valor})`);

// 3) flags de capacidade existem em negocios (defaults carteiras/metas = true)
const { data: negFlags, error: eFlags } = await sb
  .from("negocios")
  .select("usa_estoque, usa_fiado, usa_locacao, usa_carteiras, usa_metas")
  .eq("id", neg.id)
  .single();
assert(
  !eFlags && negFlags.usa_carteiras === true && negFlags.usa_metas === true && negFlags.usa_estoque === false,
  "negocios tem as flags usa_* com defaults corretos",
);

// limpeza (cascata por negocio_id)
await sb.from("negocios").delete().eq("id", neg.id);
console.log("VERIFICACAO OK");
