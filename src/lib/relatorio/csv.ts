// Neutraliza injecao de formula: Excel/Sheets tratam celulas iniciadas por
// = + - @ (ou tab/CR) como formula. Prefixar com ' (aspa simples) desativa isso.
export function protegerCelulaCSV(valor: string): string {
  return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
}
