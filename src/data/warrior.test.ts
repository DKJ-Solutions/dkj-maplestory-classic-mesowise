import { describe, expect, it } from 'vitest'
import {
  averageAttackMs,
  effectiveMultiplier,
  IMPROVED_HP_RECOVERY,
  IRON_BODY_LEVELS,
  IRON_BODY_SOURCE,
  MAX_HP_INCREASE,
  MELEE_ACTION_SPLIT,
  NPC_WARRIOR_ARMOR,
  NPC_WARRIOR_WEAPONS,
  POWER_STRIKE_LEVELS,
  POWER_STRIKE_SOURCE,
  POWER_STRIKE_TARGETS,
  PRECISE_STRIKES_LEVELS,
  PRECISE_STRIKES_SOURCE,
  SLASH_BLAST_LEVELS,
  SLASH_BLAST_SOURCE,
  SLASH_BLAST_TARGETS,
  WARRIOR_ACCURACY_SOURCE,
  WARRIOR_HP_MP,
  warriorAccuracy,
  warriorHpPerLevelFrom,
  warriorMpPerLevelFrom,
} from './warrior'

const DATE = /^2026-10-04$/
/** De wapens zonder jobregel (voor elke klas, #55, 2026-10-04) en de armor zonder jobregel. */
const NO_JOB_LINE_WEAPONS = ['Long Sword', 'Double Axe', 'Steel Pipe', 'Leather Purse', 'Red Brick', 'Hard Briefcase', 'Plunger', 'Sky Blue Umbrella']
const NO_JOB_LINE_ARMOR = ['White Bandana', 'Red Baseball Cap']
/** Van de wapens zonder jobregel vragen alleen deze twee geen STR: de pagina noemt geen eis. */
const NO_STR_REQ = ['Steel Pipe', 'Sky Blue Umbrella']
const ITEM_URL = /^https:\/\/meowdb\.com\/msclassic\/item-db\/\d+$/

describe('NPC_WARRIOR_WEAPONS', () => {
  it('bevat precies de 39 NPC-wapens (31 met jobregel, 8 zonder: #55), van laag naar hoog level, zoals de bron ze geeft', () => {
    const rows = NPC_WARRIOR_WEAPONS.map((w) => [w.name, w.level, w.watk, w.str, w.dex, w.speed.label, w.price])
    expect(rows).toEqual([
      ['Long Sword', 10, 27, 20, 0, 'Fast (4)', 3_000],
      ['Double Axe', 10, 27, 20, 0, 'Fast (4)', 3_000],
      ['Steel Pipe', 10, 29, 0, 0, 'Fast (5)', 3_000],
      ['Wooden Sword', 10, 30, 25, 0, 'Fast (5)', 5_000],
      ['Metal Axe', 10, 30, 25, 0, 'Fast (5)', 5_000],
      ['Wooden Mallet', 10, 32, 25, 0, 'Normal (6)', 5_000],
      ['Spear', 10, 32, 25, 0, 'Slow (7)', 5_000],
      ['Pole Arm', 10, 35, 15, 0, 'Slow (8)', 5_000],
      ['Leather Purse', 12, 31, 15, 0, 'Fast (5)', 3_800],
      ['Sabre', 15, 32, 30, 10, 'Fast (4)', 5_000],
      ['Battle Axe', 15, 32, 30, 10, 'Fast (4)', 5_000],
      ['Mace', 15, 34, 20, 0, 'Fast (5)', 5_000],
      ['Fork on a Stick', 15, 37, 25, 0, 'Slow (7)', 7_000],
      ['Iron Ball', 15, 40, 35, 15, 'Slow (8)', 7_000],
      ['Heavy Mace', 15, 40, 35, 15, 'Slow (7)', 16_500],
      ['Red Brick', 15, 31, 10, 0, 'Fast (4)', 5_000],
      ['Square Shovel', 17, 36, 11, 11, 'Fast (5)', 6_200],
      ['Iron Mace', 20, 39, 30, 0, 'Fast (5)', 10_500],
      ['Viking Sword', 20, 37, 40, 15, 'Fast (4)', 10_500],
      ['Machete', 20, 37, 40, 15, 'Fast (4)', 10_500],
      ['Two-Handed Sword', 20, 40, 45, 20, 'Fast (5)', 13_500],
      ['Iron Axe', 20, 35, 45, 20, 'Fast (5)', 13_500],
      ['Square Hammer', 20, 42, 45, 20, 'Slow (7)', 13_500],
      ['Studded Polearm', 20, 42, 45, 20, 'Slow (7)', 13_500],
      ['Hard Briefcase', 20, 39, 30, 0, 'Fast (5)', 10_500],
      ['Pointed Shovel', 22, 41, 16, 16, 'Fast (5)', 11_700],
      ['Mithril Axe', 25, 45, 50, 20, 'Fast (5)', 13_500],
      ['Eloon', 25, 42, 50, 20, 'Fast (4)', 13_500],
      ['Fusion Mace', 25, 41, 40, 0, 'Fast (4)', 13_500],
      ['Broadsword', 25, 45, 55, 25, 'Fast (5)', 16_500],
      ['Two-Handed Axe', 25, 45, 55, 25, 'Fast (5)', 16_500],
      ['Plunger', 25, 44, 40, 0, 'Fast (5)', 13_500],
      ['Sky Blue Umbrella', 27, 33, 0, 0, 'Fast (4)', 14_700],
      ['War Hammer', 30, 49, 60, 25, 'Fast (5)', 22_000],
      ['Gladius', 30, 47, 65, 30, 'Fast (4)', 22_000],
      ["Fireman's Axe", 30, 47, 60, 25, 'Fast (4)', 22_000],
      ['Scimitar', 30, 53, 65, 30, 'Normal (6)', 26_000],
      ['Blue Axe', 30, 50, 65, 30, 'Fast (5)', 26_000],
      ['Mithril Pole Arm', 30, 55, 65, 30, 'Slow (8)', 26_000],
    ])
    expect(NPC_WARRIOR_WEAPONS).toHaveLength(39)
  })

  it('geeft elke rij een MeowDB-itempagina als bron, met opgehaald op 2026-10-04', () => {
    for (const w of NPC_WARRIOR_WEAPONS) {
      expect(w.source.url, w.name).toMatch(ITEM_URL)
      expect(w.source.retrieved, w.name).toMatch(DATE)
    }
  })

  it('verwijst per wapen naar een eigen pagina en gebruikt elke naam een keer', () => {
    expect(new Set(NPC_WARRIOR_WEAPONS.map((w) => w.source.url)).size).toBe(NPC_WARRIOR_WEAPONS.length)
    expect(new Set(NPC_WARRIOR_WEAPONS.map((w) => w.name)).size).toBe(NPC_WARRIOR_WEAPONS.length)
  })

  it('heeft levels binnen 10 tot 30 en staat gesorteerd op level', () => {
    for (const w of NPC_WARRIOR_WEAPONS) {
      expect(w.level, w.name).toBeGreaterThanOrEqual(10)
      expect(w.level, w.name).toBeLessThanOrEqual(30)
    }
    for (let i = 1; i < NPC_WARRIOR_WEAPONS.length; i++) {
      const [p, c] = [NPC_WARRIOR_WEAPONS[i - 1], NPC_WARRIOR_WEAPONS[i]]
      expect(c.level, `${p.name} -> ${c.name}`).toBeGreaterThanOrEqual(p.level)
    }
  })

  it('heeft positieve watk en prijs en niet-negatieve DEX, als hele getallen, en positieve STR behalve bij de stukken zonder STR-eis', () => {
    for (const w of NPC_WARRIOR_WEAPONS) {
      expect(Number.isInteger(w.watk) && w.watk > 0, `${w.name} watk`).toBe(true)
      if (!NO_STR_REQ.includes(w.name)) expect(Number.isInteger(w.str) && w.str > 0, `${w.name} str`).toBe(true)
      expect(Number.isInteger(w.price) && w.price > 0, `${w.name} price`).toBe(true)
      expect(Number.isInteger(w.dex) && w.dex >= 0, `${w.name} dex`).toBe(true)
    }
  })

  it('pint de acht wapens zonder jobregel (#55) met level, STR, DEX en soort zoals op MeowDB gelezen, en geen ander wapen heeft STR 0', () => {
    const by = (n: string) => NPC_WARRIOR_WEAPONS.find((w) => w.name === n)!
    const pin = (n: string) => { const w = by(n); return [w.source.url.split('/').pop(), w.kind, w.level, w.str, w.dex, w.watk, w.speed.label, w.price] }
    expect(pin('Long Sword')).toEqual(['543', '1h-sword', 10, 20, 0, 27, 'Fast (4)', 3_000])
    expect(pin('Double Axe')).toEqual(['577', '1h-axe', 10, 20, 0, 27, 'Fast (4)', 3_000])
    expect(pin('Steel Pipe')).toEqual(['588', '1h-blunt', 10, 0, 0, 29, 'Fast (5)', 3_000])
    expect(pin('Leather Purse')).toEqual(['589', '1h-blunt', 12, 15, 0, 31, 'Fast (5)', 3_800])
    expect(pin('Red Brick')).toEqual(['591', '1h-blunt', 15, 10, 0, 31, 'Fast (4)', 5_000])
    expect(pin('Hard Briefcase')).toEqual(['594', '1h-blunt', 20, 30, 0, 39, 'Fast (5)', 10_500])
    expect(pin('Plunger')).toEqual(['597', '1h-blunt', 25, 40, 0, 44, 'Fast (5)', 13_500])
    expect(pin('Sky Blue Umbrella')).toEqual(['550', '1h-sword', 27, 0, 0, 33, 'Fast (4)', 14_700])
    expect(NPC_WARRIOR_WEAPONS.filter((w) => NO_JOB_LINE_WEAPONS.includes(w.name))).toHaveLength(8)
    expect(NPC_WARRIOR_WEAPONS.filter((w) => w.str === 0).map((w) => w.name)).toEqual(NO_STR_REQ)
  })

  it('geeft elk wapen de multiplier van zijn soort en alleen spear en polearm een steekcyclus', () => {
    for (const w of NPC_WARRIOR_WEAPONS) {
      const twoCycles = w.kind === 'spear' || w.kind === 'polearm'
      expect(w.speed.stabMs !== undefined, w.name).toBe(twoCycles)
      expect(w.speed.attackMs, w.name).toBeGreaterThan(0)
    }
    const by = (n: string) => NPC_WARRIOR_WEAPONS.find((w) => w.name === n)!
    expect(by('Gladius').mult).toEqual({ swing: 1.8, stab: 1.8 })
    expect(by('Scimitar').mult).toEqual({ swing: 2.5, stab: 2.5 })
    expect(by('Battle Axe').mult).toEqual({ swing: 2.4, stab: 1.2 })
    expect(by('Iron Mace').mult).toEqual({ swing: 2.4, stab: 1.2 })
    expect(by('Blue Axe').mult).toEqual({ swing: 3.0, stab: 2.0 })
    expect(by('Heavy Mace').mult).toEqual({ swing: 3.0, stab: 2.0 })
    expect(by('Spear').mult).toEqual({ swing: 1.5, stab: 3.5 })
    expect(by('Mithril Pole Arm').mult).toEqual({ swing: 3.5, stab: 1.5 })
  })

  it('pint de aanvalscycli van spear en polearm (zwaai en steek)', () => {
    const by = (n: string) => NPC_WARRIOR_WEAPONS.find((w) => w.name === n)!
    expect(by('Spear').speed).toEqual({ label: 'Slow (7)', attackMs: 870, stabMs: 810 })
    expect(by('Mithril Pole Arm').speed).toEqual({ label: 'Slow (8)', attackMs: 900, stabMs: 870 })
    expect(by('Gladius').speed).toEqual({ label: 'Fast (4)', attackMs: 720 })
    expect(by('Wooden Sword').speed).toEqual({ label: 'Fast (5)', attackMs: 750 })
    expect(by('Scimitar').speed).toEqual({ label: 'Normal (6)', attackMs: 810 })
    expect(by('Heavy Mace').speed).toEqual({ label: 'Slow (7)', attackMs: 870 })
  })
})

describe('NPC_WARRIOR_ARMOR', () => {
  const SLOTS = ['hat', 'shoes'] as const

  it('bevat precies de 15 stukken (13 met jobregel, 2 zonder: #55), per slot van laag naar hoog level, zoals de bron ze geeft', () => {
    const rows = NPC_WARRIOR_ARMOR.map((a) => [a.name, a.slot, a.level, a.str, a.dex, a.wdef, a.price])
    expect(rows).toEqual([
      ['Bronze Koif', 'hat', 10, 10, 0, 22, 1_200],
      ['White Bandana', 'hat', 10, 0, 0, 15, 1_200],
      ['Bronze Helmet', 'hat', 12, 15, 0, 24, 1_400],
      ['Bronze Full Helm', 'hat', 15, 20, 0, 26, 1_800],
      ['Bronze Football Helmet', 'hat', 20, 30, 10, 30, 3_600],
      ['Bronze Viking Helm', 'hat', 20, 30, 10, 30, 3_600],
      ['Red Baseball Cap', 'hat', 22, 0, 0, 22, 3_900],
      ['Steel Sharp Helm', 'hat', 22, 34, 12, 32, 3_900],
      ['Iron Burgernet Helm', 'hat', 25, 40, 15, 34, 4_500],
      ['Jousting Helmet', 'hat', 30, 50, 20, 38, 7_200],
      ['Bronze Grieves', 'shoes', 15, 20, 0, 18, 1_800],
      ['Steel Grieves', 'shoes', 15, 20, 0, 18, 1_800],
      ['Brown High Boots', 'shoes', 20, 30, 10, 21, 3_600],
      ['Orange High Boots', 'shoes', 20, 30, 10, 21, 3_600],
      ['Blue High Boots', 'shoes', 20, 30, 10, 21, 3_600],
    ])
  })

  it('geeft elke rij een MeowDB-itempagina als bron, met opgehaald op 2026-10-04, en elk stuk een eigen pagina', () => {
    for (const a of NPC_WARRIOR_ARMOR) {
      expect(a.source.url, a.name).toMatch(ITEM_URL)
      expect(a.source.retrieved, a.name).toMatch(DATE)
    }
    expect(new Set(NPC_WARRIOR_ARMOR.map((a) => a.source.url)).size).toBe(NPC_WARRIOR_ARMOR.length)
    expect(new Set(NPC_WARRIOR_ARMOR.map((a) => a.name)).size).toBe(NPC_WARRIOR_ARMOR.length)
  })

  it('heeft alleen hat en shoes (tops en broeken zijn alleen voor mannen) en levels binnen 10 tot 30', () => {
    expect(new Set(NPC_WARRIOR_ARMOR.map((a) => a.slot))).toEqual(new Set(SLOTS))
    for (const a of NPC_WARRIOR_ARMOR) {
      expect(a.level, a.name).toBeGreaterThanOrEqual(10)
      expect(a.level, a.name).toBeLessThanOrEqual(30)
    }
  })

  it('staat gesorteerd op slot (hat, shoes), dan op level', () => {
    const rank = (s: string) => SLOTS.indexOf(s as (typeof SLOTS)[number])
    for (let i = 1; i < NPC_WARRIOR_ARMOR.length; i++) {
      const [p, c] = [NPC_WARRIOR_ARMOR[i - 1], NPC_WARRIOR_ARMOR[i]]
      const order = rank(c.slot) - rank(p.slot) || c.level - p.level
      expect(order, `${p.name} -> ${c.name}`).toBeGreaterThanOrEqual(0)
    }
  })

  it('heeft de White Bandana (719) en de Red Baseball Cap (781) zonder jobregel precies zoals op MeowDB gelezen: geen STR- of DEX-eis', () => {
    expect(NPC_WARRIOR_ARMOR.find((a) => a.name === 'White Bandana')).toMatchObject({ slot: 'hat', level: 10, str: 0, dex: 0, wdef: 15, price: 1_200, source: { url: 'https://meowdb.com/msclassic/item-db/719', retrieved: '2026-10-04' } })
    expect(NPC_WARRIOR_ARMOR.find((a) => a.name === 'Red Baseball Cap')).toMatchObject({ slot: 'hat', level: 22, str: 0, dex: 0, wdef: 22, price: 3_900, source: { url: 'https://meowdb.com/msclassic/item-db/781', retrieved: '2026-10-04' } })
    expect(NPC_WARRIOR_ARMOR.filter((a) => a.str === 0 && a.dex === 0).map((a) => a.name)).toEqual(NO_JOB_LINE_ARMOR)
  })

  it('heeft positieve WDEF en prijs en niet-negatieve STR en DEX, als hele getallen', () => {
    for (const a of NPC_WARRIOR_ARMOR) {
      expect(Number.isInteger(a.wdef) && a.wdef > 0, `${a.name} wdef`).toBe(true)
      expect(Number.isInteger(a.price) && a.price > 0, `${a.name} price`).toBe(true)
      expect(Number.isInteger(a.str) && a.str >= 0, `${a.name} str`).toBe(true)
      expect(Number.isInteger(a.dex) && a.dex >= 0, `${a.name} dex`).toBe(true)
    }
  })

  // De White Bandana en de Red Baseball Cap hebben geen jobregel en dus een lagere WDEF dan de klasse-stukken
  // van hetzelfde of een lager level (Bandana lv 10 met 15 na Bronze Koif met 22; Cap lv 22 met 22 na Football
  // Helmet lv 20 met 30): voor hen geldt de regel niet, voor de rest wel.
  it('geeft binnen een slot een hoger level nooit minder WDEF, voor de stukken met een jobregel', () => {
    for (const slot of SLOTS) {
      const rows = NPC_WARRIOR_ARMOR.filter((a) => a.slot === slot && !NO_JOB_LINE_ARMOR.includes(a.name))
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i].wdef, `${rows[i - 1].name} -> ${rows[i].name}`).toBeGreaterThanOrEqual(rows[i - 1].wdef)
      }
    }
  })
})

describe('effectiveMultiplier en averageAttackMs', () => {
  it('geeft 1,92 voor 1H bijl en stomp, 2,6 voor 2H, 1,8 en 2,5 voor de zwaarden', () => {
    expect(effectiveMultiplier({ swing: 2.4, stab: 1.2 })).toBe(1.92)
    expect(effectiveMultiplier({ swing: 3.0, stab: 2.0 })).toBe(2.6)
    expect(effectiveMultiplier({ swing: 1.8, stab: 1.8 })).toBe(1.8)
    expect(effectiveMultiplier({ swing: 2.5, stab: 2.5 })).toBe(2.5)
  })

  it('geeft 2,3 voor spear en 2,7 voor polearm, zoals de gids', () => {
    expect(effectiveMultiplier({ swing: 1.5, stab: 3.5 })).toBe(2.3)
    expect(effectiveMultiplier({ swing: 3.5, stab: 1.5 })).toBe(2.7)
  })

  it('volgt de 60/40-verdeling van MELEE_ACTION_SPLIT', () => {
    expect(MELEE_ACTION_SPLIT.swing + MELEE_ACTION_SPLIT.stab).toBeCloseTo(1, 10)
    expect(MELEE_ACTION_SPLIT.swing).toBe(0.6)
    expect(MELEE_ACTION_SPLIT.stab).toBe(0.4)
    expect(MELEE_ACTION_SPLIT.source.url).toBe('https://meowdb.com/msclassic/guides/explaining-the-damage-formula')
    expect(MELEE_ACTION_SPLIT.source.retrieved).toMatch(DATE)
  })


  it('middelt de cyclus: een cyclus blijft zoals hij is, spear en polearm wegen 60/40', () => {
    expect(averageAttackMs({ label: 'Fast (4)', attackMs: 720 })).toBe(720)
    expect(averageAttackMs({ label: 'Slow (7)', attackMs: 870, stabMs: 810 })).toBe(846)
    expect(averageAttackMs({ label: 'Slow (8)', attackMs: 900, stabMs: 870 })).toBe(888)
  })
})

describe('Power Strike', () => {
  it('heeft 20 levels, genummerd van 1 tot 20, en raakt 1 mob', () => {
    expect(POWER_STRIKE_LEVELS.map((l) => l.level)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
    expect(POWER_STRIKE_TARGETS).toBe(1)
  })

  it('pint level 1, 10 en 20', () => {
    expect(POWER_STRIKE_LEVELS[0]).toEqual({ level: 1, mp: 4, damagePct: 160 })
    expect(POWER_STRIKE_LEVELS[9]).toEqual({ level: 10, mp: 7, damagePct: 205 })
    expect(POWER_STRIKE_LEVELS[19]).toEqual({ level: 20, mp: 12, damagePct: 260 })
  })

  it('loopt in schade strikt op en in MP nooit terug', () => {
    for (let i = 1; i < POWER_STRIKE_LEVELS.length; i++) {
      expect(POWER_STRIKE_LEVELS[i].damagePct, `level ${i + 1}`).toBeGreaterThan(POWER_STRIKE_LEVELS[i - 1].damagePct)
      expect(POWER_STRIKE_LEVELS[i].mp, `level ${i + 1}`).toBeGreaterThanOrEqual(POWER_STRIKE_LEVELS[i - 1].mp)
    }
  })

  it('heeft een skillpagina als bron', () => {
    expect(POWER_STRIKE_SOURCE.url).toBe('https://meowdb.com/msclassic/skills/warrior/power-strike')
    expect(POWER_STRIKE_SOURCE.retrieved).toMatch(DATE)
  })
})

describe('Slash Blast', () => {
  it('heeft 20 levels, genummerd van 1 tot 20, en raakt 4 mobs', () => {
    expect(SLASH_BLAST_LEVELS.map((l) => l.level)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
    expect(SLASH_BLAST_TARGETS).toBe(4)
  })

  it('pint level 1, 10 en 20', () => {
    expect(SLASH_BLAST_LEVELS[0]).toEqual({ level: 1, hp: 3, mp: 4, damagePct: 70 })
    expect(SLASH_BLAST_LEVELS[9]).toEqual({ level: 10, hp: 5, mp: 7, damagePct: 97 })
    expect(SLASH_BLAST_LEVELS[19]).toEqual({ level: 20, hp: 8, mp: 12, damagePct: 130 })
  })

  it('loopt in schade strikt op en in HP en MP nooit terug', () => {
    for (let i = 1; i < SLASH_BLAST_LEVELS.length; i++) {
      const [p, c] = [SLASH_BLAST_LEVELS[i - 1], SLASH_BLAST_LEVELS[i]]
      expect(c.damagePct, `level ${i + 1}`).toBeGreaterThan(p.damagePct)
      expect(c.hp, `level ${i + 1}`).toBeGreaterThanOrEqual(p.hp)
      expect(c.mp, `level ${i + 1}`).toBeGreaterThanOrEqual(p.mp)
    }
  })

  it('heeft een skillpagina als bron', () => {
    expect(SLASH_BLAST_SOURCE.url).toBe('https://meowdb.com/msclassic/skills/warrior/slash-blast')
    expect(SLASH_BLAST_SOURCE.retrieved).toMatch(DATE)
  })
})

describe('de passieven', () => {
  it('Improved HP Recovery: 15 levels van 5% tot 20%, nooit terug', () => {
    const t = IMPROVED_HP_RECOVERY.itemRecoveryPct
    expect(t).toHaveLength(15)
    expect([t[0], t[14]]).toEqual([5, 20])
    for (let i = 1; i < t.length; i++) expect(t[i], `level ${i + 1}`).toBeGreaterThan(t[i - 1])
    expect(IMPROVED_HP_RECOVERY.source.url).toBe('https://meowdb.com/msclassic/skills/warrior/improved-hp-recovery')
    expect(IMPROVED_HP_RECOVERY.source.retrieved).toMatch(DATE)
  })

  it('Max HP Increase: 15 levels van 10% tot 25%, nooit terug', () => {
    const t = MAX_HP_INCREASE.maxHpPct
    expect(t).toHaveLength(15)
    expect([t[0], t[14]]).toEqual([10, 25])
    for (let i = 1; i < t.length; i++) expect(t[i], `level ${i + 1}`).toBeGreaterThan(t[i - 1])
    expect(MAX_HP_INCREASE.source.url).toBe('https://meowdb.com/msclassic/skills/warrior/max-hp-increase')
    expect(MAX_HP_INCREASE.source.retrieved).toMatch(DATE)
  })

  it('Iron Body: 20 levels, WDEF 5% tot 25%, duur 300 s tot 570 s en dan 600 s, 15 MP', () => {
    expect(IRON_BODY_LEVELS).toHaveLength(20)
    expect(IRON_BODY_LEVELS.map((l) => l.level)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
    expect(IRON_BODY_LEVELS[0]).toEqual({ level: 1, wdefPct: 5, mp: 15, seconds: 300 })
    expect(IRON_BODY_LEVELS[18]).toEqual({ level: 19, wdefPct: 23, mp: 15, seconds: 570 })
    expect(IRON_BODY_LEVELS[19]).toEqual({ level: 20, wdefPct: 25, mp: 15, seconds: 600 })
    for (let i = 1; i < IRON_BODY_LEVELS.length; i++) {
      expect(IRON_BODY_LEVELS[i].wdefPct, `level ${i + 1}`).toBeGreaterThan(IRON_BODY_LEVELS[i - 1].wdefPct)
      expect(IRON_BODY_LEVELS[i].seconds, `level ${i + 1}`).toBeGreaterThan(IRON_BODY_LEVELS[i - 1].seconds)
    }
    expect(IRON_BODY_SOURCE.url).toBe('https://meowdb.com/msclassic/skills/warrior/iron-body')
    expect(IRON_BODY_SOURCE.retrieved).toMatch(DATE)
  })

  it('Precise Strikes: 15 levels, accuracy 5 tot 20, crit 1% tot 5%, nooit terug', () => {
    expect(PRECISE_STRIKES_LEVELS).toHaveLength(15)
    expect(PRECISE_STRIKES_LEVELS[0]).toEqual({ level: 1, accuracy: 5, critPct: 1 })
    expect(PRECISE_STRIKES_LEVELS[14]).toEqual({ level: 15, accuracy: 20, critPct: 5 })
    for (let i = 1; i < PRECISE_STRIKES_LEVELS.length; i++) {
      expect(PRECISE_STRIKES_LEVELS[i].accuracy, `level ${i + 1}`).toBeGreaterThan(PRECISE_STRIKES_LEVELS[i - 1].accuracy)
      expect(PRECISE_STRIKES_LEVELS[i].critPct, `level ${i + 1}`).toBeGreaterThanOrEqual(PRECISE_STRIKES_LEVELS[i - 1].critPct)
    }
    expect(PRECISE_STRIKES_SOURCE.url).toBe('https://meowdb.com/msclassic/skills/warrior/precise-strikes')
    expect(PRECISE_STRIKES_SOURCE.retrieved).toMatch(DATE)
  })
})

describe('HP en MP per level', () => {
  it('geeft een Beginner +16 HP en +12 MP onder level 10', () => {
    expect(warriorHpPerLevelFrom(1)).toBe(16)
    expect(warriorHpPerLevelFrom(9)).toBe(16)
    expect(warriorMpPerLevelFrom(1)).toBe(12)
    expect(warriorMpPerLevelFrom(9)).toBe(12)
  })

  it('geeft een Warrior +28 HP en +12 MP vanaf level 10', () => {
    expect(warriorHpPerLevelFrom(10)).toBe(28)
    expect(warriorHpPerLevelFrom(11)).toBe(28)
    expect(warriorHpPerLevelFrom(30)).toBe(28)
    expect(warriorMpPerLevelFrom(10)).toBe(12)
    expect(warriorMpPerLevelFrom(30)).toBe(12)
  })

  it('pint de waarden en de bronnen', () => {
    expect(WARRIOR_HP_MP.beginner).toEqual({ hp: 16, mp: 12 })
    expect(WARRIOR_HP_MP.warrior).toEqual({ hp: 28, mp: 12 })
    expect(WARRIOR_HP_MP.warriorFromLevel).toBe(10)
    expect(WARRIOR_HP_MP.advancement).toEqual({ hp: 350, mp: 150 })
    expect(WARRIOR_HP_MP.source.url).toBe('https://meowdb.com/msclassic/guides/hp-mp-gain-explained')
    expect(WARRIOR_HP_MP.levelSource.url).toBe('https://meowdb.com/msclassic/guides/warrior-class-guide')
    expect(WARRIOR_HP_MP.source.retrieved).toMatch(DATE)
    expect(WARRIOR_HP_MP.levelSource.retrieved).toMatch(DATE)
  })

  it('rekent de gids na: Beginner level 10 met 194 HP en 113 MP wordt Warrior level 11 met 572 HP en 275 MP', () => {
    expect(194 + WARRIOR_HP_MP.advancement.hp + warriorHpPerLevelFrom(10)).toBe(572)
    expect(113 + WARRIOR_HP_MP.advancement.mp + warriorMpPerLevelFrom(10)).toBe(275)
  })
})

describe('warriorAccuracy', () => {
  it('geeft 49 voor het voorbeeld uit de damage-gids (dex 30, level 30, luk 4)', () => {
    expect(warriorAccuracy(30, 30, 4)).toBe(49) // 49,36
  })

  it('rondt naar beneden af', () => {
    expect(warriorAccuracy(0, 10, 0)).toBe(18) // 18,0
    expect(warriorAccuracy(0, 10, 1)).toBe(18) // 18,24
    expect(warriorAccuracy(0, 10, 2)).toBe(18) // 18,48
    expect(warriorAccuracy(0, 10, 5)).toBe(19) // 19,2
  })

  it('geeft precies 32, 28, 30 en 26 waar de formule in kommagetallen net onder een heel getal viel', () => {
    expect(warriorAccuracy(9, 5, 57)).toBe(32)
    expect(warriorAccuracy(18, 6, 19)).toBe(28)
    expect(warriorAccuracy(18, 7, 24)).toBe(30)
    expect(warriorAccuracy(18, 8, 4)).toBe(26)
  })

  it('heeft een bron met de damage-gids', () => {
    expect(WARRIOR_ACCURACY_SOURCE.url).toBe('https://meowdb.com/msclassic/guides/explaining-the-damage-formula')
    expect(WARRIOR_ACCURACY_SOURCE.retrieved).toMatch(DATE)
  })
})
