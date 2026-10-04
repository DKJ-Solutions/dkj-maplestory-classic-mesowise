// Wat een skill aan je totalen verandert (Dave, 4 oktober 2026, issue #139): DEF, accuracy, evasion, Max HP en crit,
// per skill-level. Puur, zonder UI-import. Alle getallen komen uit de data van elke job, met hun bron daar.
//
// Twee soorten, en het verschil telt:
// - Een passief (Nimble Body, Precise Strikes, Max HP Increase) zit al in je statvenster, dus al in de totalen van
//   je profiel. Het advies telt een punt erbij op (plusOne in skillPoint.ts); hier telt hij niet nog een keer.
// - Een buff (Iron Body, Magic Armor, Focus) staat niet in het profiel: dat vul je in zonder buff. Het model neemt
//   aan dat je hem de hele tijd aanhoudt (Dave, #139) en telt dus zijn stat erbij én de MP om hem aan te houden.
import { FOCUS_LEVELS, CRITICAL_SHOT } from './data/bowman'
import { MAGIC_ARMOR_LEVELS, MAX_MP_INCREASE } from './data/magician'
import type { SkillKey } from './data/skills'
import { NIMBLE_BODY } from './data/thief'
import { IRON_BODY_LEVELS, MAX_HP_INCREASE, PRECISE_STRIKES_LEVELS } from './data/warrior'
import type { Profile } from './profile'

/** Wat een buff op dit level geeft; undefined op level 0 (niet geleerd) of buiten de tabel. */
const at = <T>(levels: readonly T[], level: number): T | undefined => (level >= 1 ? levels[level - 1] : undefined)

/** De WDEF die Iron Body bovenop deze WDEF geeft: een procent ervan, naar beneden afgerond. */
export const ironBodyDef = (wdef: number, level: number): number => Math.floor((wdef * (at(IRON_BODY_LEVELS, level)?.wdefPct ?? 0)) / 100)

/** Wat de buffs van het profiel samen geven, als ze de hele tijd aan staan. */
export interface BuffBonus {
  wdef: number
  accuracy: number
  avoid: number
  /** De MP per uur om ze aan te houden: MP per cast maal het aantal casts per uur. */
  mpPerHour: number
}

/** De MP per uur om een buff met deze kosten en duur aan te houden. */
const upkeep = (b: { mp: number; seconds: number } | undefined): number => (b ? (b.mp * 3600) / b.seconds : 0)

/**
 * De buffs van het profiel (Iron Body, Magic Armor, Focus) als ze de hele tijd aan staan. Iron Body telt als procent
 * van de WDEF uit je statvenster; Magic Armor als vast getal; Focus als accuracy en evasion.
 */
export function buffBonus(p: Profile): BuffBonus {
  const iron = at(IRON_BODY_LEVELS, p.ironBody)
  const armor = at(MAGIC_ARMOR_LEVELS, p.magicArmor)
  const focus = at(FOCUS_LEVELS, p.focus)
  return {
    wdef: ironBodyDef(p.wdef, p.ironBody) + (armor?.def ?? 0),
    accuracy: focus?.accuracy ?? 0,
    avoid: focus?.evasion ?? 0,
    mpPerHour: upkeep(iron) + upkeep(armor) + upkeep(focus),
  }
}

/**
 * Wat een skill op dit level aan je totalen geeft, als tekst voor de sectie "Skillpoints"; null als de skill geen
 * total verandert (een aanval, of een effect dat geen stat is) of het level 0 is. `wdef` is de DEF uit je profiel: Iron
 * Body geeft een procent ervan, dus zonder geldige DEF noemt de tekst alleen het procent.
 */
export function skillEffectText(key: SkillKey, level: number, wdef: number | null): string | null {
  if (level < 1) return null
  switch (key) {
    case 'nimbleBody':
      return level > NIMBLE_BODY.maxLevel ? null : `+${level * NIMBLE_BODY.accuracyPerLevel} Accuracy, +${level * NIMBLE_BODY.avoidPerLevel} Evasion`
    case 'preciseStrikes': {
      const l = at(PRECISE_STRIKES_LEVELS, level)
      return l ? `+${l.accuracy} Accuracy, +${l.critPct}% Crit. Rate` : null
    }
    case 'maxHpIncrease': {
      const pct = at(MAX_HP_INCREASE.maxHpPct, level)
      return pct === undefined ? null : `+${pct}% Max HP`
    }
    case 'ironBody': {
      const l = at(IRON_BODY_LEVELS, level)
      if (!l) return null
      return wdef === null ? `+${l.wdefPct}% DEF` : `+${ironBodyDef(wdef, level)} DEF (${l.wdefPct}%)`
    }
    case 'magicArmor': {
      const l = at(MAGIC_ARMOR_LEVELS, level)
      return l ? `+${l.def} DEF en Magic Def` : null
    }
    case 'focus': {
      const l = at(FOCUS_LEVELS, level)
      return l ? `+${l.accuracy} Accuracy, +${l.evasion} Evasion` : null
    }
    case 'criticalShot': {
      const pct = at(CRITICAL_SHOT.critPct, level)
      return pct === undefined ? null : `+${pct}% Crit. Rate`
    }
    case 'maxMpIncrease': {
      const pct = at(MAX_MP_INCREASE.maxMpPct, level)
      return pct === undefined ? null : `+${pct}% Max MP`
    }
    default:
      return null
  }
}

/** Max HP na een punt in Max HP Increase: de basis (je Max HP zonder de skill) maal het nieuwe procent, naar beneden afgerond. */
export function maxHpAfterPoint(hp: number, from: number): number {
  const pct = (level: number) => at(MAX_HP_INCREASE.maxHpPct, level) ?? 0
  return Math.floor((hp * (100 + pct(from + 1))) / (100 + pct(from)))
}
