import { describe, expect, it } from 'vitest'
import type { Spot } from './calc/rankSpots'
import { MAX_NAME_LENGTH, MAX_SPOTS, newDraft, parseAmount, toDraft, toSpot, type SpotDraft } from './spotDraft'

describe('parseAmount', () => {
  it('leest gewone getallen', () => {
    expect(parseAmount('60000')).toBe(60_000)
    expect(parseAmount('0')).toBe(0)
    expect(parseAmount('3.5')).toBe(3.5)
    expect(parseAmount(' 12 ')).toBe(12)
  })

  it('geeft NaN voor een leeg veld of alleen spaties (en niet stilletjes 0)', () => {
    expect(parseAmount('')).toBeNaN()
    expect(parseAmount('   ')).toBeNaN()
  })

  it('geeft NaN voor tekst die geen getal is', () => {
    expect(parseAmount('abc')).toBeNaN()
  })
})

describe('toSpot', () => {
  const draft: SpotDraft = {
    id: 'a1',
    name: '  Ant Tunnel  ',
    expPerHour: '60000',
    potions: '10000',
    ammo: '4000',
    travel: '1000',
  }

  it('zet de tekstvelden om naar getallen', () => {
    expect(toSpot(draft)).toEqual({
      id: 'a1',
      name: 'Ant Tunnel',
      expPerHour: 60_000,
      cost: { potions: 10_000, ammo: 4_000, travel: 1_000 },
    })
  })

  it('trimt de naam', () => {
    expect(toSpot(draft).name).toBe('Ant Tunnel')
  })

  it('maakt van een leeg veld NaN', () => {
    const s = toSpot({ ...draft, expPerHour: '', ammo: ' ' })
    expect(s.expPerHour).toBeNaN()
    expect(s.cost.ammo).toBeNaN()
    expect(s.cost.potions).toBe(10_000)
  })
})

describe('toDraft', () => {
  const spot: Spot = {
    id: 'b2',
    name: 'Sleepywood',
    expPerHour: 45_000,
    cost: { potions: 7_500, ammo: 0, travel: 250 },
  }

  it('zet getallen om naar tekst', () => {
    expect(toDraft(spot)).toEqual({
      id: 'b2',
      name: 'Sleepywood',
      expPerHour: '45000',
      potions: '7500',
      ammo: '0',
      travel: '250',
    })
  })

  it('geeft heen en terug dezelfde plek', () => {
    expect(toSpot(toDraft(spot))).toEqual(spot)
  })
})

describe('grenzen', () => {
  it('heeft vaste grenzen van 200 plekken en 100 tekens', () => {
    expect(MAX_SPOTS).toBe(200)
    expect(MAX_NAME_LENGTH).toBe(100)
  })
})

describe('newDraft', () => {
  it('begint leeg, met kosten op 0', () => {
    expect(newDraft('x')).toEqual({ id: 'x', name: '', expPerHour: '', potions: '0', ammo: '0', travel: '0' })
  })
})
