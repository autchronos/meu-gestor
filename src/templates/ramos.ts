import type { Ramo } from "@/lib/auth/roteamento";

export interface CategoriaTemplate {
  nome: string;
  tipo: "entrada" | "saida";
}
export interface ItemTemplate {
  nome: string;
  preco: number;
  unidade: string;
  tipo: "venda" | "aluguel";
  controla_estoque: boolean;
  estoque: number;
}
export interface RamoTemplate {
  categorias: CategoriaTemplate[];
  itens: ItemTemplate[];
}

const SAIDAS_COMUNS: CategoriaTemplate[] = [
  { nome: "Fornecedores", tipo: "saida" },
  { nome: "Contas fixas", tipo: "saida" },
];

export const TEMPLATES: Record<Ramo, RamoTemplate> = {
  alimentacao: {
    categorias: [{ nome: "Vendas", tipo: "entrada" }, ...SAIDAS_COMUNS],
    itens: [
      { nome: "Açaí 300ml", preco: 15, unidade: "un", tipo: "venda", controla_estoque: true, estoque: 0 },
      { nome: "Açaí 500ml", preco: 20, unidade: "un", tipo: "venda", controla_estoque: true, estoque: 0 },
    ],
  },
  revenda: {
    categorias: [{ nome: "Vendas", tipo: "entrada" }, ...SAIDAS_COMUNS],
    itens: [
      { nome: "Produto exemplo", preco: 50, unidade: "un", tipo: "venda", controla_estoque: true, estoque: 0 },
    ],
  },
  beleza: {
    categorias: [{ nome: "Serviços", tipo: "entrada" }, ...SAIDAS_COMUNS],
    itens: [
      { nome: "Esmalte", preco: 8, unidade: "un", tipo: "venda", controla_estoque: true, estoque: 0 },
    ],
  },
  locacao: {
    categorias: [{ nome: "Aluguéis", tipo: "entrada" }, ...SAIDAS_COMUNS],
    itens: [
      { nome: "Item para locação", preco: 100, unidade: "un", tipo: "aluguel", controla_estoque: true, estoque: 1 },
    ],
  },
  servicos: {
    categorias: [{ nome: "Serviços", tipo: "entrada" }, ...SAIDAS_COMUNS],
    itens: [],
  },
  outro: {
    categorias: [{ nome: "Vendas", tipo: "entrada" }, ...SAIDAS_COMUNS],
    itens: [],
  },
};

export function templateDoRamo(ramo: Ramo): RamoTemplate {
  return TEMPLATES[ramo];
}
