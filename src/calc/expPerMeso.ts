// De rekenkern: pure TypeScript, zonder UI-import, zodat Vitest hem los kan testen.

/** Wat een trainingsplek per uur kost, in meso. */
export interface CostPerHour {
  potions: number
  ammo: number
  travel: number
}

/** Totale kosten per uur; elke post moet een eindig getal van 0 of meer zijn. */
export function totalCostPerHour(cost: CostPerHour): number {
  for (const [post, value] of Object.entries(cost)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`kosten '${post}' moet een getal van 0 of meer zijn, niet ${value}`)
    }
  }
  return cost.potions + cost.ammo + cost.travel
}

/**
 * EXP per uitgegeven meso. Kost een plek niets, dan is de opbrengst per meso onbegrensd:
 * Infinity bij EXP, 0 als er ook geen EXP is.
 */
export function expPerMeso(expPerHour: number, cost: CostPerHour): number {
  if (!Number.isFinite(expPerHour) || expPerHour < 0) {
    throw new RangeError(`EXP per uur moet een getal van 0 of meer zijn, niet ${expPerHour}`)
  }
  const total = totalCostPerHour(cost)
  if (total === 0) return expPerHour === 0 ? 0 : Infinity
  return expPerHour / total
}
