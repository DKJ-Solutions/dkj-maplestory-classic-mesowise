// Wat een level-up in het profiel bijwerkt, als getallen (issue #154, hergebruikt voor de horizon van het skillpunt-advies, #145).
// Alleen wat uit een bronregel volgt: level +1, Max HP (vaste waarde per level per job) en het level-deel van de accuracy.
// De AP en de skillpunten verdeelt de speler zelf, dus die blijven staan. Puur, zonder UI-import.
import { magicianAccuracy, magicianHpPerLevelFrom } from './data/magician'
import { baseAccuracy, hpPerLevelFrom } from './data/thief'
import { bowmanAccuracy, bowmanHpPerLevelFrom } from './data/bowman'
import { warriorAccuracy, warriorHpPerLevelFrom } from './data/warrior'
import { isComputed, type Job } from './job'
import type { Profile } from './profile'

/**
 * Wat een level-up bijwerkt voor een Warrior, Bowman en Magician: zijn eigen Max HP per level en het stat-deel van zijn
 * accuracy (dat van het level afhangt), met `stat` als de stat waaruit dat deel volgt (DEX; bij een Magician INT).
 * De Thief heeft zijn eigen formules in applyLevelUp en profileAfterLevelUp.
 */
export const OWN_AP: Partial<Record<Job, { stat: 'dex' | 'int'; hpFrom: (level: number) => number; accuracy: (stat: number, level: number, luk: number) => number }>> = {
  warrior: { stat: 'dex', hpFrom: warriorHpPerLevelFrom, accuracy: warriorAccuracy },
  bowman: { stat: 'dex', hpFrom: bowmanHpPerLevelFrom, accuracy: bowmanAccuracy },
  magician: { stat: 'int', hpFrom: magicianHpPerLevelFrom, accuracy: magicianAccuracy },
}

/**
 * Het profiel een level hoger, zoals applyLevelUp het voor een ingevuld concept doet: level +1, Max HP + de vaste waarde van die
 * job en het verschil van het level-deel van de accuracy. De stats in een Profile zijn al je totalen (base AP plus items). Een job
 * die de app niet doorrekent krijgt alleen level +1. De Max HP per level komt er vast bij: ook met Max HP Increase, net als bij
 * applyLevelUp, dus over de horizon van het skillpunt-advies telt dat procent niet over de nieuwe HP (een klein beetje te laag).
 */
export function profileAfterLevelUp(p: Profile): Profile {
  const next: Profile = { ...p, level: p.level + 1 }
  if (!isComputed(p.job)) return next
  const own = OWN_AP[p.job]
  if (own) {
    next.hp = p.hp + own.hpFrom(p.level)
    next.accuracy = p.accuracy + own.accuracy(p[own.stat], p.level + 1, p.luk) - own.accuracy(p[own.stat], p.level, p.luk)
    return next
  }
  next.hp = p.hp + hpPerLevelFrom(p.level)
  next.accuracy = p.accuracy + baseAccuracy(p.dex, p.level + 1, p.luk) - baseAccuracy(p.dex, p.level, p.luk)
  return next
}
