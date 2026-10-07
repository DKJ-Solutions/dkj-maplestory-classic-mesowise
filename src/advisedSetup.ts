// De setup van Advised als vast punt (Dave, 6 oktober 2026, #192): de equip die Advised koopt hangt af van de mob en de potions, en de goedkoopste
// mob en potions hangen af van de equip. Dit rekent dat om en om uit tot het equip-advies niets meer koopt, zodat wie Overnemen tikt daarna
// niets meer wint en niets meer te kopen heeft. Puur, zonder UI-import.
import { armorUpgradeAdvice } from './armorUpgrade'
import { advisedEquipment, cheapestEquipment, countedAmmo, type CheapestSlot, type Purchase } from './cheapestEquip'
import { cheapestSettings, profileOf, type CheapestInput, type CheapestResult } from './cheapestSettings'
import { clawUpgradeAdvice, requiredWeapon } from './clawUpgrade'
import { EQUIP_SLOTS, isEmptyEntry, shownSlots, wornName, wornWdef, type EquipSlot, type Equipment } from './equipment'
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
  /** De munitie die de factuur van Advised telt (countedAmmo, #189), voor een leeg Ammo-slot in de Equip-popup; null als hij niets gooit. */
  ammo: string | null
}

/**
 * De setup van Advised voor deze invoer. Per ronde: de goedkoopste instellingen met de equip die er nu is, dan het equip-advies (tot je volgende
 * upgrade, zoals het Report) op wat daaruit komt. Koopt het niets, dan is dit de uitkomst; anders komen die stukken erbij en begint de ronde opnieuw
 * met je eigen mob, potions en skillpunten. Een slot dat twee keer verandert, koopt alleen het laatste stuk (met de prijs en horizon van de ronde
 * die het koos). Na de uitkomst nemen en opnieuw rekenen verandert dus niets.
 *
 * Er staat altijd een wapen in het advies (Dave, 7 oktober 2026, #202). Is je eigen wapenslot leeg, dan rekent Advised vanaf een lege hand
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
    const claw = clawUpgradeAdvice(state.drafts, profile)
    const weapon = needsWeapon && isEmptyEntry(equipment.claw) ? requiredWeapon(profile, claw) : null
    advice = cheapestEquipment(shownSlots(job, equipment.claw), equipment, claw, armorUpgradeAdvice(state.drafts, profile, wornWdef(equipment, job)), weapon)
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
    ammo: profile ? countedAmmo(profile, equipment.claw) : null,
  }
}
