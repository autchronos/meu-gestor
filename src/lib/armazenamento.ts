/**
 * Fronteira de I/O do navegador.
 *
 * localStorage e matchMedia PODEM LANCAR excecao: Safari em modo privado,
 * webview embutida de app (WhatsApp, Instagram — por onde o nosso usuario
 * costuma abrir link), iframe com storage bloqueado por politica.
 *
 * Uma excecao dessas durante o render derruba a arvore inteira do React e o
 * usuario ve tela branca. Aqui elas morrem: a leitura falha virando null, a
 * gravacao falha virando no-op. O app funciona sem persistir o tema, que e um
 * degrade aceitavel; tela branca nao e.
 */

export function lerArmazenado(chave: string): string | null {
  try {
    return localStorage.getItem(chave)
  } catch {
    return null
  }
}

export function gravarArmazenado(chave: string, valor: string): void {
  try {
    localStorage.setItem(chave, valor)
  } catch {
    // Storage bloqueado: o tema so nao sobrevive a recarga. Nao e motivo de crash.
  }
}

export function prefereEscuroNoSistema(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}
