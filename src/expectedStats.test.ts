import { describe, expect, it } from 'vitest'
import { baseAccuracy, baseAvoid } from './data/thief'
import { warriorAccuracy } from './data/warrior'
import { expectedStat } from './expectedStats'
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
    const draft = { ...DEFAULT_PROFILE, level: '20', dex: '30', luk: '90' }
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
    expect(expectedStat('accuracy', { ...DEFAULT_PROFILE, luk: '4.5' }, 'thief')).toBeUndefined()
  })

  it('rekent de Warrior-accuracy met zijn eigen formule', () => {
    // floor((1,2 x 25 + 2 x 10 + 0,6 x 40) / 2,5 + 10) = floor(39,6) = 39, niet de Thief-waarde 33
    expect(expectedStat('accuracy', DEFAULT_PROFILE, 'warrior')).toBe(39)
    expect(expectedStat('accuracy', DEFAULT_PROFILE, 'warrior')).toBe(warriorAccuracy(25, 10, 40))
  })

  it('volgt bij de Warrior het voorbeeld uit de bron: DEX 30, level 30 en LUK 4 geven 49 accuracy', () => {
    expect(expectedStat('accuracy', { ...DEFAULT_PROFILE, dex: '30', level: '30', luk: '4' }, 'warrior')).toBe(49)
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

  it('heeft geen verwachting voor een job zonder formules', () => {
    expect(expectedStat('accuracy', DEFAULT_PROFILE, 'magician')).toBeUndefined()
  })

  it('heeft geen verwachting voor een stat zonder formule', () => {
    expect(expectedStat('luk', DEFAULT_PROFILE, 'thief')).toBeUndefined()
  })
})
