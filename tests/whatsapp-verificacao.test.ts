import { gerarCodigoNumerico } from "@/lib/whatsapp/verificacao";

test("gera código de 6 dígitos", () => {
  for (let i = 0; i < 50; i++) {
    expect(gerarCodigoNumerico()).toMatch(/^\d{6}$/);
  }
});
