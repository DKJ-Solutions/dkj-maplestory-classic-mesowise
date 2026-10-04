import { describe, expect, it } from 'vitest'
import { baseAccuracy, baseAvoid } from './data/thief'
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

  it('heeft geen verwachting voor een job zonder formules', () => {
    expect(expectedStat('accuracy', DEFAULT_PROFILE, 'warrior')).toBeUndefined()
  })

  it('heeft geen verwachting voor een stat zonder formule', () => {
    expect(expectedStat('luk', DEFAULT_PROFILE, 'thief')).toBeUndefined()
  })
})
