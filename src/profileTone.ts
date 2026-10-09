/**
 * Hoe het totaal van Profile in Level cost gekleurd wordt (Dave, 9 oktober 2026). Cheapest is neutraal: een level kost altijd iets, en
 * Cheapest is wat het minimaal kost. Profile zegt wél iets, gemeten aan Cheapest: vlak erbij is groen, ver erboven is rood, en daartussen
 * neutraal.
 */
export type ProfileTone = 'close' | 'between' | 'far'

/** Tot zoveel boven Cheapest is Profile "in de buurt" (groen). */
export const CLOSE_SHARE = 0.1
/** Vanaf zoveel boven Cheapest is Profile "ver erboven" (rood). */
export const FAR_SHARE = 0.25

/**
 * Hoeveel Profile meer kost dan Cheapest, als deel van Cheapest (0,18 is 18% duurder; negatief is goedkoper). Kost Cheapest niets,
 * dan is er geen deel van te nemen: null.
 */
export function profileShare(cheapest: number, profile: number): number | null {
  return cheapest > 0 ? (profile - cheapest) / cheapest : null
}

/**
 * De kleur van Profile naast Cheapest, op het deel dat Profile meer kost dan Cheapest. Profile even duur of goedkoper is altijd 'close';
 * kost Cheapest niets, dan is elke meso erboven 'far'.
 */
export function profileTone(cheapest: number, profile: number): ProfileTone {
  if (profile <= cheapest) return 'close'
  const over = profileShare(cheapest, profile)
  if (over === null) return 'far'
  return over <= CLOSE_SHARE ? 'close' : over < FAR_SHARE ? 'between' : 'far'
}

/** Het deel als tekst op de knop van Profile: "+18%", "−5%" of "0%", afgerond op hele procenten. */
export function formatShare(share: number): string {
  const pct = Math.round(share * 100)
  return pct === 0 ? '0%' : `${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`
}
