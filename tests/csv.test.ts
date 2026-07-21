import { protegerCelulaCSV } from "@/lib/relatorio/csv";

test("protegerCelulaCSV prefixa formulas e mantem texto normal", () => {
  expect(protegerCelulaCSV("=1+1")).toBe("'=1+1");
  expect(protegerCelulaCSV("+55 11")).toBe("'+55 11");
  expect(protegerCelulaCSV("-5")).toBe("'-5");
  expect(protegerCelulaCSV("@cmd")).toBe("'@cmd");
  expect(protegerCelulaCSV("Venda normal")).toBe("Venda normal");
  expect(protegerCelulaCSV("")).toBe("");
});
