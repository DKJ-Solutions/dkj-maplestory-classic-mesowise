import { describe, expect, it } from 'vitest'
import type { BestVerdict } from './best'
import type { RankResult } from './calc/rankSpots'
import { expToNextLevel } from './data/expTable'
import { LUCKY_SEVEN_LEVELS, NIMBLE_BODY } from './data/thief'
import {
  applyLevelUp,
  applySkillPoint,
  bestSpotOf,
  CHECK_FIELDS,
  huntingGroundAdvice,
  luckySevenMp,
} from './levelUp'
import { DEFAULT_PROFILE, parseProfile, PROFILE_FIELDS, type Profile } from './profile'

const parsed = parseProfile(DEFAULT_PROFILE)
if (!('profile' in parsed)) throw new Error('voorbeeldprofiel ongeldig')
const profile: Profile = parsed.profile

const cost = { potions: 0, ammo: 0, travel: 0 }
const spot = (id: string, name = id) => ({ id, name, expPerHour: 1, cost })
const ok = (id: string, expPerMeso: number, name?: string): RankResult => ({ spot: spot(id, name), expPerMeso })
const bad = (id: string, name?: string): RankResult => ({ spot: spot(id, name), error: 'Deze invoer klopt niet.' })
const verdict = (ranked: RankResult[], bestId: string | null): BestVerdict => ({
  ranked,
  bestId,
  robust: true,
  excluded: new Map(),
})

describe('applyLevelUp', () => {
  it('zet het level er één bij, als tekst, en laat de rest staan', () => {
    expect(applyLevelUp(DEFAULT_PROFILE)).toEqual({ ...DEFAULT_PROFILE, level: '11' })
    expect(applyLevelUp({ ...DEFAULT_PROFILE, level: ' 42 ' }).level).toBe('43')
    expect(applyLevelUp({ ...DEFAULT_PROFILE, level: '199' }).level).toBe('200')
  })

  it('laat het profiel zoals het was bij een leeg of geen heel level', () => {
    for (const level of ['', '   ', '10.5', 'abc', 'Infinity']) {
      const d = { ...DEFAULT_PROFILE, level }
      expect(applyLevelUp(d)).toBe(d)
    }
  })

  it('gaat niet voorbij het hoogste level', () => {
    const d = { ...DEFAULT_PROFILE, level: '200' }
    expect(applyLevelUp(d)).toBe(d)
  })
})

describe('applySkillPoint', () => {
  it('zet bij Lucky Seven één level erbij en laat de rest staan', () => {
    expect(applySkillPoint(DEFAULT_PROFILE, 'luckySeven')).toEqual({ ...DEFAULT_PROFILE, luckySeven: '2' })
  })

  it('telt bij Nimble Body ook accuracy en avoid op', () => {
    const next = applySkillPoint(DEFAULT_PROFILE, 'nimbleBody')
    expect(next).toEqual({ ...DEFAULT_PROFILE, nimbleBody: '1', accuracy: '34', avoid: '24' })
  })

  it('geeft een draft die door parseProfile komt, met precies de verwachte getallen', () => {
    const next = parseProfile(applySkillPoint(DEFAULT_PROFILE, 'nimbleBody'))
    expect(next).toEqual({
      profile: {
        ...profile,
        nimbleBody: 1,
        accuracy: profile.accuracy + NIMBLE_BODY.accuracyPerLevel,
        avoid: profile.avoid + NIMBLE_BODY.avoidPerLevel,
      },
    })
  })

  it('laat het profiel zoals het was als het niet te lezen is', () => {
    const d = { ...DEFAULT_PROFILE, hp: '' }
    expect(applySkillPoint(d, 'luckySeven')).toBe(d)
    const d2 = { ...DEFAULT_PROFILE, level: '0' }
    expect(applySkillPoint(d2, 'nimbleBody')).toBe(d2)
  })

  it('laat het profiel zoals het was als de skill al op het maximum staat', () => {
    const lucky = { ...DEFAULT_PROFILE, luckySeven: String(LUCKY_SEVEN_LEVELS.length) }
    expect(applySkillPoint(lucky, 'luckySeven')).toBe(lucky)
    const nimble = { ...DEFAULT_PROFILE, nimbleBody: String(NIMBLE_BODY.maxLevel) }
    expect(applySkillPoint(nimble, 'nimbleBody')).toBe(nimble)
  })
})

describe('luckySevenMp', () => {
  it('geeft de MP uit de tabel per level', () => {
    LUCKY_SEVEN_LEVELS.forEach((l, i) => expect(luckySevenMp(i + 1)).toBe(l.mp))
    expect(luckySevenMp(1)).toBe(8)
    expect(luckySevenMp(20)).toBe(16)
  })

  it('is 0 zolang hij niet geleerd is', () => {
    expect(luckySevenMp(0)).toBe(0)
  })

  it('blijft op het hoogste level boven 20', () => {
    expect(luckySevenMp(21)).toBe(16)
    expect(luckySevenMp(999)).toBe(16)
  })
})

describe('bestSpotOf', () => {
  it('geeft id en naam van de beste plek', () => {
    const v = verdict([ok('a', 5, 'Alpha'), ok('b', 3, 'Beta')], 'b')
    expect(bestSpotOf(v)).toEqual({ id: 'b', name: 'Beta' })
  })

  it('geeft null zonder beste, bij een onbekend id en bij een ongeldige plek', () => {
    expect(bestSpotOf(verdict([ok('a', 5)], null))).toBeNull()
    expect(bestSpotOf(verdict([ok('a', 5)], 'zz'))).toBeNull()
    expect(bestSpotOf(verdict([bad('a')], 'a'))).toBeNull()
  })
})

describe('huntingGroundAdvice', () => {
  const lv10Exp = expToNextLevel(10)!

  it('meldt noBest als er nu geen beste plek is', () => {
    expect(huntingGroundAdvice({ id: 'a', name: 'A' }, verdict([ok('a', 5)], null), profile)).toEqual({ kind: 'noBest' })
    expect(huntingGroundAdvice(null, verdict([bad('a')], 'a'), profile)).toEqual({ kind: 'noBest' })
  })

  it('blijft staan bij dezelfde plek, met de huidige naam', () => {
    const v = verdict([ok('a', 5, 'Nieuwe naam')], 'a')
    expect(huntingGroundAdvice({ id: 'a', name: 'Oude naam' }, v, profile)).toEqual({ kind: 'stay', name: 'Nieuwe naam' })
  })

  it('verhuist naar een andere plek, met de mesokosten van beide, apart nagerekend', () => {
    const v = verdict([ok('b', 8, 'Beta'), ok('a', 2, 'Alpha')], 'b')
    const advice = huntingGroundAdvice({ id: 'a', name: 'Alpha' }, v, profile)
    expect(advice).toEqual({ kind: 'move', from: 'Alpha', fromGone: false, to: 'Beta', mesoFrom: lv10Exp / 2, mesoTo: lv10Exp / 8 })
    if (advice.kind === 'move') expect(advice.mesoTo!).toBeLessThan(advice.mesoFrom!)
  })

  it('heeft from null als er geen plek van voor de level-up was, of die verdwenen is', () => {
    const v = verdict([ok('b', 8, 'Beta')], 'b')
    expect(huntingGroundAdvice(null, v, profile)).toEqual({ kind: 'move', from: null, fromGone: false, to: 'Beta', mesoFrom: undefined, mesoTo: lv10Exp / 8 })
    expect(huntingGroundAdvice({ id: 'weg', name: 'Weg' }, v, profile)).toEqual({
      kind: 'move',
      from: null,
      fromGone: true,
      to: 'Beta',
      mesoFrom: undefined,
      mesoTo: lv10Exp / 8,
    })
  })

  it('laat de kosten undefined zonder profiel of buiten de EXP-tabel', () => {
    const v = verdict([ok('b', 8, 'Beta'), ok('a', 2, 'Alpha')], 'b')
    const before = { id: 'a', name: 'Alpha' }
    const expected = { kind: 'move', from: 'Alpha', fromGone: false, to: 'Beta', mesoFrom: undefined, mesoTo: undefined }
    expect(huntingGroundAdvice(before, v, null)).toEqual(expected)
    expect(expToNextLevel(200)).toBeUndefined()
    expect(huntingGroundAdvice(before, v, { ...profile, level: 200 })).toEqual(expected)
  })

  it('laat de kosten van een ongeldige oude plek undefined, de nieuwe blijft staan', () => {
    const v = verdict([ok('b', 8, 'Beta'), bad('a', 'Alpha')], 'b')
    expect(huntingGroundAdvice({ id: 'a', name: 'Alpha' }, v, profile)).toEqual({
      kind: 'move',
      from: 'Alpha',
      fromGone: false,
      to: 'Beta',
      mesoFrom: undefined,
      mesoTo: lv10Exp / 8,
    })
  })

  it('geeft null als een plek geen EXP oplevert en 0 als hij niets kost', () => {
    const v = verdict([ok('b', Infinity, 'Beta'), ok('a', 0, 'Alpha')], 'b')
    expect(huntingGroundAdvice({ id: 'a', name: 'Alpha' }, v, profile)).toMatchObject({ mesoFrom: null, mesoTo: 0 })
  })
})

describe('CHECK_FIELDS', () => {
  it('bevat elk profielveld precies één keer', () => {
    const keys = CHECK_FIELDS.map((f) => f.key)
    expect(keys).toHaveLength(PROFILE_FIELDS.length)
    expect([...keys].sort()).toEqual(PROFILE_FIELDS.map((f) => f.key).sort())
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('begint met Level', () => {
    expect(CHECK_FIELDS[0].key).toBe('level')
  })
})
