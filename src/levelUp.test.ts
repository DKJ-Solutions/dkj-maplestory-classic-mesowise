import { describe, expect, it } from 'vitest'
import type { BestVerdict } from './best'
import type { RankResult } from './calc/rankSpots'
import { expToNextLevel } from './data/expTable'
import { baseAccuracy, LUCKY_SEVEN_LEVELS, NIMBLE_BODY } from './data/thief'
import {
  applyLevelUp,
  applySkillPoint,
  bestSpotOf,
  CHECK_FIELDS,
  checkFieldsFor,
  huntingGroundAdvice,
  levelUpChanges,
  levelUpSummary,
  luckySevenMp,
} from './levelUp'
import type { Job } from './job'
import { DEFAULT_PROFILE, parseProfile, PROFILE_FIELDS, profileFieldsFor, type Profile } from './profile'

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
    expect(applyLevelUp(DEFAULT_PROFILE, 'thief')).toEqual({ ...DEFAULT_PROFILE, level: '11', hp: '466', luk: '45', accuracy: '34' })
    expect(applyLevelUp({ ...DEFAULT_PROFILE, level: ' 42 ' }, 'thief').level).toBe('43')
    expect(applyLevelUp({ ...DEFAULT_PROFILE, level: '199' }, 'thief').level).toBe('200')
  })

  it('laat het profiel zoals het was bij een leeg of geen heel level', () => {
    for (const level of ['', '   ', '10.5', 'abc', 'Infinity']) {
      const d = { ...DEFAULT_PROFILE, level }
      expect(applyLevelUp(d, 'thief')).toBe(d)
    }
  })

  it('gaat niet voorbij het hoogste level', () => {
    const d = { ...DEFAULT_PROFILE, level: '200' }
    expect(applyLevelUp(d, 'thief')).toBe(d)
  })

  it('geeft Beginner-HP (+16) tot level 10 en Thief-HP (+22) vanaf level 10', () => {
    expect(applyLevelUp({ ...DEFAULT_PROFILE, level: '9', hp: '100' }, 'thief').hp).toBe('116')
    expect(applyLevelUp({ ...DEFAULT_PROFILE, level: '10', hp: '100' }, 'thief').hp).toBe('122')
    expect(applyLevelUp({ ...DEFAULT_PROFILE, level: '11', hp: '100' }, 'thief').hp).toBe('122')
    expect(applyLevelUp({ ...DEFAULT_PROFILE, level: '1', hp: '100' }, 'thief').hp).toBe('116')
  })

  it('zet er 5 LUK bij', () => {
    expect(applyLevelUp({ ...DEFAULT_PROFILE, luk: '40' }, 'thief').luk).toBe('45')
    expect(applyLevelUp({ ...DEFAULT_PROFILE, luk: ' 7 ' }, 'thief').luk).toBe('12')
  })

  it('past de accuracy aan met het verschil van het stat-deel: +1 op het voorbeeldprofiel', () => {
    // base(dex 25, lv 10, luk 40) = floor(18,5 + 15) = 33; base(25, 11, 45) = floor(19,75 + 15) = 34.
    expect(baseAccuracy(25, 10, 40)).toBe(33)
    expect(baseAccuracy(25, 11, 45)).toBe(34)
    expect(applyLevelUp(DEFAULT_PROFILE, 'thief').accuracy).toBe('34')
  })

  it('telt accuracy uit skills en items mee als verschil, niet als herberekening', () => {
    expect(applyLevelUp({ ...DEFAULT_PROFILE, accuracy: '50' }, 'thief').accuracy).toBe('51')
  })

  it('geeft +2 accuracy als de floor net omslaat (DEX 0), anders +1', () => {
    // De ruwe winst is altijd 1,25 (2 x 0,25 + 5 x 0,6 x 0,25): +1 of +2, nooit 0.
    // dex 0, lv 10, luk 5: floor(5,75 + 15) = 20; dex 0, lv 11, luk 10: floor(7 + 15) = 22 => +2.
    expect(baseAccuracy(0, 10, 5)).toBe(20)
    expect(baseAccuracy(0, 11, 10)).toBe(22)
    expect(applyLevelUp({ ...DEFAULT_PROFILE, dex: '0', luk: '5', accuracy: '20' }, 'thief').accuracy).toBe('22')
    // dex 0, lv 10, luk 0: floor(5 + 15) = 20; dex 0, lv 11, luk 5: floor(6,25 + 15) = 21 => +1.
    expect(applyLevelUp({ ...DEFAULT_PROFILE, dex: '0', luk: '0', accuracy: '20' }, 'thief').accuracy).toBe('21')
  })

  it('rekent de floor in gehele getallen: +2 bij luk 213, +1 bij luk 228 (dex 6, level 10)', () => {
    // luk 213: floor(2150/40) = 53 -> floor(2200/40) = 55 => +2. luk 228: floor(2240/40) = 56 -> floor(2290/40) = 57 => +1.
    const base = { ...DEFAULT_PROFILE, dex: '6', level: '10', accuracy: '100' }
    expect(applyLevelUp({ ...base, luk: '213' }, 'thief').accuracy).toBe('102')
    expect(applyLevelUp({ ...base, luk: '228' }, 'thief').accuracy).toBe('101')
  })

  it('past hp, luk en accuracy alleen aan als het hele getallen zijn; een decimaal blijft zoals getypt', () => {
    expect(applyLevelUp({ ...DEFAULT_PROFILE, hp: '444.5' }, 'thief').hp).toBe('444.5')
    expect(applyLevelUp({ ...DEFAULT_PROFILE, luk: '40.5' }, 'thief')).toEqual({ ...DEFAULT_PROFILE, level: '11', hp: '466', luk: '40.5', accuracy: '33' })
    expect(applyLevelUp({ ...DEFAULT_PROFILE, accuracy: '33.5' }, 'thief').accuracy).toBe('33.5')
    expect(applyLevelUp({ ...DEFAULT_PROFILE, dex: '25.5' }, 'thief')).toEqual({ ...DEFAULT_PROFILE, level: '11', hp: '466', luk: '45', dex: '25.5', accuracy: '33' })
  })

  it('levelUpChanges meldt alleen wat werkelijk veranderde', () => {
    expect(levelUpChanges(DEFAULT_PROFILE, applyLevelUp(DEFAULT_PROFILE, 'thief'))).toEqual({ hp: 22, luk: true, accuracy: true })
    const odd = { ...DEFAULT_PROFILE, hp: '444.5', luk: 'x' }
    expect(levelUpChanges(odd, applyLevelUp(odd, 'thief'))).toEqual({ hp: null, luk: false, accuracy: false })
  })

  it('levelUpSummary noemt alleen wat veranderde', () => {
    expect(levelUpSummary({ hp: 22, luk: true, accuracy: true })).toBe('Bijgewerkt: level +1, Max HP +22, 5 AP in LUK en je accuracy.')
    expect(levelUpSummary({ hp: null, luk: false, accuracy: false })).toBe('Bijgewerkt: level +1.')
    expect(levelUpSummary({ hp: 16, luk: false, accuracy: false })).toBe('Bijgewerkt: level +1 en Max HP +16.')
  })

  it('laat een veld dat geen getal is zoals getypt, en past de rest wel aan', () => {
    expect(applyLevelUp({ ...DEFAULT_PROFILE, hp: 'abc' }, 'thief')).toEqual({ ...DEFAULT_PROFILE, level: '11', hp: 'abc', luk: '45', accuracy: '34' })
    expect(applyLevelUp({ ...DEFAULT_PROFILE, luk: '' }, 'thief')).toEqual({ ...DEFAULT_PROFILE, level: '11', hp: '466', luk: '', accuracy: '33' })
    expect(applyLevelUp({ ...DEFAULT_PROFILE, accuracy: 'x' }, 'thief')).toEqual({ ...DEFAULT_PROFILE, level: '11', hp: '466', luk: '45', accuracy: 'x' })
    expect(applyLevelUp({ ...DEFAULT_PROFILE, dex: 'Infinity' }, 'thief')).toEqual({
      ...DEFAULT_PROFILE,
      level: '11',
      hp: '466',
      luk: '45',
      dex: 'Infinity',
      accuracy: '33',
    })
  })

  it('raakt str, dex, avoid, wdef, skills en aanvalssnelheid niet aan', () => {
    const next = applyLevelUp(DEFAULT_PROFILE, 'thief')
    for (const k of ['str', 'dex', 'clawWatk', 'avoid', 'wdef', 'luckySeven', 'nimbleBody', 'attackMs'] as const) {
      expect(next[k]).toBe(DEFAULT_PROFILE[k])
    }
  })

  it('komt na een level-up nog door parseProfile, met de verwachte getallen', () => {
    expect(parseProfile(applyLevelUp(DEFAULT_PROFILE, 'thief'))).toEqual({
      profile: { ...profile, level: 11, hp: 466, luk: 45, accuracy: 34 },
    })
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

describe('applyLevelUp per job', () => {
  const others: Job[] = ['beginner', 'warrior', 'magician', 'bowman']

  it('geeft voor de Thief hetzelfde als zonder job', () => {
    expect(applyLevelUp(DEFAULT_PROFILE, 'thief')).toEqual(applyLevelUp(DEFAULT_PROFILE, 'thief'))
    expect(applyLevelUp(DEFAULT_PROFILE, 'thief')).toEqual({ ...DEFAULT_PROFILE, level: '11', hp: '466', luk: '45', accuracy: '34' })
  })

  it('verhoogt voor een andere job alleen het level en laat HP, LUK en accuracy staan', () => {
    for (const j of others) {
      expect(applyLevelUp(DEFAULT_PROFILE, j), j).toEqual({ ...DEFAULT_PROFILE, level: '11' })
    }
  })

  it('geeft een andere job nooit een Thief-getal, op elk level', () => {
    for (const j of others) {
      for (const level of ['1', '10', '30', '100', '198']) {
        const d = { ...DEFAULT_PROFILE, level }
        const out = applyLevelUp(d, j)
        expect(out.hp, `${j} ${level}`).toBe(d.hp)
        expect(out.luk, `${j} ${level}`).toBe(d.luk)
        expect(out.accuracy, `${j} ${level}`).toBe(d.accuracy)
        expect(out.level).toBe(String(Number(level) + 1))
      }
    }
  })

  it('houdt het hoogste level en een ongeldig level ongewijzigd, voor elke job', () => {
    for (const j of [...others, 'thief' as Job]) {
      const max = { ...DEFAULT_PROFILE, level: '200' }
      expect(applyLevelUp(max, j), j).toEqual(max)
      for (const level of ['', 'x', '10.5']) {
        const d = { ...DEFAULT_PROFILE, level }
        expect(applyLevelUp(d, j), `${j} "${level}"`).toEqual(d)
      }
    }
  })

  it('verandert de invoer niet', () => {
    const d = { ...DEFAULT_PROFILE }
    applyLevelUp(d, 'warrior')
    expect(d).toEqual(DEFAULT_PROFILE)
  })
})

describe('checkFieldsFor', () => {
  it('geeft voor de Thief hetzelfde als CHECK_FIELDS', () => {
    expect(checkFieldsFor('thief')).toEqual(CHECK_FIELDS)
  })

  it('laat voor een andere job alleen Lucky Seven en Nimble Body weg, in dezelfde volgorde', () => {
    for (const j of ['beginner', 'warrior', 'magician', 'bowman'] as const) {
      const keys = checkFieldsFor(j).map((f) => f.key)
      expect(keys, j).toEqual(CHECK_FIELDS.map((f) => f.key).filter((k) => k !== 'luckySeven' && k !== 'nimbleBody'))
      expect(keys[0], j).toBe('level')
      expect(keys.length, j).toBe(profileFieldsFor(j).length)
    }
  })
})
