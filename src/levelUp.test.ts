import { describe, expect, it } from 'vitest'
import type { BestVerdict } from './best'
import type { RankResult } from './calc/rankSpots'
import { expToNextLevel } from './data/expTable'
import { baseAccuracy, LUCKY_SEVEN_LEVELS, NIMBLE_BODY } from './data/thief'
import { warriorAccuracy } from './data/warrior'
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
  powerStrikeMp,
} from './levelUp'
import { isSkillKey } from './data/skills'
import type { Job } from './job'
import { DEFAULT_PROFILE, parseProfile, PROFILE_FIELDS, profileFieldsFor, statFieldsFor, type Profile } from './profile'

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
  it('bevat elke stat precies één keer, en geen skills (die hebben hun eigen kaart)', () => {
    const keys = CHECK_FIELDS.map((f) => f.key)
    const stats = PROFILE_FIELDS.map((f) => f.key).filter((k) => !isSkillKey(k))
    expect([...keys].sort()).toEqual([...stats].sort())
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('begint met Level', () => {
    expect(CHECK_FIELDS[0].key).toBe('level')
  })
})

describe('applyLevelUp per job', () => {
  // De Warrior rekent sinds issue #42 en heeft zijn eigen tests; deze twee jobs rekenen nog niet.
  const others: Job[] = ['magician', 'bowman']

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
    for (const j of [...others, 'warrior' as Job, 'thief' as Job]) {
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

  it('geeft voor een andere job dezelfde stats: skills staan niet op het controlescherm', () => {
    for (const j of ['magician', 'bowman'] as const) {
      const keys = checkFieldsFor(j).map((f) => f.key)
      expect(keys, j).toEqual(CHECK_FIELDS.map((f) => f.key))
      expect(keys[0], j).toBe('level')
      expect(keys.length, j).toBe(profileFieldsFor(j).filter((f) => !isSkillKey(f.key)).length)
    }
  })
})

describe('een Warrior: applyLevelUp', () => {
  // De Warrior krijgt vanaf level 10 +28 HP per level, daaronder +16 (de HP/MP-gids), en geen AP: die verdeelt hij zelf.
  const w = { ...DEFAULT_PROFILE, level: '10', hp: '444', str: '60', dex: '25', luk: '4', accuracy: '33' }

  it('geeft van level 10 naar 11 +28 HP, en laat STR, DEX en LUK staan (geen AP-verdeling)', () => {
    const out = applyLevelUp(w, 'warrior')
    expect(out.level).toBe('11')
    expect(out.hp).toBe('472')
    expect(out.str).toBe('60')
    expect(out.dex).toBe('25')
    expect(out.luk).toBe('4')
  })

  it('geeft onder level 10 nog de Beginner-waarde: +16 HP van level 9 naar 10', () => {
    expect(applyLevelUp({ ...w, level: '9' }, 'warrior').hp).toBe('460')
    expect(applyLevelUp({ ...w, level: '1' }, 'warrior').hp).toBe('460')
    expect(applyLevelUp({ ...w, level: '10' }, 'warrior').hp).toBe('472')
    expect(applyLevelUp({ ...w, level: '100' }, 'warrior').hp).toBe('472')
  })

  it('past de accuracy aan met het verschil van de Warrior-formule (floor((1,2·DEX + 2·level + 0,6·LUK)/2,5 + 10))', () => {
    // DEX 25, LUK 4: level 10 geeft floor(52,4/2,5 + 10) = floor(30,96) = 30; level 11 geeft floor(54,4/2,5 + 10) = floor(31,76) = 31.
    expect(warriorAccuracy(25, 10, 4)).toBe(30)
    expect(warriorAccuracy(25, 11, 4)).toBe(31)
    expect(applyLevelUp(w, 'warrior').accuracy).toBe('34')
    // Over meerdere levels loopt het delta mee: de som van de stappen is het totaalverschil.
    let d = { ...w, accuracy: '0' }
    for (let i = 0; i < 20; i++) d = applyLevelUp(d, 'warrior')
    expect(Number(d.accuracy)).toBe(warriorAccuracy(25, 30, 4) - warriorAccuracy(25, 10, 4))
  })

  it('gebruikt de Warrior-accuracy en niet die van de Thief', () => {
    const same = { ...DEFAULT_PROFILE, level: '10', luk: '40', dex: '25', accuracy: '33' }
    expect(applyLevelUp(same, 'warrior').accuracy).toBe(String(33 + warriorAccuracy(25, 11, 40) - warriorAccuracy(25, 10, 40)))
    expect(applyLevelUp(same, 'warrior').luk).toBe('40')
    expect(applyLevelUp(same, 'thief').luk).toBe('45')
  })

  it('laat HP en accuracy zoals getypt als een van de velden geen geheel getal is', () => {
    const out = applyLevelUp({ ...w, hp: 'x', accuracy: '33.5' }, 'warrior')
    expect(out).toEqual({ ...w, hp: 'x', accuracy: '33.5', level: '11' })
    expect(applyLevelUp({ ...w, dex: '' }, 'warrior').accuracy).toBe('33')
  })

  it('laat de andere velden (weapon multiplier, skills, wdef, avoid) staan', () => {
    const out = applyLevelUp({ ...w, weaponMult: '2.6', powerStrike: '5', wdef: '88', avoid: '9' }, 'warrior')
    expect(out).toMatchObject({ weaponMult: '2.6', powerStrike: '5', wdef: '88', avoid: '9' })
  })
})

describe('een Warrior: checkFieldsFor', () => {
  const keys = checkFieldsFor('warrior').map((f) => f.key)

  it('begint met Level, HP, STR, DEX, accuracy en avoid, in die volgorde', () => {
    expect(keys.slice(0, 6)).toEqual(['level', 'hp', 'str', 'dex', 'accuracy', 'avoid'])
  })

  it('heeft alle stats van een Warrior precies één keer, met de weapon multiplier, en geen skills', () => {
    expect(new Set(keys).size).toBe(keys.length)
    expect([...keys].sort()).toEqual(statFieldsFor('warrior').map((f) => f.key).sort())
    expect(keys).toContain('weaponMult')
    expect(keys).toContain('luk')
    expect(keys.filter(isSkillKey)).toEqual([])
  })

  it('verandert niets voor de Thief: geen weapon multiplier', () => {
    expect(checkFieldsFor('thief')).toEqual(CHECK_FIELDS)
    expect(checkFieldsFor('thief').map((f) => f.key)).not.toContain('weaponMult')
  })
})

describe('een Warrior: applySkillPoint', () => {
  const w = { ...DEFAULT_PROFILE, level: '30', accuracy: '80', powerStrike: '3', preciseStrikes: '0' }

  it('zet bij Precise Strikes 0 → 1 de accuracy van level 1 erbij (+5), en laat de rest staan', () => {
    expect(applySkillPoint(w, 'preciseStrikes', 'warrior')).toEqual({ ...w, preciseStrikes: '1', accuracy: '85' })
  })

  it('telt van level naar level alleen het verschil van de accuracy, volgens de skillpagina (5, 6, 7, 8, ... 18, 20)', () => {
    const delta = (from: number) => {
      const out = applySkillPoint({ ...w, preciseStrikes: String(from) }, 'preciseStrikes', 'warrior')
      return Number(out.accuracy) - 80
    }
    expect(delta(1)).toBe(6 - 5)
    expect(delta(3)).toBe(8 - 7)
    expect(delta(13)).toBe(18 - 17)
    expect(delta(14)).toBe(20 - 18) // de laatste stap springt 2
  })

  it('zet bij Power Strike een level erbij zonder accuracy of andere stats te raken', () => {
    expect(applySkillPoint(w, 'powerStrike', 'warrior')).toEqual({ ...w, powerStrike: '4' })
  })

  it('laat het profiel staan op het maximum (Power Strike 20, Precise Strikes 15)', () => {
    const maxed = { ...w, powerStrike: '20', preciseStrikes: '15' }
    expect(applySkillPoint(maxed, 'powerStrike', 'warrior')).toBe(maxed)
    expect(applySkillPoint(maxed, 'preciseStrikes', 'warrior')).toBe(maxed)
  })

  it('kent een Thief-skill niet voor een Warrior, en een Warrior-skill niet voor een Thief', () => {
    expect(applySkillPoint(w, 'luckySeven', 'warrior')).toBe(w)
    expect(applySkillPoint(w, 'powerStrike')).toBe(w)
    expect(applySkillPoint(w, 'powerStrike', 'thief')).toBe(w)
  })

  it('laat de velden die deze job niet invult zoals getypt (een terugwissel van job verliest niets)', () => {
    // De profielkaart belooft: de getypte waarden blijven in het concept staan, zodat een terugwissel niets kwijt is.
    const typed = { ...w, luckySeven: '7', nimbleBody: '4' }
    const out = applySkillPoint(typed, 'powerStrike', 'warrior')
    expect(out.luckySeven).toBe('7')
    expect(out.nimbleBody).toBe('4')
    const thiefTyped = { ...DEFAULT_PROFILE, weaponMult: '2.6', powerStrike: '9' }
    const out2 = applySkillPoint(thiefTyped, 'luckySeven', 'thief')
    expect(out2.weaponMult).toBe('2.6')
    expect(out2.powerStrike).toBe('9')
  })
})

describe('powerStrikeMp', () => {
  it('geeft de MP per aanval van het skill-level, en 0 als hij nog niet geleerd is', () => {
    expect(powerStrikeMp(0)).toBe(0)
    expect(powerStrikeMp(1)).toBe(4)
    expect(powerStrikeMp(20)).toBe(12)
  })
})
