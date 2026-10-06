import { describe, expect, it } from 'vitest'
import { expToNextLevel } from './data/expTable'
import { writeOff } from './writeOff'

describe('writeOff (Dave, 6 oktober 2026, #192)', () => {
  it('geeft bij een horizon van één level de volle prijs', () => {
    expect(writeOff(7000, 20, 20, 20)).toMatchObject({ share: 1, meso: 7000 })
  })

  it('verdeelt de prijs over de levels naar hun EXP: prijs × EXP van dit level / EXP van de horizon, naar boven afgerond', () => {
    const w = writeOff(7000, 20, 20, 24)
    let sum = 0
    for (let l = 20; l <= 24; l++) sum += expToNextLevel(l)!
    expect(w.thisExp).toBe(expToNextLevel(20))
    expect(w.sumExp).toBe(sum)
    expect(w.share).toBeCloseTo(w.thisExp / sum, 12)
    expect(w.meso).toBe(Math.ceil(7000 * w.share - 1e-9))
    expect(w.meso).toBeLessThan(7000)
  })

  it('telt over de hele horizon op tot ongeveer de prijs (hoogstens één meso per level te veel door afronden)', () => {
    const from = 20
    const to = 26
    let total = 0
    for (let level = from; level <= to; level++) total += writeOff(12_345, level, from, to).meso
    expect(total).toBeGreaterThanOrEqual(12_345)
    expect(total - 12_345).toBeLessThanOrEqual(to - from + 1)
  })

  it('rondt zonder rekenruis: een deel dat precies hele meso is, blijft staan', () => {
    expect(writeOff(0, 20, 20, 24).meso).toBe(0)
  })

  it('geeft de volle prijs als het level buiten de horizon of buiten de EXP-tabel valt', () => {
    expect(writeOff(5000, 20, 21, 24).meso).toBe(5000)
    expect(writeOff(5000, 999, 999, 999).meso).toBe(5000)
  })
})
