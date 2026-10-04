import { describe, expect, it } from 'vitest'
import { SPEED } from './attackSpeed'
import {
  ARROW_BLOW_ARROWS,
  ARROW_BLOW_HITS,
  ARROW_BLOW_LEVELS,
  ARROW_BLOW_SOURCE,
  ARROW_BLOW_TARGETS,
  BOWMAN_ACCURACY_SOURCE,
  BOWMAN_DAMAGE,
  BOWMAN_HP_MP,
  BOWMAN_MASTERY_BASE,
  bowmanAccuracy,
  bowmanHpPerLevelFrom,
  bowmanMpPerLevelFrom,
  CRITICAL_SHOT,
  DOUBLE_SHOT_ARROWS,
  DOUBLE_SHOT_HITS,
  DOUBLE_SHOT_LEVELS,
  DOUBLE_SHOT_SOURCE,
  DOUBLE_SHOT_TARGETS,
  EYE_OF_AMAZON,
  FOCUS_LEVELS,
  FOCUS_SOURCE,
  HELPFUL_STRANGER_ARROWS,
  HELPFUL_STRANGER_SOURCES,
  NPC_ARROWS,
  NPC_BOWMAN_ARMOR,
  NPC_BOWMAN_WEAPONS,
} from './bowman'

const DATE = /^2026-10-04$/
const ITEM_URL = /^https:\/\/meowdb\.com\/msclassic\/item-db\/\d+$/
const item = (id: number) => `https://meowdb.com/msclassic/item-db/${id}`
const skillUrl = (slug: string) => `https://meowdb.com/msclassic/skills/bowman/${slug}`
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

describe('NPC_BOWMAN_WEAPONS', () => {
  it('bevat precies de 10 bogen en kruisbogen van Karl, zoals het onderzoek ze geeft', () => {
    const rows = NPC_BOWMAN_WEAPONS.map((w) => [
      w.name, w.kind, w.level, w.str, w.dex, w.watk, w.speed.label, w.speed.attackMs, w.price,
    ])
    expect(rows).toEqual([
      ['War Bow', 'bow', 10, 0, 25, 30, 'Normal (6)', 810, 5_000],
      ['Composite Bow', 'bow', 15, 15, 35, 35, 'Normal (6)', 810, 7_000],
      ["Hunter's Bow", 'bow', 20, 20, 45, 42, 'Normal (6)', 810, 13_500],
      ['Battle Bow', 'bow', 25, 25, 55, 44, 'Fast (5)', 750, 16_500],
      ['Ryden', 'bow', 30, 30, 65, 50, 'Normal (6)', 810, 26_000],
      ['Crossbow', 'crossbow', 10, 0, 25, 32, 'Slow (7)', 870, 5_000],
      ['Battle Crossbow', 'crossbow', 15, 0, 35, 37, 'Slow (7)', 870, 7_000],
      ['Balanche', 'crossbow', 20, 10, 45, 39, 'Normal (6)', 840, 13_500],
      ['Mountain Crossbow', 'crossbow', 25, 15, 55, 47, 'Slow (7)', 870, 16_500],
      ['Eagle Crow', 'crossbow', 30, 20, 65, 52, 'Slow (7)', 870, 26_000],
    ])
    expect(NPC_BOWMAN_WEAPONS).toHaveLength(10)
  })

  it('verwijst per wapen naar de itempagina met het id uit het onderzoek, opgehaald op 2026-10-04', () => {
    const ids: Record<string, number> = {
      'War Bow': 663, 'Composite Bow': 665, "Hunter's Bow": 666, 'Battle Bow': 667, Ryden: 668,
      Crossbow: 672, 'Battle Crossbow': 673, Balanche: 674, 'Mountain Crossbow': 675, 'Eagle Crow': 676,
    }
    for (const w of NPC_BOWMAN_WEAPONS) {
      expect(w.source.url, w.name).toBe(item(ids[w.name]))
      expect(w.source.url, w.name).toMatch(ITEM_URL)
      expect(w.source.retrieved, w.name).toMatch(DATE)
    }
    expect(new Set(NPC_BOWMAN_WEAPONS.map((w) => w.source.url)).size).toBe(10)
    expect(new Set(NPC_BOWMAN_WEAPONS.map((w) => w.name)).size).toBe(10)
  })

  it("laat Beginner's War Bow (664) en de wapens boven level 30 (669 tot 671, 677 tot 679) weg", () => {
    const urls = NPC_BOWMAN_WEAPONS.map((w) => w.source.url)
    for (const id of [664, 669, 670, 671, 677, 678, 679]) expect(urls).not.toContain(item(id))
    expect(NPC_BOWMAN_WEAPONS.map((w) => w.name)).not.toContain("Beginner's War Bow")
  })

  it('heeft levels binnen 10 tot 30, eerst alle bogen en dan alle kruisbogen, elk op level gesorteerd', () => {
    for (const w of NPC_BOWMAN_WEAPONS) {
      expect(w.level, w.name).toBeGreaterThanOrEqual(10)
      expect(w.level, w.name).toBeLessThanOrEqual(30)
    }
    expect(NPC_BOWMAN_WEAPONS.map((w) => w.kind)).toEqual([...Array(5).fill('bow'), ...Array(5).fill('crossbow')])
    for (let i = 1; i < NPC_BOWMAN_WEAPONS.length; i++) {
      const [p, c] = [NPC_BOWMAN_WEAPONS[i - 1], NPC_BOWMAN_WEAPONS[i]]
      if (p.kind === c.kind) expect(c.level, `${p.name} -> ${c.name}`).toBeGreaterThanOrEqual(p.level)
    }
  })

  it('heeft positieve DEX, watk en prijs en niet-negatieve STR, als hele getallen', () => {
    for (const w of NPC_BOWMAN_WEAPONS) {
      expect(Number.isInteger(w.dex) && w.dex > 0, `${w.name} dex`).toBe(true)
      expect(Number.isInteger(w.watk) && w.watk > 0, `${w.name} watk`).toBe(true)
      expect(Number.isInteger(w.price) && w.price > 0, `${w.name} price`).toBe(true)
      expect(Number.isInteger(w.str) && w.str >= 0, `${w.name} str`).toBe(true)
    }
  })

  it('zet de bogen op de gedeelde SPEED.normal6 en SPEED.fast5 en de kruisbogen op SPEED.slow7', () => {
    const by = (n: string) => NPC_BOWMAN_WEAPONS.find((w) => w.name === n)!
    for (const n of ['War Bow', 'Composite Bow', "Hunter's Bow", 'Ryden']) expect(by(n).speed, n).toEqual(SPEED.normal6)
    expect(by('Battle Bow').speed).toEqual(SPEED.fast5)
    for (const n of ['Crossbow', 'Battle Crossbow', 'Mountain Crossbow', 'Eagle Crow']) {
      expect(by(n).speed, n).toEqual(SPEED.slow7)
    }
  })

  it('legt de Balanche vast zoals de pagina hem print: Normal (6) met 840 ms, terwijl SPEED.normal6 op 810 blijft', () => {
    const b = NPC_BOWMAN_WEAPONS.find((w) => w.name === 'Balanche')!
    expect(b.speed).toEqual({ label: 'Normal (6)', attackMs: 840 })
    expect(SPEED.normal6.attackMs).toBe(810)
    expect(SPEED.normal6.label).toBe('Normal (6)')
  })
})

describe('NPC_ARROWS', () => {
  it('bevat alleen de gewone pijlen 209 en 213: W.ATT 0 en 1 meso per pijl', () => {
    expect(NPC_ARROWS.map((a) => [a.name, a.for, a.watk, a.pricePerArrow, a.source.url])).toEqual([
      ['Arrows for Bows', 'bow', 0, 1, item(209)],
      ['Arrows for Crossbows', 'crossbow', 0, 1, item(213)],
    ])
    for (const a of NPC_ARROWS) expect(a.source.retrieved, a.name).toMatch(DATE)
  })

  it('laat de bronze pijlen (210, 214: citizenship-eis) en de gemaakte pijlen (211, 212, 215, 216) weg', () => {
    const urls = NPC_ARROWS.map((a) => a.source.url)
    for (const id of [210, 214, 211, 212, 215, 216]) expect(urls).not.toContain(item(id))
    expect(NPC_ARROWS.some((a) => /Bronze|Iron|Adamantium|Mithril/.test(a.name))).toBe(false)
    expect(NPC_ARROWS.some((a) => a.pricePerArrow === 2 || a.watk === 1)).toBe(false)
  })
})

describe('HELPFUL_STRANGER_ARROWS', () => {
  it('bevat de bronze pijlen 210 en 214: +1 W.ATT voor 2 meso per pijl, een voor elke soort wapen', () => {
    expect(HELPFUL_STRANGER_ARROWS.map((a) => [a.name, a.for, a.watk, a.pricePerArrow, a.source.url])).toEqual([
      ['Bronze Arrows for Bows', 'bow', 1, 2, item(210)],
      ['Bronze Arrows for Crossbows', 'crossbow', 1, 2, item(214)],
    ])
    for (const a of HELPFUL_STRANGER_ARROWS) expect(a.source.retrieved, a.name).toMatch(DATE)
  })

  it('noemt Raymonds winkel en de klasgids als bron van de rang-eis', () => {
    expect(HELPFUL_STRANGER_SOURCES.map((s) => s.url)).toEqual([
      'https://meowdb.com/msclassic/npcs/232',
      'https://meowdb.com/msclassic/guides/bowman-class-guide',
    ])
    for (const s of HELPFUL_STRANGER_SOURCES) expect(s.retrieved).toMatch(DATE)
  })
})

describe('NPC_BOWMAN_ARMOR', () => {
  it('bevat precies de 17 stukken, per slot (hat, top, bottom, shoes) van laag naar hoog level', () => {
    const rows = NPC_BOWMAN_ARMOR.map((a) => [a.name, a.slot, a.level, a.str, a.dex, a.wdef, a.price])
    expect(rows).toEqual([
      ['Winter Hat', 'hat', 10, 0, 10, 15, 1_200],
      ['Feather Hat', 'hat', 15, 0, 20, 18, 1_800],
      ['Robin Hat', 'hat', 20, 10, 30, 21, 3_600],
      ['Hunter', 'hat', 25, 15, 40, 24, 4_500],
      ['Hawkeye', 'hat', 30, 20, 50, 27, 7_200],
      ['Archer Top / Avelin', 'top', 10, 0, 10, 24, 2_000],
      ['Leather Hoodwear / Able Armor', 'top', 15, 0, 20, 28, 3_000],
      ['Hard Leather Top / Shivermail', 'top', 20, 10, 30, 32, 6_000],
      ['Bennis Chainmail / Yellow Bennis Chainmail', 'top', 25, 15, 40, 36, 7_500],
      ["Hunter's Armor / Huntress Armor", 'top', 30, 20, 50, 40, 12_000],
      ['Archer Pants', 'bottom', 10, 0, 10, 17, 1_600],
      ['Hard Leather Pants', 'bottom', 20, 10, 30, 23, 4_800],
      ['Bennis Chain Pants', 'bottom', 25, 15, 40, 26, 6_000],
      ["Hunter's Pants / Huntress Pants", 'bottom', 30, 20, 50, 29, 9_600],
      ['Hard Leather Boots', 'shoes', 10, 0, 10, 10, 1_200],
      ['Woodsman Boots', 'shoes', 15, 0, 20, 12, 1_800],
      ['Huntertop', 'shoes', 20, 10, 30, 14, 3_600],
    ])
    expect(NPC_BOWMAN_ARMOR).toHaveLength(17)
  })

  it('verwijst naar de pagina van het eerste id (bij de paren de mannenpagina), opgehaald op 2026-10-04', () => {
    const ids: Record<string, number> = {
      'Winter Hat': 730, 'Feather Hat': 751, 'Robin Hat': 771, Hunter: 798, Hawkeye: 818,
      'Archer Top / Avelin': 946, 'Leather Hoodwear / Able Armor': 966, 'Hard Leather Top / Shivermail': 984,
      'Bennis Chainmail / Yellow Bennis Chainmail': 1003, "Hunter's Armor / Huntress Armor": 1023,
      'Archer Pants': 1180, 'Hard Leather Pants': 1215, 'Bennis Chain Pants': 1232,
      "Hunter's Pants / Huntress Pants": 1238,
      'Hard Leather Boots': 1313, 'Woodsman Boots': 1324, Huntertop: 1340,
    }
    for (const a of NPC_BOWMAN_ARMOR) {
      expect(a.source.url, a.name).toBe(item(ids[a.name]))
      expect(a.source.retrieved, a.name).toMatch(DATE)
    }
    expect(new Set(NPC_BOWMAN_ARMOR.map((a) => a.source.url)).size).toBe(17)
    expect(new Set(NPC_BOWMAN_ARMOR.map((a) => a.name)).size).toBe(17)
  })

  it('vouwt de vijf top-paren en het level-30 bottom-paar samen tot een regel met de mannenpagina als bron', () => {
    const pairs = NPC_BOWMAN_ARMOR.filter((a) => a.name.includes(' / '))
    expect(pairs.map((a) => a.slot)).toEqual(['top', 'top', 'top', 'top', 'top', 'bottom'])
    const urls = NPC_BOWMAN_ARMOR.map((a) => a.source.url)
    // Vrouwenpagina's van de paren.
    for (const id of [955, 956, 974, 975, 976, 994, 995, 996, 1016, 1034, 1035, 1249, 1250]) {
      expect(urls).not.toContain(item(id))
    }
  })

  it('laat de rokken met dezelfde stats als een uniseks-bottom weg: Avelin Skirt en Shivermail Skirt', () => {
    const urls = NPC_BOWMAN_ARMOR.map((a) => a.source.url)
    for (const id of [1175, 1176, 1209, 1210, 1211]) expect(urls).not.toContain(item(id))
    expect(NPC_BOWMAN_ARMOR.some((a) => /Skirt/.test(a.name) && !a.name.includes(' / '))).toBe(false)
  })

  it('heeft geen bottom op level 15: de Able Armor Skirt (1190 tot 1192) is alleen voor vrouwen', () => {
    expect(NPC_BOWMAN_ARMOR.filter((a) => a.slot === 'bottom' && a.level === 15)).toHaveLength(0)
    expect(NPC_BOWMAN_ARMOR.filter((a) => a.slot === 'bottom').map((a) => a.level)).toEqual([10, 20, 25, 30])
    const urls = NPC_BOWMAN_ARMOR.map((a) => a.source.url)
    for (const id of [1190, 1191, 1192]) expect(urls).not.toContain(item(id))
  })

  it('laat de stukken zonder jobregel of met fame-eis weg: 664-reeks, Skullcap, Baseball caps, Old Wisconsin, Whitebottom', () => {
    const urls = NPC_BOWMAN_ARMOR.map((a) => a.source.url)
    for (const id of [708, 761, 781, 782, 783, 784, 785, 1364, 1365, 1366, 1367]) {
      expect(urls, String(id)).not.toContain(item(id))
    }
    for (const n of ['Brown Skullcap', 'Baseball', 'Old Wisconsin', 'Whitebottom']) {
      expect(NPC_BOWMAN_ARMOR.some((a) => a.name.includes(n)), n).toBe(false)
    }
  })

  it('heeft geen overalls en geen schoenen op level 25 of 30', () => {
    const slots = new Set<string>(NPC_BOWMAN_ARMOR.map((a) => a.slot))
    expect(slots).toEqual(new Set(['hat', 'top', 'bottom', 'shoes']))
    expect(NPC_BOWMAN_ARMOR.filter((a) => a.slot === 'shoes').map((a) => a.level)).toEqual([10, 15, 20])
  })

  it('staat gesorteerd op slot (hat, top, bottom, shoes), dan op level, met levels binnen 10 tot 30', () => {
    const SLOTS = ['hat', 'top', 'bottom', 'shoes']
    for (let i = 1; i < NPC_BOWMAN_ARMOR.length; i++) {
      const [p, c] = [NPC_BOWMAN_ARMOR[i - 1], NPC_BOWMAN_ARMOR[i]]
      const order = SLOTS.indexOf(c.slot) - SLOTS.indexOf(p.slot) || c.level - p.level
      expect(order, `${p.name} -> ${c.name}`).toBeGreaterThanOrEqual(0)
    }
    for (const a of NPC_BOWMAN_ARMOR) {
      expect(a.level, a.name).toBeGreaterThanOrEqual(10)
      expect(a.level, a.name).toBeLessThanOrEqual(30)
    }
  })

  it('heeft positieve WDEF, DEX en prijs en niet-negatieve STR, als hele getallen', () => {
    for (const a of NPC_BOWMAN_ARMOR) {
      expect(Number.isInteger(a.wdef) && a.wdef > 0, `${a.name} wdef`).toBe(true)
      expect(Number.isInteger(a.dex) && a.dex > 0, `${a.name} dex`).toBe(true)
      expect(Number.isInteger(a.price) && a.price > 0, `${a.name} price`).toBe(true)
      expect(Number.isInteger(a.str) && a.str >= 0, `${a.name} str`).toBe(true)
    }
  })

  it('pint de Huntertop op WDEF 14 (de laatste changelog verhoogde hem van 10)', () => {
    expect(NPC_BOWMAN_ARMOR.find((a) => a.name === 'Huntertop')!.wdef).toBe(14)
  })
})

describe('Arrow Blow', () => {
  const MP = [6, 6, 6, 6, 7, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14]
  const PCT = [160, 164, 168, 172, 176, 180, 184, 188, 192, 196, 200, 204, 208, 212, 216, 220, 224, 228, 232, 240]

  it('heeft 20 levels, genummerd van 1 tot 20, raakt 1 mob met 1 hit en gebruikt 1 pijl per cast', () => {
    expect(ARROW_BLOW_LEVELS).toHaveLength(20)
    expect(ARROW_BLOW_LEVELS.map((l) => l.level)).toEqual(range(20))
    expect(ARROW_BLOW_TARGETS).toBe(1)
    expect(ARROW_BLOW_HITS).toBe(1)
    expect(ARROW_BLOW_ARROWS).toBe(1)
  })

  it('pint de MP- en schadetabel exact', () => {
    expect(ARROW_BLOW_LEVELS.map((l) => l.mp)).toEqual(MP)
    expect(ARROW_BLOW_LEVELS.map((l) => l.damagePct)).toEqual(PCT)
  })

  it('pint level 1, 10 en 20 en de sprong van 232 naar 240', () => {
    expect(ARROW_BLOW_LEVELS[0]).toEqual({ level: 1, mp: 6, damagePct: 160 })
    expect(ARROW_BLOW_LEVELS[9]).toEqual({ level: 10, mp: 9, damagePct: 196 })
    expect(ARROW_BLOW_LEVELS[19]).toEqual({ level: 20, mp: 14, damagePct: 240 })
    expect(ARROW_BLOW_LEVELS[19].damagePct - ARROW_BLOW_LEVELS[18].damagePct).toBe(8)
  })

  it('loopt in schade strikt op en in MP nooit terug', () => {
    for (let i = 1; i < ARROW_BLOW_LEVELS.length; i++) {
      expect(ARROW_BLOW_LEVELS[i].damagePct, `level ${i + 1}`).toBeGreaterThan(ARROW_BLOW_LEVELS[i - 1].damagePct)
      expect(ARROW_BLOW_LEVELS[i].mp, `level ${i + 1}`).toBeGreaterThanOrEqual(ARROW_BLOW_LEVELS[i - 1].mp)
    }
  })

  it('heeft een skillpagina als bron', () => {
    expect(ARROW_BLOW_SOURCE.url).toBe(skillUrl('arrow-blow'))
    expect(ARROW_BLOW_SOURCE.retrieved).toMatch(DATE)
  })
})

describe('Double Shot', () => {
  const MP = [8, 8, 8, 8, 9, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16]
  const PCT = [80, 82, 84, 86, 88, 90, 92, 94, 96, 98, 100, 102, 104, 106, 108, 110, 112, 114, 116, 120]

  it('heeft 20 levels, genummerd van 1 tot 20, raakt 2 mobs met 1 hit per target en gebruikt 2 pijlen per cast', () => {
    expect(DOUBLE_SHOT_LEVELS).toHaveLength(20)
    expect(DOUBLE_SHOT_LEVELS.map((l) => l.level)).toEqual(range(20))
    expect(DOUBLE_SHOT_TARGETS).toBe(2)
    expect(DOUBLE_SHOT_HITS).toBe(1)
    expect(DOUBLE_SHOT_ARROWS).toBe(2)
  })

  it('pint de MP- en schadetabel exact', () => {
    expect(DOUBLE_SHOT_LEVELS.map((l) => l.mp)).toEqual(MP)
    expect(DOUBLE_SHOT_LEVELS.map((l) => l.damagePct)).toEqual(PCT)
  })

  it('pint level 1, 10 en 20 en de sprong van 116 naar 120', () => {
    expect(DOUBLE_SHOT_LEVELS[0]).toEqual({ level: 1, mp: 8, damagePct: 80 })
    expect(DOUBLE_SHOT_LEVELS[9]).toEqual({ level: 10, mp: 11, damagePct: 98 })
    expect(DOUBLE_SHOT_LEVELS[19]).toEqual({ level: 20, mp: 16, damagePct: 120 })
    expect(DOUBLE_SHOT_LEVELS[19].damagePct - DOUBLE_SHOT_LEVELS[18].damagePct).toBe(4)
  })

  it('loopt in schade strikt op en in MP nooit terug', () => {
    for (let i = 1; i < DOUBLE_SHOT_LEVELS.length; i++) {
      expect(DOUBLE_SHOT_LEVELS[i].damagePct, `level ${i + 1}`).toBeGreaterThan(DOUBLE_SHOT_LEVELS[i - 1].damagePct)
      expect(DOUBLE_SHOT_LEVELS[i].mp, `level ${i + 1}`).toBeGreaterThanOrEqual(DOUBLE_SHOT_LEVELS[i - 1].mp)
    }
  })

  it('kost per cast meer MP dan Arrow Blow en doet per target minder schade, maar twee targets op level 20 zijn samen 240%', () => {
    for (let i = 0; i < 20; i++) {
      expect(DOUBLE_SHOT_LEVELS[i].mp).toBeGreaterThan(ARROW_BLOW_LEVELS[i].mp)
      expect(DOUBLE_SHOT_LEVELS[i].damagePct).toBeLessThan(ARROW_BLOW_LEVELS[i].damagePct)
    }
    expect(DOUBLE_SHOT_LEVELS[19].damagePct * DOUBLE_SHOT_TARGETS * DOUBLE_SHOT_HITS).toBe(ARROW_BLOW_LEVELS[19].damagePct)
  })

  it('heeft een skillpagina als bron', () => {
    expect(DOUBLE_SHOT_SOURCE.url).toBe(skillUrl('double-shot'))
    expect(DOUBLE_SHOT_SOURCE.retrieved).toMatch(DATE)
  })
})

describe('de passieven en de buff', () => {
  it('Critical Shot: 15 levels, kans 5 tot 18 en 20 op level 15, schade +1 tot +15', () => {
    expect(CRITICAL_SHOT.critPct).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20])
    expect(CRITICAL_SHOT.critDamage).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    expect(CRITICAL_SHOT.critPct).toHaveLength(15)
    expect(CRITICAL_SHOT.critDamage).toHaveLength(15)
    expect(CRITICAL_SHOT.source.url).toBe(skillUrl('critical-shot'))
    expect(CRITICAL_SHOT.source.retrieved).toMatch(DATE)
  })

  it('The Eye of Amazon: 15 levels, bereik +50 tot +120 in stappen van 5', () => {
    expect(EYE_OF_AMAZON.range).toEqual([50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120])
    expect(EYE_OF_AMAZON.range).toHaveLength(15)
    expect(EYE_OF_AMAZON.source.url).toBe(skillUrl('the-eye-of-amazon'))
    expect(EYE_OF_AMAZON.source.retrieved).toMatch(DATE)
  })

  it('Focus: 20 levels, accuracy, evasion, MP en duur exact', () => {
    expect(FOCUS_LEVELS).toHaveLength(20)
    expect(FOCUS_LEVELS.map((l) => l.level)).toEqual(range(20))
    expect(FOCUS_LEVELS.map((l) => l.accuracy)).toEqual(range(20))
    expect(FOCUS_LEVELS.map((l) => l.evasion)).toEqual([
      5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25,
    ])
    expect(FOCUS_LEVELS.map((l) => l.mp)).toEqual([
      ...Array(5).fill(8), ...Array(5).fill(10), ...Array(5).fill(13), ...Array(5).fill(16),
    ])
    expect(FOCUS_LEVELS.map((l) => l.seconds)).toEqual([
      70, 80, 90, 100, 110, 130, 140, 150, 160, 170, 195, 205, 215, 225, 235, 260, 270, 280, 290, 300,
    ])
  })

  it('Focus: evasion springt op level 20 van 23 naar 25 en de rest loopt strikt op', () => {
    expect(FOCUS_LEVELS[19].evasion - FOCUS_LEVELS[18].evasion).toBe(2)
    for (let i = 1; i < FOCUS_LEVELS.length; i++) {
      expect(FOCUS_LEVELS[i].evasion, `level ${i + 1}`).toBeGreaterThan(FOCUS_LEVELS[i - 1].evasion)
      expect(FOCUS_LEVELS[i].seconds, `level ${i + 1}`).toBeGreaterThan(FOCUS_LEVELS[i - 1].seconds)
      expect(FOCUS_LEVELS[i].mp, `level ${i + 1}`).toBeGreaterThanOrEqual(FOCUS_LEVELS[i - 1].mp)
    }
    expect(FOCUS_SOURCE.url).toBe(skillUrl('focus'))
    expect(FOCUS_SOURCE.retrieved).toMatch(DATE)
  })
})

describe('de schadeconstanten', () => {
  it('pint Shoot 2,5, StatDiv 100, APDiv 50, DEX als primaire en STR als secundaire stat', () => {
    expect(BOWMAN_DAMAGE.shootMultiplier).toBe(2.5)
    expect(BOWMAN_DAMAGE.statDiv).toBe(100)
    expect(BOWMAN_DAMAGE.apDiv).toBe(50)
    expect(BOWMAN_DAMAGE.primary).toBe('dex')
    expect(BOWMAN_DAMAGE.secondary).toBe('str')
    expect(BOWMAN_DAMAGE.source.url).toBe('https://meowdb.com/msclassic/guides/explaining-the-damage-formula')
    expect(BOWMAN_DAMAGE.source.retrieved).toMatch(DATE)
  })

  it('pint de basismastery op 0,08 = (0 / 10 + 0,1) x 0,8', () => {
    expect(BOWMAN_MASTERY_BASE).toBe(0.08)
    expect(BOWMAN_MASTERY_BASE).toBeCloseTo((0 / 10 + 0.1) * 0.8, 12)
  })
})

describe('HP en MP per level', () => {
  it('geeft een Beginner +16 HP en +12 MP onder level 10', () => {
    expect(bowmanHpPerLevelFrom(1)).toBe(16)
    expect(bowmanHpPerLevelFrom(9)).toBe(16)
    expect(bowmanMpPerLevelFrom(1)).toBe(12)
    expect(bowmanMpPerLevelFrom(9)).toBe(12)
  })

  it('geeft een Bowman +22 HP en +17 MP vanaf level 10', () => {
    for (const l of [10, 11, 30]) {
      expect(bowmanHpPerLevelFrom(l), `hp ${l}`).toBe(22)
      expect(bowmanMpPerLevelFrom(l), `mp ${l}`).toBe(17)
    }
  })

  it('pint de waarden en de bronnen', () => {
    expect(BOWMAN_HP_MP.beginner).toEqual({ hp: 16, mp: 12 })
    expect(BOWMAN_HP_MP.bowman).toEqual({ hp: 22, mp: 17 })
    expect(BOWMAN_HP_MP.bowmanFromLevel).toBe(10)
    expect(BOWMAN_HP_MP.advancement).toEqual({ hp: 250, mp: 250 })
    expect(BOWMAN_HP_MP.source.url).toBe('https://meowdb.com/msclassic/guides/hp-mp-gain-explained')
    expect(BOWMAN_HP_MP.levelSource.url).toBe('https://meowdb.com/msclassic/guides/bowman-class-guide')
    expect(BOWMAN_HP_MP.source.retrieved).toMatch(DATE)
    expect(BOWMAN_HP_MP.levelSource.retrieved).toMatch(DATE)
  })

  it('telt de job-advancement er niet in: level 10 naar 11 geeft alleen +22 HP en +17 MP', () => {
    expect(bowmanHpPerLevelFrom(10)).toBeLessThan(BOWMAN_HP_MP.advancement.hp)
    expect(bowmanMpPerLevelFrom(10)).toBeLessThan(BOWMAN_HP_MP.advancement.mp)
  })
})

describe('bowmanAccuracy', () => {
  it('geeft 20 zonder stats en level 0 en rondt naar beneden af', () => {
    expect(bowmanAccuracy(0, 0, 0)).toBe(20)
    expect(bowmanAccuracy(0, 10, 0)).toBe(24) // 20 / 4,8 = 4,17
    expect(bowmanAccuracy(0, 1, 0)).toBe(20) // 0,42
  })

  it('geeft een bekend voorbeeld: DEX 100, level 30, LUK 4', () => {
    expect(bowmanAccuracy(100, 30, 4)).toBe(58) // (120 + 60 + 2,4) / 4,8 + 20 = 58,0 precies
  })

  it('geeft op een exacte grens het hele getal en een stap lager het getal eronder', () => {
    expect(bowmanAccuracy(4, 0, 0)).toBe(21) // 1,2 x 4 / 4,8 = 1,0 precies
    expect(bowmanAccuracy(3, 0, 0)).toBe(20) // 20,75
    expect(bowmanAccuracy(0, 12, 0)).toBe(25) // 24 / 4,8 = 5,0 precies
    expect(bowmanAccuracy(0, 11, 0)).toBe(24) // 24,58
    expect(bowmanAccuracy(0, 0, 8)).toBe(21) // 0,6 x 8 / 4,8 = 1,0 precies
    expect(bowmanAccuracy(0, 0, 7)).toBe(20) // 20,875
  })

  it('weegt DEX zwaarder dan LUK en groeit nooit terug', () => {
    expect(bowmanAccuracy(40, 0, 0)).toBe(30) // 48 / 4,8 = 10,0
    expect(bowmanAccuracy(0, 0, 40)).toBe(25) // 24 / 4,8 = 5,0
    for (let level = 1; level < 30; level++) {
      expect(bowmanAccuracy(100, level + 1, 10)).toBeGreaterThanOrEqual(bowmanAccuracy(100, level, 10))
    }
  })

  it('komt over een raster van invoer overeen met de kommagetal-vorm floor((1,2 DEX + 2 L + 0,6 LUK) / 4,8 + 20)', () => {
    const mismatches: string[] = []
    for (let dex = 0; dex <= 300; dex += 7) {
      for (let level = 1; level <= 30; level++) {
        for (let luk = 0; luk <= 60; luk += 3) {
          const exact = Math.floor((12 * dex + 20 * level + 6 * luk) / 48 + 20)
          const float = Math.floor((1.2 * dex + 2 * level + 0.6 * luk) / 4.8 + 20)
          const got = bowmanAccuracy(dex, level, luk)
          expect(got, `${dex}/${level}/${luk} exact`).toBe(exact)
          if (got !== float) mismatches.push(`${dex}/${level}/${luk}: int ${got}, float ${float}`)
        }
      }
    }
    // Waar de kommagetal-vorm net onder een heel getal valt, wint de gehele vorm: de afwijking is altijd EEN lager.
    for (const m of mismatches) {
      const [, got, fl] = m.match(/int (\d+), float (\d+)/)!
      expect(Number(fl), m).toBe(Number(got) - 1)
    }
  })

  it('heeft een bron met de damage-gids', () => {
    expect(BOWMAN_ACCURACY_SOURCE.url).toBe('https://meowdb.com/msclassic/guides/explaining-the-damage-formula')
    expect(BOWMAN_ACCURACY_SOURCE.retrieved).toMatch(DATE)
  })
})

describe('de bronnen', () => {
  it('heeft elke regel een meowdb.com/msclassic-bron, opgehaald op 2026-10-04', () => {
    const sources = [
      ...NPC_BOWMAN_WEAPONS.map((w) => w.source),
      ...NPC_ARROWS.map((a) => a.source),
      ...NPC_BOWMAN_ARMOR.map((a) => a.source),
      ARROW_BLOW_SOURCE, DOUBLE_SHOT_SOURCE, FOCUS_SOURCE, CRITICAL_SHOT.source, EYE_OF_AMAZON.source,
      BOWMAN_DAMAGE.source, BOWMAN_ACCURACY_SOURCE, BOWMAN_HP_MP.source, BOWMAN_HP_MP.levelSource,
    ]
    for (const s of sources) {
      expect(s.url).toMatch(/^https:\/\/meowdb\.com\/msclassic\//)
      expect(s.retrieved).toBe('2026-10-04')
    }
  })
})
