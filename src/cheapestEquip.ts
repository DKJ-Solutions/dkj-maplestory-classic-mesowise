// De Cheapest-equip in de Equip-popup (Dave, 6 oktober 2026, #188): per slot de equip waarmee je het goedkoopst één level omhoog gaat.
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
  /** Wat het stuk in de winkel kost als je het moet kopen; null als je hier niets koopt. */
  price: number | null
}

/**
 * Per slot wat je draagt en wat de goedkoopste equip heeft. Het wapen: de winnaar van het wapenadvies. Armor: elk slot
 * waarvan het beste stuk zich terugverdient (netto besparing boven 0), van grootste naar kleinste netto besparing; een
 * stuk dat een slot vult dat een eerder stuk al vulde, of een overall naast een top of bottom, valt af. Elk stuk is
 * doorgerekend tegen wat je nu draagt, dus dit is het advies per slot naast elkaar, geen nieuwe berekening van
 * alles samen. Zonder advies blijft elk slot wat je draagt.
 */
export function cheapestEquipment(slots: readonly EquipSlot[], equipment: Equipment, claw: ClawUpgradeAdvice, armor: ArmorUpgradeAdvice): Record<EquipSlot, CheapestSlot> {
  const pick: Partial<Record<EquipSlot, string | null>> = {}
  const price: Partial<Record<EquipSlot, number>> = {}
  if (claw.kind === 'advice' && claw.winner) {
    pick.claw = claw.winner.name
    price.claw = claw.winner.price
  }
  if (armor.kind === 'advice') {
    // Wat de gekozen stukken vullen; wat daardoor leeg raakt volgt pas daarna, zodat twee stukken die hetzelfde slot leeg
    // maken (een losse top en een losse bottom maken allebei de overall leeg) elkaar niet blokkeren.
    const fill: Partial<Record<ArmorSlot, string>> = {}
    const bare = new Set<ArmorSlot>()
    const halves = (f: typeof fill) => f.top !== undefined || f.bottom !== undefined
    for (const c of armor.choices) {
      if (c.net === null || c.net <= 0) continue
      const pieces = c.with ? [c.armor, c.with] : [c.armor]
      const add: Partial<Record<ArmorSlot, string>> = Object.fromEntries(pieces.map((p) => [p.slot, p.name]))
      // Botsen doet een slot dat al gevuld is, of een overall naast een top of bottom.
      const clash = Object.keys(add).some((s) => fill[s as ArmorSlot] !== undefined) || (add.overall !== undefined && halves(fill)) || (fill.overall !== undefined && halves(add))
      if (clash) continue
      Object.assign(fill, add)
      for (const p of pieces) price[p.slot] = p.price
      if (c.bare) bare.add(c.bare)
    }
    for (const [s, name] of Object.entries(fill)) pick[s as ArmorSlot] = name
    if (fill.overall !== undefined) pick.top = pick.bottom = null
    if (halves(fill)) pick.overall = null
    // Een losse helft over een gedragen overall laat de andere helft leeg, tenzij een ander stuk die vult.
    for (const s of bare) if (fill[s] === undefined) pick[s] = null
  }
  const out = {} as Record<EquipSlot, CheapestSlot>
  for (const slot of slots) {
    const worn = wornName(equipment[slot])
    const cheapest = slot in pick ? (pick[slot] ?? null) : worn
    const changed = cheapest !== worn
    out[slot] = { worn, cheapest, changed, price: changed && cheapest !== null ? (price[slot] ?? null) : null }
  }
  return out
}
