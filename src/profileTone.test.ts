import { describe, expect, it } from 'vitest'
import { CLOSE_SHARE, FAR_SHARE, formatShare, profileShare, profileTone } from './profileTone'

describe('profileTone', () => {
  it('Profile even duur of goedkoper dan Cheapest is close', () => {
    expect(profileTone(10_000, 10_000)).toBe('close')
    expect(profileTone(10_000, 9_000)).toBe('close')
    expect(profileTone(0, 0)).toBe('close')
  })

  it('tot en met 10% boven Cheapest is close', () => {
    expect(CLOSE_SHARE).toBe(0.1)
    expect(profileTone(10_000, 11_000)).toBe('close')
    expect(profileTone(10_000, 11_001)).toBe('between')
  })

  it('vanaf 25% boven Cheapest is far', () => {
    expect(FAR_SHARE).toBe(0.25)
    expect(profileTone(10_000, 12_499)).toBe('between')
    expect(profileTone(10_000, 12_500)).toBe('far')
    expect(profileTone(10_000, 40_000)).toBe('far')
  })

  it('kost Cheapest niets, dan is elke meso erboven far', () => {
    expect(profileTone(0, 1)).toBe('far')
  })
})

describe('profileShare', () => {
  it('is het verschil als deel van Cheapest', () => {
    expect(profileShare(10_000, 11_800)).toBeCloseTo(0.18)
    expect(profileShare(10_000, 9_500)).toBeCloseTo(-0.05)
    expect(profileShare(10_000, 10_000)).toBe(0)
  })

  it('heeft geen deel als Cheapest niets kost', () => {
    expect(profileShare(0, 500)).toBeNull()
  })
})

describe('formatShare', () => {
  it('zegt in woorden of Profile duurder of goedkoper is, afgerond op hele procenten', () => {
    expect(formatShare(0.57)).toBe('+57% more expensive')
    expect(formatShare(-0.05)).toBe('5% cheaper')
    expect(formatShare(0.004)).toBe('Same cost')
    expect(formatShare(-0.004)).toBe('Same cost')
  })
})
