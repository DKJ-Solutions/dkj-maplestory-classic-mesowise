// Loont een nieuwe claw nu? (Dave, 3 oktober 2026, issue #25) Per claw uit de NPC-winkel die je kunt dragen
// en die meer weapon attack geeft: wat bespaart hij in mesos tot je volgende upgrade, min zijn prijs.
// Voor een Magician (issue #43) is het een wand of staff uit zijn winkel (magicianGear.ts); zijn wapen geeft M.ATT in plaats van weapon
// attack, en meer M.ATT is daar beter (de cast duurt altijd 810 ms).
// Voor een Warrior (issue #42) is het een wapen uit zijn winkel (warriorGear.ts), voor een Bowman (issue #44) een boog of
// kruisboog uit de zijne (bowmanGear.ts), en voor een Thief met een dagger (issue #170) een dagger (data/daggers.ts). Meer weapon attack zegt daar
// niets: een zwaarder wapen kan trager zijn of een lagere multiplier hebben. Een wapen telt dus als beter
// als het model er meer EXP per meso mee haalt dan met je huidige wapen, en de horizon loopt tot het volgende
// wapen dat meer schade per milliseconde geeft (weapon attack × multiplier ÷ aanvalstijd).
// Puur, zonder UI-import. Gekozen standaarden (de app toont ze): je stats van nu blijven gelden over de
// hele horizon, alleen de EXP per level verschilt; de verkoopwaarde van je oude claw telt niet mee
// (zo belooft "Kopen" nooit te veel); het huidige level telt vol mee. Je weapon attack komt uit het profiel;
// het scherm "Equip" vult die in als je een claw kiest.
import { ASSUMPTION_VARIANTS } from './best'
import { BOWMAN_WEAPONS } from './bowmanGear'
import { ASSUMPTIONS, type Assumptions } from './calc/mobModel'
import { NPC_CLAWS } from './data/claws'
import { NPC_DAGGERS } from './data/daggers'
import { EXP_TABLE_LEVELS, expToNextLevel } from './data/expTable'
import type { Weapon } from './data/types'
import { byNet, horizonCost, type HorizonScope } from './horizonCost'
import { bestExpPerMeso } from './bestExpPerMeso'
import { MAGICIAN_WEAPONS } from './magicianGear'
import { shortfall, thiefWithDagger, type Profile, type StatNeed } from './profile'
import type { SpotDraft } from './spotDraft'
import { WARRIOR_WEAPONS } from './warriorGear'

const LAST_TABLE_LEVEL = EXP_TABLE_LEVELS[EXP_TABLE_LEVELS.length - 1]

export interface ClawChoice {
  claw: Weapon
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
  claw: Weapon
  /** Per stat wat je tekortkomt, de hoofdstat van je job eerst; nooit leeg. */
  needs: StatNeed[]
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
      winner: Weapon | null
      /** False als een andere claw wint (of geen) zodra één aanname naar de rand gaat. */
      robust: boolean
    }

/** Het profiel met deze claw in je hand (een Warrior-wapen zet ook zijn weapon multiplier). */
export const withClaw = (p: Profile, c: Weapon): Profile => ({
  ...p,
  clawWatk: c.watk,
  attackMs: c.speed.attackMs,
  ...(c.mult !== undefined ? { weaponMult: c.mult } : {}),
})

/** De schade per milliseconde zonder stats: genoeg om te zeggen welk wapen "later" beter is (voor de horizon van een Warrior of Bowman). */
const power = (c: Weapon): number => (c.watk * (c.mult ?? 1)) / c.speed.attackMs

/** Of de Thief van dit profiel een dagger draagt (#170): dan vergelijkt het advies daggers in plaats van claws. */
const withDagger = (p: Profile): boolean => thiefWithDagger(p.job, p.dagger)

/**
 * Of het model een wapen boven een ander zet op meer dan weapon attack: bij wapens met een eigen snelheid (Warrior, Bowman en de
 * daggers van een Thief), niet bij de claws.
 */
const rankedByModel = (p: Profile): boolean => p.job === 'warrior' || p.job === 'bowman' || withDagger(p)

/** De wapenlijst per job met een eigen winkel; de Thief heeft de claws (NPC_CLAWS). Het wapen van een Magician geeft M.ATT in `watk` (zie magicianGear.ts). */
const WEAPONS_BY_JOB: Partial<Record<Profile['job'], readonly Weapon[]>> = { warrior: WARRIOR_WEAPONS, bowman: BOWMAN_WEAPONS, magician: MAGICIAN_WEAPONS }

/** De winkellijst van dit profiel (een Thief met een dagger: de daggers), en of een wapen daarin "beter" is dan een ander (voor de horizon). */
const shopOf = (p: Profile) =>
  rankedByModel(p)
    ? { weapons: withDagger(p) ? NPC_DAGGERS : (WEAPONS_BY_JOB[p.job] ?? []), better: (c: Weapon, than: Weapon) => power(c) > power(than) }
    : { weapons: WEAPONS_BY_JOB[p.job] ?? NPC_CLAWS, better: (c: Weapon, than: Weapon) => c.watk > than.watk }

/** Het eerste wapen van de winkel waar je level nog niet voor volstaat en dat `better` beter vindt; null als er geen meer komt. */
const firstBetterAbove = (profile: Profile, better: (c: Weapon) => boolean): Weapon | null =>
  shopOf(profile).weapons.find((c) => c.level > profile.level && better(c)) ?? null

/** De horizon van een claw: van je level tot net vóór de volgende betere claw, hoogstens de hele tabel. */
function horizon(profile: Profile, claw: Weapon, scope: HorizonScope): { from: number; to: number; truncated: boolean } {
  if (scope === 'this-level') return { from: profile.level, to: profile.level, truncated: false }
  const next = firstBetterAbove(profile, (c) => shopOf(profile).better(c, claw))
  const end = next ? next.level - 1 : Infinity
  return { from: profile.level, to: Math.min(end, LAST_TABLE_LEVEL), truncated: end > LAST_TABLE_LEVEL }
}

/**
 * Het eerstvolgende betere wapen waar je level nog niet voor volstaat. Wat je draagt komt uit het profiel: weapon attack,
 * aanvalstijd en (alleen bij wapens met een multiplier: de Warrior en de daggers van een Thief) de multiplier.
 * Zo kan het advies ook op een level zonder keuze zeggen wanneer er een upgrade komt.
 */
export function nextBetterWeapon(profile: Profile): Weapon | null {
  if (!rankedByModel(profile)) return firstBetterAbove(profile, (c) => c.watk > profile.clawWatk)
  const hasMult = shopOf(profile).weapons.some((c) => c.mult !== undefined)
  const wornPower = (profile.clawWatk * (hasMult ? profile.weaponMult : 1)) / profile.attackMs
  return firstBetterAbove(profile, (c) => power(c) > wornPower)
}

function adviseUnder(drafts: readonly SpotDraft[], profile: Profile, candidates: readonly Weapon[], a: Assumptions, scope: HorizonScope) {
  const baseEpm = bestExpPerMeso(drafts, profile, a)
  if (baseEpm === undefined) return null
  const choices = candidates
    .map((claw): ClawChoice => {
      const h = horizon(profile, claw, scope)
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
 * Thief met een claw is dat meer weapon attack (bij een Magician meer M.ATT); bij een Warrior, een Bowman of een Thief met een dagger meer
 * EXP per meso volgens het model (zie de kop).
 */
function betterClaws(drafts: readonly SpotDraft[], profile: Profile): readonly Weapon[] {
  const inLevel = shopOf(profile).weapons.filter((c) => c.level <= profile.level)
  if (!rankedByModel(profile)) return inLevel.filter((c) => c.watk > profile.clawWatk)
  const base = bestExpPerMeso(drafts, profile, ASSUMPTIONS)
  if (base === undefined) return inLevel
  return inLevel.filter((c) => (bestExpPerMeso(drafts, withClaw(profile, c), ASSUMPTIONS) ?? -Infinity) > base)
}

/** Een wapen met de levels waarover het meetelt: wat Advised in een leeg wapenslot zet (requiredWeapon). */
export type WeaponPick = Pick<ClawChoice, 'claw' | 'from' | 'to' | 'truncated'>

/**
 * Het wapen dat Advised in je hand zet als je wapenslot leeg is (Dave, 7 oktober 2026, #202): er staat altijd een wapen in het advies. De
 * winnaar van het advies; verdient geen wapen zich terug, dan het wapen met de beste netto besparing (het kleinste verlies); vergelijkt het
 * advies geen wapen of valt geen besparing uit te rekenen (het model ziet geen verschil met een lege hand, of rekent niet), dan het goedkoopste wapen uit je winkel dat je kunt
 * dragen, bij gelijke prijs het sterkste. Null als je winkel op je level niets heeft wat je kunt dragen (onder level 10, of te lage stats).
 */
export function requiredWeapon(profile: Profile | null, advice: ClawUpgradeAdvice): WeaponPick | null {
  if (!profile) return null
  // Zonder netto besparing (geen wapen valt uit te rekenen) zegt de volgorde van de keuzes niets: dan het goedkoopste.
  if (advice.kind === 'advice' && advice.choices[0] && advice.choices[0].net !== null) return advice.choices[0]
  const wearable = shopOf(profile).weapons.filter((c) => c.level <= profile.level && shortfall(c, profile).length === 0)
  const pick = [...wearable].sort((a, b) => a.price - b.price || power(b) - power(a))[0]
  return pick ? { claw: pick, ...horizon(profile, pick, 'next-upgrade') } : null
}

export function clawUpgradeAdvice(drafts: readonly SpotDraft[], profile: Profile | null, scope: HorizonScope = 'next-upgrade'): ClawUpgradeAdvice {
  if (!profile || expToNextLevel(profile.level) === undefined) return { kind: 'none' }
  const better = betterClaws(drafts, profile)
  const notWearable = better.map((c): UnwearableClaw => ({ claw: c, needs: shortfall(c, profile) })).filter((u) => u.needs.length > 0)
  const wearable = better.filter((c) => !notWearable.some((u) => u.claw === c))
  const main = adviseUnder(drafts, profile, wearable, ASSUMPTIONS, scope)
  if (!main) return { kind: 'none' }
  const robust = ASSUMPTION_VARIANTS.every((v) => (adviseUnder(drafts, profile, wearable, v, scope)?.winner ?? null) === main.winner)
  return { kind: 'advice', level: profile.level, ...main, notWearable, robust }
}
