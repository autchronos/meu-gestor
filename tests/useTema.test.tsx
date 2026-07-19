import { act, renderHook } from "@testing-library/react";
import { lerTemaInicial, useTema } from "@/hooks/useTema";

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

test("lê o tema salvo do localStorage ao montar", () => {
  localStorage.setItem("tema", "escuro");
  const { result } = renderHook(() => useTema());
  expect(result.current.tema).toBe("escuro");
  expect(document.documentElement.classList.contains("dark")).toBe(true);
});

test("alterna de volta para claro removendo a classe", () => {
  localStorage.setItem("tema", "escuro");
  const { result } = renderHook(() => useTema());
  expect(result.current.tema).toBe("escuro");

  act(() => result.current.alternar());

  expect(result.current.tema).toBe("claro");
  expect(document.documentElement.classList.contains("dark")).toBe(false);
  expect(localStorage.getItem("tema")).toBe("claro");
});

test("lerTemaInicial: claro por padrão, escuro quando salvo", () => {
  expect(lerTemaInicial()).toBe("claro");
  localStorage.setItem("tema", "escuro");
  expect(lerTemaInicial()).toBe("escuro");
});
