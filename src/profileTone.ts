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
 * De kleur van Profile naast Cheapest, op het deel dat Profile meer kost dan Cheapest. Profile even duur of goedkoper is altijd 'close';
 * kost Cheapest niets, dan is elke meso erboven 'far'.
 */
export function profileTone(cheapest: number, profile: number): ProfileTone {
  if (profile <= cheapest) return 'close'
  if (cheapest <= 0) return 'far'
  const over = (profile - cheapest) / cheapest
  return over <= CLOSE_SHARE ? 'close' : over < FAR_SHARE ? 'between' : 'far'
}
