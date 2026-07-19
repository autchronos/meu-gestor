"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { PontoFluxo } from "@/lib/caixa/fluxo";
import { formatarBRL } from "@/lib/formato";

export function GraficoFluxo({ serie }: { serie: PontoFluxo[] }) {
  const dados = serie.map((p) => ({ ...p, dia: p.data.slice(8, 10) + "/" + p.data.slice(5, 7) }));
  return (
    <div className="h-48 w-full rounded-xl border border-borda bg-superficie p-3">
      <p className="mb-2 text-sm text-texto-suave">Fluxo de caixa (30 dias)</p>
      <ResponsiveContainer width="100%" height="80%">
        <LineChart data={dados} margin={{ left: 4, right: 4 }}>
          <XAxis dataKey="dia" tick={{ fontSize: 10 }} interval={6} stroke="var(--cor-texto-suave)" />
          <YAxis hide />
          <Tooltip
            formatter={(v) => (typeof v === "number" ? formatarBRL(v) : String(v))}
            labelFormatter={(l) => `Dia ${l}`}
          />
          <Line type="monotone" dataKey="saldo" stroke="var(--cor-marca)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
