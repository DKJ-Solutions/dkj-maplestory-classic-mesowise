import { describe, expect, it } from 'vitest'
import { armorUpgradeAdvice } from '../armorUpgrade'
import { clawUpgradeAdvice } from '../clawUpgrade'
import { DEFAULT_PROFILE, parseProfile } from '../profile'
import { newDraft } from '../spotDraft'
import { NPC_ARMOR } from './armor'
import { NPC_CLAWS } from './claws'
import { knownSpotPatch } from './spots'
import { ATTACK_MS } from './thief'
import { WORN_ARMOR, WORN_CLAWS } from './wornItems'

const SLOTS = ['hat', 'top', 'bottom', 'shoes'] as const
const SPEEDS: Record<string, number> = { 'Fast (5)': ATTACK_MS.fast5, 'Fast (4)': ATTACK_MS.fast4, 'Faster (3)': ATTACK_MS.faster3 }
const idOf = (url: string) => Number(url.split('/').pop())
const ALL = [...WORN_ARMOR, ...WORN_CLAWS]

describe('WORN_ARMOR en WORN_CLAWS', () => {
  it('bevat 118 stukken armor en 6 claws', () => {
    expect(WORN_ARMOR).toHaveLength(118)
    expect(WORN_CLAWS).toHaveLength(6)
  })

  it('geeft elke rij een eigen MeowDB-itempagina als bron, opgehaald op 2026-10-04', () => {
    for (const r of ALL) {
      expect(r.source.url, r.name).toMatch(/^https:\/\/meowdb\.com\/msclassic\/item-db\/\d+$/)
      expect(r.source.retrieved, r.name).toBe('2026-10-04')
    }
    expect(new Set(ALL.map((r) => idOf(r.source.url))).size).toBe(ALL.length)
  })

  it('heeft levels van 0 tot en met 30', () => {
    for (const r of ALL) {
      expect(Number.isInteger(r.level), r.name).toBe(true)
      expect(r.level, r.name).toBeGreaterThanOrEqual(0)
      expect(r.level, r.name).toBeLessThanOrEqual(30)
    }
  })

  it('heeft geen naam twee keer binnen armor of binnen claws, en geen naam uit de NPC-lijst', () => {
    const armor = WORN_ARMOR.map((a) => a.name)
    const claws = WORN_CLAWS.map((c) => c.name)
    expect(new Set(armor).size).toBe(armor.length)
    expect(new Set(claws).size).toBe(claws.length)
    for (const n of armor) expect(NPC_ARMOR.map((a) => a.name), n).not.toContain(n)
    for (const n of claws) expect(NPC_CLAWS.map((c) => c.name), n).not.toContain(n)
  })

  it('laat de uitgesloten items weg', () => {
    const names = ALL.map((r) => r.name)
    for (const n of ['Dr. Lim Hat', 'Nemi Hat', 'Inkwell Hat', 'Wizet Invincible Hat', 'Wizet Plain Suit', 'Wizet Plain Shoes', 'Black Sneak']) {
      expect(names, n).not.toContain(n)
    }
    expect(ALL.map((r) => idOf(r.source.url))).not.toContain(1009) // Black Sneak
  })
})

describe('WORN_ARMOR', () => {
  it('heeft alleen bekende slots en positieve WDEF als hele getal', () => {
    for (const a of WORN_ARMOR) {
      expect(SLOTS, a.name).toContain(a.slot)
      expect(Number.isInteger(a.wdef) && a.wdef > 0, `${a.name} wdef`).toBe(true)
    }
    expect(new Set(WORN_ARMOR.map((a) => a.slot))).toEqual(new Set(SLOTS))
  })

  it('staat gesorteerd op slot (hat, top, bottom, shoes), dan op level', () => {
    const rank = (s: string) => SLOTS.indexOf(s as (typeof SLOTS)[number])
    for (let i = 1; i < WORN_ARMOR.length; i++) {
      const p = WORN_ARMOR[i - 1]
      const c = WORN_ARMOR[i]
      expect(rank(c.slot) - rank(p.slot) || c.level - p.level, `${p.name} -> ${c.name}`).toBeGreaterThanOrEqual(0)
    }
  })

  it('geeft de gecontroleerde stukken exact weer', () => {
    const pick = (n: string) => {
      const a = WORN_ARMOR.find((x) => x.name === n)
      return a && [a.slot, a.level, a.wdef, idOf(a.source.url)]
    }
    expect(pick('Red Ghetto Beanie')).toEqual(['hat', 10, 15, 732])
    expect(pick('Undershirt')).toEqual(['top', 0, 6, 935])
    expect(pick('Blue Qi Pao Skirt')).toEqual(['bottom', 22, 24, 1217])
    expect(pick('Bronze Aroa Boots')).toEqual(['shoes', 16, 13, 1331])
  })
})

describe('WORN_CLAWS', () => {
  it('heeft positieve WATK als hele getal en een bekende snelheid met de bijbehorende ATTACK_MS', () => {
    for (const c of WORN_CLAWS) {
      expect(Number.isInteger(c.watk) && c.watk > 0, `${c.name} watk`).toBe(true)
      expect(SPEEDS[c.speed.label], c.name).toBeDefined()
      expect(c.speed.attackMs, c.name).toBe(SPEEDS[c.speed.label])
    }
  })

  it('geeft de gecontroleerde claws exact weer', () => {
    const rows = WORN_CLAWS.map((c) => [c.name, c.level, c.watk, c.speed.label, idOf(c.source.url)])
    expect(rows).toContainEqual(['Mithril Guards', 30, 23, 'Fast (4)', 690])
    expect(rows).toContainEqual(["Beginner's Garnier", 10, 10, 'Fast (5)', 681])
  })

  it('staat van laag naar hoog level', () => {
    for (let i = 1; i < WORN_CLAWS.length; i++) expect(WORN_CLAWS[i].level).toBeGreaterThanOrEqual(WORN_CLAWS[i - 1].level)
  })
})

describe('items zonder prijs in het upgrade-advies', () => {
  const parsed = parseProfile(DEFAULT_PROFILE)
  if (!('profile' in parsed)) throw new Error('voorbeeldprofiel ongeldig')
  const spots = [
    { ...newDraft('a'), ...knownSpotPatch('henesys-rain-forest-east') },
    { ...newDraft('b'), name: 'b', expPerHour: '1000', potions: '10000' },
  ]

  it('komt met de echte data in geen enkel advies voor, op elk level', () => {
    const seen = new Set<string>()
    for (let level = 10; level <= 30; level++) {
      const p = { ...parsed.profile, level, dex: 100, luk: 100, clawWatk: 0 }
      const json = JSON.stringify([armorUpgradeAdvice(spots, p, {}), clawUpgradeAdvice(spots, p)])
      if (json.includes('"advice"')) seen.add(String(level))
      for (const r of ALL) expect(json, `${r.name} op level ${level}`).not.toContain(`"${r.name}"`)
    }
    expect(seen.size, 'er moet echt advies zijn gemaakt').toBeGreaterThan(0)
  })
})
