import { describe, expect, it } from 'vitest'
import { DOUBLE_STAB_HITS, DOUBLE_STAB_LEVELS, DOUBLE_STAB_WEAPON_MULT } from '../data/thief'
import { beginnerAttack, daggerAttack } from './mobModel'

const c = { str: 4, dex: 25, luk: 40, watk: 28 }

describe('daggerAttack', () => {
  it('Double Stab level 1 (80%, steek 2,0): LUK als hoofdstat, STR + DEX als secundaire, twee klappen en MP van de skill', () => {
    // max = 0,8 x 28 x (1 + (40 x 2,0 + 29) / 100) = 46,816; min = 0,8 x 28 x (0,8 + (40 x 0,08 x 2,0 + 29) / 100) = 25,8496.
    const a = daggerAttack(c, DOUBLE_STAB_WEAPON_MULT, DOUBLE_STAB_LEVELS[0], DOUBLE_STAB_HITS)
    expect(DOUBLE_STAB_LEVELS[0]).toMatchObject({ mp: 8, damagePct: 80 })
    expect(a.max).toBeCloseTo(46.816, 6)
    expect(a.min).toBeCloseTo(25.8496, 6)
    expect(a).toMatchObject({ stars: 2, mpPerAttack: 8 })
  })

  it('de gewone aanval (geen skill, multiplier 1,4): één klap, geen MP', () => {
    // max = 28 x (1 + (40 x 1,4 + 29) / 100) = 51,8; min = 28 x (0,8 + (40 x 0,08 x 1,4 + 29) / 100) = 31,7744.
    const a = daggerAttack(c, 1.4, null, 1)
    expect(a.max).toBeCloseTo(51.8, 6)
    expect(a.min).toBeCloseTo(31.7744, 6)
    expect(a).toMatchObject({ stars: 1, mpPerAttack: 0 })
  })

  it('is dezelfde aanval als de dagger van beginnerAttack', () => {
    expect(daggerAttack(c, 1.4, null, 1)).toEqual(beginnerAttack(c, 1.4, true))
  })

  it('meer LUK, STR of DEX geeft meer schade; de schade schaalt met het skill-percentage', () => {
    const base = daggerAttack(c, 2, DOUBLE_STAB_LEVELS[0], 2)
    for (const more of [{ luk: 50 }, { str: 14 }, { dex: 35 }]) expect(daggerAttack({ ...c, ...more }, 2, DOUBLE_STAB_LEVELS[0], 2).max).toBeGreaterThan(base.max)
    const last = DOUBLE_STAB_LEVELS[DOUBLE_STAB_LEVELS.length - 1]
    expect(daggerAttack(c, 2, last, 2).max / base.max).toBeCloseTo(last.damagePct / 80, 10)
  })
})
