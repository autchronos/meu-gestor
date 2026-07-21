// Le as migrations e garante que toda tabela criada em public tem RLS + policy.
// Guardiao de regressao: quebra se uma fase futura criar tabela sem RLS.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "supabase/migrations";
const bruto = readdirSync(dir)
  .filter((f) => f.endsWith(".sql")).sort()
  .map((f) => readFileSync(join(dir, f), "utf8")).join("\n");

// Remove comentarios (-- ate o fim da linha, e blocos /* */) para nao
// contar um "CREATE TABLE" comentado como tabela real.
const sql = bruto.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

// Nome opcional com schema (public.foo -> captura "foo").
const tabelas = new Set();
for (const m of sql.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:\w+\.)?(\w+)/gi)) tabelas.add(m[1].toLowerCase());

const comRLS = new Set();
for (const m of sql.matchAll(/ALTER TABLE\s+(?:\w+\.)?(\w+)\s+ENABLE ROW LEVEL SECURITY/gi)) comRLS.add(m[1].toLowerCase());

const comPolicy = new Set();
for (const m of sql.matchAll(/CREATE POLICY\s+\w+\s+ON\s+(?:\w+\.)?(\w+)/gi)) comPolicy.add(m[1].toLowerCase());

let falhou = false;
for (const t of [...tabelas].sort()) {
  const rls = comRLS.has(t), pol = comPolicy.has(t);
  if (!rls || !pol) {
    falhou = true;
    const faltas = [!rls && "sem RLS", !pol && "sem policy"].filter(Boolean).join(" e ");
    console.error(`FALHOU: tabela "${t}" ${faltas}`);
  } else {
    console.log(`ok: ${t} (RLS + policy)`);
  }
}
if (falhou) { console.error("\nRLS INCOMPLETA"); process.exit(1); }
console.log(`\nRLS OK (${tabelas.size} tabelas)`);
