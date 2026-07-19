# Referência — `src/index.css` do Lovable (design system exato)

Tailwind v4 (`@theme inline` + OKLCH). Fonte de verdade dos tokens do re-skin.

## Comparação com o que JÁ temos (Fases 1–3B)

| Token | Lovable (OKLCH → hex) | Nosso atual | Igual? |
|---|---|---|---|
| ice / background | `#F7F8FA` | `--cor-fundo #F7F8FA` | ✅ igual |
| navy / primary | `#0A2540` | `--cor-marca #0A2540` | ✅ igual |
| gold | `#C9A227` | `--cor-dourado #C9A227` | ✅ igual |
| entrada | `#1B7A4B` | `--cor-entrada #1B7A4B` | ✅ igual |
| saida | `#9B2335` | `--cor-saida #9B2335` | ✅ igual |
| card | `#FFFFFF` | `--cor-superficie #FFFFFF` | ✅ igual |
| rule / border | `oklch(0.905 0.005 258)` ≈ cinza-frio | `--cor-borda #E3E7ED` | ~ perto |
| muted-foreground | `oklch(0.48 0.02 258)` | `--cor-texto-suave #5A6675` | ~ perto |
| **serif** | **Cormorant Garamond** | **Lora** | ❌ **muda** |
| sans | Inter | Inter | ✅ igual |
| radius | `0.375rem` (6px) | usávamos rounded-lg/xl | muda p/ 6px + cantos retos |

**Extras que eles têm e a gente não:** `--navy-deep` (navy mais fundo, p/ nav/header),
`--gold-soft`, e as utilities `.rule-t`/`.rule-b` (divisórias 1px).

## Conclusão
O re-skin **não muda cor** — muda: (1) **fonte serifada → Cormorant Garamond**;
(2) **cantos retos** (sem rounded) estilo extrato; (3) **layout/refinamentos** do
componente (faixa navy do saldo com centavos dourados, nav navy + FAB "+" dourado,
labels uppercase com tracking, divisórias rule, caixas de ícone quadradas,
números serifados/tabular).

## index.css original (Lovable, Tailwind v4)
```css
@import "tailwindcss" source(none);
@source "../src";
@import "tw-animate-css";
@custom-variant dark (&:is(.dark *));

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  /* ...mapeamento shadcn de --color-* -> var(--*) ... */
  --color-navy: var(--navy);
  --color-navy-deep: var(--navy-deep);
  --color-gold: var(--gold);
  --color-gold-soft: var(--gold-soft);
  --color-entrada: var(--entrada);
  --color-saida: var(--saida);
  --color-ice: var(--ice);
  --color-rule: var(--rule);
  --font-serif: "Cormorant Garamond", "Times New Roman", serif;
  --font-sans: "Inter", "Helvetica Neue", Arial, sans-serif;
}

:root {
  --radius: 0.375rem;
  --ice: oklch(0.977 0.003 247);       /* #F7F8FA */
  --navy: oklch(0.24 0.055 258);       /* #0A2540 */
  --navy-deep: oklch(0.19 0.05 258);
  --navy-foreground: oklch(0.977 0.003 247);
  --gold: oklch(0.735 0.115 87);       /* #C9A227 */
  --gold-soft: oklch(0.86 0.07 87);
  --entrada: oklch(0.475 0.095 155);   /* #1B7A4B */
  --saida: oklch(0.44 0.155 20);       /* #9B2335 */
  --rule: oklch(0.905 0.005 258);
  --background: var(--ice);
  --foreground: var(--navy);
  --card: oklch(1 0 0);
  --primary: var(--navy);
  --primary-foreground: var(--navy-foreground);
  --secondary: oklch(0.955 0.008 258);
  --muted: oklch(0.955 0.008 258);
  --muted-foreground: oklch(0.48 0.02 258);
  --accent: var(--gold);
  --destructive: var(--saida);
  --border: var(--rule);
  --input: var(--rule);
  --ring: var(--navy);
}

@layer base {
  * { border-color: var(--color-border); }
  html, body {
    background-color: var(--color-background);
    color: var(--color-foreground);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    font-feature-settings: "tnum" 1, "lnum" 1;
  }
  .font-serif { font-family: var(--font-serif); }
  .tabular-nums { font-variant-numeric: tabular-nums; }
}

@utility rule-t { border-top: 1px solid var(--color-rule); }
@utility rule-b { border-bottom: 1px solid var(--color-rule); }
```
