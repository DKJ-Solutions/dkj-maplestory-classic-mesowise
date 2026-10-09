/**
 * Hoeveel Profile van Cheapest afwijkt, voor het vak Difference in Level cost (Dave, 9 oktober 2026). Cheapest en Profile zelf zijn
 * neutraal; pas Difference zegt of het verschil goed of slecht is. Tot 9 oktober 2026 kleurde dit bestand ook het totaal van Profile
 * (groen vlak bij Cheapest, rood ver erboven); dat is weg (Dave).
 */

/**
 * Hoeveel Profile meer kost dan Cheapest, als deel van Cheapest (0,18 is 18% duurder; negatief is goedkoper). Kost Cheapest niets,
 * dan is er geen deel van te nemen: null.
 */
export function profileShare(cheapest: number, profile: number): number | null {
  return cheapest > 0 ? (profile - cheapest) / cheapest : null
}

/**
 * Het deel als tekst in het vak Difference (sinds 9 oktober 2026 daar en niet op Profile, Dave), afgerond op hele procenten:
 * "+57% more expensive", "5% cheaper" (zonder min: "−5% cheaper" zegt het twee keer) of "Same cost".
 */
export function formatShare(share: number): string {
  const pct = Math.round(share * 100)
  return pct === 0 ? 'Same cost' : pct > 0 ? `+${pct}% more expensive` : `${-pct}% cheaper`
}
