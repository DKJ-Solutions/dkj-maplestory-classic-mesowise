// De setup van Advised als vast punt (Dave, 6 oktober 2026, #192): de equip die Advised koopt hangt af van de mob en de potions, en de goedkoopste
// mob en potions hangen af van de equip. Dit rekent dat om en om uit tot het equip-advies niets meer koopt, zodat wie Overnemen tikt daarna
// niets meer wint en niets meer te kopen heeft. Puur, zonder UI-import.
import { armorUpgradeAdvice } from './armorUpgrade'
import { advisedEquipment, cheapestEquipment, type CheapestSlot, type Purchase } from './cheapestEquip'
import { cheapestSettings, profileOf, type CheapestInput, type CheapestResult } from './cheapestSettings'
import { clawUpgradeAdvice } from './clawUpgrade'
import { EQUIP_SLOTS, shownSlots, wornName, wornWdef, type EquipSlot, type Equipment } from './equipment'
import type { ProfileDraft } from './profile'

/** Hoeveel keer hoogstens equipment erbij komt en alles opnieuw wordt doorgerekend; daarna blijft de laatste stand staan (`capped`). */
export const MAX_EQUIP_ROUNDS = 4

export interface AdvisedSetup {
  /** De goedkoopste instellingen met de equip erbij; `capped` ook als de equip-rondes op raakten. */
  result: CheapestResult
  /** Wat je draagt plus wat Advised koopt, en het profiel dat daarbij hoort (weapon attack, WDEF), zonder de wijzigingen van `result`. */
  equipment: Equipment
  profile: ProfileDraft
  /** De stukken die Advised koopt, elk met zijn winkelprijs en horizon: per slot alleen het stuk dat er uiteindelijk staat. */
  purchases: Purchase[]
  /** Wat de stukken samen in de winkel kosten. */
  shop: number
  /** Per slot wat je draagt en wat Advised heeft, voor de Equip-popup en de wijzigingsregels. */
  cheapest: Record<EquipSlot, CheapestSlot>
}

/**
 * De setup van Advised voor deze invoer. Per ronde: de goedkoopste instellingen met de equip die er nu is, dan het equip-advies (tot je volgende
 * upgrade, zoals het Report) op wat daaruit komt. Koopt het niets, dan is dit de uitkomst; anders komen die stukken erbij en begint de ronde opnieuw
 * met je eigen mob, potions en skillpunten. Een slot dat twee keer verandert, koopt alleen het laatste stuk (met de prijs en horizon van de ronde
 * die het koos). Na de uitkomst nemen en opnieuw rekenen verandert dus niets.
 */
export function advisedSetup(user: CheapestInput): AdvisedSetup {
  const { job } = user
  let equipment = user.equipment
  let profileDraft = user.profileDraft
  let purchases: Purchase[] = []
  let rounds = 0
  let advice: Record<EquipSlot, CheapestSlot> | null = null
  let result: CheapestResult
  let equipCapped = false
  for (;;) {
    const input: CheapestInput = { ...user, equipment, profileDraft }
    result = cheapestSettings(input)
    const state: CheapestInput = { ...input, drafts: result.drafts, profileDraft: result.profileDraft, potionChoice: result.potionChoice }
    const profile = profileOf(state)
    advice = cheapestEquipment(shownSlots(job, equipment.claw), equipment, clawUpgradeAdvice(state.drafts, profile), armorUpgradeAdvice(state.drafts, profile, wornWdef(equipment, job)))
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
    }
  }
  return {
    result: equipCapped ? { ...result, capped: true } : result,
    equipment,
    profile: profileDraft,
    purchases: final,
    shop: final.reduce((sum, p) => sum + p.price, 0),
    cheapest,
  }
}
