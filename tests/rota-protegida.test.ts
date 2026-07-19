import { ehRotaProtegida } from "@/lib/supabase/rotas";

test("/onboarding e /painel são protegidas", () => {
  expect(ehRotaProtegida("/onboarding")).toBe(true);
  expect(ehRotaProtegida("/painel")).toBe(true);
  expect(ehRotaProtegida("/painel/qualquer")).toBe(true);
});

test("/, /entrar e /auth/callback são públicas", () => {
  expect(ehRotaProtegida("/")).toBe(false);
  expect(ehRotaProtegida("/entrar")).toBe(false);
  expect(ehRotaProtegida("/auth/callback")).toBe(false);
});
