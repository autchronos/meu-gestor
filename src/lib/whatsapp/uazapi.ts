export interface MensagemRecebida {
  remetente: string; // só dígitos, ex.: 5511999999999
  texto: string;
  messageId: string;
  fromMe: boolean;
  isGroup: boolean;
}

function digitos(s: unknown): string {
  return typeof s === "string" ? s.replace(/@.*/, "").replace(/\D/g, "") : "";
}

// Primeiro valor que for uma string não-vazia (tolera campos ausentes/nulos).
function primeiroTexto(...vals: unknown[]): string {
  for (const v of vals) if (typeof v === "string" && v !== "") return v;
  return "";
}

// Tolerante ao payload real do uazapiGO v2 (confirmado contra webhook de verdade).
// Retorna null para qualquer coisa que não seja uma mensagem de texto processável.
export function extrairMensagem(payload: unknown): MensagemRecebida | null {
  const p = payload as { message?: Record<string, unknown> } | null;
  const m = p?.message;
  if (!m || typeof m !== "object") return null;

  const messageId = primeiroTexto(m.messageid, m.id);
  const texto = primeiroTexto(m.text, m.content).trim();
  // O NÚMERO real vem em sender_pn/chatid (@s.whatsapp.net). NÃO usar `sender`,
  // que no WhatsApp atual pode ser um @lid (LinkedID) — não é o telefone.
  const chatid = primeiroTexto(m.chatid);
  const remetente = digitos(primeiroTexto(m.sender_pn, chatid));
  if (!messageId || !texto || !remetente) return null;

  const isGroup = m.isGroup === true || chatid.endsWith("@g.us");
  const fromMe = m.fromMe === true;
  return { remetente, texto, messageId, fromMe, isGroup };
}

// POST de texto para a uazapi. Loga falha e NÃO lança — o fluxo que chama já
// concluiu (o lançamento foi gravado); não devemos quebrar por falha de envio.
export async function enviarTexto(numero: string, texto: string): Promise<void> {
  try {
    const resp = await fetch(`${process.env.UAZAPI_URL}/send/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: process.env.UAZAPI_TOKEN! },
      body: JSON.stringify({ number: numero, text: texto }),
    });
    if (!resp.ok) console.error("uazapi enviarTexto falhou:", resp.status, await resp.text());
  } catch (e) {
    console.error("uazapi enviarTexto erro:", e);
  }
}
