import { describe, expect, it } from 'vitest'
import { DEFAULT_PROFILE } from '../profile'
import { THREE_SNAILS_DAMAGE, THREE_SNAILS_SHELL, THREE_SNAILS_SOURCE } from './skills'
import { ACCURACY_SOURCE, AP_PER_LEVEL, baseAccuracy, DOUBLE_STAB_HITS, DOUBLE_STAB_LEVELS, DOUBLE_STAB_SOURCE, HP_PER_LEVEL, hpPerLevelFrom } from './thief'

describe('baseAccuracy', () => {
  it('geeft 33 voor het voorbeeldprofiel (dex 25, level 10, luk 40), gelijk aan de accuracy daarin', () => {
    expect(baseAccuracy(25, 10, 40)).toBe(33)
    expect(String(baseAccuracy(25, 10, 40))).toBe(DEFAULT_PROFILE.accuracy)
  })

  it('rondt naar beneden af', () => {
    expect(baseAccuracy(0, 10, 5)).toBe(20) // 20,75
    expect(baseAccuracy(0, 11, 10)).toBe(22) // 22,0
  })
})

describe('baseAccuracy: geen drijvende-kommafout', () => {
  it('geeft precies 50, 53 en 56 waar 1,2 x dex + 0,6 x luk net onder een heel getal viel', () => {
    expect(baseAccuracy(1, 1, 228)).toBe(50)
    expect(baseAccuracy(1, 1, 248)).toBe(53)
    expect(baseAccuracy(1, 1, 268)).toBe(56)
  })
})

describe('hpPerLevelFrom', () => {
  it('is +16 onder level 10 en +22 vanaf level 10', () => {
    expect(hpPerLevelFrom(1)).toBe(16)
    expect(hpPerLevelFrom(9)).toBe(16)
    expect(hpPerLevelFrom(10)).toBe(22)
    expect(hpPerLevelFrom(11)).toBe(22)
    expect(hpPerLevelFrom(199)).toBe(22)
  })
})

describe('bronnen en constanten', () => {
  it('heeft per bron een meowdb-URL en een datum', () => {
    for (const s of [HP_PER_LEVEL.source, AP_PER_LEVEL.source, ACCURACY_SOURCE]) {
      expect(s.url).toMatch(/^https:\/\/meowdb\.com\/msclassic\/guides\/[a-z0-9-]+$/)
      expect(s.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('pint de waarden uit de bron', () => {
    expect(HP_PER_LEVEL.beginner).toBe(16)
    expect(HP_PER_LEVEL.thief).toBe(22)
    expect(HP_PER_LEVEL.thiefFromLevel).toBe(10)
    expect(AP_PER_LEVEL.amount).toBe(5)
    expect(ACCURACY_SOURCE.url).toBe('https://meowdb.com/msclassic/guides/thief-class-guide')
  })
})

describe("Double Stab en Three Snails (de skillpagina's, #139)", () => {
  it('Double Stab: 20 levels, 2 klappen, schade 80% +4 per level tot 152% op 19 en 160% op 20, MP 8 tot 16', () => {
    expect(DOUBLE_STAB_LEVELS).toHaveLength(20)
    expect(DOUBLE_STAB_HITS).toBe(2)
    expect(DOUBLE_STAB_LEVELS.slice(0, 19).map((l) => l.damagePct)).toEqual(Array.from({ length: 19 }, (_, i) => 80 + 4 * i))
    expect(DOUBLE_STAB_LEVELS[19]).toEqual({ level: 20, mp: 16, damagePct: 160 })
    expect(DOUBLE_STAB_LEVELS.map((l) => l.mp)).toEqual([8, 8, 8, 8, 9, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16])
    expect(DOUBLE_STAB_SOURCE).toEqual({ url: 'https://meowdb.com/msclassic/skills/thief/double-stab', retrieved: '2026-10-04' })
  })

  it('Three Snails: 15, 25 en 40 schade, met een Snail Shell, Blue en Red', () => {
    expect(THREE_SNAILS_DAMAGE).toEqual([15, 25, 40])
    expect(THREE_SNAILS_SHELL).toEqual(['Snail Shell', 'Blue Snail Shell', 'Red Snail Shell'])
    expect(THREE_SNAILS_SOURCE).toEqual({ url: 'https://meowdb.com/msclassic/skills/beginner/three-snails', retrieved: '2026-10-04' })
  })
})
