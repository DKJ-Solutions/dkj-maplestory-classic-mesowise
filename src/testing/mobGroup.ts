// Alleen voor de tests: een plek met meerdere mobs, om het model over verschillende monsters tegelijk te draaien.
// De app zelf rekent met één mob (#123); er staat hier geen speldata, alleen namen uit MOBS.
import { MOBS } from '../data/spots'
import type { KnownSpot } from '../data/types'

/** Een plek met deze mobs, in deze volgorde; gooit bij een naam die niet in MOBS staat. */
export function mobGroup(...names: string[]): KnownSpot {
  const monsters = names.map((n) => {
    const m = MOBS.find((x) => x.name === n)
    if (!m) throw new Error(`onbekende mob: ${n}`)
    return m
  })
  return { id: `group:${names.join('+')}`, name: names.join(' + '), source: monsters[0].source, monsters }
}
