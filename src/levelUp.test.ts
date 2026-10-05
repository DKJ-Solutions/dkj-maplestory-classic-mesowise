import { describe, expect, it } from 'vitest'
import { apAtLevel, baseAccuracy, LUCKY_SEVEN_LEVELS, NIMBLE_BODY } from './data/thief'
import { bowmanAccuracy } from './data/bowman'
import { magicianAccuracy } from './data/magician'
import { warriorAccuracy } from './data/warrior'
import {
  applyLevelDown,
  applyLevelUp,
  applySkillPoint,
  apToDistribute,
  snapshotApplies,
  spToDistribute,
  takeSnapshot,
} from './levelUp'
import type { Job } from './job'
import { DEFAULT_PROFILE, parseProfile, PROFILE_FIELDS, type Profile } from './profile'

const parsed = parseProfile(DEFAULT_PROFILE)
if (!('profile' in parsed)) throw new Error('voorbeeldprofiel ongeldig')
const profile: Profile = parsed.profile

describe('applyLevelUp', () => {
  it('zet het level er één bij, als tekst, en laat de rest staan', () => {
    expect(applyLevelUp(DEFAULT_PROFILE, 'thief')).toEqual({ ...DEFAULT_PROFILE, level: '11', hp: '466', accuracy: '34' })
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

  it('plaatst zelf geen AP: STR, DEX, INT en LUK blijven staan (#154)', () => {
    const next = applyLevelUp({ ...DEFAULT_PROFILE, lukExtra: '0', luk: '40', str: '4' }, 'thief')
    expect([next.str, next.dex, next.int, next.luk]).toEqual(['4', DEFAULT_PROFILE.dex, DEFAULT_PROFILE.int, '40'])
  })

  it('past de accuracy aan met het verschil van het level-deel: +1 op het voorbeeldprofiel', () => {
    // base(dex 25, lv 10, luk 40) = floor(18,5 + 15) = 33; base(25, 11, 40) = floor(19 + 15) = 34.
    expect(baseAccuracy(25, 10, 40)).toBe(33)
    expect(baseAccuracy(25, 11, 40)).toBe(34)
    expect(applyLevelUp(DEFAULT_PROFILE, 'thief').accuracy).toBe('34')
  })

  it('telt accuracy uit skills en items mee als verschil, niet als herberekening', () => {
    expect(applyLevelUp({ ...DEFAULT_PROFILE, accuracy: '50' }, 'thief').accuracy).toBe('51')
  })

  it('geeft +1 of +0 accuracy: het level geeft 0,5, de floor rondt af (zonder AP-verschuiving)', () => {
    // dex 0, luk 5: level 10 geeft floor(830/40) = 20, level 11 geeft floor(850/40) = 21 => +1.
    expect(applyLevelUp({ ...DEFAULT_PROFILE, lukExtra: '0', dex: '0', luk: '5', accuracy: '20' }, 'thief').accuracy).toBe('21')
    // dex 0, luk 9: level 10 geeft floor(854/40) = 21, level 11 geeft floor(874/40) = 21 => +0.
    expect(applyLevelUp({ ...DEFAULT_PROFILE, lukExtra: '0', dex: '0', luk: '9', accuracy: '21' }, 'thief').accuracy).toBe('21')
  })

  it('rekent de floor in gehele getallen: +1 bij luk 213, +0 bij luk 228 (dex 6, level 10)', () => {
    // luk 213: floor(2150/40) = 53 -> floor(2170/40) = 54 => +1. luk 228: floor(2240/40) = 56 -> floor(2260/40) = 56 => +0.
    const base = { ...DEFAULT_PROFILE, lukExtra: '0', dex: '6', level: '10', accuracy: '100' }
    expect(applyLevelUp({ ...base, luk: '213' }, 'thief').accuracy).toBe('101')
    expect(applyLevelUp({ ...base, luk: '228' }, 'thief').accuracy).toBe('100')
  })

  it('past hp en accuracy alleen aan als het hele getallen zijn; een decimaal blijft zoals getypt', () => {
    expect(applyLevelUp({ ...DEFAULT_PROFILE, hp: '444.5' }, 'thief').hp).toBe('444.5')
    expect(applyLevelUp({ ...DEFAULT_PROFILE, lukExtra: '0', luk: '40.5' }, 'thief')).toEqual({ ...DEFAULT_PROFILE, lukExtra: '0', level: '11', hp: '466', luk: '40.5', accuracy: '33' })
    expect(applyLevelUp({ ...DEFAULT_PROFILE, accuracy: '33.5' }, 'thief').accuracy).toBe('33.5')
    expect(applyLevelUp({ ...DEFAULT_PROFILE, dex: '25.5' }, 'thief')).toEqual({ ...DEFAULT_PROFILE, level: '11', hp: '466', dex: '25.5', accuracy: '33' })
  })

  it('laat een veld dat geen getal is zoals getypt, en past de rest wel aan', () => {
    expect(applyLevelUp({ ...DEFAULT_PROFILE, hp: 'abc' }, 'thief')).toEqual({ ...DEFAULT_PROFILE, level: '11', hp: 'abc', accuracy: '34' })
    expect(applyLevelUp({ ...DEFAULT_PROFILE, lukExtra: '0', luk: '' }, 'thief')).toEqual({ ...DEFAULT_PROFILE, lukExtra: '0', level: '11', hp: '466', luk: '', accuracy: '33' })
    expect(applyLevelUp({ ...DEFAULT_PROFILE, accuracy: 'x' }, 'thief')).toEqual({ ...DEFAULT_PROFILE, level: '11', hp: '466', accuracy: 'x' })
    expect(applyLevelUp({ ...DEFAULT_PROFILE, dex: 'Infinity' }, 'thief')).toEqual({
      ...DEFAULT_PROFILE,
      level: '11',
      hp: '466',
      dex: 'Infinity',
      accuracy: '33',
    })
  })

  it('raakt str, dex, luk, avoid, wdef, skills en aanvalssnelheid niet aan', () => {
    const next = applyLevelUp(DEFAULT_PROFILE, 'thief')
    for (const k of ['str', 'dex', 'luk', 'clawWatk', 'avoid', 'wdef', 'luckySeven', 'nimbleBody', 'attackMs'] as const) {
      expect(next[k]).toBe(DEFAULT_PROFILE[k])
    }
  })

  it('komt na een level-up nog door parseProfile, met de verwachte getallen', () => {
    expect(parseProfile(applyLevelUp(DEFAULT_PROFILE, 'thief'))).toEqual({
      profile: { ...profile, level: 11, hp: 466, accuracy: 34 },
    })
  })
})

describe('applySkillPoint', () => {
  // Level 11: 4 skillpunten van de 1e job, waarvan Lucky Seven er 1 heeft (issue #136).
  const L11 = { ...DEFAULT_PROFILE, level: '11' }

  it('zet bij Lucky Seven één level erbij en laat de rest staan', () => {
    expect(applySkillPoint(L11, 'luckySeven')).toEqual({ ...L11, luckySeven: '2' })
  })

  it('telt bij Nimble Body ook accuracy en avoid op', () => {
    const next = applySkillPoint(L11, 'nimbleBody')
    expect(next).toEqual({ ...L11, nimbleBody: '1', accuracy: '34', avoid: '24' })
  })

  it('geeft een draft die door parseProfile komt, met precies de verwachte getallen', () => {
    const next = parseProfile(applySkillPoint(L11, 'nimbleBody'))
    expect(next).toEqual({
      profile: {
        ...profile,
        level: 11,
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

describe('applyLevelUp per job', () => {
  it('geeft voor de Thief hetzelfde als zonder job', () => {
    expect(applyLevelUp(DEFAULT_PROFILE, 'thief')).toEqual(applyLevelUp(DEFAULT_PROFILE, 'thief'))
    expect(applyLevelUp(DEFAULT_PROFILE, 'thief')).toEqual({ ...DEFAULT_PROFILE, level: '11', hp: '466', accuracy: '34' })
  })

  it('houdt het hoogste level en een ongeldig level ongewijzigd, voor elke job', () => {
    for (const j of ['warrior', 'bowman', 'magician', 'thief'] as Job[]) {
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

describe('een Warrior: applyLevelUp', () => {
  // De Warrior krijgt vanaf level 10 +28 HP per level, daaronder +16 (de HP/MP-gids), en geen AP: die verdeelt hij zelf.
  const w = { ...DEFAULT_PROFILE, lukExtra: '0', level: '10', hp: '444', str: '60', dex: '25', luk: '4', accuracy: '33' }

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
    const same = { ...DEFAULT_PROFILE, lukExtra: '0', level: '10', luk: '40', dex: '25', accuracy: '33' }
    expect(applyLevelUp(same, 'warrior').accuracy).toBe(String(33 + warriorAccuracy(25, 11, 40) - warriorAccuracy(25, 10, 40)))
    expect(applyLevelUp(same, 'warrior').luk).toBe('40')
    expect(applyLevelUp(same, 'thief').luk).toBe('40')
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

describe('applyLevelDown (#130)', () => {
  it('zet alleen het level een terug; je stats blijven staan', () => {
    const draft = { ...DEFAULT_PROFILE, level: '12' }
    expect(applyLevelDown(draft)).toEqual({ ...draft, level: '11' })
  })

  it('zet na een level-up zonder snapshot alleen het level een terug', () => {
    const up = applyLevelUp({ ...DEFAULT_PROFILE, level: '12' }, 'thief')
    const back = applyLevelDown(up)
    expect(back.level).toBe('12')
    expect(back.hp).toBe(up.hp)
    expect(back.luk).toBe(up.luk)
  })

  it.each(['1', '', 'abc', '12.5', '201'])('laat het profiel ongemoeid bij level %j', (level) => {
    const draft = { ...DEFAULT_PROFILE, level }
    expect(applyLevelDown(draft)).toBe(draft)
  })

  it('gaat van het hoogste level naar een lager', () => {
    const max = String(PROFILE_FIELDS.find((f) => f.key === 'level')!.max)
    expect(applyLevelDown({ ...DEFAULT_PROFILE, level: max }).level).toBe(String(Number(max) - 1))
  })
})

describe('applySkillPoint: de pot is vol (issue #136)', () => {
  it('geeft het concept ongewijzigd terug als je geen punt van de 1e job meer hebt', () => {
    // Level 10: 1 punt, en Lucky Seven heeft hem al.
    expect(applySkillPoint(DEFAULT_PROFILE, 'luckySeven')).toBe(DEFAULT_PROFILE)
    expect(applySkillPoint(DEFAULT_PROFILE, 'nimbleBody')).toBe(DEFAULT_PROFILE)
  })

  it('zet het laatste punt nog wel en daarna niet meer', () => {
    const L10 = { ...DEFAULT_PROFILE, luckySeven: '0' }
    const once = applySkillPoint(L10, 'luckySeven')
    expect(once).toEqual({ ...L10, luckySeven: '1' })
    expect(applySkillPoint(once, 'luckySeven')).toBe(once)
  })
})

describe('applyLevelUp met extra AP van items', () => {
  it('laat je base LUK staan, en rekent de accuracy met je totale DEX en LUK', () => {
    const draft = { ...DEFAULT_PROFILE, dex: '25', dexExtra: '5', luk: '37', lukExtra: '3', accuracy: '40' }
    const next = applyLevelUp(draft, 'thief')
    expect(next.luk).toBe('37')
    expect(next.lukExtra).toBe('3')
    expect(next.accuracy).toBe(String(40 + baseAccuracy(30, 11, 40) - baseAccuracy(30, 10, 40)))
  })
})

describe('apToDistribute (#154)', () => {
  it('geeft wat je level aan base AP geeft min wat er in STR, DEX, INT en LUK staat', () => {
    // Level 10 geeft 70; na een level-up is dat 75.
    const at10 = { ...DEFAULT_PROFILE, lukExtra: '0', str: '4', dex: '25', int: '4', luk: '37' }
    expect(apAtLevel(10)).toBe(70)
    expect(apToDistribute(at10)).toBeNull()
    expect(apToDistribute(applyLevelUp(at10, 'thief'))).toBe(5)
    expect(apToDistribute(applyLevelUp(applyLevelUp(at10, 'warrior'), 'warrior'))).toBe(10)
  })

  it('toont niets bij te veel AP, een leeg of onleesbaar level, of een level buiten 1 tot 200', () => {
    expect(apToDistribute({ ...DEFAULT_PROFILE, str: '90' })).toBeNull()
    for (const level of ['', 'x', '10.5', '0', '201']) expect(apToDistribute({ ...DEFAULT_PROFILE, lukExtra: '0', level, str: '4', luk: '4' }), level).toBeNull()
  })

  it('telt een onleesbare stat als 0', () => {
    const d = { ...DEFAULT_PROFILE, lukExtra: '0', level: '2', str: '4', dex: '4', int: '4', luk: 'x' }
    expect(apToDistribute(d)).toBe(apAtLevel(2) - 12)
  })
})

describe('spToDistribute (#154)', () => {
  it('geeft de punten van de pot van je 1e job die je nog niet hebt gezet', () => {
    // Level 11: 4 punten van de 1e job, Lucky Seven heeft er 1.
    expect(spToDistribute({ ...DEFAULT_PROFILE, level: '11' }, 'thief')).toBe(3)
    expect(spToDistribute({ ...DEFAULT_PROFILE, level: '11', luckySeven: '4' }, 'thief')).toBeNull()
  })

  it('toont niets zonder geldig level of bij te veel punten', () => {
    expect(spToDistribute({ ...DEFAULT_PROFILE, level: '' }, 'thief')).toBeNull()
    expect(spToDistribute({ ...DEFAULT_PROFILE, level: '10', luckySeven: '9' }, 'thief')).toBeNull()
  })
})

describe('de level-up-snapshot (#154)', () => {
  const eq = { slot: 'x' }

  it('onthoudt het profiel en de equipment van vlak voor de level-up, en het level waar je heen ging', () => {
    const snap = takeSnapshot(DEFAULT_PROFILE, eq, 'thief')
    expect(snap).toEqual({ job: 'thief', toLevel: '11', draft: DEFAULT_PROFILE, equipment: eq })
  })

  it('geldt zolang je op het nieuwe level van dezelfde job staat', () => {
    const snap = takeSnapshot(DEFAULT_PROFILE, eq, 'thief')
    const up = applyLevelUp(DEFAULT_PROFILE, 'thief')
    expect(snapshotApplies(snap, up, 'thief')).toBe(true)
    expect(snapshotApplies(snap, { ...up, level: '12' }, 'thief')).toBe(false)
    expect(snapshotApplies(snap, up, 'warrior')).toBe(false)
    expect(snapshotApplies(null, up, 'thief')).toBe(false)
  })
})

describe('applyLevelUp: HP en accuracy per job over de drempel en de floor (#154)', () => {
  const base = { ...DEFAULT_PROFILE, lukExtra: '0', hp: '100', accuracy: '100', dex: '25', int: '30', luk: '40' }
  const accuracyOf: Record<Job, (stat: number, level: number, luk: number) => number> = {
    thief: baseAccuracy,
    warrior: warriorAccuracy,
    bowman: bowmanAccuracy,
    magician: magicianAccuracy,
  }
  // De stat waaruit het stat-deel van de accuracy volgt: DEX, bij een Magician INT.
  const statOf = (job: Job) => Number(job === 'magician' ? base.int : base.dex)

  it.each(['thief', 'warrior', 'bowman', 'magician'] as Job[])('%s: +16 HP tot en met level 9, de job-waarde vanaf level 10 (Magician: ook +16, volgens de HP/MP-gids)', (job) => {
    const hp = (level: number) => Number(applyLevelUp({ ...base, level: String(level) }, job).hp) - 100
    const jobHp = { thief: 22, warrior: 28, bowman: 22, magician: 16 }[job]
    expect([hp(1), hp(8), hp(9)]).toEqual([16, 16, 16])
    expect([hp(10), hp(11), hp(199)]).toEqual([jobHp, jobHp, jobHp])
  })

  it.each(['thief', 'warrior', 'bowman', 'magician'] as Job[])('%s: de accuracy-stap is op elk level het verschil van zijn eigen formule, en 0 of 1', (job) => {
    for (let level = 1; level < 200; level++) {
      const out = applyLevelUp({ ...base, level: String(level) }, job)
      const expected = accuracyOf[job](statOf(job), level + 1, 40) - accuracyOf[job](statOf(job), level, 40)
      expect(Number(out.accuracy) - 100, `${job} lv ${level}`).toBe(expected)
      expect(expected).toBeGreaterThanOrEqual(0)
      expect(expected).toBeLessThanOrEqual(1)
    }
  })

  it('geeft de Thief om het andere level +1 accuracy (DEX 25, LUK 40: lv 10 +1, lv 11 +0, lv 12 +1)', () => {
    const step = (level: number) => Number(applyLevelUp({ ...base, level: String(level) }, 'thief').accuracy) - 100
    expect([step(10), step(11), step(12), step(13)]).toEqual([1, 0, 1, 0])
  })

  it('gebruikt bij een Magician INT en niet DEX voor de accuracy', () => {
    const lowDex = { ...base, level: '30', dex: '4', int: '200', accuracy: '100' }
    const out = applyLevelUp(lowDex, 'magician')
    expect(Number(out.accuracy) - 100).toBe(magicianAccuracy(200, 31, 40) - magicianAccuracy(200, 30, 40))
    // DEX verandert het verschil niet.
    expect(applyLevelUp({ ...lowDex, dex: '150' }, 'magician').accuracy).toBe(out.accuracy)
  })

  it('rekent de accuracy met base plus extra AP van items (Warrior met DEX-items, Magician met INT-items, Bowman met LUK-items)', () => {
    const w = { ...base, level: '30', dex: '10', dexExtra: '15' }
    expect(Number(applyLevelUp(w, 'warrior').accuracy) - 100).toBe(warriorAccuracy(25, 31, 40) - warriorAccuracy(25, 30, 40))
    const m = { ...base, level: '30', int: '10', intExtra: '90' }
    expect(Number(applyLevelUp(m, 'magician').accuracy) - 100).toBe(magicianAccuracy(100, 31, 40) - magicianAccuracy(100, 30, 40))
    const l = { ...base, level: '30', luk: '10', lukExtra: '200' }
    expect(Number(applyLevelUp(l, 'bowman').accuracy) - 100).toBe(bowmanAccuracy(25, 31, 210) - bowmanAccuracy(25, 30, 210))
  })

  it('raakt per job alleen level, hp en accuracy aan', () => {
    for (const job of ['thief', 'warrior', 'bowman', 'magician'] as Job[]) {
      const out = applyLevelUp({ ...base, level: '30' }, job)
      expect({ ...out, level: '', hp: '', accuracy: '' }, job).toEqual({ ...base, level: '', hp: '', accuracy: '' })
    }
  })
})

describe('apToDistribute: randgevallen (#154)', () => {
  const placed = (str: number, dex: number, int: number, luk: number) => ({ str: String(str), dex: String(dex), int: String(int), luk: String(luk) })

  it('geeft level 1 de startpunten: 25 AP, en toont niets als die gezet zijn', () => {
    expect(apAtLevel(1)).toBe(25)
    expect(apToDistribute({ ...DEFAULT_PROFILE, level: '1', ...placed(4, 4, 4, 13) })).toBeNull()
    expect(apToDistribute({ ...DEFAULT_PROFILE, level: '1', ...placed(4, 4, 4, 12) })).toBe(1)
  })

  it('toont niets bij precies evenveel gezet als het level geeft, en 1 bij één punt minder', () => {
    expect(apToDistribute({ ...DEFAULT_PROFILE, ...placed(4, 25, 4, 37) })).toBeNull()
    expect(apToDistribute({ ...DEFAULT_PROFILE, ...placed(4, 25, 4, 36) })).toBe(1)
    expect(apToDistribute({ ...DEFAULT_PROFILE, ...placed(4, 25, 4, 38) })).toBeNull()
  })

  it('werkt op de grenzen level 1 en level 200, en niet net erbuiten', () => {
    const none = placed(4, 4, 4, 4)
    expect(apToDistribute({ ...DEFAULT_PROFILE, level: '200', ...none })).toBe(apAtLevel(200) - 16)
    expect(apToDistribute({ ...DEFAULT_PROFILE, level: '201', ...none })).toBeNull()
    expect(apToDistribute({ ...DEFAULT_PROFILE, level: '0', ...none })).toBeNull()
    expect(apToDistribute({ ...DEFAULT_PROFILE, level: '-1', ...none })).toBeNull()
  })

  it('leest een level met spaties, en geeft niets bij een decimaal of onleesbaar level', () => {
    const none = placed(4, 4, 4, 4)
    expect(apToDistribute({ ...DEFAULT_PROFILE, level: ' 11 ', ...none })).toBe(apAtLevel(11) - 16)
    for (const level of ['', '  ', '10.5', 'abc', 'Infinity', 'NaN']) {
      expect(apToDistribute({ ...DEFAULT_PROFILE, level, ...none }), level).toBeNull()
    }
  })

  it('telt alleen base AP: de extra AP van items verlagen het getal niet', () => {
    const d = { ...DEFAULT_PROFILE, level: '11', ...placed(4, 4, 4, 4), strExtra: '50', dexExtra: '50', intExtra: '50', lukExtra: '50' }
    expect(apToDistribute(d)).toBe(apAtLevel(11) - 16)
  })

  it('geeft niets terug als er te veel base AP staat, ook al zijn er extra AP', () => {
    expect(apToDistribute({ ...DEFAULT_PROFILE, ...placed(4, 25, 4, 38), lukExtra: '10' })).toBeNull()
  })

  it('telt een negatief, decimaal of leeg veld als 0 (zoals baseApSpent)', () => {
    const at = (over: Partial<typeof DEFAULT_PROFILE>) => apToDistribute({ ...DEFAULT_PROFILE, lukExtra: '0', level: '2', str: '4', dex: '4', int: '4', luk: '4', ...over })
    const full = apAtLevel(2) - 16
    expect(at({ str: '-5' })).toBe(full + 4)
    expect(at({ str: '4.5' })).toBe(full + 4)
    expect(at({ str: '' })).toBe(full + 4)
  })
})

describe('spToDistribute: de grens van de 1e job (#154)', () => {
  it('geeft onder level 10 niets: de 1e job begint op level 10', () => {
    for (const level of ['1', '5', '9']) expect(spToDistribute({ ...DEFAULT_PROFILE, level, luckySeven: '0' }, 'thief'), level).toBeNull()
  })

  it('geeft op level 10 één punt, en niets meer als dat gezet is', () => {
    expect(spToDistribute({ ...DEFAULT_PROFILE, level: '10', luckySeven: '0' }, 'thief')).toBe(1)
    expect(spToDistribute({ ...DEFAULT_PROFILE, level: '10', luckySeven: '1' }, 'thief')).toBeNull()
  })

  it('geeft 3 punten erbij per level vanaf level 11', () => {
    expect(spToDistribute({ ...DEFAULT_PROFILE, level: '11', luckySeven: '1' }, 'thief')).toBe(3)
    expect(spToDistribute({ ...DEFAULT_PROFILE, level: '12', luckySeven: '1' }, 'thief')).toBe(6)
  })

  it('telt de skills van de andere jobs in het concept niet mee', () => {
    // Een Warrior met Thief-waarden in het concept (een terugwissel verliest niets): alleen zijn eigen skills tellen.
    const d = { ...DEFAULT_PROFILE, level: '11', luckySeven: '4', nimbleBody: '3', powerStrike: '0', preciseStrikes: '0' }
    expect(spToDistribute(d, 'warrior')).toBe(4)
    expect(spToDistribute({ ...d, powerStrike: '4' }, 'warrior')).toBeNull()
  })

  it('geeft niets bij een ongeldig level, voor elke job', () => {
    for (const job of ['warrior', 'bowman', 'magician', 'thief'] as Job[]) {
      for (const level of ['', 'x', '10.5', '0', '201']) expect(spToDistribute({ ...DEFAULT_PROFILE, level }, job), `${job} ${level}`).toBeNull()
    }
  })
})

describe('snapshotApplies: na een jobwissel of een handmatig aangepast level (#154)', () => {
  const eq = { slot: 'x' }
  const snap = takeSnapshot(DEFAULT_PROFILE, eq, 'thief')

  it('geldt niet meer als het level na de level-up is aangepast (omhoog, omlaag of leeg)', () => {
    for (const level of ['10', '12', '1', '200', '', 'x', '11.5']) {
      expect(snapshotApplies(snap, { ...DEFAULT_PROFILE, level }, 'thief'), level).toBe(false)
    }
  })

  it('geldt nog als het level terug is op het nieuwe level, ook met spaties en met andere stats', () => {
    expect(snapshotApplies(snap, { ...DEFAULT_PROFILE, lukExtra: '0', level: ' 11 ', luk: '99' }, 'thief')).toBe(true)
  })

  it('geldt niet na een andere job, ook niet op het juiste level', () => {
    for (const job of ['warrior', 'bowman', 'magician'] as Job[]) {
      expect(snapshotApplies(snap, { ...DEFAULT_PROFILE, level: '11' }, job), job).toBe(false)
    }
  })

  it('onthoudt de job waarmee de snapshot is genomen, en niet de huidige', () => {
    const w = takeSnapshot({ ...DEFAULT_PROFILE, level: '30' }, eq, 'warrior')
    expect(w.job).toBe('warrior')
    expect(snapshotApplies(w, { ...DEFAULT_PROFILE, level: '31' }, 'warrior')).toBe(true)
    expect(snapshotApplies(w, { ...DEFAULT_PROFILE, level: '31' }, 'thief')).toBe(false)
  })

  it('bewaart het concept en de equipment zoals ze waren, zonder de invoer te wijzigen', () => {
    const d = { ...DEFAULT_PROFILE }
    const s = takeSnapshot(d, eq, 'thief')
    expect(s.draft).toBe(d)
    expect(s.equipment).toBe(eq)
    expect(d).toEqual(DEFAULT_PROFILE)
  })

  it('geeft bij level 200 toLevel 200: de level-up deed niets, dus Back mag ook niets terugzetten behalve op level 200 zelf', () => {
    const top = takeSnapshot({ ...DEFAULT_PROFILE, level: '200' }, eq, 'thief')
    expect(top.toLevel).toBe('200')
  })
})
