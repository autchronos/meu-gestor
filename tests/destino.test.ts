import { destinoSeguro } from "@/lib/auth/destino";

test("destinoSeguro só aceita caminho relativo seguro", () => {
  expect(destinoSeguro("/painel")).toBe("/painel");
  expect(destinoSeguro("/nova-senha")).toBe("/nova-senha");
  expect(destinoSeguro("/confirmado")).toBe("/confirmado");
  expect(destinoSeguro("//evil.com")).toBe("/painel");
  expect(destinoSeguro("https://evil.com")).toBe("/painel");
  expect(destinoSeguro("")).toBe("/painel");
  expect(destinoSeguro(null)).toBe("/painel");
  expect(destinoSeguro(undefined)).toBe("/painel");
});
