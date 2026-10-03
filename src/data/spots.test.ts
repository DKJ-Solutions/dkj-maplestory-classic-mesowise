import { describe, expect, it } from 'vitest'
import { KNOWN_SPOTS, POTIONS, findKnownSpot, knownSpotPatch, monsterLevels } from './spots'
import type { Source } from './types'
import { newDraft } from '../spotDraft'

/** Elke bron: een https-pagina op meowdb.com en een echte kalenderdatum, niet in de toekomst. */
function expectValidSource(source: Source, where: string) {
  expect(source.url, where).toMatch(/^https:\/\/meowdb\.com\/\S+$/)
  expect(source.retrieved, where).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  const date = new Date(`${source.retrieved}T00:00:00Z`)
  expect(Number.isNaN(date.getTime()), where).toBe(false)
  // 2026-02-30 wordt in JS 2026-03-02: de datum moet terugkomen zoals hij er stond.
  expect(date.toISOString().slice(0, 10), where).toBe(source.retrieved)
  // Een dag speling: de datum is middernacht UTC, de klok van de testmachine kan erachter lopen.
  expect(date.getTime(), where).toBeLessThanOrEqual(Date.now() + 24 * 60 * 60 * 1000)
}

/** Eindig en niet negatief. */
function expectAmount(value: number, where: string) {
  expect(Number.isFinite(value), where).toBe(true)
  expect(value, where).toBeGreaterThanOrEqual(0)
}

describe('de bekende plekken', () => {
  it('zijn er, en alleen de gekozen plekken: geen hele tabel', () => {
    expect(KNOWN_SPOTS.length).toBeGreaterThan(0)
    expect(KNOWN_SPOTS.length).toBeLessThanOrEqual(10)
  })

  it('hebben elk een unieke, niet-lege id', () => {
    const ids = KNOWN_SPOTS.map((k) => k.id)
    expect(ids.every((id) => id.trim() !== '')).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('hebben een naam, en monsters met een geheel level vanaf 1', () => {
    for (const k of KNOWN_SPOTS) {
      expect(k.name.trim(), k.id).not.toBe('')
      for (const m of k.monsters) expect(Number.isInteger(m.level) && m.level >= 1, `${k.id}: ${m.name}`).toBe(true)
    }
  })

  it('geven voor de map een bron', () => {
    for (const k of KNOWN_SPOTS) expectValidSource(k.source, `${k.id}: map`)
  })

  it('hebben monsters met een bron en eindige getallen ≥ 0', () => {
    for (const k of KNOWN_SPOTS) {
      expect(k.monsters.length, k.id).toBeGreaterThan(0)
      for (const m of k.monsters) {
        const where = `${k.id}: ${m.name}`
        expect(m.name.trim(), where).not.toBe('')
        for (const [veld, v] of Object.entries({ level: m.level, hp: m.hp, exp: m.expPerKill, wdef: m.wdef, avoid: m.avoid, accuracy: m.accuracy })) {
          expectAmount(v, `${where} ${veld}`)
        }
        expectAmount(m.touch.min, `${where} touch min`)
        expect(m.touch.max, `${where} touch max`).toBeGreaterThanOrEqual(m.touch.min)
        expect(m.hp, `${where} hp > 0`).toBeGreaterThan(0)
        expectValidSource(m.source, where)
      }
    }
  })

  it('noemen per plek elk monster maar één keer', () => {
    for (const k of KNOWN_SPOTS) {
      const names = k.monsters.map((m) => m.name)
      expect(new Set(names).size, k.id).toBe(names.length)
    }
  })
})

describe('de potions', () => {
  it('hebben een naam, een eindige prijs ≥ 0 en een bron', () => {
    expect(POTIONS.length).toBeGreaterThan(0)
    for (const p of POTIONS) {
      expect(p.name.trim()).not.toBe('')
      expectAmount(p.price, `${p.name} prijs`)
      expectAmount(p.hp, `${p.name} hp`)
      expectAmount(p.mp, `${p.name} mp`)
      expect(p.hp + p.mp, `${p.name} herstelt iets`).toBeGreaterThan(0)
      expectValidSource(p.source, p.name)
    }
  })
})

describe('monsterLevels', () => {
  it('geeft het laagste en hoogste monsterlevel van een plek', () => {
    const spot = findKnownSpot('henesys-rain-forest-east')!
    expect(monsterLevels(spot)).toEqual({ min: 7, max: 10 })
    expect(monsterLevels(findKnownSpot('kerning-subway-line-1-area-1')!)).toEqual({ min: 15, max: 15 })
  })
})

describe('findKnownSpot', () => {
  it('vindt elke bekende plek op zijn id', () => {
    for (const k of KNOWN_SPOTS) expect(findKnownSpot(k.id)).toBe(k)
  })

  it('geeft undefined voor leeg, onbekend of ontbrekend', () => {
    expect(findKnownSpot(undefined)).toBeUndefined()
    expect(findKnownSpot('')).toBeUndefined()
    expect(findKnownSpot('bestaat-niet')).toBeUndefined()
  })
})

describe('knownSpotPatch', () => {
  it('vult bij een bekende plek de naam en de verwijzing in, en maakt de voorstelvelden leeg', () => {
    const k = KNOWN_SPOTS[0]
    expect(knownSpotPatch(k.id)).toEqual({
      known: k.id,
      name: k.name,
      monster: undefined,
      kills: '',
      expPerHour: '',
      potions: '',
      ammo: '',
    })
  })

  it('maakt van een lege of onbekende keuze een eigen plek en laat naam en getallen staan', () => {
    const own = { known: undefined, monster: undefined, kills: undefined }
    expect(knownSpotPatch('')).toEqual(own)
    expect(knownSpotPatch('bestaat-niet')).toEqual(own)
    for (const f of ['name', 'expPerHour', 'potions', 'ammo', 'travel']) expect(f in knownSpotPatch('')).toBe(false)
  })

  it('heft een eerdere keuze op als je hem over een plek heen legt, zoals de app doet', () => {
    const k = KNOWN_SPOTS[0]
    const gekozen = { ...newDraft('a'), name: 'eigen naam', ...knownSpotPatch(k.id) }
    expect(findKnownSpot(gekozen.known)).toBe(k)
    expect(gekozen.name).toBe(k.name)
    const terug = { ...gekozen, ...knownSpotPatch('') }
    expect(findKnownSpot(terug.known)).toBeUndefined()
    expect(terug.name).toBe(k.name)
  })
})
