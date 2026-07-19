// Puro (sem imports do Next), para ser testável no Vitest e reusado no middleware.
const ROTAS_PROTEGIDAS = ["/onboarding", "/painel"];

export function ehRotaProtegida(pathname: string): boolean {
  return ROTAS_PROTEGIDAS.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  );
}
