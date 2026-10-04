import { describe, expect, it } from 'vitest'
import type { BestVerdict } from './best'
import { rankSpots, type Spot } from './calc/rankSpots'
import { levelCost } from './levelCost'
import { DEFAULT_PROFILE, parseProfile, type Profile } from './profile'

const parsed = parseProfile(DEFAULT_PROFILE)
if (!('profile' in parsed)) throw new Error('voorbeeldprofiel ongeldig')
const lv = (level: number): Profile => ({ ...parsed.profile, level })

const spot = (id: string, expPerHour: number, potions: number): Spot => ({
  id,
  name: `plek ${id}`,
  expPerHour,
  cost: { potions, ammo: 0, travel: 0 },
})
const verdict = (spots: Spot[], bestId: string | null, robust = true): BestVerdict => ({
  ranked: rankSpots(spots),
  bestId,
  robust,
  excluded: new Map(),
})

describe('levelCost', () => {
  it('rekent de EXP tot het volgende level om naar meso op de beste plek', () => {
    // lv 10 → 11 is 1.716 EXP; plek a geeft 4 EXP per meso, dus 429 meso.
    const v = verdict([spot('a', 40_000, 10_000), spot('b', 30_000, 10_000)], 'a')
    expect(levelCost(lv(10), v)).toEqual({ kind: 'cost', level: 10, expToNext: 1_716, spotName: 'plek a', meso: 429, robust: true })
  })

  it('volgt "Beste", ook als die niet bovenaan de rangschikking staat', () => {
    const v = verdict([spot('a', 40_000, 10_000), spot('b', 30_000, 10_000)], 'b')
    expect(levelCost(lv(10), v)).toMatchObject({ spotName: 'plek b', meso: 572 })
  })

  it('geeft door dat de winnaar van de aannames afhangt', () => {
    const v = verdict([spot('a', 40_000, 10_000), spot('b', 30_000, 10_000)], 'a', false)
    expect(levelCost(lv(10), v)).toMatchObject({ robust: false })
  })

  it('is 0 op een beste plek die niets kost, en null op een beste plek zonder EXP', () => {
    expect(levelCost(lv(20), verdict([spot('a', 5_000, 0), spot('b', 1, 1)], 'a'))).toMatchObject({ expToNext: 20_216, meso: 0 })
    expect(levelCost(lv(20), verdict([spot('a', 0, 10), spot('b', 0, 20)], 'a'))).toMatchObject({ meso: null })
  })

  it('zegt het als er geen profiel is', () => {
    expect(levelCost(null, verdict([], null))).toEqual({ kind: 'noProfile' })
  })

  it('zegt het als het level buiten de EXP-tabel valt', () => {
    expect(levelCost(lv(31), verdict([], null))).toEqual({ kind: 'noTable', level: 31 })
  })

  it('kent de EXP ook onder lv 10 (issue #146)', () => {
    expect(levelCost(lv(9), verdict([], null))).toEqual({ kind: 'noBest', level: 9, expToNext: 1_242 })
  })

  it('zegt het als er geen beste plek is, of als die ongeldig is', () => {
    expect(levelCost(lv(10), verdict([spot('a', 1, 1)], null))).toEqual({ kind: 'noBest', level: 10, expToNext: 1_716 })
    const invalid = verdict([spot('a', Number.NaN, 1), spot('b', 1, 1)], 'a')
    expect(levelCost(lv(10), invalid)).toMatchObject({ kind: 'noBest' })
  })
})
