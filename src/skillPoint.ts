// Waar je skillpunt de meeste mesos bespaart (Dave, 3 oktober 2026, issue #26). Een punt kost niets,
// dus de vraag is niet óf, maar in welke skill: per skill die het mob-model kan doorrekenen het profiel
// met één punt erbij, en de mesokosten van de horizon (hieronder) op de beste plek. Puur, zonder UI-import.
// Staat er nog een punt open, dan is "niet zetten" geen antwoord: het punt moet ergens heen, ook als geen skill iets bespaart.
// Een punt blijft voor altijd staan, dus de besparing telt over een vaste horizon van 5 levels: je huidige plus de 4 erna
// (Dave, 4 oktober 2026, issue #145), opgeteld zoals horizonCost dat voor de upgrades doet. Elk level van de horizon wordt op dat
// level doorgerekend (het mob-model kent het levelverschil met het monster), met je andere stats van nu: zo kan een punt dat nu
// weinig scheelt later een klap per kill schelen. Niet langer, want elk level geeft 3 nieuwe punten die een voorsprong alsnog
// kunnen inhalen; eindigt de EXP-tabel eerder, dan stopt de horizon daar.
// De Warrior (issue #42): Power Strike, Precise Strikes, Improved HP Recovery, Max HP Increase en Iron Body; de Bowman (issue #44):
// Arrow Blow en Focus; de Magician (issue #43): Energy Bolt, Magic Claw, Improved MP Recovery en Magic Armor (de Recovery-skills
// sinds issue #141, Max HP Increase en de buffs sinds issue #139). De Thief met een dagger (issue #170): Double Stab in plaats van
// Lucky Seven, die met een dagger niets doet (en Double Stab met een claw).
import { ASSUMPTION_VARIANTS } from './best'
import { ASSUMPTIONS, type Assumptions } from './calc/mobModel'
import { EXP_TABLE_LEVELS, expToNextLevel } from './data/expTable'
import { ALL_SKILLS, THIEF_SKILLS, type SkillInfo, type SkillKey } from './data/skills'
import { skillPointCap, skillPoolOf, type SkillPool } from './data/skillPoints'
import {
  ENERGY_BOLT_LEVELS,
  IMPROVED_MP_RECOVERY,
  MAGIC_ARMOR_LEVELS,
  MAGIC_ARMOR_REQUIRES_MAGIC_GUARD,
  MAGIC_CLAW_LEVELS,
  MAGIC_CLAW_REQUIRES_ENERGY_BOLT,
} from './data/magician'
import { DOUBLE_STAB_LEVELS, LUCKY_SEVEN_LEVELS, NIMBLE_BODY } from './data/thief'
import { ARROW_BLOW_LEVELS, FOCUS_LEVELS, FOCUS_REQUIRES_EYE_OF_AMAZON } from './data/bowman'
import {
  IMPROVED_HP_RECOVERY,
  IRON_BODY_LEVELS,
  IRON_BODY_REQUIRES_MAX_HP_INCREASE,
  MAX_HP_INCREASE,
  MAX_HP_INCREASE_REQUIRES_IMPROVED_HP_RECOVERY,
  POWER_STRIKE_LEVELS,
  PRECISE_STRIKES_LEVELS,
} from './data/warrior'
import type { Job } from './job'
import { horizonCost } from './horizonCost'
import { bestExpPerMeso } from './bestExpPerMeso'
import { profileFieldsFor, skillPointsLeft, STAT_FIELDS, type Profile, type ProfileDraft } from './profile'
import { maxHpAfterPoint, maxHpBeforePoint } from './skillEffects'
import type { SpotDraft } from './spotDraft'

const LEVEL_FIELD = STAT_FIELDS.find((f) => f.key === 'level')!

/** Over hoeveel levels een skillpunt telt: je huidige plus de 4 erna (issue #145). */
export const SKILL_HORIZON_LEVELS = 5

const LAST_TABLE_LEVEL = EXP_TABLE_LEVELS[EXP_TABLE_LEVELS.length - 1]

/** De horizon van een skillpunt: van je level tot 4 levels verder, hoogstens tot het eind van de EXP-tabel. */
export function skillHorizon(level: number): { from: number; to: number; truncated: boolean } {
  const end = level + SKILL_HORIZON_LEVELS - 1
  return { from: level, to: Math.min(end, LAST_TABLE_LEVEL), truncated: end > LAST_TABLE_LEVEL }
}

/** De skills die het mob-model kan doorrekenen. */
export type SkillId = Extract<
  SkillKey,
  | 'luckySeven'
  | 'doubleStab'
  | 'nimbleBody'
  | 'powerStrike'
  | 'preciseStrikes'
  | 'improvedHpRecovery'
  | 'maxHpIncrease'
  | 'ironBody'
  | 'arrowBlow'
  | 'focus'
  | 'energyBolt'
  | 'magicClaw'
  | 'improvedMpRecovery'
  | 'magicArmor'
>

interface Skill {
  id: SkillId
  name: string
  max: number
  level: (p: Profile) => number
  /** Het profiel met één punt erbij in deze skill. */
  plusOne: (p: Profile) => Profile
  /** Het profiel met één punt minder in deze skill: het omgekeerde van plusOne (bij Max HP Increase bij benadering, zie maxHpBeforePoint). */
  minusOne: (p: Profile) => Profile
  /** Of het skill-level dat deze skill vraagt gehaald is (los van of je hem al hebt); zonder dit altijd. */
  prereq?: (p: Profile) => boolean
  /** Of je de skill nu kunt leren (een skill die een ander skill-level vraagt); zonder dit altijd. */
  learnable?: (p: Profile) => boolean
}

/** Eén punt minder in een skill die alleen zijn eigen level in het profiel zet. */
const levelDown = (key: SkillId) => (p: Profile): Profile => ({ ...p, [key]: (p[key] as number) - 1 })

/** De velden `prereq` en `learnable` van een skill die het level van een andere skill vraagt: eenmaal geleerd, blijft hij leerbaar. */
const dependent = (own: (p: Profile) => number, prereq: (p: Profile) => boolean) => ({
  prereq,
  learnable: (p: Profile) => own(p) > 0 || prereq(p),
})

const NIMBLE_BODY_SKILL: Skill = {
    id: 'nimbleBody',
    name: 'Nimble Body',
    max: NIMBLE_BODY.maxLevel,
    level: (p) => p.nimbleBody,
    // Accuracy en avoid in het profiel zijn de totalen uit je statvenster, met Nimble Body erin.
    plusOne: (p) => ({
      ...p,
      nimbleBody: p.nimbleBody + 1,
      accuracy: p.accuracy + NIMBLE_BODY.accuracyPerLevel,
      avoid: p.avoid + NIMBLE_BODY.avoidPerLevel,
    }),
    minusOne: (p) => ({
      ...p,
      nimbleBody: p.nimbleBody - 1,
      accuracy: p.accuracy - NIMBLE_BODY.accuracyPerLevel,
      avoid: p.avoid - NIMBLE_BODY.avoidPerLevel,
    }),
}

/** De skills van de 1e job van een Thief met een claw die het model kan doorrekenen. */
export const SKILLS: readonly Skill[] = [
  {
    id: 'luckySeven',
    name: 'Lucky Seven',
    max: LUCKY_SEVEN_LEVELS.length,
    level: (p) => p.luckySeven,
    plusOne: (p) => ({ ...p, luckySeven: p.luckySeven + 1 }),
    minusOne: levelDown('luckySeven'),
  },
  NIMBLE_BODY_SKILL,
]

/** De skills van de 1e job van een Thief met een dagger (#170): Double Stab is zijn aanval, Lucky Seven gooit stars en doet met een dagger niets. */
export const DAGGER_SKILLS: readonly Skill[] = [
  {
    id: 'doubleStab',
    name: 'Double Stab',
    max: DOUBLE_STAB_LEVELS.length,
    level: (p) => p.doubleStab,
    plusOne: (p) => ({ ...p, doubleStab: p.doubleStab + 1 }),
    minusOne: levelDown('doubleStab'),
  },
  NIMBLE_BODY_SKILL,
]

/** De accuracy die Precise Strikes op dit level geeft (0 op level 0). */
const preciseAccuracy = (level: number): number => PRECISE_STRIKES_LEVELS[level - 1]?.accuracy ?? 0

/**
 * De skills van de 1e job van een Warrior die het model kan doorrekenen. Power Strike telt als de aanval van
 * elke klap. Van Precise Strikes telt alleen de accuracy; de extra kans op een critical hit niet, want de
 * damage-gids noemt geen schade voor een crit (de voorzichtige keuze: het punt lijkt dan minder waard dan het is).
 * Van Improved HP Recovery telt het extra herstel van potions (suggest.ts, potionFactorOf); het herstel per 10 seconden niet.
 * Max HP Increase telt als Max HP en bepaalt zo of één tik gevaarlijk is, Iron Body als DEF met de MP om hem aan te houden (issue #139).
 */
export const WARRIOR_MODELLED: readonly Skill[] = [
  {
    id: 'powerStrike',
    name: 'Power Strike',
    max: POWER_STRIKE_LEVELS.length,
    level: (p) => p.powerStrike,
    plusOne: (p) => ({ ...p, powerStrike: p.powerStrike + 1 }),
    minusOne: levelDown('powerStrike'),
  },
  {
    id: 'preciseStrikes',
    name: 'Precise Strikes',
    max: PRECISE_STRIKES_LEVELS.length,
    level: (p) => p.preciseStrikes,
    // De accuracy in het profiel is het totaal uit je statvenster, met Precise Strikes erin.
    plusOne: (p) => ({
      ...p,
      preciseStrikes: p.preciseStrikes + 1,
      accuracy: p.accuracy + preciseAccuracy(p.preciseStrikes + 1) - preciseAccuracy(p.preciseStrikes),
    }),
    minusOne: (p) => ({
      ...p,
      preciseStrikes: p.preciseStrikes - 1,
      accuracy: p.accuracy - (preciseAccuracy(p.preciseStrikes) - preciseAccuracy(p.preciseStrikes - 1)),
    }),
  },
  {
    id: 'improvedHpRecovery',
    name: 'Improved HP Recovery',
    max: IMPROVED_HP_RECOVERY.itemRecoveryPct.length,
    level: (p) => p.improvedHpRecovery,
    plusOne: (p) => ({ ...p, improvedHpRecovery: p.improvedHpRecovery + 1 }),
    minusOne: levelDown('improvedHpRecovery'),
  },
  {
    id: 'maxHpIncrease',
    name: 'Max HP Increase',
    max: MAX_HP_INCREASE.maxHpPct.length,
    level: (p) => p.maxHpIncrease,
    // De Max HP in het profiel is het totaal uit je statvenster, met Max HP Increase erin.
    plusOne: (p) => ({ ...p, maxHpIncrease: p.maxHpIncrease + 1, hp: maxHpAfterPoint(p.hp, p.maxHpIncrease) }),
    minusOne: (p) => ({ ...p, maxHpIncrease: p.maxHpIncrease - 1, hp: maxHpBeforePoint(p.hp, p.maxHpIncrease) }),
    ...dependent((p) => p.maxHpIncrease, (p) => p.improvedHpRecovery >= MAX_HP_INCREASE_REQUIRES_IMPROVED_HP_RECOVERY),
  },
  {
    id: 'ironBody',
    name: 'Iron Body',
    max: IRON_BODY_LEVELS.length,
    level: (p) => p.ironBody,
    // Een buff staat niet in het profiel: toCharacter telt hem erbij (buffBonus in skillEffects.ts).
    plusOne: (p) => ({ ...p, ironBody: p.ironBody + 1 }),
    minusOne: levelDown('ironBody'),
    ...dependent((p) => p.ironBody, (p) => p.maxHpIncrease >= IRON_BODY_REQUIRES_MAX_HP_INCREASE),
  },
]

/**
 * De skills van de 1e job van een Magician die het model kan doorrekenen: de twee spreuken. Elk punt verandert de schade (en de
 * spell mastery, de MP per cast) van die spreuk; het model kiest per monster de spreuk met de meeste EXP per meso (zie suggest.ts). Magic Claw vraagt Energy Bolt 1.
 * Van Improved MP Recovery telt het extra herstel van potions (suggest.ts, potionFactorOf); het herstel per 10 seconden niet.
 * Magic Armor telt als DEF met de MP om hem aan te houden (issue #139); hij vraagt Magic Guard 3.
 */
export const MAGICIAN_MODELLED: readonly Skill[] = [
  {
    id: 'energyBolt',
    name: 'Energy Bolt',
    max: ENERGY_BOLT_LEVELS.length,
    level: (p) => p.energyBolt,
    plusOne: (p) => ({ ...p, energyBolt: p.energyBolt + 1 }),
    minusOne: levelDown('energyBolt'),
  },
  {
    id: 'magicClaw',
    name: 'Magic Claw',
    max: MAGIC_CLAW_LEVELS.length,
    level: (p) => p.magicClaw,
    plusOne: (p) => ({ ...p, magicClaw: p.magicClaw + 1 }),
    minusOne: levelDown('magicClaw'),
    ...dependent((p) => p.magicClaw, (p) => p.energyBolt >= MAGIC_CLAW_REQUIRES_ENERGY_BOLT),
  },
  {
    id: 'improvedMpRecovery',
    name: 'Improved MP Recovery',
    max: IMPROVED_MP_RECOVERY.itemRecoveryPct.length,
    level: (p) => p.improvedMpRecovery,
    plusOne: (p) => ({ ...p, improvedMpRecovery: p.improvedMpRecovery + 1 }),
    minusOne: levelDown('improvedMpRecovery'),
  },
  {
    id: 'magicArmor',
    name: 'Magic Armor',
    max: MAGIC_ARMOR_LEVELS.length,
    level: (p) => p.magicArmor,
    plusOne: (p) => ({ ...p, magicArmor: p.magicArmor + 1 }),
    minusOne: levelDown('magicArmor'),
    ...dependent((p) => p.magicArmor, (p) => p.magicGuard >= MAGIC_ARMOR_REQUIRES_MAGIC_GUARD),
  },
]

/**
 * De skills van de 1e job van een Bowman die het model kan doorrekenen: Arrow Blow, de aanval van elk schot (1 klap, 1 pijl), en
 * Focus, als accuracy en evasion met de MP om hem aan te houden (issue #139); Focus vraagt The Eye of Amazon 3. De andere drie
 * tellen niet mee, zie BOWMAN_NOT_MODELLED.
 */
export const BOWMAN_MODELLED: readonly Skill[] = [
  {
    id: 'arrowBlow',
    name: 'Arrow Blow',
    max: ARROW_BLOW_LEVELS.length,
    level: (p) => p.arrowBlow,
    plusOne: (p) => ({ ...p, arrowBlow: p.arrowBlow + 1 }),
    minusOne: levelDown('arrowBlow'),
  },
  {
    id: 'focus',
    name: 'Focus',
    max: FOCUS_LEVELS.length,
    level: (p) => p.focus,
    plusOne: (p) => ({ ...p, focus: p.focus + 1 }),
    minusOne: levelDown('focus'),
    ...dependent((p) => p.focus, (p) => p.eyeOfAmazon >= FOCUS_REQUIRES_EYE_OF_AMAZON),
  },
]

const MODELLED: Partial<Record<Job, readonly Skill[]>> = { warrior: WARRIOR_MODELLED, bowman: BOWMAN_MODELLED, magician: MAGICIAN_MODELLED }

/** De skills die het model voor deze job kan doorrekenen; bij een Thief hangt dat af van zijn wapen (`dagger`, #170). */
export const skillsOf = (job: Job, dagger = false): readonly Skill[] => MODELLED[job] ?? (job === 'thief' && dagger ? DAGGER_SKILLS : SKILLS)

/** De skills die het model voor dit profiel kan doorrekenen (een Thief met een dagger heeft Double Stab). */
const skillsFor = (p: Profile): readonly Skill[] => skillsOf(p.job, p.dagger === 1)

const notIn = (skills: readonly Skill[]): readonly string[] =>
  THIEF_SKILLS.filter((s) => s.job === 'Thief' && !skills.some((m) => m.id === s.key)).map((s) => s.name)

/** De andere skills van de 1e job van een Thief met een claw: het model rekent ze niet door, dus de app noemt ze. */
export const NOT_MODELLED: readonly string[] = notIn(SKILLS)

/** Hetzelfde voor een Thief met een dagger: daar telt Lucky Seven niet, Double Stab wel. */
export const DAGGER_NOT_MODELLED: readonly string[] = notIn(DAGGER_SKILLS)

/**
 * Wat het model van een Warrior niet kan doorrekenen, met de reden. Slash Blast raakt tot 4 monsters, en hoeveel
 * monsters er bij je staan is nergens gemeten; op één monster is hij zwakker dan Power Strike en kost hij HP.
 */
export const WARRIOR_NOT_MODELLED: readonly string[] = ['Slash Blast']

/**
 * Wat het model van een Magician niet kan doorrekenen, met de reden. Magic Guard zet een deel van de schade om in MP-verlies;
 * het model kent geen schade die naar MP gaat. Max MP Increase werkt op Max MP, en de berekening gebruikt Max MP niet (Total stats toont hem).
 */
export const MAGICIAN_NOT_MODELLED: readonly string[] = ['Magic Guard', 'Max MP Increase']

/**
 * Wat het model van een Bowman niet kan doorrekenen, met de reden. Double Shot raakt tot 2 monsters met 1 klap per monster,
 * en hoeveel monsters er bij je staan is nergens gemeten; op één monster is hij zwakker dan Arrow Blow en kost hij 2 pijlen
 * en meer MP. Critical Shot geeft een kans op een critical en "extra critical-schade"; de damage-gids noemt geen schade
 * voor een crit. The Eye of Amazon geeft alleen bereik.
 */
export const BOWMAN_NOT_MODELLED: readonly string[] = ['Double Shot', 'Critical Shot', 'The Eye of Amazon']

const NOT_MODELLED_BY_JOB: Partial<Record<Job, readonly string[]>> = { warrior: WARRIOR_NOT_MODELLED, bowman: BOWMAN_NOT_MODELLED, magician: MAGICIAN_NOT_MODELLED }

/** De skills van deze job (bij een Thief: met dit wapen) die het model niet doorrekent. */
export const notModelled = (job: Job, dagger = false): readonly string[] =>
  NOT_MODELLED_BY_JOB[job] ?? (job === 'thief' && dagger ? DAGGER_NOT_MODELLED : NOT_MODELLED)

/** Een skill zoals de speler hem nu heeft gezet; `level` is null als het veld geen geldig skill-level is. */
export interface SkillLevel extends SkillInfo {
  level: number | null
}

/**
 * De skillpunten die de speler nu heeft gezet, voor elke skill van een Thief tot de 2e job. Leest het
 * profiel zoals ingevuld, zodat de sectie ook klopt als een ander veld nog niet goed is.
 */
export function skillLevels(draft: ProfileDraft, skills: readonly SkillInfo[] = THIEF_SKILLS): SkillLevel[] {
  return skills.map((s) => {
    const text = draft[s.key].trim()
    const n = text === '' ? NaN : Number(text)
    const valid = Number.isInteger(n) && n >= 0 && n <= s.max
    return { ...s, level: valid ? n : null }
  })
}

/**
 * Een skillveld na een tik op − of +: één level lager of hoger, binnen 0 en het maximum. Een veld dat geen
 * heel getal is (leeg of half getypt), telt als 0; boven het maximum telt als het maximum.
 */
export function stepSkill(text: string, delta: -1 | 1, max: number): string {
  const n = Number(text.trim())
  const from = text.trim() !== '' && Number.isInteger(n) ? Math.min(Math.max(n, 0), max) : 0
  return String(Math.min(Math.max(from + delta, 0), max))
}

/**
 * De mesokosten van de horizon (skillHorizon): per level de kosten op de beste plek van dat level, met je andere stats van nu.
 * Undefined als er op een level niets uit te rekenen valt, null als een level onhaalbaar is.
 */
function mesoCost(drafts: readonly SpotDraft[], profile: Profile, a: Assumptions): number | null | undefined {
  if (expToNextLevel(profile.level) === undefined) return undefined
  const { from, to } = skillHorizon(profile.level)
  return horizonCost(from, to, (level) => bestExpPerMeso(drafts, { ...profile, level }, a))
}

export interface SkillChoice {
  id: SkillId
  name: string
  /** Het skill-level na het punt. */
  to: number
  /** De mesokosten van de horizon met het punt erbij, of null als dat niet uit te rekenen valt. */
  meso: number | null
  /** Hoeveel meso het punt over de horizon bespaart (0 of negatief: niets), of null zonder kosten. */
  saving: number | null
}

/** Zonder punt over: zit je verdeling goed, of had één punt in skill B in plaats van in skill A de kosten van de horizon verlaagd? */
export type SkillMove = { from: string; to: string; saving: number }
export type SkillPlacement = { kind: 'good'; /** De beste andere verplaatsing van één punt (besparing 0 of negatief), als de app er een kon doorrekenen. */ closest: SkillMove | null } | { kind: 'better'; from: string; to: string; saving: number }

export type SkillPointAdvice =
  /** De kosten van de horizon zijn niet uit te rekenen (geen profiel, buiten de tabel, geen "Beste"). */
  | { kind: 'none' }
  | {
      kind: 'advice'
      /** Het eerste en het laatste level van de horizon, en of de EXP-tabel hem afkapt (skillHorizon). */
      from: number
      to: number
      truncated: boolean
      /** De mesokosten van de horizon zonder het punt. */
      base: number
      /** Per skill die nog omhoog kan, van meeste naar minste besparing. */
      choices: SkillChoice[]
      /** Hoeveel skillpunten van de 1e job je op dit level nog hebt; bij 0 is er niets te kiezen. */
      left: number
      /** De namen van de skills die al op het maximum staan. */
      maxed: string[]
      /**
       * De skill met de grootste besparing, ook als die 0 of negatief is (het punt moet toch ergens heen: de skill met de
       * minste extra kosten wint). Null alleen als er geen punt over is, geen skill om te kiezen, of geen skill uit te rekenen is.
       */
      winner: SkillId | null
      /** Alleen bij left === 0: of een ander punt beter was; null als er geen punt te verplaatsen valt of niets uit te rekenen is. */
      placement: SkillPlacement | null
      /** False als een andere skill wint (of geen) zodra één aanname naar de rand gaat. */
      robust: boolean
    }

/** Een verschil onder een halve meso is afrondruis: gelijke skills tonen dan allemaal 0 in plaats van "minder dan 1 meso". */
const snapSaving = (x: number) => (Math.abs(x) < 0.5 ? 0 : x)

const bySaving = (a: SkillChoice, b: SkillChoice) => (b.saving ?? -Infinity) - (a.saving ?? -Infinity)

/**
 * Zonder punt over: de beste verplaatsing van één punt van een skill A met een punt (zodat de skills die A vragen
 * geldig blijven) naar een andere skill B die op het kleinere profiel leerbaar is en onder het maximum zit. Skills waarvan het
 * model niets weet (Eye of Amazon, Magic Guard) blijven zoals ze zijn. Null als er geen verplaatsing is die de app kan doorrekenen.
 */
function placementUnder(drafts: readonly SpotDraft[], profile: Profile, a: Assumptions, base: number): SkillPlacement | null {
  const skills = skillsFor(profile)
  let best: SkillMove | null = null
  let closest: SkillMove | null = null
  for (const from of skills) {
    if (from.level(profile) < 1) continue
    const reduced = from.minusOne(profile)
    if (!skills.every((s) => s.level(reduced) === 0 || (s.prereq?.(reduced) ?? true))) continue
    for (const to of skills) {
      if (to === from || to.level(reduced) >= to.max || !(to.learnable?.(reduced) ?? true)) continue
      const meso = mesoCost(drafts, to.plusOne(reduced), a)
      if (typeof meso !== 'number') continue
      const saving = snapSaving(base - meso)
      const move = { from: from.name, to: to.name, saving }
      if (saving > 0 && (best === null || saving > best.saving)) best = move
      if (closest === null || saving > closest.saving) closest = move
    }
  }
  return best ? { kind: 'better', ...best } : closest ? { kind: 'good', closest } : null
}

function adviseUnder(drafts: readonly SpotDraft[], profile: Profile, a: Assumptions) {
  const base = mesoCost(drafts, profile, a)
  if (typeof base !== 'number') return null
  // De modelleerbare skills zijn allemaal van de 1e job: zonder punt over in die pot is er niets te kiezen.
  const left = skillPointsLeft(profile, 'job')
  const choices = skillsFor(profile)
    .filter((s) => left > 0 && s.level(profile) < s.max && (s.learnable?.(profile) ?? true))
    .map((s): SkillChoice => {
      const meso = mesoCost(drafts, s.plusOne(profile), a)
      const known = typeof meso === 'number'
      return { id: s.id, name: s.name, to: s.level(profile) + 1, meso: known ? meso : null, saving: known ? snapSaving(base - meso) : null }
    })
    .sort(bySaving)
  // Gesorteerd van meeste naar minste besparing, en niet-uit-te-rekenen skills staan achteraan: de eerste is de beste.
  const top = choices[0]
  const winner = left > 0 && top && top.saving !== null ? top.id : null
  const placement = left === 0 ? placementUnder(drafts, profile, a, base) : null
  return { base, choices, winner, left, placement }
}

/**
 * Het punt dat skillPointAdvice zou zetten (de `winner`), zonder de robuust-controle onder de aanname-varianten: de goedkope vorm voor wie
 * veel punten achter elkaar moet plaatsen (growth.ts, Dave, 7 oktober 2026). Null als er geen punt over is of niets uit te rekenen valt.
 */
export function skillPointWinner(drafts: readonly SpotDraft[], profile: Profile): SkillId | null {
  return adviseUnder(drafts, profile, ASSUMPTIONS)?.winner ?? null
}

/** De skillpunten van een pot zoals de speler ze nu heeft gezet, tegenover wat zijn level hem geeft; `cap` is null als het level geen geldig getal is. */
export function skillPoolUsage(draft: ProfileDraft, job: Job, pool: SkillPool): { spent: number; cap: number | null } {
  const shown = profileFieldsFor(job).map((f) => f.key)
  const spent = skillLevels(draft, ALL_SKILLS)
    .filter((s) => shown.includes(s.key) && skillPoolOf(s.job) === pool)
    .reduce((sum, s) => sum + (s.level ?? 0), 0)
  const text = draft.level.trim()
  const level = text === '' ? NaN : Number(text)
  const valid = Number.isInteger(level) && level >= LEVEL_FIELD.min && level <= LEVEL_FIELD.max
  return { spent, cap: valid ? skillPointCap(level, pool) : null }
}

/** Of twee uitkomsten van de plaatsing hetzelfde zeggen: dezelfde soort, en bij 'better' dezelfde skills. */
const samePlacement = (a: SkillPlacement | null, b: SkillPlacement | null): boolean =>
  a === null || b === null ? a === b : a.kind === b.kind && (a.kind !== 'better' || (b.kind === 'better' && a.from === b.from && a.to === b.to))

export function skillPointAdvice(drafts: readonly SpotDraft[], profile: Profile | null): SkillPointAdvice {
  if (!profile) return { kind: 'none' }
  const main = adviseUnder(drafts, profile, ASSUMPTIONS)
  if (!main) return { kind: 'none' }
  // Robuust: onder elke variant ligt de besparing van de hoofdwinnaar binnen een halve meso van de beste (gelijkspel telt mee).
  const robust = ASSUMPTION_VARIANTS.every((a) => {
    const v = adviseUnder(drafts, profile, a)
    if (main.winner === null) return (v?.winner ?? null) === null && samePlacement(main.placement, v?.placement ?? null)
    const mine = v?.choices.find((c) => c.id === main.winner)?.saving
    const best = v?.choices[0]?.saving
    return typeof mine === 'number' && typeof best === 'number' && best - mine <= 0.5
  })
  const maxed = skillsFor(profile).filter((s) => s.level(profile) >= s.max).map((s) => s.name)
  return { kind: 'advice', ...skillHorizon(profile.level), ...main, maxed, robust }
}
