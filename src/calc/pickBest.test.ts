import { describe, expect, it } from 'vitest'
import { MIN_EXP_SHARE, pickBest } from './pickBest'
import { rankSpots, type Spot } from './rankSpots'

// Ammo en reis op 0: EXP per meso is dan EXP per uur gedeeld door de potionkosten.
const spot = (id: string, expPerHour: number, potions: number): Spot => ({
  id,
  name: id,
  expPerHour,
  cost: { potions, ammo: 0, travel: 0 },
})
const never = () => false

describe('pickBest', () => {
  it('kiest de bovenste plek als niets hem uitsluit', () => {
    const ranked = rankSpots([spot('a', 10_000, 1_000), spot('b', 10_000, 2_000)])
    expect(pickBest(ranked, never)).toEqual({ bestId: 'a', excluded: new Map() })
  })

  it('slaat een plek met minder dan de helft van de hoogste EXP per uur over (de Snail-val)', () => {
    // De Snail: 10 EXP per meso, maar 1_000 EXP per uur; de andere 5 EXP per meso bij 20_000.
    const ranked = rankSpots([spot('snail', 1_000, 100), spot('goed', 20_000, 4_000)])
    expect(ranked[0].spot.id).toBe('snail')
    const pick = pickBest(ranked, never)
    expect(pick.bestId).toBe('goed')
    expect(pick.excluded.get('snail')).toBe('lowExp')
  })

  it('telt precies de helft nog mee, net eronder niet', () => {
    expect(MIN_EXP_SHARE).toBe(0.5)
    const top = spot('top', 10_000, 10_000)
    expect(pickBest(rankSpots([spot('half', 5_000, 1), top]), never).bestId).toBe('half')
    expect(pickBest(rankSpots([spot('net-niet', 4_999, 1), top]), never).bestId).toBe('top')
  })

  it('slaat een gevaarlijke plek over, en gevaar gaat voor lage EXP', () => {
    const ranked = rankSpots([spot('eng', 1_000, 10), spot('a', 10_000, 1_000), spot('b', 9_000, 1_000)])
    const pick = pickBest(ranked, (id) => id === 'eng' || id === 'a')
    expect(pick.bestId).toBe('b')
    expect(pick.excluded).toEqual(
      new Map([
        ['eng', 'dangerous'],
        ['a', 'dangerous'],
      ]),
    )
  })

  it('laat een gevaarlijke plek de lat voor de ondergrens niet leggen', () => {
    // Zonder deze regel zou 'eng' (100_000 EXP per uur) beide veilige plekken onder de helft duwen.
    const ranked = rankSpots([spot('eng', 100_000, 1_000), spot('a', 10_000, 1_000), spot('b', 4_000, 1_000)])
    const pick = pickBest(ranked, (id) => id === 'eng')
    expect(pick.bestId).toBe('a')
    expect(pick.excluded).toEqual(
      new Map([
        ['eng', 'dangerous'],
        ['b', 'lowExp'],
      ]),
    )
  })

  it('geeft null als elke plek is uitgesloten', () => {
    const ranked = rankSpots([spot('a', 10_000, 1_000), spot('b', 9_000, 1_000)])
    expect(pickBest(ranked, () => true).bestId).toBeNull()
  })

  it('vergelijkt niets bij één plek of een ongeldige bovenste', () => {
    expect(pickBest(rankSpots([spot('a', 10_000, 1_000)]), never).bestId).toBeNull()
    expect(pickBest(rankSpots([spot('x', NaN, 1), spot('y', NaN, 1)]), never).bestId).toBeNull()
  })

  it('negeert ongeldige plekken voor de ondergrens', () => {
    const ranked = rankSpots([spot('a', 1_000, 100), spot('b', 900, 100), spot('kapot', NaN, 1)])
    expect(pickBest(ranked, never).bestId).toBe('a')
  })

  it('kiest een plek die niets kost (Infinity) als hij genoeg EXP per uur oplevert', () => {
    const ranked = rankSpots([spot('gratis', 8_000, 0), spot('a', 10_000, 1_000)])
    expect(pickBest(ranked, never).bestId).toBe('gratis')
  })
})
