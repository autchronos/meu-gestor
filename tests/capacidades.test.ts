import { capacidadesPadrao } from "@/lib/negocio/capacidades";

test("locacao liga locacao e carteiras/metas, sem estoque", () => {
  expect(capacidadesPadrao("locacao")).toEqual({
    usa_estoque: false, usa_fiado: false, usa_locacao: true,
    usa_carteiras: true, usa_metas: true,
  });
});

test("revenda liga estoque e fiado", () => {
  const f = capacidadesPadrao("revenda");
  expect(f.usa_estoque).toBe(true);
  expect(f.usa_fiado).toBe(true);
  expect(f.usa_locacao).toBe(false);
});

test("servicos e outro nao ligam estoque/fiado/locacao", () => {
  for (const r of ["servicos", "outro"] as const) {
    const f = capacidadesPadrao(r);
    expect([f.usa_estoque, f.usa_fiado, f.usa_locacao]).toEqual([false, false, false]);
    expect([f.usa_carteiras, f.usa_metas]).toEqual([true, true]);
  }
});
