import { describe, expect, it } from 'vitest'
import { MAX_NAME_LENGTH, MAX_SPOTS, newDraft, parseAmount, toSpot, type SpotDraft } from './spotDraft'

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
    travel: '1000',
  }

  it('zet de tekstvelden om naar getallen, met potions en munitie op 0 (die staan niet in de plek)', () => {
    expect(toSpot(draft)).toEqual({
      id: 'a1',
      name: 'Ant Tunnel',
      expPerHour: 60_000,
      cost: { potions: 0, ammo: 0, travel: 1_000 },
    })
  })

  it('trimt de naam', () => {
    expect(toSpot(draft).name).toBe('Ant Tunnel')
  })

  it('maakt van een leeg veld NaN', () => {
    const s = toSpot({ ...draft, expPerHour: '', travel: ' ' })
    expect(s.expPerHour).toBeNaN()
    expect(s.cost.travel).toBeNaN()
  })
})

describe('grenzen', () => {
  it('heeft vaste grenzen van 200 plekken en 100 tekens', () => {
    expect(MAX_SPOTS).toBe(200)
    expect(MAX_NAME_LENGTH).toBe(100)
  })
})

describe('newDraft', () => {
  it('begint leeg, met reizen op 0', () => {
    expect(newDraft('x')).toEqual({ id: 'x', name: '', expPerHour: '', travel: '0' })
  })
})
