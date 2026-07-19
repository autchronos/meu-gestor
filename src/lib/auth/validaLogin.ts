export function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validarSenha(senha: string): { ok: boolean; erro?: string } {
  if (senha.length < 6) {
    return { ok: false, erro: "A senha precisa ter ao menos 6 caracteres." };
  }
  return { ok: true };
}
