import { validarEmail, validarSenha } from "@/lib/auth/validaLogin";

test("e-mail válido e inválido", () => {
  expect(validarEmail("ana@loja.com")).toBe(true);
  expect(validarEmail("ana@")).toBe(false);
  expect(validarEmail("sem-arroba")).toBe(false);
});

test("senha exige mínimo de 6 caracteres", () => {
  expect(validarSenha("123456").ok).toBe(true);
  expect(validarSenha("123").ok).toBe(false);
  expect(validarSenha("123").erro).toMatch(/6/);
});
