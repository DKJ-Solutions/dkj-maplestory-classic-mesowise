import { describe, expect, it } from 'vitest'
import { DAGGER_SHOP_SOURCE, isNpcDagger, NPC_DAGGERS } from './daggers'
import { ATTACK_MS } from './thief'

describe('NPC_DAGGERS', () => {
  it('bevat precies de negen NPC-daggers, van laag naar hoog level, zoals de bron ze geeft', () => {
    const rows = NPC_DAGGERS.map((d) => [d.name, d.level, d.watk, d.speed.attackMs, d.str ?? 0, d.dex ?? 0, d.luk ?? 0, d.price])
    expect(rows).toEqual([
      ['Triangular Zamadar', 10, 28, ATTACK_MS.fast4, 0, 0, 20, 3_000],
      ['Field Dagger', 15, 30, ATTACK_MS.faster3, 0, 10, 20, 5_000],
      ['Triple-Tipped Zamadar', 17, 35, ATTACK_MS.fast4, 0, 11, 31, 5_800],
      ['Coconut Knife', 20, 35, ATTACK_MS.faster3, 0, 15, 30, 10_500],
      ['Stinger', 22, 40, ATTACK_MS.fast4, 17, 0, 44, 11_700],
      ['Iron Dagger', 25, 40, ATTACK_MS.faster3, 20, 0, 40, 13_500],
      ['Forked Dagger', 27, 45, ATTACK_MS.fast4, 0, 22, 54, 14_700],
      ['Cass', 30, 45, ATTACK_MS.faster3, 25, 0, 60, 22_000],
      ['Reef Claw', 30, 48, ATTACK_MS.fast4, 0, 25, 60, 22_000],
    ])
  })

  it('loopt op in level, van 10 tot en met 30', () => {
    for (let i = 1; i < NPC_DAGGERS.length; i++) expect(NPC_DAGGERS[i].level).toBeGreaterThanOrEqual(NPC_DAGGERS[i - 1].level)
    expect(NPC_DAGGERS[0].level).toBe(10)
    expect(NPC_DAGGERS[NPC_DAGGERS.length - 1].level).toBe(30)
    for (const d of NPC_DAGGERS) expect(d.level, d.name).toBeGreaterThanOrEqual(10)
  })

  it('geeft elke rij een eigen MeowDB-itempagina als bron, met een datum, en een prijs', () => {
    for (const d of NPC_DAGGERS) {
      expect(d.source.url, d.name).toMatch(/^https:\/\/meowdb\.com\/msclassic\/item-db\/\d+$/)
      expect(d.source.retrieved, d.name).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(d.price, d.name).toBeGreaterThan(0)
    }
    expect(new Set(NPC_DAGGERS.map((d) => d.source.url)).size).toBe(NPC_DAGGERS.length)
  })

  it('rekent met de verwachte multiplier van de dagger (1,4) en kent alleen Faster (3) en Fast (4)', () => {
    for (const d of NPC_DAGGERS) {
      expect(d.mult, d.name).toBeCloseTo(1.4, 10)
      expect([ATTACK_MS.faster3, ATTACK_MS.fast4], d.name).toContain(d.speed.attackMs)
    }
    expect(NPC_DAGGERS.map((d) => d.speed.label)).toEqual(['Fast (4)', 'Faster (3)', 'Fast (4)', 'Faster (3)', 'Fast (4)', 'Faster (3)', 'Fast (4)', 'Faster (3)', 'Fast (4)'])
  })

  it('verwijst voor de winkelprijzen naar de winkel van Cutthroat Manny', () => {
    expect(DAGGER_SHOP_SOURCE.url).toBe('https://meowdb.com/msclassic/npcs/408')
    expect(DAGGER_SHOP_SOURCE.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('isNpcDagger', () => {
  it('herkent elke NPC-dagger op naam, en niets anders', () => {
    for (const d of NPC_DAGGERS) expect(isNpcDagger(d.name), d.name).toBe(true)
    for (const n of ['Garnier', 'Sword', 'Razor', 'Steel Guards', '']) expect(isNpcDagger(n), n).toBe(false)
  })
})
