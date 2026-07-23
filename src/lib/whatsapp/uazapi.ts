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

// Tolerante: lê nomes de campo comuns do uazapiGO v2. Retorna null para
// qualquer coisa que não seja uma mensagem de texto processável.
export function extrairMensagem(payload: unknown): MensagemRecebida | null {
  const p = payload as { message?: Record<string, unknown> } | null;
  const m = p?.message;
  if (!m || typeof m !== "object") return null;

  const messageId = typeof m.id === "string" ? m.id : typeof m.messageid === "string" ? m.messageid : "";
  const txt = m.text ?? m.content;
  const texto = (typeof txt === "string" ? txt : "").trim();
  const bruto = m.sender ?? m.chatid;
  const remetente = digitos(bruto);
  if (!messageId || !texto || !remetente) return null;

  const isGroup = m.isGroup === true || String(bruto).endsWith("@g.us");
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
