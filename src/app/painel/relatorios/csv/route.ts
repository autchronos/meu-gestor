import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { negocioAtual } from "@/lib/supabase/negocioAtual";
import { protegerCelulaCSV } from "@/lib/relatorio/csv";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const de = searchParams.get("de") ?? "2000-01-01";
  const ate = searchParams.get("ate") ?? "2100-01-01";

  const negocio = await negocioAtual();
  if (!negocio) return new NextResponse("Não autorizado", { status: 401 });

  const supabase = criarClienteServidor();
  const { data } = await supabase
    .from("lancamentos")
    .select("data, descricao, tipo, valor, eh_retirada")
    .eq("negocio_id", negocio.id)
    .eq("carteira", "empresa") // mesmo escopo dos cards do relatorio (retirada marcada, dá p/ filtrar)
    .gte("data", de).lte("data", ate)
    .order("data", { ascending: false });

  const linhas = [["data", "descricao", "tipo", "valor"]];
  for (const l of data ?? []) {
    const tipo = l.eh_retirada ? "retirada" : l.tipo;
    const desc = `"${protegerCelulaCSV(String(l.descricao)).replace(/"/g, '""')}"`;
    linhas.push([l.data, desc, tipo, String(l.valor)]);
  }
  // BOM + separador ';' para o Excel PT-BR abrir bem.
  const csv = "﻿" + linhas.map((r) => r.join(";")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-${de}-a-${ate}.csv"`,
    },
  });
}
