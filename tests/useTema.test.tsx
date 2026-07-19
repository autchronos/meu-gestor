import { act, renderHook } from "@testing-library/react";
import { useTema } from "@/hooks/useTema";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

test("começa no claro e alterna para escuro aplicando a classe e persistindo", () => {
  const { result } = renderHook(() => useTema());
  expect(result.current.tema).toBe("claro");

  act(() => result.current.alternar());

  expect(result.current.tema).toBe("escuro");
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  expect(localStorage.getItem("tema")).toBe("escuro");
});

test("lê o tema salvo do localStorage", () => {
  localStorage.setItem("tema", "escuro");
  const { result } = renderHook(() => useTema());
  expect(result.current.tema).toBe("escuro");
});
