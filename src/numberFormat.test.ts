import { describe, expect, it } from 'vitest'
import { compactMeso } from './numberFormat'

describe('compactMeso: bedragen kort, zoals 14.1k (Dave, 7 oktober 2026)', () => {
  it('schrijft duizenden als k met één decimaal, afgerond', () => {
    expect(compactMeso(14100)).toBe('14.1k')
    expect(compactMeso(1875)).toBe('1.9k')
    expect(compactMeso(1849)).toBe('1.8k')
    expect(compactMeso(1850)).toBe('1.9k')
  })

  it('laat ".0" weg bij een hele waarde', () => {
    expect(compactMeso(14000)).toBe('14k')
    expect(compactMeso(1000)).toBe('1k')
    expect(compactMeso(14040)).toBe('14k')
  })

  it('houdt een bedrag onder de duizend heel', () => {
    expect(compactMeso(0)).toBe('0')
    expect(compactMeso(218)).toBe('218')
    expect(compactMeso(999)).toBe('999')
  })

  it('gaat over op k of M waar het afronden de grens haalt', () => {
    expect(compactMeso(999.6)).toBe('1k')
    expect(compactMeso(999949)).toBe('999.9k')
    expect(compactMeso(999950)).toBe('1M')
    expect(compactMeso(2_340_000)).toBe('2.3M')
  })

  it('zet een min voor een negatief bedrag', () => {
    expect(compactMeso(-1875)).toBe('-1.9k')
  })
})
