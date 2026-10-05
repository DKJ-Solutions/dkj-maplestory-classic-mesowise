// Gedeeld door de upgrade-adviezen (claw #25, armor #36): wat een horizon van levels in mesos kost, en
// hoe je de keuzes op netto besparing sorteert. Puur, zonder UI-import.
import { mesoCostOfLevel } from './calc/mesoCostOfLevel'
import { expToNextLevel } from './data/expTable'

/**
 * De mesokosten van alle levels van `from` tot en met `to`, bij deze EXP per meso; null als een level onhaalbaar is.
 * Een functie geeft de EXP per meso per level (het skillpunt-advies, #145); undefined daaruit maakt de hele horizon undefined.
 */
export function horizonCost(from: number, to: number, epm: number): number | null
export function horizonCost(from: number, to: number, epm: (level: number) => number | undefined): number | null | undefined
export function horizonCost(from: number, to: number, epm: number | ((level: number) => number | undefined)): number | null | undefined {
  let sum = 0
  for (let level = from; level <= to; level++) {
    const e = typeof epm === 'number' ? epm : epm(level)
    if (e === undefined) return undefined
    const cost = mesoCostOfLevel(expToNextLevel(level)!, e)
    if (cost === null) return null
    sum += cost
  }
  return sum
}

/** Van meeste naar minste netto besparing; "niet uit te rekenen" (null) staat expliciet achteraan. */
export const byNet = (a: { net: number | null }, b: { net: number | null }) =>
  (a.net === null ? 1 : 0) - (b.net === null ? 1 : 0) || (b.net ?? 0) - (a.net ?? 0)
