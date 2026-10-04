import { describe, expect, it } from 'vitest'
import { ACCESSORIES, accessoriesFor } from './accessories'
import { WORN_ARMOR } from './wornItems'

const SLOTS = ['shield', 'gloves', 'cape', 'earrings'] as const
const idOf = (url: string) => Number(url.split('/').pop())
const byId = (id: number) => ACCESSORIES.find((a) => idOf(a.source.url) === id)

describe('ACCESSORIES (#125)', () => {
  it('bevat 11 shields, 40 gloves, 1 cape en 10 earrings: alles tot level 30 uit het MeowDB-overzicht', () => {
    const count = (s: string) => ACCESSORIES.filter((a) => a.slot === s).length
    expect([count('shield'), count('gloves'), count('cape'), count('earrings')]).toEqual([11, 40, 1, 10])
    expect(ACCESSORIES).toHaveLength(62)
  })

  it('geeft elke rij een eigen MeowDB-itempagina als bron, opgehaald op 2026-10-04', () => {
    for (const a of ACCESSORIES) {
      expect(a.source.url, a.name).toMatch(/^https:\/\/meowdb\.com\/msclassic\/item-db\/\d+$/)
      expect(a.source.retrieved, a.name).toBe('2026-10-04')
    }
    expect(new Set(ACCESSORIES.map((a) => idOf(a.source.url))).size).toBe(ACCESSORIES.length)
    expect(new Set(ACCESSORIES.map((a) => a.name)).size).toBe(ACCESSORIES.length)
  })

  it('heeft alleen de vier slots, levels tot en met 30, gehele stats en geen geslacht', () => {
    for (const a of ACCESSORIES) {
      expect(SLOTS, a.name).toContain(a.slot)
      expect(Number.isInteger(a.level) && a.level >= 0 && a.level <= 30, a.name).toBe(true)
      expect(Number.isInteger(a.wdef) && a.wdef >= 0, a.name).toBe(true)
      if (a.mdef !== undefined) expect(Number.isInteger(a.mdef) && a.mdef > 0, a.name).toBe(true)
      expect(a.gender, a.name).toBeUndefined()
    }
  })

  it('staat gesorteerd op slot (shield, gloves, cape, earrings), dan op level', () => {
    const rank = (s: string) => SLOTS.indexOf(s as (typeof SLOTS)[number])
    for (let i = 1; i < ACCESSORIES.length; i++) {
      const p = ACCESSORIES[i - 1]
      const c = ACCESSORIES[i]
      expect(rank(c.slot) - rank(p.slot) || c.level - p.level, `${p.name} -> ${c.name}`).toBeGreaterThanOrEqual(0)
    }
  })

  it('neemt de waarden van de itempagina over (steekproef per slot)', () => {
    expect(byId(925)).toMatchObject({ name: 'Red Cross Shield', level: 30, wdef: 110, jobs: ['warrior'] })
    expect(byId(920)).toMatchObject({ name: 'Mystic Shield', level: 22, wdef: 20, mdef: 42, jobs: ['magician'] })
    expect(byId(1435)).toMatchObject({ name: 'Work Gloves', level: 10, wdef: 6 })
    expect(byId(1435)?.jobs).toBeUndefined()
    expect(byId(1466)).toMatchObject({ name: 'Red Lutia', level: 30, wdef: 6, mdef: 8, jobs: ['magician'] })
    expect(byId(889)).toMatchObject({ name: 'Old Raggedy Cape', level: 25, wdef: 12, mdef: 5 })
    expect(byId(908)).toMatchObject({ name: 'Star Earrings', level: 30, wdef: 0, mdef: 27 })
  })

  it('geeft earrings alleen MDEF, en geen ander slot WDEF 0', () => {
    for (const a of ACCESSORIES) {
      if (a.slot === 'earrings') expect([a.wdef, a.mdef! > 0], a.name).toEqual([0, true])
      else expect(a.wdef, a.name).toBeGreaterThan(0)
    }
  })

  it('kiest per job wat hij mag dragen: zonder jobregel voor iedereen, anders alleen de eigen job', () => {
    for (const job of ['thief', 'warrior', 'bowman', 'magician'] as const) {
      const mine = accessoriesFor(job)
      for (const a of ACCESSORIES) expect(mine.includes(a), `${job} ${a.name}`).toBe(!a.jobs || a.jobs.includes(job))
    }
    expect(accessoriesFor('thief').map((a) => a.name)).toContain('Jurgen Wristguard')
    expect(accessoriesFor('bowman').map((a) => a.name)).not.toContain('Jurgen Wristguard')
  })

  it('deelt geen naam met de andere armor zonder prijs', () => {
    const other = new Set(WORN_ARMOR.map((a) => a.name))
    for (const a of ACCESSORIES) expect(other.has(a.name), a.name).toBe(false)
  })
})
