import { describe, expect, it } from 'vitest'
import { SPEED } from './attackSpeed'
import {
  ENERGY_BOLT_LEVELS,
  ENERGY_BOLT_SOURCE,
  ENERGY_BOLT_TARGETS,
  IMPROVED_MP_RECOVERY,
  MAGIC_ARMOR_LEVELS,
  MAGIC_ARMOR_SOURCE,
  MAGIC_CLAW_HITS,
  MAGIC_CLAW_REQUIRES_ENERGY_BOLT,
  MAGIC_CLAW_LEVELS,
  MAGIC_CLAW_SOURCE,
  MAGIC_CLAW_TARGETS,
  MAGIC_GUARD,
  MAGICIAN_ACCURACY_SOURCE,
  MAGICIAN_HP_MP,
  MAGICIAN_MP_POTIONS,
  magicianAccuracy,
  magicianHpPerLevelFrom,
  magicianMpPerLevelFrom,
  MAX_MP_INCREASE,
  NPC_MAGICIAN_ARMOR,
  NPC_MAGICIAN_WEAPONS,
  SPELL_CAST_MS,
} from './magician'

const DATE = /^2026-10-04$/
const ITEM_URL = /^https:\/\/meowdb\.com\/msclassic\/item-db\/\d+$/
const item = (id: number) => `https://meowdb.com/msclassic/item-db/${id}`
/** De stukken zonder jobregel op MeowDB: voor elke klas (Dave, #55, 2026-10-04). */
const NO_JOB_LINE_WANDS = ['Wooden Wand', 'Hardwood Wand', 'Metal Wand']
const NO_JOB_LINE_ARMOR = ['White Bandana', 'Red Baseball Cap']
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

describe('NPC_MAGICIAN_WEAPONS', () => {
  it('bevat precies de 10 wands en staffs: 7 met een Mage-jobregel en 3 wands zonder jobregel (#55), zoals het onderzoek ze geeft', () => {
    const rows = NPC_MAGICIAN_WEAPONS.map((w) => [
      w.name, w.kind, w.level, w.int, w.luk, w.watk, w.matk, w.speed.label, w.speed.attackMs, w.price,
    ])
    expect(rows).toEqual([
      ['Wooden Wand', 'wand', 10, 20, 0, 18, 27, 'Normal (6)', 810, 3_000],
      ['Wooden Staff', 'staff', 10, 20, 0, 20, 24, 'Slow (7)', 810, 3_000],
      ['Hardwood Wand', 'wand', 15, 30, 0, 23, 34, 'Normal (6)', 810, 5_000],
      ['Sapphire Staff', 'staff', 15, 30, 10, 25, 31, 'Slow (7)', 810, 5_000],
      ['Emerald Staff', 'staff', 15, 30, 10, 25, 31, 'Slow (7)', 810, 5_000],
      ['Metal Wand', 'wand', 20, 40, 10, 21, 41, 'Normal (6)', 810, 10_500],
      ['Old Wooden Staff', 'staff', 20, 40, 15, 30, 38, 'Slow (7)', 810, 10_500],
      ['Ice Wand', 'wand', 25, 50, 15, 24, 48, 'Normal (6)', 810, 13_500],
      ['Wizard Staff', 'staff', 25, 50, 20, 35, 45, 'Slow (7)', 810, 13_500],
      ['Mithril Wand', 'wand', 30, 60, 20, 27, 55, 'Normal (6)', 810, 22_000],
    ])
    expect(NPC_MAGICIAN_WEAPONS).toHaveLength(10)
  })

  it('verwijst per wapen naar de itempagina met het id uit het onderzoek, opgehaald op 2026-10-04', () => {
    const ids: Record<string, number> = {
      'Wooden Wand': 648, 'Hardwood Wand': 650, 'Metal Wand': 651, 'Wooden Staff': 657, 'Sapphire Staff': 658, 'Emerald Staff': 659, 'Old Wooden Staff': 660,
      'Ice Wand': 652, 'Wizard Staff': 661, 'Mithril Wand': 653,
    }
    for (const w of NPC_MAGICIAN_WEAPONS) {
      expect(w.source.url, w.name).toBe(item(ids[w.name]))
      expect(w.source.url, w.name).toMatch(ITEM_URL)
      expect(w.source.retrieved, w.name).toMatch(DATE)
    }
    expect(new Set(NPC_MAGICIAN_WEAPONS.map((w) => w.source.url)).size).toBe(10)
    expect(new Set(NPC_MAGICIAN_WEAPONS.map((w) => w.name)).size).toBe(10)
  })

  it('heeft Wooden Wand (648), Hardwood Wand (650) en Metal Wand (651) erin: geen jobregel op de pagina, dus voor elke klas (#55)', () => {
    const by = (n: string) => NPC_MAGICIAN_WEAPONS.find((w) => w.name === n)!
    expect(by('Wooden Wand')).toEqual({ name: 'Wooden Wand', kind: 'wand', level: 10, int: 20, luk: 0, watk: 18, matk: 27, speed: SPEED.normal6, price: 3_000, source: { url: item(648), retrieved: '2026-10-04' } })
    expect(by('Hardwood Wand')).toEqual({ name: 'Hardwood Wand', kind: 'wand', level: 15, int: 30, luk: 0, watk: 23, matk: 34, speed: SPEED.normal6, price: 5_000, source: { url: item(650), retrieved: '2026-10-04' } })
    expect(by('Metal Wand')).toEqual({ name: 'Metal Wand', kind: 'wand', level: 20, int: 40, luk: 10, watk: 21, matk: 41, speed: SPEED.normal6, price: 10_500, source: { url: item(651), retrieved: '2026-10-04' } })
    expect(NPC_MAGICIAN_WEAPONS.filter((w) => NO_JOB_LINE_WANDS.includes(w.name))).toHaveLength(3)
  })

  it("laat Beginner's Wooden Wand (649) weg: niet te koop", () => {
    expect(NPC_MAGICIAN_WEAPONS.map((w) => w.source.url)).not.toContain(item(649))
  })

  it('heeft levels binnen 10 tot 30, staat gesorteerd op level en heeft geen staff op level 30', () => {
    for (const w of NPC_MAGICIAN_WEAPONS) {
      expect(w.level, w.name).toBeGreaterThanOrEqual(10)
      expect(w.level, w.name).toBeLessThanOrEqual(30)
    }
    for (let i = 1; i < NPC_MAGICIAN_WEAPONS.length; i++) {
      const [p, c] = [NPC_MAGICIAN_WEAPONS[i - 1], NPC_MAGICIAN_WEAPONS[i]]
      expect(c.level, `${p.name} -> ${c.name}`).toBeGreaterThanOrEqual(p.level)
    }
    expect(NPC_MAGICIAN_WEAPONS.filter((w) => w.kind === 'staff' && w.level === 30)).toHaveLength(0)
  })

  it('heeft positieve INT, watk, matk en prijs en niet-negatieve LUK, als hele getallen', () => {
    for (const w of NPC_MAGICIAN_WEAPONS) {
      expect(Number.isInteger(w.int) && w.int > 0, `${w.name} int`).toBe(true)
      expect(Number.isInteger(w.watk) && w.watk > 0, `${w.name} watk`).toBe(true)
      expect(Number.isInteger(w.matk) && w.matk > 0, `${w.name} matk`).toBe(true)
      expect(Number.isInteger(w.price) && w.price > 0, `${w.name} price`).toBe(true)
      expect(Number.isInteger(w.luk) && w.luk >= 0, `${w.name} luk`).toBe(true)
    }
  })

  it('legt de staff-snelheid vast zoals de pagina hem print: Slow (7) met 810 ms, niet de 870 van de gedeelde tabel', () => {
    for (const w of NPC_MAGICIAN_WEAPONS.filter((x) => x.kind === 'staff')) {
      expect(w.speed, w.name).toEqual({ label: 'Slow (7)', attackMs: 810 })
    }
    expect(SPEED.slow7.attackMs).toBe(870)
  })

  it('zet de wands op de gedeelde SPEED.normal6', () => {
    for (const w of NPC_MAGICIAN_WEAPONS.filter((x) => x.kind === 'wand')) {
      expect(w.speed, w.name).toEqual(SPEED.normal6)
      expect(w.speed.label).toBe('Normal (6)')
      expect(w.speed.attackMs).toBe(810)
    }
  })

  it('komt met de M.ATT van de wands overeen met de voorbeelden uit de gids: 48 op level 25 en 55 op level 30', () => {
    const wands = NPC_MAGICIAN_WEAPONS.filter((w) => w.kind === 'wand')
    expect(wands.map((w) => [w.level, w.matk])).toEqual([[10, 27], [15, 34], [20, 41], [25, 48], [30, 55]])
  })
})

describe('NPC_MAGICIAN_ARMOR', () => {
  it('bevat precies de 14 stukken (12 met jobregel, 2 zonder: #55), per slot (hat, top, bottom, shoes) van laag naar hoog level', () => {
    const rows = NPC_MAGICIAN_ARMOR.map((a) => [a.name, a.slot, a.level, a.int, a.luk, a.wdef, a.mdef, a.price])
    expect(rows).toEqual([
      ['Apprentice Hat', 'hat', 10, 10, 0, 8, 10, 1_200],
      ['White Bandana', 'hat', 10, 0, 0, 15, 0, 1_200],
      ['Moon Conehat', 'hat', 15, 20, 0, 10, 12, 1_800],
      ['Wizardry Hat', 'hat', 20, 30, 10, 12, 14, 3_600],
      ['Red Baseball Cap', 'hat', 22, 0, 0, 22, 0, 3_900],
      ['Jester', 'hat', 30, 50, 20, 16, 18, 7_200],
      ['Training Shirt / Armine', 'top', 10, 10, 0, 13, 18, 2_000],
      ['Split Piece / Split', 'top', 20, 30, 10, 19, 24, 6_000],
      ['Training Pants / Armine Skirt', 'bottom', 10, 10, 0, 9, 12, 1_600],
      ['Split Pants / Split Skirt', 'bottom', 20, 30, 10, 13, 16, 4_800],
      ['Basic Boots', 'shoes', 10, 10, 0, 5, 6, 1_200],
      ['Nitty', 'shoes', 15, 20, 0, 6, 7, 1_800],
      ['Jewelry Boots', 'shoes', 20, 30, 10, 7, 8, 3_600],
      ['Wind Shoes', 'shoes', 25, 40, 15, 8, 9, 4_500],
    ])
    expect(NPC_MAGICIAN_ARMOR).toHaveLength(14)
  })

  it('verwijst naar de pagina van het eerste id (bij de paren de mannenpagina), opgehaald op 2026-10-04', () => {
    const ids: Record<string, number> = {
      'Apprentice Hat': 727, 'White Bandana': 719, 'Red Baseball Cap': 781, 'Moon Conehat': 746, 'Wizardry Hat': 768, Jester: 813,
      'Training Shirt / Armine': 944, 'Split Piece / Split': 981,
      'Training Pants / Armine Skirt': 1166, 'Split Pants / Split Skirt': 1199,
      'Basic Boots': 1310, Nitty: 1322, 'Jewelry Boots': 1337, 'Wind Shoes': 1354,
    }
    for (const a of NPC_MAGICIAN_ARMOR) {
      expect(a.source.url, a.name).toBe(item(ids[a.name]))
      expect(a.source.retrieved, a.name).toMatch(DATE)
    }
    expect(new Set(NPC_MAGICIAN_ARMOR.map((a) => a.source.url)).size).toBe(14)
    expect(new Set(NPC_MAGICIAN_ARMOR.map((a) => a.name)).size).toBe(14)
  })

  it('vouwt de vier man/vrouw-paren samen tot een regel met de mannenpagina als bron', () => {
    const by = (n: string) => NPC_MAGICIAN_ARMOR.find((a) => a.name === n)!
    // Training Shirt 944 / Armine 953, Split Piece 981 / Split 991, Training Pants 1166 / Armine Skirt 1173,
    // Split Pants 1199 / Split Skirt 1207: identieke eisen, WDEF, MDEF en prijs.
    expect(by('Training Shirt / Armine').source.url).toBe(item(944))
    expect(by('Split Piece / Split').source.url).toBe(item(981))
    expect(by('Training Pants / Armine Skirt').source.url).toBe(item(1166))
    expect(by('Split Pants / Split Skirt').source.url).toBe(item(1199))
    const pairs = NPC_MAGICIAN_ARMOR.filter((a) => a.name.includes(' / '))
    expect(pairs).toHaveLength(4)
    const urls = NPC_MAGICIAN_ARMOR.map((a) => a.source.url)
    for (const id of [953, 991, 1173, 1207]) expect(urls).not.toContain(item(id))
  })

  it('laat de alleen-vrouwen-stukken zonder mannenversie weg: Arianne, Arianne Skirt, Fairy Top en Fairy Skirt', () => {
    const names = NPC_MAGICIAN_ARMOR.map((a) => a.name).join('|')
    for (const n of ['Arianne', 'Arianne Skirt', 'Fairy Top', 'Fairy Skirt']) {
      expect(names.split('|').filter((x) => x.split(' / ').includes(n)), n).toHaveLength(0)
    }
    const urls = NPC_MAGICIAN_ARMOR.map((a) => a.source.url)
    for (const id of [970, 971, 972, 973, 1031, 1032, 1186, 1187, 1188, 1189, 1246, 1247]) {
      expect(urls).not.toContain(item(id))
    }
  })

  it('heeft geen overalls (Plain Robe, Doros Robe, Doroness Robe, Wizard Robe)', () => {
    const slots = new Set<string>(NPC_MAGICIAN_ARMOR.map((a) => a.slot))
    expect(slots).toEqual(new Set(['hat', 'top', 'bottom', 'shoes']))
    expect(NPC_MAGICIAN_ARMOR.some((a) => /Robe/.test(a.name))).toBe(false)
    const urls = NPC_MAGICIAN_ARMOR.map((a) => a.source.url)
    for (const id of [1091, 1098, 1102, 1107, 1110]) expect(urls).not.toContain(item(id))
  })

  it('staat gesorteerd op slot (hat, top, bottom, shoes), dan op level, met levels binnen 10 tot 30', () => {
    const SLOTS = ['hat', 'top', 'bottom', 'shoes']
    for (let i = 1; i < NPC_MAGICIAN_ARMOR.length; i++) {
      const [p, c] = [NPC_MAGICIAN_ARMOR[i - 1], NPC_MAGICIAN_ARMOR[i]]
      const order = SLOTS.indexOf(c.slot) - SLOTS.indexOf(p.slot) || c.level - p.level
      expect(order, `${p.name} -> ${c.name}`).toBeGreaterThanOrEqual(0)
    }
    for (const a of NPC_MAGICIAN_ARMOR) {
      expect(a.level, a.name).toBeGreaterThanOrEqual(10)
      expect(a.level, a.name).toBeLessThanOrEqual(30)
    }
  })

  it('heeft positieve WDEF en prijs en niet-negatieve LUK, als hele getallen, en bij de stukken met een jobregel positieve MDEF en INT en een MDEF van minstens de WDEF', () => {
    for (const a of NPC_MAGICIAN_ARMOR) {
      expect(Number.isInteger(a.wdef) && a.wdef > 0, `${a.name} wdef`).toBe(true)
      expect(Number.isInteger(a.price) && a.price > 0, `${a.name} price`).toBe(true)
      expect(Number.isInteger(a.luk) && a.luk >= 0, `${a.name} luk`).toBe(true)
      if (NO_JOB_LINE_ARMOR.includes(a.name)) continue // zie de volgende test
      expect(Number.isInteger(a.mdef) && a.mdef > 0, `${a.name} mdef`).toBe(true)
      expect(Number.isInteger(a.int) && a.int > 0, `${a.name} int`).toBe(true)
      expect(a.mdef, a.name).toBeGreaterThanOrEqual(a.wdef)
    }
  })

  it('heeft de White Bandana (719) en de Red Baseball Cap (781) zonder jobregel met INT 0, LUK 0 en MDEF 0: de pagina noemt geen eis en toont geen MDEF', () => {
    const by = (n: string) => NPC_MAGICIAN_ARMOR.find((a) => a.name === n)!
    expect(by('White Bandana')).toEqual({ name: 'White Bandana', slot: 'hat', level: 10, int: 0, luk: 0, wdef: 15, mdef: 0, price: 1_200, source: { url: item(719), retrieved: '2026-10-04' } })
    expect(by('Red Baseball Cap')).toEqual({ name: 'Red Baseball Cap', slot: 'hat', level: 22, int: 0, luk: 0, wdef: 22, mdef: 0, price: 3_900, source: { url: item(781), retrieved: '2026-10-04' } })
    expect(NPC_MAGICIAN_ARMOR.filter((a) => a.int === 0).map((a) => a.name)).toEqual(NO_JOB_LINE_ARMOR)
    expect(NPC_MAGICIAN_ARMOR.filter((a) => a.mdef === 0).map((a) => a.name)).toEqual(NO_JOB_LINE_ARMOR)
  })

  it('pint de Apprentice Hat op WDEF 8 (de pagina wint van het zoekresultaat met 5)', () => {
    expect(NPC_MAGICIAN_ARMOR.find((a) => a.name === 'Apprentice Hat')!.wdef).toBe(8)
  })
})

describe('MAGICIAN_MP_POTIONS', () => {
  it('pint Orange (239) en Lemon (240) uit het onderzoek', () => {
    expect(MAGICIAN_MP_POTIONS.map((p) => [p.name, p.hp, p.mp, p.price, p.source.url])).toEqual([
      ['Orange', 0, 50, 50, item(239)],
      ['Lemon', 0, 150, 150, item(240)],
    ])
    for (const p of MAGICIAN_MP_POTIONS) expect(p.source.retrieved, p.name).toMatch(DATE)
  })
})

describe('Energy Bolt', () => {
  const MP = [8, 8, 8, 8, 9, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16]
  const PCT = [90, 92, 94, 96, 98, 100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 122, 124, 126, 130]
  const MASTERY = [1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10]

  it('heeft 20 levels, genummerd van 1 tot 20, en raakt 1 mob met 1 hit', () => {
    expect(ENERGY_BOLT_LEVELS).toHaveLength(20)
    expect(ENERGY_BOLT_LEVELS.map((l) => l.level)).toEqual(range(20))
    expect(ENERGY_BOLT_TARGETS).toBe(1)
  })

  it('pint de MP-, schade- en mastery-tabel exact', () => {
    expect(ENERGY_BOLT_LEVELS.map((l) => l.mp)).toEqual(MP)
    expect(ENERGY_BOLT_LEVELS.map((l) => l.damagePct)).toEqual(PCT)
    expect(ENERGY_BOLT_LEVELS.map((l) => l.mastery)).toEqual(MASTERY)
  })

  it('pint level 1, 10 en 20 en de sprong van 126 naar 130', () => {
    expect(ENERGY_BOLT_LEVELS[0]).toEqual({ level: 1, mp: 8, damagePct: 90, mastery: 1 })
    expect(ENERGY_BOLT_LEVELS[9]).toEqual({ level: 10, mp: 11, damagePct: 108, mastery: 5 })
    expect(ENERGY_BOLT_LEVELS[19]).toEqual({ level: 20, mp: 16, damagePct: 130, mastery: 10 })
    expect(ENERGY_BOLT_LEVELS[19].damagePct - ENERGY_BOLT_LEVELS[18].damagePct).toBe(4)
  })

  it('loopt in schade strikt op en in MP en mastery nooit terug', () => {
    for (let i = 1; i < ENERGY_BOLT_LEVELS.length; i++) {
      const [p, c] = [ENERGY_BOLT_LEVELS[i - 1], ENERGY_BOLT_LEVELS[i]]
      expect(c.damagePct, `level ${i + 1}`).toBeGreaterThan(p.damagePct)
      expect(c.mp, `level ${i + 1}`).toBeGreaterThanOrEqual(p.mp)
      expect(c.mastery, `level ${i + 1}`).toBeGreaterThanOrEqual(p.mastery)
    }
  })

  it('heeft een skillpagina als bron', () => {
    expect(ENERGY_BOLT_SOURCE.url).toBe('https://meowdb.com/msclassic/skills/magician/energy-bolt')
    expect(ENERGY_BOLT_SOURCE.retrieved).toMatch(DATE)
  })
})

describe('Magic Claw', () => {
  const MP = [10, 10, 10, 10, 11, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16, 17, 18, 19, 20]
  const PCT = [45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 65]
  const MASTERY = [1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10]

  it('heeft 20 levels, genummerd van 1 tot 20, raakt 1 mob en slaat 2 keer', () => {
    expect(MAGIC_CLAW_LEVELS).toHaveLength(20)
    expect(MAGIC_CLAW_LEVELS.map((l) => l.level)).toEqual(range(20))
    expect(MAGIC_CLAW_TARGETS).toBe(1)
    expect(MAGIC_CLAW_HITS).toBe(2)
  })

  it('pint de MP-, schade-per-hit- en mastery-tabel exact', () => {
    expect(MAGIC_CLAW_LEVELS.map((l) => l.mp)).toEqual(MP)
    expect(MAGIC_CLAW_LEVELS.map((l) => l.damagePct)).toEqual(PCT)
    expect(MAGIC_CLAW_LEVELS.map((l) => l.mastery)).toEqual(MASTERY)
  })

  it('pint level 1, 10 en 20', () => {
    expect(MAGIC_CLAW_LEVELS[0]).toEqual({ level: 1, mp: 10, damagePct: 45, mastery: 1 })
    expect(MAGIC_CLAW_LEVELS[9]).toEqual({ level: 10, mp: 13, damagePct: 54, mastery: 5 })
    expect(MAGIC_CLAW_LEVELS[19]).toEqual({ level: 20, mp: 20, damagePct: 65, mastery: 10 })
  })

  it('heeft op level 20 twee hits van samen 130%, gelijk aan de Energy Bolt op level 20', () => {
    expect(MAGIC_CLAW_LEVELS[19].damagePct * MAGIC_CLAW_HITS).toBe(ENERGY_BOLT_LEVELS[19].damagePct)
  })

  it('heeft dezelfde mastery als Energy Bolt en loopt in schade strikt op en in MP nooit terug', () => {
    expect(MAGIC_CLAW_LEVELS.map((l) => l.mastery)).toEqual(ENERGY_BOLT_LEVELS.map((l) => l.mastery))
    for (let i = 1; i < MAGIC_CLAW_LEVELS.length; i++) {
      expect(MAGIC_CLAW_LEVELS[i].damagePct, `level ${i + 1}`).toBeGreaterThan(MAGIC_CLAW_LEVELS[i - 1].damagePct)
      expect(MAGIC_CLAW_LEVELS[i].mp, `level ${i + 1}`).toBeGreaterThanOrEqual(MAGIC_CLAW_LEVELS[i - 1].mp)
    }
  })

  it('heeft een skillpagina als bron', () => {
    expect(MAGIC_CLAW_SOURCE.url).toBe('https://meowdb.com/msclassic/skills/magician/magic-claw')
    expect(MAGIC_CLAW_SOURCE.retrieved).toMatch(DATE)
  })
})

describe('de cast-animatie', () => {
  it('is 810 ms, en 720 ms met Spell Booster', () => {
    expect(SPELL_CAST_MS).toEqual({ normal: 810, withSpellBooster: 720 })
  })
})

describe('de buffs en passieven', () => {
  it('Magic Guard: 15 levels, schade naar MP van 30% tot 80%, met de sprongen na 5 en 10', () => {
    expect(MAGIC_GUARD.damageToMpPct).toEqual([30, 33, 36, 39, 42, 49, 52, 55, 58, 61, 68, 71, 74, 77, 80])
    expect(MAGIC_GUARD.mp).toEqual([8, 8, 8, 8, 8, 10, 10, 10, 10, 10, 12, 12, 12, 12, 12])
    expect(MAGIC_GUARD.damageToMpPct).toHaveLength(15)
    expect(MAGIC_GUARD.mp).toHaveLength(15)
    expect(MAGIC_GUARD.source.url).toBe('https://meowdb.com/msclassic/skills/magician/magic-guard')
    expect(MAGIC_GUARD.source.retrieved).toMatch(DATE)
  })

  it('Magic Armor: 20 levels, MP, DEF en duur exact', () => {
    expect(MAGIC_ARMOR_LEVELS).toHaveLength(20)
    expect(MAGIC_ARMOR_LEVELS.map((l) => l.level)).toEqual(range(20))
    expect(MAGIC_ARMOR_LEVELS.map((l) => [l.mp, l.def, l.seconds])).toEqual([
      [8, 40, 300], [8, 44, 315], [8, 48, 330], [8, 52, 345], [8, 56, 360],
      [10, 60, 375], [10, 64, 390], [10, 68, 405], [10, 72, 420], [10, 76, 435],
      [13, 80, 450], [13, 84, 465], [13, 88, 480], [13, 92, 495], [13, 96, 510],
      [16, 100, 525], [16, 104, 540], [16, 108, 555], [16, 112, 570], [16, 120, 600],
    ])
  })

  it('Magic Armor: level 20 volgt het patroon niet (DEF 120 waar 116 volgt, 600 s waar 585 volgt)', () => {
    expect(MAGIC_ARMOR_LEVELS[19].def - MAGIC_ARMOR_LEVELS[18].def).toBe(8)
    expect(MAGIC_ARMOR_LEVELS[19].seconds - MAGIC_ARMOR_LEVELS[18].seconds).toBe(30)
    for (let i = 1; i < MAGIC_ARMOR_LEVELS.length; i++) {
      expect(MAGIC_ARMOR_LEVELS[i].def, `level ${i + 1}`).toBeGreaterThan(MAGIC_ARMOR_LEVELS[i - 1].def)
      expect(MAGIC_ARMOR_LEVELS[i].seconds, `level ${i + 1}`).toBeGreaterThan(MAGIC_ARMOR_LEVELS[i - 1].seconds)
    }
    expect(MAGIC_ARMOR_SOURCE.url).toBe('https://meowdb.com/msclassic/skills/magician/magic-armor')
    expect(MAGIC_ARMOR_SOURCE.retrieved).toMatch(DATE)
  })

  it('Improved MP Recovery: 15 levels, 1% Max MP per 10 s, items van 5% tot 20%, nooit terug', () => {
    const t = IMPROVED_MP_RECOVERY.itemRecoveryPct
    expect(t).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20])
    expect(t).toHaveLength(15)
    expect(IMPROVED_MP_RECOVERY.maxMpPctPer10s).toBe(1)
    for (let i = 1; i < t.length; i++) expect(t[i], `level ${i + 1}`).toBeGreaterThan(t[i - 1])
    expect(IMPROVED_MP_RECOVERY.source.url).toBe('https://meowdb.com/msclassic/skills/magician/improved-mp-recovery')
    expect(IMPROVED_MP_RECOVERY.source.retrieved).toMatch(DATE)
  })

  it('Max MP Increase: 15 levels van 10% tot 25%, nooit terug', () => {
    const t = MAX_MP_INCREASE.maxMpPct
    expect(t).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25])
    expect(t).toHaveLength(15)
    for (let i = 1; i < t.length; i++) expect(t[i], `level ${i + 1}`).toBeGreaterThan(t[i - 1])
    expect(MAX_MP_INCREASE.source.url).toBe('https://meowdb.com/msclassic/skills/magician/max-mp-increase')
    expect(MAX_MP_INCREASE.source.retrieved).toMatch(DATE)
  })
})

describe('HP en MP per level', () => {
  it('geeft een Beginner +16 HP en +12 MP onder level 10', () => {
    expect(magicianHpPerLevelFrom(1)).toBe(16)
    expect(magicianHpPerLevelFrom(9)).toBe(16)
    expect(magicianMpPerLevelFrom(1)).toBe(12)
    expect(magicianMpPerLevelFrom(9)).toBe(12)
  })

  it('geeft een Magician +16 HP en +22 MP vanaf level 10', () => {
    expect(magicianHpPerLevelFrom(10)).toBe(16)
    expect(magicianHpPerLevelFrom(11)).toBe(16)
    expect(magicianHpPerLevelFrom(30)).toBe(16)
    expect(magicianMpPerLevelFrom(10)).toBe(22)
    expect(magicianMpPerLevelFrom(11)).toBe(22)
    expect(magicianMpPerLevelFrom(30)).toBe(22)
  })

  it('pint de waarden en de bronnen', () => {
    expect(MAGICIAN_HP_MP.beginner).toEqual({ hp: 16, mp: 12 })
    expect(MAGICIAN_HP_MP.magician).toEqual({ hp: 16, mp: 22 })
    expect(MAGICIAN_HP_MP.magicianFromLevel).toBe(10)
    expect(MAGICIAN_HP_MP.advancement).toEqual({ hp: 150, mp: 350 })
    expect(MAGICIAN_HP_MP.source.url).toBe('https://meowdb.com/msclassic/guides/hp-mp-gain-explained')
    expect(MAGICIAN_HP_MP.levelSource.url).toBe('https://meowdb.com/msclassic/guides/magician-class-guide')
    expect(MAGICIAN_HP_MP.source.retrieved).toMatch(DATE)
    expect(MAGICIAN_HP_MP.levelSource.retrieved).toMatch(DATE)
  })

  it('telt de job-advancement er niet in: level 10 naar 11 geeft alleen +16 HP en +22 MP', () => {
    expect(magicianHpPerLevelFrom(10)).toBeLessThan(MAGICIAN_HP_MP.advancement.hp)
    expect(magicianMpPerLevelFrom(10)).toBeLessThan(MAGICIAN_HP_MP.advancement.mp)
  })
})

describe('magicianAccuracy', () => {
  it('geeft 68 voor INT 155, level 30 en LUK 4', () => {
    expect(magicianAccuracy(155, 30, 4)).toBe(68) // (186 + 60 + 2,4) / 5,1 + 20 = 68,7
  })

  it('geeft 20 zonder stats en level 0 en rondt naar beneden af', () => {
    expect(magicianAccuracy(0, 0, 0)).toBe(20)
    expect(magicianAccuracy(0, 10, 0)).toBe(23) // 23,92
    expect(magicianAccuracy(0, 1, 0)).toBe(20) // 20,39
  })

  it('geeft op een exacte grens het hele getal en een LUK lager het getal eronder', () => {
    expect(magicianAccuracy(0, 3, 7)).toBe(22) // (6 + 4,2) / 5,1 + 20 = 22,0 precies
    expect(magicianAccuracy(0, 3, 6)).toBe(21) // 21,88
    expect(magicianAccuracy(17, 0, 0)).toBe(24) // 1,2 x 17 / 5,1 = 4,0 precies
    expect(magicianAccuracy(16, 0, 0)).toBe(23) // 23,76
    expect(magicianAccuracy(0, 51, 0)).toBe(40) // 102 / 5,1 = 20,0 precies
    expect(magicianAccuracy(0, 50, 0)).toBe(39) // 39,6
  })

  it('weegt INT zwaarder dan LUK en LUK zwaarder dan niets, en groeit nooit terug', () => {
    expect(magicianAccuracy(51, 0, 0)).toBeGreaterThan(magicianAccuracy(0, 0, 51) - 1)
    expect(magicianAccuracy(51, 0, 0)).toBe(32) // 61,2 / 5,1 = 12,0
    expect(magicianAccuracy(0, 0, 51)).toBe(26) // 30,6 / 5,1 = 6,0
    for (let level = 1; level < 30; level++) {
      expect(magicianAccuracy(100, level + 1, 10)).toBeGreaterThanOrEqual(magicianAccuracy(100, level, 10))
    }
  })

  it('komt over een raster van invoer overeen met de kommagetal-vorm floor((1,2 INT + 2 L + 0,6 LUK) / 5,1 + 20)', () => {
    const mismatches: string[] = []
    for (let int = 0; int <= 300; int += 7) {
      for (let level = 1; level <= 30; level++) {
        for (let luk = 0; luk <= 60; luk += 3) {
          const exact = Math.floor((12 * int + 20 * level + 6 * luk) / 51 + 20)
          const float = Math.floor((1.2 * int + 2 * level + 0.6 * luk) / 5.1 + 20)
          const got = magicianAccuracy(int, level, luk)
          expect(got, `${int}/${level}/${luk} exact`).toBe(exact)
          if (got !== float) mismatches.push(`${int}/${level}/${luk}: int ${got}, float ${float}`)
        }
      }
    }
    // Waar de kommagetal-vorm net onder een heel getal valt, wint de gehele vorm; zie baseAccuracy in thief.ts.
    // Elke afwijking moet daarom een float zijn die EEN lager is, nooit hoger.
    for (const m of mismatches) {
      const [, got, fl] = m.match(/int (\d+), float (\d+)/)!
      expect(Number(fl), m).toBe(Number(got) - 1)
    }
  })

  it('heeft een bron met de damage-gids', () => {
    expect(MAGICIAN_ACCURACY_SOURCE.url).toBe('https://meowdb.com/msclassic/guides/explaining-the-damage-formula')
    expect(MAGICIAN_ACCURACY_SOURCE.retrieved).toMatch(DATE)
  })
})

describe('de bronnen', () => {
  it('heeft elke regel een meowdb.com/msclassic-bron, opgehaald op 2026-10-04', () => {
    const sources = [
      ...NPC_MAGICIAN_WEAPONS.map((w) => w.source),
      ...NPC_MAGICIAN_ARMOR.map((a) => a.source),
      ...MAGICIAN_MP_POTIONS.map((p) => p.source),
      ENERGY_BOLT_SOURCE, MAGIC_CLAW_SOURCE, MAGIC_ARMOR_SOURCE, MAGIC_GUARD.source,
      IMPROVED_MP_RECOVERY.source, MAX_MP_INCREASE.source, MAGICIAN_ACCURACY_SOURCE,
      MAGICIAN_HP_MP.source, MAGICIAN_HP_MP.levelSource,
    ]
    for (const s of sources) {
      expect(s.url).toMatch(/^https:\/\/meowdb\.com\/msclassic\//)
      expect(s.retrieved).toBe('2026-10-04')
    }
  })
})

describe('Magic Claw vraagt Energy Bolt', () => {
  it('op level 1', () => {
    expect(MAGIC_CLAW_REQUIRES_ENERGY_BOLT).toBe(1)
  })
})
