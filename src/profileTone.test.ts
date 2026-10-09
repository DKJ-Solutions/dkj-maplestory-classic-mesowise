import { describe, expect, it } from 'vitest'
import { formatShare, profileShare } from './profileTone'

describe('profileShare', () => {
  it('is het verschil als deel van de base: van Profile tegen Cheapest, en omgekeerd van Cheapest tegen Profile', () => {
    expect(profileShare(10_000, 11_800)).toBeCloseTo(0.18)
    expect(profileShare(10_000, 9_500)).toBeCloseTo(-0.05)
    expect(profileShare(10_000, 10_000)).toBe(0)
    expect(profileShare(11_800, 10_000)).toBeCloseTo(-1_800 / 11_800)
  })

  it('heeft geen deel als de base niets kost', () => {
    expect(profileShare(0, 500)).toBeNull()
  })
})

describe('formatShare', () => {
  it('zegt in woorden of een kaart duurder of goedkoper is dan de andere, afgerond op hele procenten', () => {
    expect(formatShare(0.57)).toBe('+57% more expensive')
    expect(formatShare(-0.05)).toBe('5% cheaper')
    expect(formatShare(0.004)).toBe('Same cost')
    expect(formatShare(-0.004)).toBe('Same cost')
  })
})
