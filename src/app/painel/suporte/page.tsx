import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { ehAdmin } from "@/lib/auth/admin";
import { FormSuporte } from "@/app/painel/suporte/FormSuporte";
import { EstadoVazio } from "@/components/EstadoVazio";

const ROTULO: Record<string, string> = { pergunta: "Pergunta", sugestao: "Sugestão" };
const STATUS: Record<string, string> = { aberto: "Aberto", respondido: "Respondido", resolvido: "Resolvido" };

export default async function Suporte() {
  const negocio = await negocioAtual();
  if (!negocio) return null;
  const supabase = criarClienteServidor();
  const [{ data: mensagens }, admin] = await Promise.all([
    supabase.from("suporte").select("id, tipo, mensagem, resposta, status, created_at")
      .order("created_at", { ascending: false }).limit(50),
    ehAdmin(),
  ]);

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-serif text-2xl text-marca">Suporte</h1>
        {admin && (
          <Link href="/painel/suporte/admin" className="text-xs font-semibold uppercase tracking-wider text-marca hover:underline">
            Ver todas as mensagens (admin) →
          </Link>
        )}
      </div>
      <p className="text-sm text-texto-suave">
        Dúvidas ou ideias de melhoria? Mande abaixo — a gente lê tudo. Urgente? <a href="mailto:autchronos@gmail.com" className="text-dourado hover:underline">autchronos@gmail.com</a>
      </p>
      <FormSuporte />

      <h2 className="text-sm font-semibold uppercase tracking-wider text-marca">Suas mensagens</h2>
      {(mensagens ?? []).length === 0 ? (
        <EstadoVazio Icone={LifeBuoy} titulo="Nenhuma mensagem ainda" descricao="Suas perguntas e sugestões aparecem aqui depois de enviadas." />
      ) : (
        <ul className="border border-borda bg-superficie">
          {(mensagens ?? []).map((m, idx, arr) => (
            <li key={m.id} className={`px-5 py-3 text-sm ${idx !== arr.length - 1 ? "border-b border-borda" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-marca">{ROTULO[m.tipo] ?? m.tipo}</span>
                <span className="text-xs text-texto-suave">{STATUS[m.status] ?? m.status} · {new Date(m.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-texto">{m.mensagem}</p>
              {m.resposta && (
                <div className="mt-2 border-l-2 border-dourado bg-fundo px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-texto-suave">Resposta</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-texto">{m.resposta}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
