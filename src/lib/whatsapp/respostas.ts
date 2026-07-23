import { formatarBRL } from "@/lib/formato";

export function mensagemAjuda(): string {
  return [
    "🤖 *Autchronos* — comandos:",
    "",
    "➕ Registrar entrada: `+50 bolo` ou `entrada 50 bolo`",
    "➖ Registrar saída: `-30 gasolina` ou `saida 30 gasolina`",
    "💰 Ver saldo: `saldo`",
    "📦 Ver estoque: `estoque` ou `estoque bolo`",
    "❓ Ajuda: `ajuda`",
  ].join("\n");
}

export function mensagemRegistrado(tipo: "entrada" | "saida", valor: number, descricao: string, disponivel: number): string {
  const rotulo = tipo === "entrada" ? "Entrada" : "Saída";
  const emoji = tipo === "entrada" ? "✅" : "🔻";
  const desc = descricao ? ` (${descricao})` : "";
  return `${emoji} ${rotulo} de ${formatarBRL(valor)}${desc} registrada.\n💰 Saldo disponível: ${formatarBRL(disponivel)}`;
}

export function mensagemSaldo(disponivel: number, entradasHoje: number, saidasHoje: number): string {
  return [
    `💰 Saldo disponível: ${formatarBRL(disponivel)}`,
    `📅 Hoje: +${formatarBRL(entradasHoje)} / -${formatarBRL(saidasHoje)}`,
  ].join("\n");
}

export function mensagemEstoque(itens: { nome: string; estoque: number }[], filtro: string | null): string {
  if (!itens.length) {
    return filtro
      ? `📦 Nenhum item com estoque controlado encontrado para "${filtro}".`
      : "📦 Nenhum item com estoque controlado.";
  }
  const linhas = itens.map((i) => `• ${i.nome}: ${i.estoque}`);
  return ["📦 *Estoque*", ...linhas].join("\n");
}

export function mensagemEstoqueDesativado(): string {
  return "📦 Seu negócio não usa controle de estoque. Ative em Configurações se quiser.";
}

export function mensagemConectado(nomeNegocio: string): string {
  return `✅ WhatsApp conectado ao *${nomeNegocio}*! Agora é só mandar seus lançamentos por aqui.`;
}

export function mensagemCodigoInvalido(): string {
  return "❌ Código inválido ou expirado. Gere um novo em Configurações no app.";
}

export function mensagemNaoReconhecido(): string {
  return "👋 Número não reconhecido. Conecte seu WhatsApp no app: meu-gestor-phi.vercel.app (Configurações → Conectar WhatsApp).";
}
