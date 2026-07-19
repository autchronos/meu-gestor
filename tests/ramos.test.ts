import { templateDoRamo } from "@/templates/ramos";

test("cada ramo tem categorias e itens de exemplo", () => {
  for (const ramo of ["alimentacao", "revenda", "locacao", "servicos", "outro"] as const) {
    const t = templateDoRamo(ramo);
    expect(t.categorias.length).toBeGreaterThan(0);
    expect(Array.isArray(t.itens)).toBe(true);
  }
});

test("categorias têm tipo entrada ou saida", () => {
  for (const c of templateDoRamo("alimentacao").categorias) {
    expect(["entrada", "saida"]).toContain(c.tipo);
  }
});
