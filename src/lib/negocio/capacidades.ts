import type { Ramo } from "@/lib/auth/roteamento";

export interface Flags {
  usa_estoque: boolean;
  usa_fiado: boolean;
  usa_locacao: boolean;
  usa_carteiras: boolean;
  usa_metas: boolean;
}

export const CAPACIDADES: { chave: keyof Flags; rotulo: string; descricao: string }[] = [
  { chave: "usa_estoque", rotulo: "Controle de estoque", descricao: "Acompanhar quantidade de produtos/ingredientes." },
  { chave: "usa_fiado", rotulo: "Vendas fiado / a prazo", descricao: "Vender fiado, no cartão ou parcelado (dinheiro entra depois)." },
  { chave: "usa_locacao", rotulo: "Aluguel de itens", descricao: "Alugar itens que saem e voltam." },
  { chave: "usa_carteiras", rotulo: "Separar empresa e pessoal", descricao: "Separar o dinheiro do negócio do seu e controlar retiradas." },
];

const BASE: Flags = {
  usa_estoque: false, usa_fiado: false, usa_locacao: false,
  usa_carteiras: true, usa_metas: true,
};

export function capacidadesPadrao(ramo: Ramo): Flags {
  switch (ramo) {
    case "alimentacao":
    case "beleza":
      return { ...BASE, usa_estoque: true };
    case "revenda":
      return { ...BASE, usa_estoque: true, usa_fiado: true };
    case "locacao":
      return { ...BASE, usa_locacao: true };
    default: // servicos, outro
      return { ...BASE };
  }
}
