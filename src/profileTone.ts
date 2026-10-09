/**
 * Hoeveel een kaart in Level cost afwijkt van de andere, voor de regel onder het bedrag van Cheapest en Profile (Dave, 9 oktober 2026):
 * groen als goedkoper, rood als duurder; het bedrag zelf blijft neutraal. Tot 9 oktober 2026 kleurde dit bestand ook het totaal van
 * Profile (groen vlak bij Cheapest, rood ver erboven); dat is weg (Dave).
 */

/**
 * Hoeveel `value` meer kost dan `base`, als deel van `base` (0,18 is 18% duurder; negatief is goedkoper). Kost `base` niets, dan is er
 * geen deel van te nemen: null. Profile gebruikt Cheapest als base, Cheapest gebruikt Profile: elke kaart wordt gemeten aan de andere.
 */
export function profileShare(base: number, value: number): number | null {
  return base > 0 ? (value - base) / base : null
}

/**
 * Het deel als tekst onder het bedrag van een kaart in Level cost, afgerond op hele procenten (Dave, 9 oktober 2026):
 * "+57% more expensive", "5% cheaper" (zonder min: "−5% cheaper" zegt het twee keer) of "Same cost".
 */
export function formatShare(share: number): string {
  const pct = Math.round(share * 100)
  return pct === 0 ? 'Same cost' : pct > 0 ? `+${pct}% more expensive` : `${-pct}% cheaper`
}
