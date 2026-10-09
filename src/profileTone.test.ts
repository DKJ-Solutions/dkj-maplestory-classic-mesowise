import { describe, expect, it } from 'vitest'
import { CLOSE_SHARE, FAR_SHARE, profileTone } from './profileTone'

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
