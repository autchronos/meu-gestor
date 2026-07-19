import { act, renderHook } from "@testing-library/react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

function dispararBeforeInstallPrompt() {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const evento = new Event("beforeinstallprompt") as Event & {
    prompt: typeof prompt;
    userChoice: Promise<{ outcome: string }>;
  };
  evento.prompt = prompt;
  evento.userChoice = Promise.resolve({ outcome: "accepted" });
  act(() => {
    window.dispatchEvent(evento);
  });
  return prompt;
}

test("podeInstalar fica true após o evento e instalar() chama prompt", async () => {
  const { result } = renderHook(() => useInstallPrompt());
  expect(result.current.podeInstalar).toBe(false);

  const prompt = dispararBeforeInstallPrompt();
  expect(result.current.podeInstalar).toBe(true);

  await act(async () => {
    await result.current.instalar();
  });
  expect(prompt).toHaveBeenCalledOnce();
  expect(result.current.podeInstalar).toBe(false);
});

test("appinstalled marca instalado e limpa o evento", () => {
  const { result } = renderHook(() => useInstallPrompt());
  dispararBeforeInstallPrompt();
  expect(result.current.podeInstalar).toBe(true);

  act(() => {
    window.dispatchEvent(new Event("appinstalled"));
  });
  expect(result.current.instalado).toBe(true);
  expect(result.current.podeInstalar).toBe(false);
});

test("remove os listeners ao desmontar", () => {
  const remover = vi.spyOn(window, "removeEventListener");
  const { unmount } = renderHook(() => useInstallPrompt());
  unmount();
  expect(remover).toHaveBeenCalledWith("beforeinstallprompt", expect.any(Function));
  expect(remover).toHaveBeenCalledWith("appinstalled", expect.any(Function));
  remover.mockRestore();
});
