// Normaliza um telefone digitado ("(11) 99999-9999") para o formato de dígitos
// que a Evolution API entrega no webhook do WhatsApp: código do país + DDD +
// número (ex.: 5511999999999). É por esse valor que o webhook resolve
// telefone -> negócio, então precisa ser gravado já normalizado.
export function normalizarTelefone(texto: string): string {
  const digitos = texto.replace(/\D/g, "");
  // BR sem o código do país (DDD + 8 ou 9 dígitos) -> prefixa 55.
  if (digitos.length === 10 || digitos.length === 11) {
    return `55${digitos}`;
  }
  return digitos;
}
