import { describe, expect, it } from 'vitest'
import { NPC_ARMOR } from './armor'
import { EXP_TABLE_LEVELS } from './expTable'

const SLOTS = ['hat', 'top', 'bottom', 'shoes'] as const
const slotRank = (s: string) => SLOTS.indexOf(s as (typeof SLOTS)[number])

describe('NPC_ARMOR', () => {
  it('geeft elke rij een MeowDB-itempagina als bron, met een datum', () => {
    for (const a of NPC_ARMOR) {
      expect(a.source.url, a.name).toMatch(/^https:\/\/meowdb\.com\/msclassic\/item-db\/\d+$/)
      expect(a.source.retrieved, a.name).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('verwijst per stuk naar een eigen pagina en gebruikt elke naam één keer', () => {
    expect(new Set(NPC_ARMOR.map((a) => a.source.url)).size).toBe(NPC_ARMOR.length)
    expect(new Set(NPC_ARMOR.map((a) => a.name)).size).toBe(NPC_ARMOR.length)
  })

  it('heeft alleen bekende slots en levels binnen 10 tot 30 (de EXP-tabel)', () => {
    const first = EXP_TABLE_LEVELS[0]
    const last = EXP_TABLE_LEVELS[EXP_TABLE_LEVELS.length - 1]
    expect([first, last]).toEqual([10, 30])
    for (const a of NPC_ARMOR) {
      expect(SLOTS, a.name).toContain(a.slot)
      expect(a.level, a.name).toBeGreaterThanOrEqual(10)
      expect(a.level, a.name).toBeLessThanOrEqual(30)
    }
  })

  it('heeft elk van de vier slots minstens één keer', () => {
    expect(new Set(NPC_ARMOR.map((a) => a.slot))).toEqual(new Set(SLOTS))
  })

  it('staat gesorteerd op slot (hat, top, bottom, shoes), dan op level', () => {
    for (let i = 1; i < NPC_ARMOR.length; i++) {
      const p = NPC_ARMOR[i - 1]
      const c = NPC_ARMOR[i]
      const order = slotRank(c.slot) - slotRank(p.slot) || c.level - p.level
      expect(order, `${p.name} -> ${c.name}`).toBeGreaterThanOrEqual(0)
    }
  })

  it('heeft positieve WDEF en prijs, en niet-negatieve LUK en DEX, als hele getallen', () => {
    for (const a of NPC_ARMOR) {
      expect(Number.isInteger(a.wdef) && a.wdef > 0, `${a.name} wdef`).toBe(true)
      expect(Number.isInteger(a.price) && a.price > 0, `${a.name} price`).toBe(true)
      expect(Number.isInteger(a.luk) && a.luk >= 0, `${a.name} luk`).toBe(true)
      expect(Number.isInteger(a.dex) && a.dex >= 0, `${a.name} dex`).toBe(true)
    }
  })

  it('heeft de Red Qi Pao Skirt (id 1216, alleen voor vrouwen) er niet in, en dus 16 stukken', () => {
    expect(NPC_ARMOR.map((a) => a.name)).not.toContain('Red Qi Pao Skirt')
    expect(NPC_ARMOR.map((a) => a.source.url)).not.toContain('https://meowdb.com/msclassic/item-db/1216')
    expect(NPC_ARMOR).toHaveLength(16)
  })

  it('geeft binnen een slot een hoger level nooit minder WDEF', () => {
    for (const slot of SLOTS) {
      const rows = NPC_ARMOR.filter((a) => a.slot === slot)
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i].wdef, `${rows[i - 1].name} -> ${rows[i].name}`).toBeGreaterThanOrEqual(rows[i - 1].wdef)
      }
    }
  })
})
