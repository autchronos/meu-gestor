"use client";
import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { PontoES } from "@/lib/caixa/fluxoES";
import { formatarBRL } from "@/lib/formato";

type Periodo = "hoje" | "semana" | "mes";
const DIAS: Record<Periodo, number> = { hoje: 1, semana: 7, mes: 30 };
const ROTULO: Record<Periodo, string> = { hoje: "Hoje", semana: "Semana", mes: "Mês" };

export function GraficoFluxo({ serie }: { serie: PontoES[] }) {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const visivel = serie.slice(-DIAS[periodo]);
  const liquido = visivel.reduce((a, p) => a + p.entrada - p.saida, 0);

  return (
    <div className="border border-borda bg-superficie">
      <div className="flex items-center justify-between border-b border-borda px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-marca">Fluxo de caixa</h2>
        <div className="flex border border-borda text-[11px] uppercase tracking-wider">
          {(["hoje", "semana", "mes"] as Periodo[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodo(p)}
              aria-pressed={periodo === p}
              className={`px-2.5 py-1 transition-colors ${periodo === p ? "bg-marca text-white" : "text-texto-suave hover:text-texto"}`}
            >
              {ROTULO[p]}
            </button>
          ))}
        </div>
      </div>
      <div className="px-3 py-4">
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visivel} margin={{ left: 4, right: 4, top: 4 }}>
              <XAxis dataKey="dia" interval={periodo === "mes" ? 6 : 0} tick={{ fontSize: 10 }} stroke="var(--cor-texto-suave)" />
              <YAxis hide />
              <Tooltip formatter={(v) => (typeof v === "number" ? formatarBRL(v) : String(v ?? ""))} />
              <Area type="monotone" dataKey="entrada" stroke="var(--cor-entrada)" fill="var(--cor-entrada)" fillOpacity={0.08} strokeWidth={1.5} dot={periodo === "hoje"} />
              <Area type="monotone" dataKey="saida" stroke="var(--cor-saida)" fill="var(--cor-saida)" fillOpacity={0.08} strokeWidth={1.5} dot={periodo === "hoje"} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-borda px-2 pt-3 text-xs">
          <span className="flex items-center gap-1.5 text-texto-suave"><span className="h-2 w-2 bg-entrada" /> Entradas</span>
          <span className="flex items-center gap-1.5 text-texto-suave"><span className="h-2 w-2 bg-saida" /> Saídas</span>
          <span className="tabular-nums text-texto-suave">Líquido: <span className={`font-semibold ${liquido >= 0 ? "text-entrada" : "text-saida"}`}>{formatarBRL(liquido)}</span></span>
        </div>
      </div>
    </div>
  );
}
