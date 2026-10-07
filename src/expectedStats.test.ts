import { describe, expect, it } from 'vitest'
import { baseAccuracy, baseAvoid } from './data/thief'
import { warriorAccuracy } from './data/warrior'
import { expectedStat, statBreakdown } from './expectedStats'
import { DEFAULT_PROFILE } from './profile'

describe('expectedStat', () => {
  it('verwacht voor het voorbeeldprofiel precies de accuracy die erin staat', () => {
    expect(expectedStat('accuracy', DEFAULT_PROFILE, 'thief')).toBe(Number(DEFAULT_PROFILE.accuracy))
  })

  it('telt Nimble Body mee: +1 accuracy per skill-level', () => {
    const draft = { ...DEFAULT_PROFILE, nimbleBody: '3' }
    expect(expectedStat('accuracy', draft, 'thief')).toBe(baseAccuracy(25, 10, 40) + 3)
  })

  it('volgt DEX, LUK en level', () => {
    const draft = { ...DEFAULT_PROFILE, lukExtra: '0', level: '20', dex: '30', luk: '90' }
    // floor((1,2 x 30 + 2 x 20 + 0,6 x 90) x 0,25 + 15) = floor(47,5) = 47
    expect(expectedStat('accuracy', draft, 'thief')).toBe(47)
  })

  it('rekent avoid uit LUK en DEX, zonder level', () => {
    // floor(40 / 3) + floor(25 / 6) + 5 = 13 + 4 + 5 = 22
    expect(expectedStat('avoid', DEFAULT_PROFILE, 'thief')).toBe(22)
    expect(expectedStat('avoid', { ...DEFAULT_PROFILE, level: '50' }, 'thief')).toBe(22)
  })

  it('telt Nimble Body mee bij avoid: +1 per skill-level', () => {
    expect(expectedStat('avoid', { ...DEFAULT_PROFILE, nimbleBody: '5' }, 'thief')).toBe(27)
  })

  it('volgt het voorbeeld uit de bron: LUK 4 en DEX 30 geven 11 avoid', () => {
    expect(baseAvoid(30, 4)).toBe(11)
  })

  it('heeft geen verwachting als een benodigd veld geen geheel getal is', () => {
    expect(expectedStat('accuracy', { ...DEFAULT_PROFILE, dex: '' }, 'thief')).toBeUndefined()
    expect(expectedStat('accuracy', { ...DEFAULT_PROFILE, lukExtra: '0', luk: '4.5' }, 'thief')).toBeUndefined()
  })

  it('rekent de Warrior-accuracy met zijn eigen formule', () => {
    // floor((1,2 x 25 + 2 x 10 + 0,6 x 40) / 2,5 + 10) = floor(39,6) = 39, niet de Thief-waarde 33
    expect(expectedStat('accuracy', DEFAULT_PROFILE, 'warrior')).toBe(39)
    expect(expectedStat('accuracy', DEFAULT_PROFILE, 'warrior')).toBe(warriorAccuracy(25, 10, 40))
  })

  it('volgt bij de Warrior het voorbeeld uit de bron: DEX 30, level 30 en LUK 4 geven 49 accuracy', () => {
    expect(expectedStat('accuracy', { ...DEFAULT_PROFILE, lukExtra: '0', dex: '30', level: '30', luk: '4' }, 'warrior')).toBe(49)
  })

  it('telt Precise Strikes mee bij de Warrior-accuracy, en Nimble Body niet', () => {
    const base = warriorAccuracy(25, 10, 40)
    expect(expectedStat('accuracy', { ...DEFAULT_PROFILE, preciseStrikes: '1' }, 'warrior')).toBe(base + 5)
    expect(expectedStat('accuracy', { ...DEFAULT_PROFILE, preciseStrikes: '15' }, 'warrior')).toBe(base + 20)
    expect(expectedStat('accuracy', { ...DEFAULT_PROFILE, nimbleBody: '5' }, 'warrior')).toBe(base)
  })

  it('rekent de Warrior-avoid met dezelfde formule als elke job, zonder Nimble Body', () => {
    expect(expectedStat('avoid', DEFAULT_PROFILE, 'warrior')).toBe(22)
    expect(expectedStat('avoid', { ...DEFAULT_PROFILE, nimbleBody: '5' }, 'warrior')).toBe(22)
  })

  it('heeft voor de Warrior geen verwachting voor de weapon multiplier', () => {
    expect(expectedStat('weaponMult', DEFAULT_PROFILE, 'warrior')).toBeUndefined()
  })

  it('heeft geen verwachting voor een stat zonder formule', () => {
    expect(expectedStat('luk', DEFAULT_PROFILE, 'thief')).toBeUndefined()
  })
})

describe('statBreakdown', () => {
  const JOBS = ['thief', 'warrior', 'bowman', 'magician'] as const
  const DRAFTS = [
    DEFAULT_PROFILE,
    { ...DEFAULT_PROFILE, level: '30', dex: '61', luk: '13', int: '77', nimbleBody: '9', preciseStrikes: '15' },
    { ...DEFAULT_PROFILE, level: '1', dex: '4', luk: '4', int: '4', lukExtra: '0' },
  ]

  it('telt voor elke job en elke stat precies op tot de verwachte waarde', () => {
    for (const job of JOBS)
      for (const draft of DRAFTS)
        for (const key of ['accuracy', 'avoid'] as const) {
          const b = statBreakdown(key, draft, job)!
          expect(b.total).toBe(b.parts.reduce((sum, p) => sum + p.value, 0))
          expect(b.total).toBe(expectedStat(key, draft, job))
        }
  })

  it('splitst de evasion in LUK ÷ 3, DEX ÷ 6, 5 basis en Nimble Body', () => {
    const b = statBreakdown('avoid', { ...DEFAULT_PROFILE, nimbleBody: '4' }, 'thief')!
    expect(b.parts.map((p) => [p.label, p.value])).toEqual([['LUK 40 ÷ 3', 13], ['DEX 25 ÷ 6', 4], ['Basis', 5], ['Nimble Body (level 4)', 4]])
    expect(b.total).toBe(26)
  })

  it('toont de accuracy-formule met jouw getallen, en de passief van je job alleen als hij geleerd is', () => {
    const thief = statBreakdown('accuracy', DEFAULT_PROFILE, 'thief')!
    expect(thief.parts).toHaveLength(1)
    expect(thief.parts[0].detail).toContain('DEX 25')
    expect(thief.parts[0].detail).toContain('level 10')
    expect(thief.parts[0].detail).toContain('LUK 40')
    const warrior = statBreakdown('accuracy', { ...DEFAULT_PROFILE, preciseStrikes: '15' }, 'warrior')!
    expect(warrior.parts.at(-1)).toEqual({ label: 'Precise Strikes (level 15)', value: 20 })
    expect(statBreakdown('accuracy', DEFAULT_PROFILE, 'magician')!.parts[0].detail).toContain('INT ')
  })

  it('heeft geen opbouw voor een stat zonder formule of met een ongeldig veld', () => {
    expect(statBreakdown('luk', DEFAULT_PROFILE, 'thief')).toBeUndefined()
    expect(statBreakdown('avoid', { ...DEFAULT_PROFILE, dex: '' }, 'thief')).toBeUndefined()
    expect(statBreakdown('avoid', { ...DEFAULT_PROFILE, int: 'x' }, 'magician')).toBeUndefined()
  })
})
