import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

test("mostra a chamada Entrar / Cadastrar", () => {
  render(<Home />);
  expect(screen.getAllByText(/Entrar \/ Cadastrar/i).length).toBeGreaterThan(0);
});

test("mostra os títulos das seções principais", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { name: /Recursos/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /Como funciona/i })).toBeInTheDocument();
});

test("mostra o saldo do mockup formatado em R$", () => {
  render(<Home />);
  expect(screen.getByText("R$ 4.235,90")).toBeInTheDocument();
});
