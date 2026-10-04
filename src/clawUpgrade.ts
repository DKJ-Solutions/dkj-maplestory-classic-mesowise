// Loont een nieuwe claw nu? (Dave, 3 oktober 2026, issue #25) Per claw uit de NPC-winkel die je kunt dragen
// en die meer weapon attack geeft: wat bespaart hij in mesos tot je volgende upgrade, min zijn prijs.
// Voor een Warrior (issue #42) is het een wapen uit zijn winkel (warriorGear.ts), voor een Bowman (issue #44) een boog of
// kruisboog uit de zijne (bowmanGear.ts). Meer weapon attack zegt daar
// niets: een zwaarder wapen kan trager zijn of een lagere multiplier hebben. Een wapen telt dus als beter
// als het model er meer EXP per meso mee haalt dan met je huidige wapen, en de horizon loopt tot het volgende
// wapen dat meer schade per milliseconde geeft (weapon attack × multiplier ÷ aanvalstijd).
// Puur, zonder UI-import. Gekozen standaarden (de app toont ze): je stats van nu blijven gelden over de
// hele horizon, alleen de EXP per level verschilt; de verkoopwaarde van je oude claw telt niet mee
// (zo belooft "Kopen" nooit te veel); het huidige level telt vol mee. Je weapon attack komt uit het profiel;
// het scherm "Je equipment" vult die in als je een claw kiest.
import { ASSUMPTION_VARIANTS } from './best'
import { BOWMAN_WEAPONS } from './bowmanGear'
import { ASSUMPTIONS, type Assumptions } from './calc/mobModel'
import { NPC_CLAWS } from './data/claws'
import { EXP_TABLE_LEVELS, expToNextLevel } from './data/expTable'
import type { Claw } from './data/types'
import { byNet, horizonCost } from './horizonCost'
import { bestExpPerMeso } from './mesoCostAt'
import { requirementStatOf, type Profile } from './profile'
import type { SpotDraft } from './spotDraft'
import { WARRIOR_WEAPONS } from './warriorGear'

const LAST_TABLE_LEVEL = EXP_TABLE_LEVELS[EXP_TABLE_LEVELS.length - 1]

export interface ClawChoice {
  claw: Claw
  /** Het eerste en het laatste level van de horizon ("tot je volgende upgrade"). */
  from: number
  to: number
  /** True als de horizon verder loopt dan de EXP-tabel, en de app hem daar afkapt. */
  truncated: boolean
  /** Wat de claw over de horizon bespaart, of null als dat niet uit te rekenen valt. */
  saving: number | null
  /** De besparing min de prijs (negatief: verdient zich niet terug), of null zonder besparing. */
  net: number | null
}

/** Een claw die je level wel toestaat, maar waar je stats nog tekortschieten. */
export interface UnwearableClaw {
  claw: Claw
  /** Hoeveel van de eis naast DEX (LUK voor een Thief, STR voor een Warrior of Bowman) en DEX je tekortkomt (0 = genoeg). */
  needLuk: number
  needDex: number
}

export type ClawUpgradeAdvice =
  /** Niet uit te rekenen: geen profiel, level buiten de tabel, of geen "Beste". */
  | { kind: 'none' }
  | {
      kind: 'advice'
      /** Het level waarvandaan gerekend wordt: je huidige, dat vol meetelt. */
      level: number
      /** Per claw die je kunt dragen en die beter is, van meeste naar minste netto besparing. */
      choices: ClawChoice[]
      notWearable: UnwearableClaw[]
      /** De claw met de grootste netto besparing boven 0, of null als geen claw zich terugverdient. */
      winner: Claw | null
      /** False als een andere claw wint (of geen) zodra één aanname naar de rand gaat. */
      robust: boolean
    }

/** Het profiel met deze claw in je hand (een Warrior-wapen zet ook zijn weapon multiplier). */
export const withClaw = (p: Profile, c: Claw): Profile => ({
  ...p,
  clawWatk: c.watk,
  attackMs: c.speed.attackMs,
  ...(c.mult !== undefined ? { weaponMult: c.mult } : {}),
})

/** De schade per milliseconde zonder stats: genoeg om te zeggen welk wapen "later" beter is (voor de horizon van een Warrior of Bowman). */
const power = (c: Claw): number => (c.watk * (c.mult ?? 1)) / c.speed.attackMs

/** Of het model een wapen boven een ander zet op meer dan weapon attack: bij wapens met een eigen snelheid (Warrior en Bowman), niet bij de claws. */
const rankedByModel = (job: Profile['job']): boolean => job === 'warrior' || job === 'bowman'

/** De winkellijst van de job, en of een wapen daarin "beter" is dan een ander (voor de horizon). */
const shopOf = (job: Profile['job']) =>
  rankedByModel(job)
    ? { weapons: job === 'warrior' ? WARRIOR_WEAPONS : BOWMAN_WEAPONS, better: (c: Claw, than: Claw) => power(c) > power(than) }
    : { weapons: NPC_CLAWS, better: (c: Claw, than: Claw) => c.watk > than.watk }

/** De horizon van een claw: van je level tot net vóór de volgende betere claw, hoogstens de hele tabel. */
function horizon(profile: Profile, claw: Claw): { from: number; to: number; truncated: boolean } {
  const shop = shopOf(profile.job)
  const next = shop.weapons.find((c) => c.level > profile.level && shop.better(c, claw))
  const end = next ? next.level - 1 : Infinity
  return { from: profile.level, to: Math.min(end, LAST_TABLE_LEVEL), truncated: end > LAST_TABLE_LEVEL }
}

function adviseUnder(drafts: readonly SpotDraft[], profile: Profile, candidates: readonly Claw[], a: Assumptions) {
  const baseEpm = bestExpPerMeso(drafts, profile, a)
  if (baseEpm === undefined) return null
  const choices = candidates
    .map((claw): ClawChoice => {
      const h = horizon(profile, claw)
      const epm = bestExpPerMeso(drafts, withClaw(profile, claw), a)
      const without = horizonCost(h.from, h.to, baseEpm)
      const withIt = epm === undefined ? null : horizonCost(h.from, h.to, epm)
      // Is een level zonder claw onhaalbaar (basiskosten null), dan is elke claw bewust "niet uit te rekenen" (zie issue #25).
      const saving = without === null || withIt === null ? null : without - withIt
      return { claw, ...h, saving, net: saving === null ? null : saving - claw.price }
    })
    .sort(byNet)
  const top = choices[0]
  return { choices, winner: top && top.net !== null && top.net > 0 ? top.claw : null }
}

/**
 * De winkelclaws die voor jou in aanmerking komen: je level volstaat, en ze zijn beter dan wat je nu hebt. Bij een
 * Thief is dat meer weapon attack; bij een Warrior of Bowman meer EXP per meso volgens het model (zie de kop).
 */
function betterClaws(drafts: readonly SpotDraft[], profile: Profile): readonly Claw[] {
  const inLevel = shopOf(profile.job).weapons.filter((c) => c.level <= profile.level)
  if (!rankedByModel(profile.job)) return inLevel.filter((c) => c.watk > profile.clawWatk)
  const base = bestExpPerMeso(drafts, profile, ASSUMPTIONS)
  if (base === undefined) return inLevel
  return inLevel.filter((c) => (bestExpPerMeso(drafts, withClaw(profile, c), ASSUMPTIONS) ?? -Infinity) > base)
}

export function clawUpgradeAdvice(drafts: readonly SpotDraft[], profile: Profile | null): ClawUpgradeAdvice {
  if (!profile || expToNextLevel(profile.level) === undefined) return { kind: 'none' }
  const better = betterClaws(drafts, profile)
  const reqStat = requirementStatOf(profile)
  const needs = (c: Claw): UnwearableClaw => ({ claw: c, needLuk: Math.max(0, c.luk - reqStat), needDex: Math.max(0, c.dex - profile.dex) })
  const notWearable = better.map(needs).filter((u) => u.needLuk > 0 || u.needDex > 0)
  const wearable = better.filter((c) => !notWearable.some((u) => u.claw === c))
  const main = adviseUnder(drafts, profile, wearable, ASSUMPTIONS)
  if (!main) return { kind: 'none' }
  const robust = ASSUMPTION_VARIANTS.every((v) => (adviseUnder(drafts, profile, wearable, v)?.winner ?? null) === main.winner)
  return { kind: 'advice', level: profile.level, ...main, notWearable, robust }
}
