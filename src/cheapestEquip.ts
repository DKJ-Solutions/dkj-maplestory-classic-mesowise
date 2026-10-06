// De kolom "Cheapest" in de Equip-kaart (Dave, 6 oktober 2026, #188): per slot de equip waarmee je het goedkoopst levelt.
// Puur, zonder UI-import; leest alleen wat het wapen- en armor-advies al uitrekenden.
import type { ArmorUpgradeAdvice } from './armorUpgrade'
import type { ClawUpgradeAdvice } from './clawUpgrade'
import type { ArmorSlot } from './data/types'
import { wornName, type EquipSlot, type Equipment } from './equipment'

export interface CheapestSlot {
  /** Wat je in dit slot draagt, of null als het leeg is. */
  worn: string | null
  /** Wat de goedkoopste equip hier heeft, of null als het slot daar leeg is. */
  cheapest: string | null
  /** True als de goedkoopste equip hier iets anders heeft dan je draagt: een stuk om te kopen, of een slot dat leeg raakt. */
  changed: boolean
}

/**
 * Per slot wat je draagt en wat de goedkoopste equip heeft. Het wapen: de winnaar van het wapenadvies. Armor: elk slot
 * waarvan het beste stuk zich terugverdient (netto besparing boven 0), van grootste naar kleinste netto besparing; een
 * stuk dat een slot raakt dat een eerder stuk al nam (een overall tegenover een top of bottom) valt af. Elk stuk is
 * doorgerekend tegen wat je nu draagt, dus de kolom is het advies per slot naast elkaar, geen nieuwe berekening van
 * alles samen. Zonder advies blijft elk slot wat je draagt.
 */
export function cheapestEquipment(slots: readonly EquipSlot[], equipment: Equipment, claw: ClawUpgradeAdvice, armor: ArmorUpgradeAdvice): Record<EquipSlot, CheapestSlot> {
  const pick: Partial<Record<EquipSlot, string | null>> = {}
  if (claw.kind === 'advice' && claw.winner) pick.claw = claw.winner.name
  if (armor.kind === 'advice') {
    const taken = new Set<ArmorSlot>()
    for (const c of armor.choices) {
      if (c.net === null || c.net <= 0) continue
      const set: Partial<Record<ArmorSlot, string | null>> = { [c.armor.slot]: c.armor.name }
      if (c.with) set[c.with.slot] = c.with.name
      // Een overall maakt top en bottom leeg; een top of bottom maakt de overall leeg, en bij een losse helft (bare) ook de andere helft.
      if (c.armor.slot === 'overall') {
        set.top = null
        set.bottom = null
      } else if (c.armor.slot === 'top' || c.armor.slot === 'bottom') {
        set.overall = null
        if (c.bare) set[c.bare] = null
      }
      const touched = Object.keys(set) as ArmorSlot[]
      if (touched.some((s) => taken.has(s))) continue
      for (const s of touched) {
        taken.add(s)
        pick[s] = set[s]
      }
    }
  }
  const out = {} as Record<EquipSlot, CheapestSlot>
  for (const slot of slots) {
    const worn = wornName(equipment[slot])
    const cheapest = slot in pick ? (pick[slot] ?? null) : worn
    out[slot] = { worn, cheapest, changed: cheapest !== worn }
  }
  return out
}
