// De equip van Advised in de Equip-popup (Dave, 6 oktober 2026, #188): per slot de equip waarmee je het goedkoopst omhoog gaat. Was dit level
// (#188); sinds #192 tot je volgende upgrade in dat slot, het advies uit het Report, met afschrijving op de factuur (writeOff.ts).
// Puur, zonder UI-import; leest alleen wat het wapen- en armor-advies al uitrekenden. De factuur van Advised rekent met deze equip
// (Dave, 6 oktober 2026, #192): advisedEquipment zet haar om in een Equipment en de winkelprijs van wat je koopt.
import type { ArmorUpgradeAdvice } from './armorUpgrade'
import type { ClawUpgradeAdvice, WeaponPick } from './clawUpgrade'
import type { StarPick } from './starUpgrade'
import { HELPFUL_STRANGER_ARROWS, NPC_ARROWS, NPC_BOWMAN_WEAPONS } from './data/bowman'
import { THROWING_STARS } from './data/thief'
import type { ArmorSlot } from './data/types'
import { changeEquipment, choosePick, isEmptyEntry, NONE, wornName, type EquipEntry, type EquipSlot, type Equipment } from './equipment'
import type { Job } from './job'
import { nf3 } from './numberFormat'
import { throwsNothing, type Profile, type ProfileDraft } from './profile'

/** De levels van een stuk om te kopen, uit het wapen- of armor-advies dat het koos. */
export interface Horizon {
  from: number
  to: number
  /** True als de upgrade pas na de EXP-tabel komt, en de app de horizon daar afkapt. */
  truncated: boolean
}

export interface CheapestSlot {
  /** Wat je in dit slot draagt, of null als het leeg is. */
  worn: string | null
  /** Wat de goedkoopste equip hier heeft, of null als het slot daar leeg is. */
  cheapest: string | null
  /** True als de goedkoopste equip hier iets anders heeft dan je draagt: een stuk om te kopen, of een slot dat leeg raakt. */
  changed: boolean
  /** Wat het stuk in de winkel kost als je het moet kopen; null als je hier niets koopt. */
  price: number | null
  /** Bij een stuk om te kopen: de levels waarover het zich terugverdient, van je level tot je volgende upgrade in dat slot (#192). */
  horizon?: Horizon
  /**
   * Bij een stuk om te kopen: waarom het loont (Dave, 7 oktober 2026), de uitleg achter het vraagteken in Advised. `saving` is wat het tot je
   * volgende upgrade bespaart (null: niet uit te rekenen); `partner` het stuk waarmee het samen gekocht wordt (een top en een bottom die een
   * overall vervangen), met `cost` wat ze samen kosten. Met `required` is het het goedkoopste wapen voor een leeg wapenslot (#202): dat koop je
   * omdat je een wapen nodig hebt, niet om wat het bespaart.
   */
  why?: { saving: number | null; partner?: string; cost?: number } | { required: true }
  /**
   * Bij een slot dat leeg blijft: het beste stuk dat je hier kunt dragen, met zijn prijs en wat het tot je volgende upgrade bespaart, maar dat
   * zich niet terugverdient (Dave, 6 oktober 2026, #188). Null als het slot niet leeg blijft of de winkel hier niets heeft.
   */
  option: { name: string; price: number; saving: number | null } | null
}

/**
 * Per slot wat je draagt en wat de goedkoopste equip heeft. Het wapen: de winnaar van het wapenadvies. Armor: elk slot
 * waarvan het beste stuk zich terugverdient (netto besparing boven 0), van grootste naar kleinste netto besparing; een
 * stuk dat een slot vult dat een eerder stuk al vulde, of een overall naast een top of bottom, valt af. Elk stuk is
 * doorgerekend tegen wat je nu draagt, dus dit is het advies per slot naast elkaar, geen nieuwe berekening van
 * alles samen. Zonder advies blijft elk slot wat je draagt. Met `weapon` (een leeg wapenslot, #202) staat dat wapen er als het advies
 * zelf geen wapen koopt: er staat altijd een wapen in het advies. Met `star` (#198) staat die NPC-star in het Ammo-slot, met zijn prijs en horizon.
 */
export function cheapestEquipment(slots: readonly EquipSlot[], equipment: Equipment, claw: ClawUpgradeAdvice, armor: ArmorUpgradeAdvice, weapon: WeaponPick | null = null, star: StarPick | null = null): Record<EquipSlot, CheapestSlot> {
  const pick: Partial<Record<EquipSlot, string | null>> = {}
  const price: Partial<Record<EquipSlot, number>> = {}
  const horizon: Partial<Record<EquipSlot, Horizon>> = {}
  const why: Partial<Record<EquipSlot, NonNullable<CheapestSlot['why']>>> = {}
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
    const won = claw.choices.find((c) => c.claw === claw.winner)
    if (won) {
      horizon.claw = { from: won.from, to: won.to, truncated: won.truncated }
      why.claw = { saving: won.saving }
    }
  } else if (weapon) {
    pick.claw = weapon.claw.name
    price.claw = weapon.claw.price
    horizon.claw = { from: weapon.from, to: weapon.to, truncated: weapon.truncated }
    why.claw = { required: true }
  }
  if (star) {
    pick.ammo = star.star.name
    price.ammo = star.price
    horizon.ammo = { from: star.from, to: star.to, truncated: star.truncated }
    why.ammo = { saving: star.saving }
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
      for (const p of pieces) {
        price[p.slot] = p.price
        horizon[p.slot] = { from: c.from, to: c.to, truncated: c.truncated }
        const partner = pieces.find((q) => q !== p)
        why[p.slot] = partner ? { saving: c.saving, partner: partner.name, cost: c.price } : { saving: c.saving }
      }
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
    const bought = changed && cheapest !== null
    out[slot] = { worn, cheapest, changed, price: bought ? (price[slot] ?? null) : null, option, ...(bought && horizon[slot] ? { horizon: horizon[slot] } : {}), ...(bought && why[slot] ? { why: why[slot] } : {}) }
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
  /** Elk stuk dat je koopt, met zijn winkelprijs: één regel per stuk op de factuur van Advised (Dave, 6 oktober 2026, #192). */
  purchases: Purchase[]
}

/** Eén stuk uit de winkel: het slot, de naam en wat het kost. */
export interface Purchase {
  slot: EquipSlot
  name: string
  price: number
  /** De levels waarover het stuk zich terugverdient (#192); ontbreekt als het advies ze niet gaf. */
  horizon?: Horizon
  /** Waarom het stuk loont (Dave, 7 oktober 2026; zie CheapestSlot.why); ontbreekt als het advies het niet gaf. */
  why?: CheapestSlot['why']
}

/**
 * De equip waarmee de factuur van Advised rekent (Dave, 6 oktober 2026, #192): wat je draagt, plus elk stuk dat het advies koopt. Een
 * slot dat verandert krijgt het winkelstuk zoals een keuze op de Equip-kaart het zet (choosePick), en een slot dat leeg raakt wordt bekend leeg.
 * Het profiel volgt via changeEquipment, dezelfde stap als een keuze op de kaart, dus weapon attack, aanvalssnelheid, WDEF en een overall die
 * top en bottom vult kloppen vanzelf. Zonder wijziging komen dezelfde objecten terug.
 */
export function advisedEquipment(job: Job, profile: ProfileDraft, equipment: Equipment, cheapest: Record<EquipSlot, CheapestSlot>): AdvisedEquipment {
  let out = { equipment, profile }
  const purchases: Purchase[] = []
  const slots = Object.keys(cheapest) as EquipSlot[]
  // Eerst wat je koopt, dan wat daardoor leeg blijft: een overall maakt top en bottom al leeg, die staan dan niet meer vol.
  for (const slot of slots) {
    const c = cheapest[slot]
    if (!c.changed || c.cheapest === null) continue
    out = changeEquipment(out.profile, out.equipment, slot, choosePick(slot, out.equipment[slot], c.cheapest), job)
    purchases.push({ slot, name: c.cheapest, price: c.price ?? 0, ...(c.horizon ? { horizon: c.horizon } : {}), ...(c.why ? { why: c.why } : {}) })
  }
  for (const slot of slots) {
    const c = cheapest[slot]
    if (!c.changed || c.cheapest !== null || isEmptyEntry(out.equipment[slot])) continue
    out = changeEquipment(out.profile, out.equipment, slot, choosePick(slot, out.equipment[slot], NONE), job)
  }
  return { equipment: out.equipment, profile: out.profile, shop: purchases.reduce((sum, p) => sum + p.price, 0), purchases }
}

/** Het label van het Ammo-slot als je zelf een bedrag voor de munitie invulde: de app weet dan niet welke munitie dat koopt (#199). */
export const OWN_AMMO = 'Eigen bedrag'

/**
 * Wat een star of pijl is, op naam (Dave, 7 oktober 2026): zijn ATT, wat hij per stuk kost (herladen of kopen) en het level dat hij vraagt, voor de
 * info-knop in Total cost: Useable. Uit de lijsten zelf, niet uit het profiel: dat draagt de pijl van een Bowman niet. Undefined bij een eigen bedrag
 * of een naam die in geen lijst staat.
 */
export function ammoInfo(name: string): { watk: number; price: number; level?: number } | undefined {
  const star = THROWING_STARS.find((t) => t.name === name)
  if (star) return { watk: star.watk, price: star.rechargePerStar, level: star.level }
  const arrow = [...NPC_ARROWS, ...HELPFUL_STRANGER_ARROWS].find((a) => a.name === name)
  return arrow && { watk: arrow.watk, price: arrow.pricePerArrow }
}

/**
 * De munitie waarmee de factuur rekent, op naam (Dave, 6 oktober 2026, #189): voor het Ammo-slot van Advised als je daar niets invulde. Een Thief
 * gooit de star met de herlaadprijs uit zijn profiel (zonder keuze de Subi uit DEFAULT_PROFILE); een Bowman schiet de pijl die zijn profiel rekent
 * (arrowFor), voor zijn boog of kruisboog, en bij een eigen wapen voor een boog zoals PLAIN_ARROW. Null als hij niets gooit (throwsNothing).
 * Typte je zelf het bedrag voor de munitie van de plek (`ownCost`), dan telt de factuur dat bedrag en kent de app de munitie niet: OWN_AMMO.
 * Hoort de herlaadprijs van een Thief bij geen enkele star uit de lijst, dan een algemeen label met die prijs (#199), zoals de factuur hem telt;
 * een Bowman rekent altijd met de prijs van zijn pijl (parseProfile), dus bij hem komt dat niet voor;
 * zonder herlaadprijs telt de factuur de munitiekosten van de plek en is er niets te noemen.
 */
export function countedAmmo(profile: Profile, weapon: EquipEntry, ownCost = false): string | null {
  if (throwsNothing(profile)) return null
  if (ownCost) return OWN_AMMO
  const price = profile.starRecharge
  if (profile.job === 'thief') return THROWING_STARS.find((t) => t.rechargePerStar === price)?.name ?? (price > 0 ? `Throwing stars, ${nf3.format(price)} meso per stuk` : null)
  const kind = NPC_BOWMAN_WEAPONS.find((w) => w.name === weapon.pick)?.kind ?? 'bow'
  return [...NPC_ARROWS, ...HELPFUL_STRANGER_ARROWS].find((a) => a.for === kind && a.pricePerArrow === price && a.watk === profile.starWatk)?.name ?? null
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
