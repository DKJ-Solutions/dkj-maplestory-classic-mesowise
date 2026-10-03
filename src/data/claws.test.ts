import { describe, expect, it } from 'vitest'
import { NPC_CLAWS } from './claws'
import { ATTACK_MS } from './thief'

describe('NPC_CLAWS', () => {
  it('bevat precies de zes NPC-claws, van laag naar hoog level, zoals de bron ze geeft', () => {
    const rows = NPC_CLAWS.map((c) => [c.name, c.level, c.watk, c.speed.attackMs, c.luk, c.dex, c.price])
    expect(rows).toEqual([
      ['Garnier', 10, 10, ATTACK_MS.fast5, 25, 0, 5_000],
      ['Steel Titans', 15, 13, ATTACK_MS.fast4, 35, 15, 7_000],
      ['Steel Igor', 20, 17, ATTACK_MS.fast4, 45, 20, 14_100],
      ['Meba', 25, 19, ATTACK_MS.faster3, 55, 25, 16_500],
      ['Steel Guards', 30, 22, ATTACK_MS.fast4, 65, 30, 26_000],
      ['Adamantium Guards', 30, 23, ATTACK_MS.fast4, 65, 30, 27_600],
    ])
  })

  it('noemt de snelheid zoals het spel hem noemt', () => {
    expect(NPC_CLAWS.map((c) => c.speed.label)).toEqual(['Fast (5)', 'Fast (4)', 'Fast (4)', 'Faster (3)', 'Fast (4)', 'Fast (4)'])
  })

  it('geeft elke rij een MeowDB-itempagina als bron, met een datum', () => {
    for (const c of NPC_CLAWS) {
      expect(c.source.url, c.name).toMatch(/^https:\/\/meowdb\.com\/msclassic\/item-db\/\d+$/)
      expect(c.source.retrieved, c.name).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('verwijst per claw naar een eigen pagina', () => {
    expect(new Set(NPC_CLAWS.map((c) => c.source.url)).size).toBe(NPC_CLAWS.length)
  })

  it('loopt op in level en weapon attack en kost meer naarmate hij beter is', () => {
    for (let i = 1; i < NPC_CLAWS.length; i++) {
      expect(NPC_CLAWS[i].level).toBeGreaterThanOrEqual(NPC_CLAWS[i - 1].level)
      expect(NPC_CLAWS[i].watk).toBeGreaterThan(NPC_CLAWS[i - 1].watk)
      expect(NPC_CLAWS[i].price).toBeGreaterThan(NPC_CLAWS[i - 1].price)
    }
  })
})
