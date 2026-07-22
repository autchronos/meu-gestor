// Só caminho relativo do próprio app (começa com "/" e não com "//"), senão /painel.
// Evita open-redirect via ?next=.
export function destinoSeguro(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/painel";
  return next;
}
