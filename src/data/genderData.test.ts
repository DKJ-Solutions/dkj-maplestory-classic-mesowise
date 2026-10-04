// Het geslacht in de winkeldata (issue #55, beslissing 2): elk stuk voor één geslacht heeft zijn eigen bron, en de
// mannen- en vrouwenversie van hetzelfde level zijn even sterk en even duur (anders zou het geslacht de berekening
// scheeftrekken in plaats van alleen de keuze te beperken).
import { describe, expect, it } from 'vitest'
import { NPC_ARMOR } from './armor'
import { NPC_WARRIOR_ARMOR } from './warrior'

const idOf = (url: string) => Number(url.split('/').pop())

describe.each([
  ['NPC_ARMOR', NPC_ARMOR],
  ['NPC_WARRIOR_ARMOR', NPC_WARRIOR_ARMOR],
] as const)('%s: stukken voor één geslacht', (_name, rows) => {
  const gendered = rows.filter((a) => a.gender !== undefined)

  it('heeft stukken voor één geslacht', () => {
    expect(gendered.length).toBeGreaterThan(0)
  })

  it('geeft elk stuk voor één geslacht een eigen item-db/<id> als bron, opgehaald op 2026-10-04', () => {
    for (const a of gendered) {
      expect(['male', 'female'], a.name).toContain(a.gender)
      expect(a.source.url, a.name).toMatch(/^https:\/\/meowdb\.com\/msclassic\/item-db\/\d+$/)
      expect(a.source.retrieved, a.name).toBe('2026-10-04')
    }
    expect(new Set(gendered.map((a) => idOf(a.source.url))).size).toBe(gendered.length)
  })
})

describe('NPC_WARRIOR_ARMOR: man en vrouw even sterk', () => {
  it('heeft per (slot, level) waar beide geslachten een stuk hebben, dezelfde WDEF, STR, DEX en prijs', () => {
    let compared = 0
    for (const slot of ['top', 'bottom', 'overall'] as const) {
      for (let level = 10; level <= 30; level++) {
        const male = NPC_WARRIOR_ARMOR.filter((a) => a.slot === slot && a.level === level && a.gender === 'male')
        const female = NPC_WARRIOR_ARMOR.filter((a) => a.slot === slot && a.level === level && a.gender === 'female')
        if (male.length === 0 || female.length === 0) continue
        for (const m of male) {
          for (const f of female) {
            expect([m.wdef, m.str, m.dex, m.price], `${m.name} / ${f.name}`).toEqual([f.wdef, f.str, f.dex, f.price])
            compared++
          }
        }
      }
    }
    expect(compared, 'er moeten echt paren vergeleken zijn').toBeGreaterThan(5)
  })

  it('heeft de T-shirts van lv 12 (960 man, 962 vrouw) in beide lijsten, even sterk', () => {
    for (const rows of [NPC_ARMOR, NPC_WARRIOR_ARMOR]) {
      const m = rows.find((a) => a.name === 'Blue One-lined T-Shirt')!
      const f = rows.find((a) => a.name === 'Pink Starry Shirt')!
      expect([m.gender, f.gender]).toEqual(['male', 'female'])
      expect([idOf(m.source.url), idOf(f.source.url)]).toEqual([960, 962])
      expect([m.slot, m.level, m.wdef, m.price]).toEqual([f.slot, f.level, f.wdef, f.price])
    }
  })
})
