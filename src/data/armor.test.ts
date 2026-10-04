import { describe, expect, it } from 'vitest'
import { NPC_ARMOR } from './armor'
import { EXP_TABLE_LEVELS } from './expTable'

const SLOTS = ['hat', 'top', 'bottom', 'shoes'] as const
/** De stukken zonder jobregel op MeowDB: voor elke klas, dus zonder stat-eis (Dave, #55, 2026-10-04). */
const NO_JOB_LINE = ['White Bandana', 'Red Baseball Cap', 'Blue One-lined T-Shirt', 'Pink Starry Shirt']
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

  it('heeft alleen bekende slots en levels binnen 10 tot 30 (binnen de EXP-tabel)', () => {
    const first = EXP_TABLE_LEVELS[0]
    const last = EXP_TABLE_LEVELS[EXP_TABLE_LEVELS.length - 1]
    expect([first, last]).toEqual([1, 30])
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

  it('heeft 22 stukken: 17 met jobregel, de White Bandana en de Red Baseball Cap zonder, en sinds #55 de drie stukken voor één geslacht', () => {
    expect(NPC_ARMOR).toHaveLength(22)
    expect(NPC_ARMOR.filter((a) => a.gender).map((a) => [a.name, a.gender])).toEqual([
      ['Blue One-lined T-Shirt', 'male'],
      ['Pink Starry Shirt', 'female'],
      ['Red Qi Pao Skirt', 'female'],
    ])
  })

  it('heeft de drie stukken voor één geslacht precies zoals op MeowDB gelezen (960, 962, 1216)', () => {
    const pick = (n: string) => NPC_ARMOR.find((a) => a.name === n)
    expect(pick('Blue One-lined T-Shirt')).toEqual({
      name: 'Blue One-lined T-Shirt', slot: 'top', level: 12, wdef: 26, luk: 0, dex: 0, price: 2_400, gender: 'male',
      source: { url: 'https://meowdb.com/msclassic/item-db/960', retrieved: '2026-10-04' },
    })
    expect(pick('Pink Starry Shirt')).toEqual({
      name: 'Pink Starry Shirt', slot: 'top', level: 12, wdef: 26, luk: 0, dex: 0, price: 2_400, gender: 'female',
      source: { url: 'https://meowdb.com/msclassic/item-db/962', retrieved: '2026-10-04' },
    })
    expect(pick('Red Qi Pao Skirt')).toEqual({
      name: 'Red Qi Pao Skirt', slot: 'bottom', level: 22, wdef: 24, luk: 34, dex: 12, price: 5_280, gender: 'female',
      source: { url: 'https://meowdb.com/msclassic/item-db/1216', retrieved: '2026-10-04' },
    })
  })

  it('heeft de White Bandana (719) en de Red Baseball Cap (781) zonder jobregel precies zoals op MeowDB gelezen', () => {
    expect(NPC_ARMOR.find((a) => a.name === 'White Bandana')).toEqual({
      name: 'White Bandana', slot: 'hat', level: 10, wdef: 15, luk: 0, dex: 0, price: 1_200,
      source: { url: 'https://meowdb.com/msclassic/item-db/719', retrieved: '2026-10-04' },
    })
    expect(NPC_ARMOR.find((a) => a.name === 'Red Baseball Cap')).toEqual({
      name: 'Red Baseball Cap', slot: 'hat', level: 22, wdef: 22, luk: 0, dex: 0, price: 3_900,
      source: { url: 'https://meowdb.com/msclassic/item-db/781', retrieved: '2026-10-04' },
    })
  })

  it('heeft LUK 0 en DEX 0 bij de stukken zonder jobregel (geen stat-eis), en bij alle andere minstens één eis', () => {
    for (const a of NPC_ARMOR) {
      const noReq = a.luk === 0 && a.dex === 0
      expect(noReq, a.name).toBe(NO_JOB_LINE.includes(a.name))
    }
  })

  it('heeft de Red Ghetto Beanie (id 732, Don Hwang, Kerning City) precies zoals op MeowDB gelezen', () => {
    expect(NPC_ARMOR.find((a) => a.name === 'Red Ghetto Beanie')).toEqual({
      name: 'Red Ghetto Beanie', slot: 'hat', level: 10, wdef: 15, luk: 10, dex: 0, price: 1_200,
      source: { url: 'https://meowdb.com/msclassic/item-db/732', retrieved: '2026-10-04' },
    })
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
