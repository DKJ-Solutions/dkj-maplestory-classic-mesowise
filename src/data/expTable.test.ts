import { describe, expect, it } from 'vitest'
import { EXP_TABLE_LEVELS, EXP_TABLE_SOURCE, FIRST_LEVEL, expToNextLevel } from './expTable'

describe('de EXP-tabel', () => {
  it('dekt precies lv 1 tot en met 30', () => {
    expect(EXP_TABLE_LEVELS).toEqual(Array.from({ length: 30 }, (_, i) => 1 + i))
    expect(FIRST_LEVEL).toBe(1)
  })

  it('heeft per level een heel getal groter dan 0 dat met elk level stijgt', () => {
    let previous = 0
    for (const level of EXP_TABLE_LEVELS) {
      const exp = expToNextLevel(level)!
      expect(Number.isInteger(exp), `lv ${level}`).toBe(true)
      expect(exp, `lv ${level}`).toBeGreaterThan(previous)
      previous = exp
    }
  })

  it('telt lv 1–9 op tot de 3.347 die de bronpagina vóór lv 10 zet (issue #146)', () => {
    const sum = EXP_TABLE_LEVELS.filter((l) => l <= 9).reduce((s, level) => s + expToNextLevel(level)!, 0)
    expect(sum).toBe(3_347)
  })

  it('noemt lv 1 tot en met 9 zoals de bronpagina (guides/exp-table-level-1-to-100)', () => {
    const expected = [15, 34, 57, 92, 135, 372, 560, 840, 1_242]
    expect(expected.map((_, i) => expToNextLevel(1 + i))).toEqual(expected)
  })

  it('telt op tot het verschil in de cumulatieve kolom van de bronpagina (3.347 tot 97.841)', () => {
    // De pagina zet 3.347 EXP vóór lv 10 en 97.841 vóór lv 21: het verschil is de som van lv 10–20.
    const sum = EXP_TABLE_LEVELS.filter((l) => l >= 10 && l <= 20).reduce((s, level) => s + expToNextLevel(level)!, 0)
    expect(sum).toBe(97_841 - 3_347)
  })

  it('noemt de waarden van de randen zoals de bron ze geeft', () => {
    expect(expToNextLevel(10)).toBe(1_716)
    expect(expToNextLevel(20)).toBe(20_216)
    expect(expToNextLevel(21)).toBe(24_402)
    expect(expToNextLevel(30)).toBe(95_700)
  })

  it('noemt lv 21 tot en met 30 zoals de bronpagina (guides/exp-table-level-1-to-100)', () => {
    const expected = [24_402, 28_980, 34_320, 40_512, 47_216, 54_900, 63_666, 73_080, 83_720, 95_700]
    expect(expected.map((_, i) => expToNextLevel(21 + i))).toEqual(expected)
  })

  it('geeft undefined buiten de tabel of bij een gebroken level', () => {
    for (const level of [0, -1, 31, 10.5, Number.NaN]) expect(expToNextLevel(level), `lv ${level}`).toBeUndefined()
  })

  it('heeft een MeowDB-bron met een datum', () => {
    expect(EXP_TABLE_SOURCE.url).toMatch(/^https:\/\/meowdb\.com\/msclassic\//)
    expect(EXP_TABLE_SOURCE.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
