"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { PontoES } from "@/lib/caixa/fluxoES";
import { formatarBRL } from "@/lib/formato";

export function GraficoFluxo({ serie, liquido }: { serie: PontoES[]; liquido: number }) {
  return (
    <div className="border border-borda bg-superficie">
      <div className="flex items-center justify-between border-b border-borda px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-marca">Fluxo de caixa</h2>
        <span className="text-xs text-texto-suave">Últimos 30 dias</span>
      </div>
      <div className="px-3 py-4">
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={{ left: 4, right: 4, top: 4 }}>
              <XAxis dataKey="dia" interval={6} tick={{ fontSize: 10 }} stroke="var(--cor-texto-suave)" />
              <YAxis hide />
              <Tooltip formatter={(v) => (typeof v === "number" ? formatarBRL(v) : String(v ?? ""))} />
              <Area type="monotone" dataKey="entrada" stroke="var(--cor-entrada)" fill="var(--cor-entrada)" fillOpacity={0.08} strokeWidth={1.5} />
              <Area type="monotone" dataKey="saida" stroke="var(--cor-saida)" fill="var(--cor-saida)" fillOpacity={0.08} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-borda px-2 pt-3 text-xs">
          <span className="flex items-center gap-1.5 text-texto-suave"><span className="h-2 w-2 bg-entrada" /> Entradas</span>
          <span className="flex items-center gap-1.5 text-texto-suave"><span className="h-2 w-2 bg-saida" /> Saídas</span>
          <span className="tabular-nums text-marca">Líquido: <span className="font-semibold">{formatarBRL(liquido)}</span></span>
        </div>
      </div>
    </div>
  );
}
