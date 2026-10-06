// De equip van Advised in de Equip-popup (Dave, 6 oktober 2026, #188): per slot de equip waarmee je het goedkoopst één level omhoog gaat.
// Puur, zonder UI-import; leest alleen wat het wapen- en armor-advies al uitrekenden. De factuur van Advised rekent met deze equip
// (Dave, 6 oktober 2026, #192): advisedEquipment zet haar om in een Equipment en de winkelprijs van wat je koopt.
import type { ArmorUpgradeAdvice } from './armorUpgrade'
import type { ClawUpgradeAdvice } from './clawUpgrade'
import type { ArmorSlot } from './data/types'
import { changeEquipment, choosePick, isEmptyEntry, NONE, wornName, type EquipSlot, type Equipment } from './equipment'
import type { Job } from './job'
import type { ProfileDraft } from './profile'

export interface CheapestSlot {
  /** Wat je in dit slot draagt, of null als het leeg is. */
  worn: string | null
  /** Wat de goedkoopste equip hier heeft, of null als het slot daar leeg is. */
  cheapest: string | null
  /** True als de goedkoopste equip hier iets anders heeft dan je draagt: een stuk om te kopen, of een slot dat leeg raakt. */
  changed: boolean
  /** Wat het stuk in de winkel kost als je het moet kopen; null als je hier niets koopt. */
  price: number | null
  /**
   * Bij een slot dat leeg blijft: het beste stuk dat je hier kunt dragen, met zijn prijs en wat het dit level bespaart, maar dat
   * zich niet terugverdient (Dave, 6 oktober 2026, #188). Null als het slot niet leeg blijft of de winkel hier niets heeft.
   */
  option: { name: string; price: number; saving: number | null } | null
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
  // Per slot het beste stuk dat niet gekocht wordt: de keuzes staan al per slot, van meeste naar minste netto besparing.
  const options: Partial<Record<EquipSlot, CheapestSlot['option']>> = {}
  if (claw.kind === 'advice' && !claw.winner && claw.choices[0]) {
    const c = claw.choices[0]
    options.claw = { name: c.claw.name, price: c.claw.price, saving: c.saving }
  }
  if (armor.kind === 'advice') {
    for (const c of armor.choices) {
      if (!c.with && options[c.armor.slot] === undefined) options[c.armor.slot] = { name: c.armor.name, price: c.price, saving: c.saving }
    }
  }
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
    const option = cheapest === null && !(slot in pick && pick[slot] === null) ? (options[slot] ?? null) : null
    out[slot] = { worn, cheapest, changed, price: changed && cheapest !== null ? (price[slot] ?? null) : null, option }
  }
  return out
}

/** De equip van het advies als Equipment, het profiel dat daarbij hoort, en wat het in de winkel kost (Dave, 6 oktober 2026, #192). */
export interface AdvisedEquipment {
  equipment: Equipment
  /** Het profiel met weapon attack, WDEF en de rest zoals ze volgen uit die equip. */
  profile: ProfileDraft
  /** Wat de stukken samen in de winkel kosten; 0 als je niets koopt. */
  shop: number
}

/**
 * De equip waarmee de factuur van Advised rekent (Dave, 6 oktober 2026, #192): wat je draagt, plus elk stuk dat het advies koopt. Een
 * slot dat verandert krijgt het winkelstuk zoals een keuze op de Equip-kaart het zet (choosePick), en een slot dat leeg raakt wordt bekend leeg.
 * Het profiel volgt via changeEquipment, dezelfde stap als een keuze op de kaart, dus weapon attack, aanvalssnelheid, WDEF en een overall die
 * top en bottom vult kloppen vanzelf. Zonder wijziging komen dezelfde objecten terug.
 */
export function advisedEquipment(job: Job, profile: ProfileDraft, equipment: Equipment, cheapest: Record<EquipSlot, CheapestSlot>): AdvisedEquipment {
  let out = { equipment, profile }
  let shop = 0
  const slots = Object.keys(cheapest) as EquipSlot[]
  // Eerst wat je koopt, dan wat daardoor leeg blijft: een overall maakt top en bottom al leeg, die staan dan niet meer vol.
  for (const slot of slots) {
    const c = cheapest[slot]
    if (!c.changed || c.cheapest === null) continue
    out = changeEquipment(out.profile, out.equipment, slot, choosePick(slot, out.equipment[slot], c.cheapest), job)
    shop += c.price ?? 0
  }
  for (const slot of slots) {
    const c = cheapest[slot]
    if (!c.changed || c.cheapest !== null || isEmptyEntry(out.equipment[slot])) continue
    out = changeEquipment(out.profile, out.equipment, slot, choosePick(slot, out.equipment[slot], NONE), job)
  }
  return { equipment: out.equipment, profile: out.profile, shop }
}

/**
 * Wat Overnemen in je equip zet, in een paar woorden voor onder Difference (Dave, 6 oktober 2026, #192): bij ATT het wapen, bij DEF de
 * armorstukken die je koopt, of "geen verschil".
 */
export function buyTexts(cheapest: Record<EquipSlot, CheapestSlot>): { att: string | null; def: string | null } {
  const bought = (slots: EquipSlot[]) => slots.flatMap((s) => (cheapest[s] && cheapest[s].changed && cheapest[s].cheapest !== null ? [cheapest[s].cheapest!] : []))
  const text = (names: string[]): string | null => (names.length > 0 ? `Koop ${names.join(', ')}` : null)
  const armor = (Object.keys(cheapest) as EquipSlot[]).filter((s) => s !== 'claw' && s !== 'ammo')
  return { att: text(bought(['claw'])), def: text(bought(armor)) }
}
