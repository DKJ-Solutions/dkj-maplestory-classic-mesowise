// De setup van Cheapest als vast punt (Dave, 6 oktober 2026, #192): de equip die Cheapest koopt hangt af van de mob en de potions, en de goedkoopste
// mob en potions hangen af van de equip. Dit rekent dat om en om uit tot het equip-advies niets meer koopt, zodat wie Overnemen tikt daarna
// niets meer wint en niets meer te kopen heeft. Puur, zonder UI-import.
import { armorUpgradeAdvice } from './armorUpgrade'
import { advisedEquipment, cheapestEquipment, countedAmmo, type CheapestSlot, type Purchase } from './cheapestEquip'
import { changesBetween, cheapestSettings, costOf, profileOf, type CheapestInput, type CheapestResult } from './cheapestSettings'
import { clawUpgradeAdvice, requiredWeapon } from './clawUpgrade'
import { EQUIP_SLOTS, isEmptyEntry, wearableSetup, shownSlots, wornName, wornWdef, type EquipEntry, type EquipSlot, type Equipment } from './equipment'
import { starUpgradeAdvice } from './starUpgrade'
import { ammoLabel, levelInvoice } from './levelInvoice'
import type { Job } from './job'
import { FIRST_JOB_LEVEL, skillPoolOf } from './data/skillPoints'
import { isSkillKey, skillInfo } from './data/skills'
import { NO_POTION_CHOICE } from './potions'
import { DEFAULT_PROFILE, DRAFT_FIELDS, type ProfileDraft } from './profile'

/** Hoeveel keer hoogstens equipment erbij komt en alles opnieuw wordt doorgerekend; daarna blijft de laatste stand staan (`capped`). */
export const MAX_EQUIP_ROUNDS = 4

export interface AdvisedSetup {
  /** De goedkoopste instellingen met de equip erbij; `capped` ook als de equip-rondes op raakten. */
  result: CheapestResult
  /** Wat je draagt plus wat Cheapest koopt, en het profiel dat daarbij hoort (weapon attack, WDEF), zonder de wijzigingen van `result`. */
  equipment: Equipment
  profile: ProfileDraft
  /** De stukken die Cheapest koopt, elk met zijn winkelprijs en horizon: per slot alleen het stuk dat er uiteindelijk staat. */
  purchases: Purchase[]
  /** Wat de stukken samen in de winkel kosten. */
  shop: number
  /** Per slot wat je draagt en wat Cheapest heeft, voor de Equip-popup en de wijzigingsregels. */
  cheapest: Record<EquipSlot, CheapestSlot>
  /** De munitie die de factuur van Cheapest telt (countedAmmo, #189), voor een leeg Ammo-slot in de Equip-popup; null als hij niets gooit. */
  ammo: string | null
}

/**
 * De velden van het profiel die bij je equip horen: wapen, WDEF, stars, snelheid, de keuzes van dagger en pijlen (die houdt de Equip-kaart bij), en wat
 * je items per stat extra geven (STR, DEX, INT, LUK). Je base AP en je accuracy bouwt Cheapest zelf op.
 */
const GEAR_FIELDS = ['clawWatk', 'wdef', 'attackMs', 'weaponMult', 'starWatk', 'starRecharge', 'dagger', 'bronzeArrows', 'helpfulStranger', 'strExtra', 'dexExtra', 'intExtra', 'lukExtra'] as const satisfies readonly (keyof ProfileDraft)[]

/** Of een veld een waarde heeft die parseProfile goedkeurt: een getal binnen zijn grenzen, en heel waar dat moet. */
const validField = (key: keyof ProfileDraft, text: string): boolean => {
  const f = DRAFT_FIELDS.find((d) => d.key === key)
  const n = text.trim() === '' ? NaN : Number(text)
  return f !== undefined && Number.isFinite(n) && n >= f.min && n <= f.max && (!f.integer || Number.isInteger(n))
}

/** Elke skill van de 1e job op 0: onder level 10 heb je daar nog geen punten voor (skillPointCap), ook niet het ene punt van het standaardprofiel. */
const NO_JOB_SKILL_POINTS: Partial<ProfileDraft> = Object.fromEntries(
  Object.keys(DEFAULT_PROFILE)
    .filter((k) => isSkillKey(k) && skillPoolOf(skillInfo(k).job) === 'job')
    .map((k) => [k, '0']),
)

/**
 * Waar Cheapest begint (Dave, 8 oktober 2026, #263): je job, je level, je geslacht (sommige equip is er alleen voor het ene) en de equip die je draagt,
 * met de velden die bij die equip horen (GEAR_FIELDS): wat je al hebt is gratis, Cheapest koopt alleen wat daarbovenop loont. Al de rest bouwt
 * Cheapest zelf op, alsof je op dit level opnieuw begint: geen mob, geen gekozen potions en het standaardprofiel, met alleen het ene
 * punt in de aanvalsskill (Lucky Seven, Energy Bolt) dat het nodig heeft om aan te vallen; de rest van de skillpunten zet Cheapest zelf. Onder level 10
 * heb je nog geen punten van je 1e job, dus daar staat ook dat punt op 0.
 * Wat je zelf invulde telt niet mee, ook een fout niet (meer skillpunten dan je level toelaat). Alleen je Max HP blijft staan als het een getal is:
 * dat kies je niet, en de app kent geen HP per level met een bron voor elke job.
 */
export function freshStart(user: CheapestInput): CheapestInput {
  const hp = user.profileDraft.hp.trim()
  // De velden van je equip neemt Cheapest over waar parseProfile ze goedkeurt; een leeg of fout veld valt terug op de standaard (Victor, 8 oktober 2026).
  const gear = Object.fromEntries(GEAR_FIELDS.filter((k) => validField(k, user.profileDraft[k])).map((k) => [k, user.profileDraft[k].trim()]))
  const start: ProfileDraft = {
    ...DEFAULT_PROFILE,
    ...(Number(user.profileDraft.level) < FIRST_JOB_LEVEL ? NO_JOB_SKILL_POINTS : {}),
    ...gear,
    level: user.profileDraft.level,
    hp: /^[1-9]\d*$/.test(hp) ? hp : DEFAULT_PROFILE.hp,
  }
  // Wat je echt draagt (wearableSetup): een stuk boven je level telt niet mee (#264), en een leeg top-, bottom- of schoenenslot is je startkleding.
  const { equipment, profile: profileDraft } = wearableSetup(start, user.equipment, user.job, user.gender)
  return { job: user.job, gender: user.gender, equipment, drafts: [], potionChoice: NO_POTION_CHOICE, profileDraft }
}

/**
 * Cheapest voor jouw stand (Dave, 8 oktober 2026, #263): de setup die het zelf opbouwt vanaf je job, level en equip (freshStart), met de wijzigingen en de besparing
 * gemeten tegen jouw eigen stand, zodat Overnemen zegt wat er voor jou verandert.
 */
export function cheapestFor(user: CheapestInput): AdvisedSetup {
  const setup = advisedSetup(freshStart(user))
  const r = setup.result
  // Jouw stand zoals de app hem doorrekent: zonder equip boven je level (#264), dat bewaard blijft maar niet meetelt, en met je startkleding.
  const wearable = wearableSetup(user.profileDraft, user.equipment, user.job, user.gender)
  const own: CheapestInput = { ...user, equipment: wearable.equipment, profileDraft: wearable.profile }
  const after: CheapestInput = { ...own, drafts: r.drafts, profileDraft: r.profileDraft, potionChoice: r.potionChoice }
  const costBefore = costOf(own)
  const saving = typeof costBefore === 'number' && typeof r.costAfter === 'number' ? costBefore - r.costAfter : null
  return { ...setup, result: { ...r, changes: changesBetween(own, after), costBefore, saving } }
}

/**
 * De setup van Cheapest voor deze invoer. Per ronde: de goedkoopste instellingen met de equip die er nu is, dan het equip-advies (tot je volgende
 * upgrade, zoals het Report) op wat daaruit komt. Koopt het niets, dan is dit de uitkomst; anders komen die stukken erbij en begint de ronde opnieuw
 * met je eigen mob, potions en skillpunten. Een slot dat twee keer verandert, koopt alleen het laatste stuk (met de prijs en horizon van de ronde
 * die het koos). Na de uitkomst nemen en opnieuw rekenen verandert dus niets.
 *
 * Er staat altijd een wapen in het advies (Dave, 7 oktober 2026, #202). Is je eigen wapenslot leeg, dan rekent Cheapest vanaf een lege hand
 * (0 ATT, niet de ATT uit je profiel) en zet het het wapen van requiredWeapon in je hand, ook als dat zich niet terugverdient. Heeft je
 * winkel op je level niets wat je kunt dragen, dan blijft het zoals het was: met de ATT uit je profiel.
 */
export function advisedSetup(user: CheapestInput): AdvisedSetup {
  if (!isEmptyEntry(user.equipment.claw)) return settle(user, user.profileDraft, false)
  const armed = settle(user, { ...user.profileDraft, clawWatk: '0' }, true)
  return isEmptyEntry(armed.equipment.claw) ? settle(user, user.profileDraft, false) : armed
}

/** Het vaste punt van advisedSetup vanaf dit profiel; met `needsWeapon` krijgt een leeg wapenslot het wapen van requiredWeapon. */
function settle(user: CheapestInput, startProfile: ProfileDraft, needsWeapon: boolean): AdvisedSetup {
  const { job } = user
  let equipment = user.equipment
  let profileDraft = startProfile
  let purchases: Purchase[] = []
  let rounds = 0
  let advice: Record<EquipSlot, CheapestSlot> | null = null
  let result: CheapestResult
  let equipCapped = false
  let profile: ReturnType<typeof profileOf>
  for (;;) {
    const input: CheapestInput = { ...user, equipment, profileDraft }
    result = cheapestSettings(input)
    const state: CheapestInput = { ...input, drafts: result.drafts, profileDraft: result.profileDraft, potionChoice: result.potionChoice }
    profile = profileOf(state)
    // Onder level 10 koopt Cheapest, en alleen Cheapest, uit de wapens met een prijs van een Beginner (#203): advies en wapen delen die keuze.
    const claw = clawUpgradeAdvice(state.drafts, profile, 'next-upgrade', true)
    const weapon = needsWeapon && isEmptyEntry(equipment.claw) ? requiredWeapon(profile, claw, true) : null
    advice = cheapestEquipment(shownSlots(job, equipment.claw), equipment, claw, armorUpgradeAdvice(state.drafts, profile, wornWdef(equipment, job)), weapon, starUpgradeAdvice(state.drafts, profile))
    const gear = advisedEquipment(job, profileDraft, equipment, advice)
    if (gear.purchases.length === 0) break
    if (rounds >= MAX_EQUIP_ROUNDS) {
      equipCapped = true
      break
    }
    rounds++
    purchases = [...purchases.filter((p) => !gear.purchases.some((n) => n.slot === p.slot)), ...gear.purchases]
    equipment = gear.equipment
    profileDraft = gear.profile
  }
  // Een stuk dat een latere ronde weer verving (een overall maakt top en bottom leeg) staat er niet meer.
  const final = purchases.filter((p) => wornName(equipment[p.slot]) === p.name)
  const last = advice
  const cheapest = {} as Record<EquipSlot, CheapestSlot>
  for (const { slot } of EQUIP_SLOTS) {
    const worn = wornName(user.equipment[slot])
    const name = wornName(equipment[slot])
    const bought = final.find((p) => p.slot === slot)
    const changed = name !== worn
    cheapest[slot] = {
      worn,
      cheapest: name,
      changed,
      price: changed && bought ? bought.price : null,
      option: changed ? null : (last[slot]?.option ?? null),
      ...(bought?.horizon ? { horizon: bought.horizon } : {}),
      ...(changed && bought?.why ? { why: bought.why } : {}),
    }
  }
  return {
    result: equipCapped ? { ...result, capped: true } : result,
    equipment,
    profile: profileDraft,
    purchases: final,
    shop: final.reduce((sum, p) => sum + p.price, 0),
    cheapest,
    ammo: profile ? ammoOnInvoice(result.drafts, profile, job, equipment.claw) : null,
  }
}

/**
 * Wat het Ammo-slot noemt, volgt de factuur (#199): staat er een munitieregel (stars of pijlen, altijd met uitleg), dan die munitie; staat er geen, dan niets.
 */
function ammoOnInvoice(drafts: CheapestResult['drafts'], profile: NonNullable<ReturnType<typeof profileOf>>, job: Job, claw: EquipEntry): string | null {
  const inv = levelInvoice(drafts, profile)
  const line = inv.kind === 'invoice' ? inv.lines.find((l) => !l.shop && l.label === ammoLabel(job)) : undefined
  return line ? countedAmmo(profile, claw) : null
}
