"use client";
import { useState, useTransition } from "react";
import { salvarCliente, type TipoCliente } from "@/app/painel/clientes/acoes";

interface Inicial { id: string; nome: string; telefone: string | null; tipo: TipoCliente }

export function FormCliente({ inicial }: { inicial?: Inicial }) {
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [telefone, setTelefone] = useState(inicial?.telefone ?? "");
  const [tipo, setTipo] = useState<TipoCliente>(inicial?.tipo ?? "pessoa");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const campo = "w-full border border-borda bg-superficie px-3 py-2 text-sm text-texto";

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const r = await salvarCliente({ id: inicial?.id, nome, telefone, tipo });
      if (r?.erro) { setMsg(r.erro); return; }
      setMsg("Cliente salvo!");
      if (!inicial) { setNome(""); setTelefone(""); setTipo("pessoa"); }
    });
  }

  return (
    <div className="flex flex-col gap-2 border border-borda bg-superficie p-4">
      <p className="text-sm font-semibold uppercase tracking-wider text-marca">{inicial ? "Editar cliente" : "Novo cliente"}</p>
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" className={campo} />
      <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Telefone (opcional)" inputMode="tel" className={campo} />
      <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCliente)} className={campo}>
        <option value="pessoa">Pessoa</option>
        <option value="empresa">Empresa</option>
      </select>
      <button type="button" onClick={salvar} disabled={pendente}
        className="bg-marca px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60">
        {pendente ? "..." : "Salvar"}
      </button>
      {msg && <p role="status" className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
