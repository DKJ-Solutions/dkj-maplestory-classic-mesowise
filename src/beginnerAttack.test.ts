// Onder level 10 slaat een Thief of Bowman als Beginner (issue #171): de gewone aanval van het wapen in zijn hand, zonder
// skill, stars of pijlen. Een Warrior rekende al zo, een Magician heeft dan geen aanval.
import { describe, expect, it } from 'vitest'
import { beginnerAttack, characterAttack } from './calc/mobModel'
import { findKnownSpot } from './data/spots'
import { LUCKY_SEVEN } from './data/thief'
import { applyEquipChange, type EquipEntry } from './equipment'
import type { Job } from './job'
import { attacksAsBeginner, DEFAULT_PROFILE, parseProfile, toCharacter, totalAttack, type Profile, type ProfileDraft } from './profile'
import { hourPlan, statWindowRange, suggestMonsters } from './suggest'

const pick = (name: string): EquipEntry => ({ pick: name, name: '', stat: '' })
const unknown: EquipEntry = { pick: 'unknown', name: '', stat: '' }

/** Een level-9-karakter (geen punten in de skills van de 1e job: die heb je dan nog niet) met dit wapen in de hand. */
function beginner(weapon: string, over: Partial<ProfileDraft> = {}): ProfileDraft {
  const base = { ...DEFAULT_PROFILE, level: '9', luckySeven: '0', energyBolt: '0', ...over }
  return applyEquipChange(base, 'claw', unknown, pick(weapon))
}

function parsed(d: ProfileDraft, job: Job): Profile {
  const r = parseProfile(d, job)
  if (!('profile' in r)) throw new Error(r.error)
  return r.profile
}

const subway = findKnownSpot('kerning-subway-line-1-area-1')!

describe('beginnerAttack: de damage-formule per wapenfamilie', () => {
  it('rekent een zwaard, bijl of stomp met STR als hoofdstat en DEX als secundaire, basis-mastery 0,08', () => {
    // max = 17 x (1 + (20 x 1,8 + 10) / 100) = 24,82; min = 17 x (0,8 + (20 x 0,08 x 1,8 + 10) / 100) = 15,7896.
    const a = beginnerAttack({ str: 20, dex: 10, luk: 5, watk: 17 }, 1.8, false)
    expect(a.max).toBeCloseTo(24.82, 6)
    expect(a.min).toBeCloseTo(15.7896, 6)
    expect(a).toMatchObject({ stars: 1, mpPerAttack: 0 })
  })

  it('rekent een dagger met LUK als hoofdstat en STR + DEX als secundaire', () => {
    // max = 23 x (1 + (30 x 1,4 + 20) / 100) = 37,26; min = 23 x (0,8 + (30 x 0,08 x 1,4 + 20) / 100) = 23,7728.
    const a = beginnerAttack({ str: 10, dex: 10, luk: 30, watk: 23 }, 1.4, true)
    expect(a.max).toBeCloseTo(37.26, 6)
    expect(a.min).toBeCloseTo(23.7728, 6)
  })

  it('laat LUK niets doen bij een zwaard, en STR wel bij een dagger (als secundaire stat)', () => {
    const c = { str: 20, dex: 10, luk: 5, watk: 17 }
    expect(beginnerAttack({ ...c, luk: 50 }, 1.8, false)).toEqual(beginnerAttack(c, 1.8, false))
    expect(beginnerAttack({ ...c, str: 30 }, 1.4, true).max).toBeCloseTo(beginnerAttack(c, 1.4, true).max + 17 * 0.1, 6)
  })
})

describe('attacksAsBeginner', () => {
  it('geldt voor een Thief en een Bowman onder level 10, niet voor een Warrior of Magician', () => {
    expect(attacksAsBeginner('thief', 9)).toBe(true)
    expect(attacksAsBeginner('bowman', 1)).toBe(true)
    expect(attacksAsBeginner('thief', 10)).toBe(false)
    expect(attacksAsBeginner('bowman', 10)).toBe(false)
    expect(attacksAsBeginner('warrior', 9)).toBe(false)
    expect(attacksAsBeginner('magician', 9)).toBe(false)
  })
})

describe('een Thief of Bowman op level 9 met een wapen onder level 10', () => {
  for (const job of ['thief', 'bowman'] as const) {
    it(`${job}: de weapon attack is die van het wapen alleen, zonder stars of pijlen`, () => {
      // Stars of een bronze pijl met weapon attack (de gewone pijl heeft er 0), zodat het verschil zichtbaar is.
      const d = beginner('Sword', { helpfulStranger: '1', bronzeArrows: '1' })
      expect(toCharacter(parsed(d, job)).watk).toBe(17)
      expect(totalAttack(d, job)).toBe(17)
      // Op level 10 telt de munitie weer mee.
      expect(totalAttack({ ...d, level: '10' }, job)).toBeGreaterThan(17)
    })

    it(`${job}: geen munitie en geen MP per kill, dus geen ammokosten`, () => {
      const s = suggestMonsters(parsed(beginner('Sword'), job), subway)
      expect(s.length).toBeGreaterThan(0)
      for (const x of s) {
        expect(x.rechargePerStar).toBe(0)
        expect(x.estimate.mpPerKill).toBe(0)
        expect(hourPlan(x, x.estimate.killsPerHour).ammo).toBe(0)
      }
    })
  }

  it('rekent met de gewone aanval van het wapen: de Attack uit het statvenster is die van beginnerAttack', () => {
    const p = parsed(beginner('Sword', { str: '20', dex: '10' }), 'thief')
    const a = beginnerAttack(toCharacter(p), 1.8, false)
    expect(statWindowRange(p)).toEqual({ min: Math.trunc(a.min), max: Math.trunc(a.max) })
  })

  it('zwaard: meer STR geeft meer schade en meer LUK niet; dagger: meer LUK wel', () => {
    const range = (job: Job, weapon: string, over: Partial<ProfileDraft>) => statWindowRange(parsed(beginner(weapon, over), job))!
    expect(range('thief', 'Sword', { str: '40' }).max).toBeGreaterThan(range('thief', 'Sword', {}).max)
    expect(range('thief', 'Sword', { luk: '60' })).toEqual(range('thief', 'Sword', {}))
    expect(range('bowman', 'Razor', { luk: '60' }).max).toBeGreaterThan(range('bowman', 'Razor', {}).max)
  })

  it('leest multiplier en dagger uit het concept, en valt bij onzin terug op de standaardwaarde', () => {
    const p = parsed({ ...beginner('Razor'), weaponMult: '9', dagger: 'x' }, 'thief')
    expect(p.weaponMult).toBe(Number(DEFAULT_PROFILE.weaponMult))
    expect(p.dagger).toBe(0)
    expect(parsed(beginner('Razor'), 'thief')).toMatchObject({ weaponMult: 1.4, dagger: 1 })
  })
})

describe('wat niet verandert', () => {
  it('een Thief vanaf level 10 rekent weer met zijn claw: LUK als hoofdstat, multiplier 2,5', () => {
    const p = parsed({ ...beginner('Sword'), level: '10' }, 'thief')
    const a = characterAttack(toCharacter(p), null, LUCKY_SEVEN)
    expect(statWindowRange(p)).toEqual({ min: Math.trunc(a.min), max: Math.trunc(a.max) })
  })

  it('een Warrior op level 9 rekent zoals voorheen; zijn gewone aanval is al die van een Beginner', () => {
    const p = parsed(beginner('Sword', { str: '20', dex: '10' }), 'warrior')
    const a = beginnerAttack(toCharacter(p), 1.8, false)
    expect(statWindowRange(p)).toEqual({ min: Math.trunc(a.min), max: Math.trunc(a.max) })
  })
})
