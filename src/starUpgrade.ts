// Loont een andere NPC-star nu? (Dave, 7 oktober 2026, issue #198) Alleen voor Advised: een Thief vergelijkt de Subi- en de Wolbi-stars die hij
// niet draagt met de star die hij heeft, op wat ze hem tot zijn volgende wapenupgrade besparen min de prijs van de set. De star die je draagt
// (die van je herlaadprijs) is van jou en kost niets; een star buiten het NPC-paar (drop of Free Market) wordt nooit geadviseerd. Draag je er
// zo een, dan blijft hij, tenzij Subi of Wolbi zich ertegen terugverdient. De prijs wordt afgeschreven zoals bij equipment (writeOff.ts).
// In advisedSetup wordt de star in dezelfde ronde gekozen als de claw, tegen hetzelfde wapen: koopt die ronde ook een claw, dan houdt de
// star de prijs en horizon van die ronde, net als de claw zelf. Puur, zonder UI-import.
import { ASSUMPTIONS } from './calc/mobModel'
import { bestExpPerMeso } from './bestExpPerMeso'
import { EXP_TABLE_LEVELS, expToNextLevel } from './data/expTable'
import { THROWING_STARS } from './data/thief'
import type { ThrowingStar } from './data/types'
import { horizonCost } from './horizonCost'
import { ownAmount } from './levelInvoice'
import { nextBetterWeapon } from './clawUpgrade'
import { throwsNothing, type Profile } from './profile'
import type { SpotDraft } from './spotDraft'

const LAST_TABLE_LEVEL = EXP_TABLE_LEVELS[EXP_TABLE_LEVELS.length - 1]

/** Een star om te kopen, met de levels waarover hij zich terugverdient en wat hij daarover bespaart (min de prijs: `net`, altijd boven 0). */
export interface StarPick {
  star: ThrowingStar
  /** De prijs van de set. */
  price: number
  from: number
  to: number
  truncated: boolean
  saving: number
  net: number
}

/**
 * De star die Advised koopt, of null: een Thief die stars gooit, een geldige "Beste", en een NPC-star met een koopprijs die zich tot je volgende
 * wapenupgrade terugverdient. Bij meer dan één die zich terugverdient: de grootste netto besparing.
 */
export function starUpgradeAdvice(drafts: readonly SpotDraft[], profile: Profile | null): StarPick | null {
  if (!profile || profile.job !== 'thief' || throwsNothing(profile) || expToNextLevel(profile.level) === undefined) return null
  // Een herlaadprijs die bij geen star uit de lijst hoort, is een star die de app niet kent (#199): die is van jou, daar adviseert Advised niets over.
  // Een eigen bedrag voor de munitie verandert niet met de star (de factuur telt dat bedrag): dan valt er niets te vergelijken.
  if (drafts.some((d) => ownAmount(d.ammo))) return null
  const held = THROWING_STARS.find((t) => t.rechargePerStar === profile.starRecharge)
  if (!held) return null
  const baseEpm = bestExpPerMeso(drafts, profile, ASSUMPTIONS)
  if (baseEpm === undefined) return null
  const next = nextBetterWeapon(profile)
  const end = next ? next.level - 1 : Infinity
  const from = profile.level
  const to = Math.min(end, LAST_TABLE_LEVEL)
  const without = horizonCost(from, to, baseEpm)
  if (without === null) return null
  let best: StarPick | null = null
  for (const star of THROWING_STARS) {
    if (!star.buy || star === held || star.level > profile.level) continue
    const epm = bestExpPerMeso(drafts, { ...profile, starWatk: star.watk, starRecharge: star.rechargePerStar }, ASSUMPTIONS)
    const withIt = epm === undefined ? null : horizonCost(from, to, epm)
    if (withIt === null) continue
    const saving = without - withIt
    const net = saving - star.buy.price
    if (net > 0 && (!best || net > best.net)) best = { star, price: star.buy.price, from, to, truncated: end > LAST_TABLE_LEVEL, saving, net }
  }
  return best
}
