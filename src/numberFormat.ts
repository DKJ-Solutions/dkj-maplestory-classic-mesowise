// Eén opmaak voor getallen met tot drie decimalen, in het Nederlands (komma): voor de app en voor labels uit pure modules.
export const nf3 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 3 })

/**
 * Een bedrag kort, zoals in het spel (Dave, 7 oktober 2026): 14.1k, 1.9k, 2.3M, met een punt en één decimaal, afgerond; een hele waarde zonder
 * ".0" (14k). Onder de duizend het getal zelf, afgerond. Rondt het af op 1000k, dan wordt het 1M.
 */
export function compactMeso(n: number): string {
  const sign = n < 0 ? '-' : ''
  const a = Math.abs(n)
  const short = (x: number, unit: string) => `${sign}${Number(x.toFixed(1))}${unit}`
  if (Math.round(a) < 1000) return `${sign}${Math.round(a)}`
  if (Math.round(a / 100) < 10000) return short(a / 1000, 'k')
  return short(a / 1e6, 'M')
}
