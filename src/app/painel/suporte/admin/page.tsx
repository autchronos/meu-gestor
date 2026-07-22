import { redirect } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { ehAdmin } from "@/lib/auth/admin";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { FormResposta } from "@/app/painel/suporte/FormResposta";
import { EstadoVazio } from "@/components/EstadoVazio";

const ROTULO: Record<string, string> = { pergunta: "Pergunta", sugestao: "Sugestão" };

export default async function AdminSuporte({ searchParams }: { searchParams: { status?: string } }) {
  if (!(await ehAdmin())) redirect("/painel/suporte");
  const admin = criarClienteAdmin();
  let q = admin.from("suporte")
    .select("id, tipo, mensagem, contato, resposta, status, created_at, negocios(nome)")
    .order("created_at", { ascending: false }).limit(200);
  const f = searchParams?.status;
  if (f === "aberto" || f === "respondido" || f === "resolvido") q = q.eq("status", f);
  const { data } = await q;
  const mensagens = (data ?? []) as unknown as {
    id: string; tipo: string; mensagem: string; contato: string | null;
    resposta: string | null; status: string; created_at: string; negocios: { nome: string } | null;
  }[];

  const FILTROS: [string, string][] = [["", "Todas"], ["aberto", "Abertas"], ["respondido", "Respondidas"], ["resolvido", "Resolvidas"]];

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-serif text-2xl text-marca">Suporte · admin</h1>
      <form method="get" className="flex border border-borda text-[11px] uppercase tracking-wider">
        {FILTROS.map(([v, r]) => (
          <button key={v} name="status" value={v} type="submit"
            className={`flex-1 px-2 py-2 transition-colors ${(f ?? "") === v ? "bg-marca text-white" : "text-texto-suave hover:text-texto"}`}>{r}</button>
        ))}
      </form>
      {mensagens.length === 0 ? (
        <EstadoVazio Icone={LifeBuoy} titulo="Nenhuma mensagem" descricao="Mensagens de suporte dos usuários aparecem aqui." />
      ) : (
        <ul className="flex flex-col gap-3">
          {mensagens.map((m) => (
            <li key={m.id} className="border border-borda bg-superficie p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-marca">{ROTULO[m.tipo] ?? m.tipo} · {m.negocios?.nome ?? "—"}</span>
                <span className="text-texto-suave">{new Date(m.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-texto">{m.mensagem}</p>
              {m.contato && <p className="mt-1 text-xs text-texto-suave">Contato: {m.contato}</p>}
              <FormResposta id={m.id} respostaAtual={m.resposta ?? ""} statusAtual={m.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
