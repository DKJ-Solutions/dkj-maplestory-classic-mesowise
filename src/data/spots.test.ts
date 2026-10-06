import { describe, expect, it } from 'vitest'
import { MOB_FIELDS, MOBS, POTIONS, correctedMob, findKnownSpot, huntedMob, mobDraft, mobStatPatch, parseMobStat, spotOf } from './spots'
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

describe('de mobs als data', () => {
  it('zijn er, en alleen de gekozen mobs: geen hele tabel', () => {
    expect(MOBS.length).toBeGreaterThan(0)
    expect(MOBS.length).toBeLessThanOrEqual(20)
  })

  it('hebben een naam, een geheel level vanaf 1, een bron en eindige getallen ≥ 0', () => {
    for (const m of MOBS) {
      const where = m.name
      expect(m.name.trim(), where).not.toBe('')
      expect(Number.isInteger(m.level) && m.level >= 1, where).toBe(true)
      for (const [veld, v] of Object.entries({ level: m.level, hp: m.hp, exp: m.expPerKill, wdef: m.wdef, avoid: m.avoid, accuracy: m.accuracy })) {
        expectAmount(v, `${where} ${veld}`)
      }
      expectAmount(m.touch.min, `${where} touch min`)
      expect(m.touch.max, `${where} touch max`).toBeGreaterThanOrEqual(m.touch.min)
      expect(m.hp, `${where} hp > 0`).toBeGreaterThan(0)
      expectValidSource(m.source, where)
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

describe('findKnownSpot', () => {
  it('vindt elke mob op zijn id', () => {
    for (const m of MOBS) expect(findKnownSpot(`mob:${m.name}`)?.monsters).toEqual([m])
  })

  it('geeft undefined voor leeg, onbekend, ontbrekend of een map van vroeger', () => {
    expect(findKnownSpot(undefined)).toBeUndefined()
    expect(findKnownSpot('')).toBeUndefined()
    expect(findKnownSpot('bestaat-niet')).toBeUndefined()
    expect(findKnownSpot('henesys-rain-forest-east')).toBeUndefined()
  })
})

describe('de mobs (Dave, 4 oktober 2026: geen maps meer, alleen de mob waarop je jaagt)', () => {
  it('zijn elk monster één keer, van laag naar hoog level, met een geldige bron', () => {
    const names = MOBS.map((m) => m.name)
    expect(new Set(names).size).toBe(names.length)
    const levels = MOBS.map((m) => m.level)
    expect(levels).toEqual([...levels].sort((a, b) => a - b))
    for (const m of MOBS) expectValidSource(m.source, m.name)
  })

  it('maken van een mob een plek met alleen dat monster, en de voorgestelde velden leeg', () => {
    const d = mobDraft('Pig')!
    expect(d).toEqual({ id: 'mob:Pig', name: 'Pig', known: 'mob:Pig', monster: 'Pig', kills: '', expPerHour: '', potions: '', ammo: '', travel: '0' })
    const spot = findKnownSpot(d.known)!
    expect(spot.monsters.map((m) => m.name)).toEqual(['Pig'])
    expect(spot.source).toBe(spot.monsters[0].source)
  })

  it('geven bij een onbekende naam geen plek', () => {
    expect(mobDraft('Bestaat Niet')).toBeUndefined()
  })

  it('leest de mob terug uit een plek, en niets uit een map of een eigen plek', () => {
    expect(huntedMob(mobDraft('Slime'))?.name).toBe('Slime')
    expect(huntedMob({ ...newDraft('a'), known: 'henesys-rain-forest-east' })).toBeUndefined()
    expect(huntedMob(newDraft('a'))).toBeUndefined()
    expect(huntedMob(undefined)).toBeUndefined()
    expect(huntedMob({ ...newDraft('a'), known: 'mob:Bestaat Niet' })).toBeUndefined()
  })
})

describe('de monsterinfo aanpassen (Dave, 4 oktober 2026)', () => {
  const field = (key: string) => MOB_FIELDS.find((f) => f.key === key)!
  const pig = mobDraft('Pig')!

  it('heeft een veld voor HP, EXP, de schade laag en hoog en WDEF, elk met de waarde uit de database', () => {
    const mob = huntedMob(pig)!
    expect(MOB_FIELDS.map((f) => [f.label, f.get(mob)])).toEqual([['HP', 128], ['EXP', 13], ['Dmg laag', 16], ['Dmg hoog', 22], ['WDEF', 0]])
  })

  it('leest alleen hele getallen binnen de grenzen; HP minstens 1', () => {
    expect(parseMobStat(field('mobHp'), '200')).toBe(200)
    expect(parseMobStat(field('mobHp'), '0')).toBeUndefined()
    expect(parseMobStat(field('mobWdef'), '0')).toBe(0)
    expect(parseMobStat(field('mobExp'), '1,5')).toBeUndefined()
    expect(parseMobStat(field('mobExp'), '1.5')).toBeUndefined()
    expect(parseMobStat(field('mobExp'), '-1')).toBeUndefined()
    expect(parseMobStat(field('mobExp'), '')).toBeUndefined()
    expect(parseMobStat(field('mobExp'), undefined)).toBeUndefined()
  })

  it('bewaart een getal alleen als het afwijkt van de database; gelijk of leeg haalt de aanpassing weg', () => {
    expect(mobStatPatch(pig, field('mobHp'), '200')).toEqual({ mobHp: '200' })
    expect(mobStatPatch(pig, field('mobHp'), '128')).toEqual({ mobHp: undefined })
    expect(mobStatPatch(pig, field('mobHp'), ' ')).toEqual({ mobHp: undefined })
  })

  it('verandert niets bij een ongeldig getal of een plek die geen mob is', () => {
    expect(mobStatPatch(pig, field('mobHp'), 'abc')).toBeNull()
    expect(mobStatPatch({ ...newDraft('a'), known: 'henesys-rain-forest-east' }, field('mobHp'), '200')).toBeNull()
  })

  it('rekent met je eigen getallen, en zonder aanpassing met de database zelf', () => {
    const own = { ...pig, mobHp: '200', mobTouchMax: '30', mobWdef: 'onzin' }
    const mob = correctedMob(huntedMob(pig)!, own)
    expect([mob.hp, mob.touch.min, mob.touch.max, mob.wdef, mob.expPerKill]).toEqual([200, 16, 30, 0, 13])
    expect(spotOf(own)!.monsters).toEqual([mob])
    expect(spotOf(pig)).toBe(findKnownSpot(pig.known))
    expect(huntedMob(pig)!.hp).toBe(128)
  })
})
