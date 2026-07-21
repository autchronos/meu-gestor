import {
  LayoutGrid, ScrollText, ArrowUpFromLine, Tags, BarChart3, Settings,
  HandCoins, Users, Package,
  type LucideIcon,
} from "lucide-react";

export interface ItemNav {
  href: string;
  rotulo: string;
  Icone: LucideIcon;
}

interface Flags {
  usa_carteiras: boolean;
  usa_fiado: boolean;
  usa_estoque: boolean;
  usa_locacao: boolean;
}

export function itensNav(flags: Flags): ItemNav[] {
  const itens: ItemNav[] = [
    { href: "/painel", rotulo: "Início", Icone: LayoutGrid },
    { href: "/painel/lancamentos", rotulo: "Lançamentos", Icone: ScrollText },
  ];
  if (flags.usa_fiado) {
    itens.push({ href: "/painel/a-receber", rotulo: "A receber", Icone: HandCoins });
    itens.push({ href: "/painel/clientes", rotulo: "Clientes", Icone: Users });
  }
  if (flags.usa_estoque || flags.usa_locacao) {
    itens.push({ href: "/painel/itens", rotulo: "Itens", Icone: Package });
  }
  if (flags.usa_carteiras) {
    itens.push({ href: "/painel/retiradas", rotulo: "Retiradas", Icone: ArrowUpFromLine });
  }
  itens.push({ href: "/painel/categorias", rotulo: "Categorias", Icone: Tags });
  itens.push({ href: "/painel/relatorios", rotulo: "Relatórios", Icone: BarChart3 });
  itens.push({ href: "/painel/configuracoes", rotulo: "Config", Icone: Settings });
  return itens;
}

export function ehAtivo(pathname: string, href: string): boolean {
  return href === "/painel" ? pathname === "/painel" : pathname === href || pathname.startsWith(`${href}/`);
}
