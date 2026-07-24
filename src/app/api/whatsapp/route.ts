// src/app/api/whatsapp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { extrairMensagem, enviarTexto } from "@/lib/whatsapp/uazapi";
import { interpretar } from "@/lib/whatsapp/comandos";
import { consumirCodigo } from "@/lib/whatsapp/verificacao";
import { resolverNegocioPorTelefone, executarComando } from "@/lib/whatsapp/executor";
import { mensagemConectado, mensagemCodigoInvalido, mensagemNaoReconhecido } from "@/lib/whatsapp/respostas";

export const runtime = "nodejs"; // service_role: fora do Edge.

const ok = () => NextResponse.json({ ok: true });

export async function POST(req: NextRequest) {
  // 1. Autentica o webhook por segredo compartilhado.
  if (req.nextUrl.searchParams.get("secret") !== process.env.UAZAPI_WEBHOOK_SECRET) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  // 2. Extrai a mensagem; ignora o que não for DM de texto de terceiro.
  const body = await req.json().catch(() => null);
  const msg = extrairMensagem(body);
  if (!msg || msg.fromMe || msg.isGroup) return ok();

  const admin = criarClienteAdmin();

  // 3. Todo o processamento pós-auth num try/catch: qualquer throw (ex.: falha
  // de rede no Supabase — DNS/timeout/TLS) é logado e cai no 200 final, para
  // não devolver 500 e disparar o loop de retry da uazapi.
  try {
    const cmd = interpretar(msg.texto);

    // Verificação é o único comando que funciona sem número verificado.
    if (cmd.tipo === "verificacao") {
      const r = await consumirCodigo(admin, cmd.codigo, msg.remetente);
      await enviarTexto(msg.remetente, r ? mensagemConectado(r.nomeNegocio) : mensagemCodigoInvalido());
      return ok();
    }

    // Resolve o negócio pelo número verificado.
    const negocio = await resolverNegocioPorTelefone(admin, msg.remetente);
    if (!negocio) {
      await enviarTexto(msg.remetente, mensagemNaoReconhecido());
      return ok();
    }

    // Executa e responde.
    const resposta = await executarComando(admin, negocio, cmd, msg.messageId);
    await enviarTexto(msg.remetente, resposta);
  } catch (e) {
    console.error("webhook whatsapp erro:", e);
  }
  return ok(); // 200 sempre (evita loop de retry da uazapi).
}
