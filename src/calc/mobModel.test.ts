// De gevallen komen uit de regressietests van het mob-advies-model in Daves kennisbank (de
// referentie voor issue #15), met de hand na te rekenen. Ze controleren dat de code de formules
// goed uitvoert, niet dat de formules de waarheid over het spel zijn.
import { describe, expect, it } from 'vitest'
import { ASSUMPTIONS, bowAttack, characterAttack, DANGER_SHARE, dampedTouch, defended, estimateMob, hitChance, meleeAttack, touchTaken, type Character, type MobStats } from './mobModel'

const LS = { stars: 2, weaponMult: 3.0, mastery: 0.5 }
const LS_LV1 = { mp: 8, damagePct: 60 }

const char = (over: Partial<Character> = {}): Character => ({
  level: 10,
  hp: 1000,
  str: 4,
  dex: 25,
  luk: 30,
  watk: 25,
  accuracy: 100,
  avoid: 0,
  wdef: 0,
  attackMs: 750,
  ...over,
})

const mob = (over: Partial<MobStats> = {}): MobStats => ({
  level: 10,
  hp: 100,
  wdef: 0,
  avoid: 0,
  accuracy: 50,
  touch: { min: 1, max: 2 },
  ...over,
})

describe('characterAttack', () => {
  it('Lucky Seven lv 1: K = 0,6, W = 3,0, M = 0,5 en 2 stars (handmatig 32,85 en 23,1)', () => {
    // max = 0.6·25·(1 + (30·3 + 4 + 25)/100) = 15·2.19; min = 0.6·25·(0.8 + (30·0.5·3 + 29)/100) = 15·1.54
    const a = characterAttack(char(), LS_LV1, LS)
    expect(a.max).toBeCloseTo(32.85, 9)
    expect(a.min).toBeCloseTo(23.1, 9)
    expect(a.stars).toBe(2)
    expect(a.mpPerAttack).toBe(8)
  })

  it('de gewone claw-aanval zonder Lucky Seven (handmatig 51 en 28,75)', () => {
    // max = 25·(1 + (75 + 29)/100) = 51; min = 25·(0.8 + (30·0.08·2.5 + 29)/100) = 28.75
    const a = characterAttack(char(), null, LS)
    expect(a.max).toBeCloseTo(51, 9)
    expect(a.min).toBeCloseTo(28.75, 9)
    expect(a.stars).toBe(1)
    expect(a.mpPerAttack).toBe(0)
  })

  it('de lv-10-build met LUK 40: gewoon 57,25 / 29,25, met Lucky Seven lv 1 37,35 / 25,35', () => {
    const c = char({ luk: 40 })
    const plain = characterAttack(c, null, LS)
    expect(plain.max).toBeCloseTo(57.25, 9)
    expect(plain.min).toBeCloseTo(29.25, 9)
    const ls = characterAttack(c, LS_LV1, LS)
    expect(ls.max).toBeCloseTo(37.35, 9)
    expect(ls.min).toBeCloseTo(25.35, 9)
  })
})

describe('hitChance', () => {
  it('is 1 als de verdediger geen avoid heeft', () => {
    expect(hitChance(10, 0, 0)).toBe(1)
  })

  it('daalt met het levelverschil (handmatig 49,4% bij D=0 en 41,5% bij D=5)', () => {
    expect(hitChance(100, 110, 0)).toBeCloseTo(100 / (1.84 * 110), 9)
    expect(hitChance(100, 110, 5)).toBeCloseTo(100 / (2.19 * 110), 9)
    expect(hitChance(100, 110, 5)).toBeLessThan(hitChance(100, 110, 0))
  })

  it('komt nooit boven 1, en een negatief levelverschil telt als 0', () => {
    expect(hitChance(1000, 1, 0)).toBe(1)
    expect(hitChance(100, 110, -5)).toBe(hitChance(100, 110, 0))
  })
})

describe('dampedTouch en touchTaken', () => {
  it('dempen 1% per level verschil, nooit onder 1', () => {
    expect(dampedTouch(34.5, 0)).toBeCloseTo(34.5, 9)
    expect(dampedTouch(34.5, 20)).toBeCloseTo(27.6, 9)
    expect(dampedTouch(5, 200)).toBe(1)
  })

  it('trekken WDEF af met de formule van MeowDB (handmatig: 72 WDEF op lv 10 haalt ~20% van 34,5 af)', () => {
    // 34.5 · (1 − 72 / (72 + 5·50 + 1.2·34.5)) = 34.5 · 291.4 / 363.4
    expect(touchTaken(34.5, 72, 10)).toBeCloseTo((34.5 * 291.4) / 363.4, 9)
    expect(touchTaken(34.5, 0, 10)).toBeCloseTo(34.5, 9)
    expect(touchTaken(1, 10_000, 10)).toBe(1)
  })
})

describe('estimateMob', () => {
  const plainAttack = { min: 10, max: 20, stars: 1, mpPerAttack: 0 }

  it('rekent kills per uur uit (handmatig: 7 aanvallen, 8,75 s per kill, 411,43 kills per uur)', () => {
    // gemiddeld 15 per aanval, raakkans 1 → ceil(100/15) = 7; 7 · 0.75 s / 0.6 = 8.75 s → 3600 / 8.75
    const e = estimateMob(char(), plainAttack, mob())
    expect(e.attacksToKill).toBe(7)
    expect(e.killsPerHour).toBeCloseTo(3600 / 8.75, 9)
    expect(e.starsPerKill).toBe(7)
    expect(e.mpPerKill).toBe(0)
  })

  it('gebruikt de aannames, en die zijn te vervangen', () => {
    expect(ASSUMPTIONS).toEqual({ timeEfficiency: 0.6, contactsPerKill: 0.3 })
    const half = estimateMob(char(), plainAttack, mob(), { timeEfficiency: 0.3, contactsPerKill: 0.3 })
    expect(half.killsPerHour).toBeCloseTo(estimateMob(char(), plainAttack, mob()).killsPerHour / 2, 9)
  })

  it('telt de MP van Lucky Seven per aanval', () => {
    const e = estimateMob(char(), { min: 10, max: 20, stars: 2, mpPerAttack: 8 }, mob())
    // 2 stars · 15 = 30 per aanval → ceil(100/30) = 4 aanvallen, 32 MP en 8 stars per kill
    expect(e.attacksToKill).toBe(4)
    expect(e.mpPerKill).toBe(32)
    expect(e.starsPerKill).toBe(8)
  })

  it('vloert de schade op 1 als de WDEF van het monster de klap onder 1 drukt', () => {
    // Lv 28, avoid 17: raakkans 1. Met WDEF 100.000 is 100 x 100 / 100.100 < 1, dus elke klap doet 1.
    const e = estimateMob(char(), { min: 50, max: 100, stars: 1, mpPerAttack: 0 }, mob({ level: 28, hp: 1000, wdef: 100_000, avoid: 17 }))
    expect(e.hitChance).toBe(1)
    expect(e.attacksToKill).toBe(1000)
  })

  it('verlaagt een fysieke klap met de verdedigingscurve van de bron, niet door WDEF af te trekken (#89)', () => {
    // Het voorbeeld uit #89: DEF 50 en een klap van 100 → 100 x 100 / 150 = 66,7 (aftrekken gaf 75 en 70).
    expect(defended(100, 50)).toBeCloseTo(200 / 3, 9)
    expect(defended(100, 0)).toBe(100)
    // Een monster op je eigen level, zonder levelverschil: de gemiddelde klap is (50 + 100) / 2 x 100 / 150 = 50.
    const e = estimateMob(char(), { min: 50, max: 100, stars: 1, mpPerAttack: 0 }, mob({ level: char().level, hp: 500, wdef: 50, avoid: 0 }))
    expect(e.attacksToKill).toBe(10)
  })

  it('geeft met meer LUK niet minder kills per uur', () => {
    const m = mob({ hp: 300, wdef: 5, avoid: 30, touch: { min: 5, max: 8 } })
    const c = (luk: number) => char({ luk, accuracy: 25, wdef: 10, hp: 250 })
    const low = estimateMob(c(10), characterAttack(c(10), null, LS), m)
    const high = estimateMob(c(50), characterAttack(c(50), null, LS), m)
    expect(high.killsPerHour).toBeGreaterThanOrEqual(low.killsPerHour)
  })

  it('waarschuwt "gevaarlijk" als één tik 25% of meer van je HP kost', () => {
    // lv 30 tegen lv 10: touch_max 150 · 0.8 = 120 ≥ 0.25 · 200
    const e = estimateMob(char({ level: 30, hp: 200 }), { min: 50, max: 100, stars: 1, mpPerAttack: 0 }, mob({ touch: { min: 100, max: 150 } }))
    expect(e.dangerous).toBe(true)
    expect(e.missesOften).toBe(false)
  })

  it('legt de grens voor "gevaarlijk" op precies 25% van je HP', () => {
    // Zelfde level en geen WDEF: één tik is touch_max = 50, en 25% van 200 HP is 50.
    const attack = { min: 50, max: 100, stars: 1, mpPerAttack: 0 }
    const m = mob({ touch: { min: 1, max: 50 } })
    expect(DANGER_SHARE).toBe(0.25)
    expect(estimateMob(char({ hp: 200 }), attack, m).dangerous).toBe(true)
    expect(estimateMob(char({ hp: 201 }), attack, m).dangerous).toBe(false)
  })

  it('waarschuwt "mist vaak" onder 80% raakkans, los van "gevaarlijk"', () => {
    const e = estimateMob(char({ wdef: 100 }), { min: 50, max: 100, stars: 1, mpPerAttack: 0 }, mob({ level: 15, avoid: 110 }))
    expect(e.hitChance).toBeCloseTo(0.415, 3)
    expect(e.missesOften).toBe(true)
    expect(e.dangerous).toBe(false)
  })

  it('verliest met WDEF minder HP per kill', () => {
    const m = mob({ touch: { min: 29, max: 40 } })
    const zonder = estimateMob(char({ wdef: 0 }), { min: 50, max: 100, stars: 1, mpPerAttack: 0 }, m)
    const met = estimateMob(char({ wdef: 72 }), { min: 50, max: 100, stars: 1, mpPerAttack: 0 }, m)
    expect(met.hpLossPerKill).toBeLessThan(zonder.hpLossPerKill)
    // 0.3 aanrakingen · raakkans 1 · 34.5
    expect(zonder.hpLossPerKill).toBeCloseTo(0.3 * 34.5, 9)
  })

  it('valt niet om bij 0% raakkans', () => {
    const e = estimateMob(char({ accuracy: 0 }), { min: 10, max: 20, stars: 1, mpPerAttack: 0 }, mob({ avoid: 10 }))
    expect(e.hitChance).toBe(0)
    expect(Number.isFinite(e.killsPerHour)).toBe(true)
    expect(e.killsPerHour).toBeGreaterThan(0)
  })
})

describe('meleeAttack', () => {
  // De werkvoorbeelden komen uit de damage-gids van NiaMeowDB (externe waarheid, niet uit onze code):
  // https://meowdb.com/msclassic/guides/explaining-the-damage-formula
  // Level 30 Warrior, 47 weapon attack, STR 132, DEX 30, multiplier 1,8.
  const warrior = { str: 132, dex: 30, watk: 47 }

  it('geeft de gewone aanval van de gids: 60 tot 172', () => {
    const a = meleeAttack(warrior, 1.8, null)
    expect(Math.floor(a.min)).toBe(60)
    expect(Math.floor(a.max)).toBe(172)
  })

  it('geeft Power Strike lv 20 (260%) van de gids: 157 tot 449', () => {
    const a = meleeAttack(warrior, 1.8, { mp: 12, damagePct: 260 })
    expect(Math.floor(a.min)).toBe(157)
    expect(Math.floor(a.max)).toBe(449)
  })

  it('rekent het voorbeeld met de hand na (47 · (1 + (132 · 1,8 + 30)/100) = 172,772 en 47 · (0,8 + (132 · 0,08 · 1,8 + 30)/100) = 60,634)', () => {
    const a = meleeAttack(warrior, 1.8, null)
    expect(a.max).toBeCloseTo(172.772, 9)
    expect(a.min).toBeCloseTo(60.63376, 9)
  })

  it('slaat één keer per aanval, zonder munitie, en rekent de MP van de skill (0 bij de gewone aanval)', () => {
    expect(meleeAttack(warrior, 1.8, null)).toMatchObject({ stars: 1, mpPerAttack: 0 })
    expect(meleeAttack(warrior, 1.8, { mp: 4, damagePct: 160 })).toMatchObject({ stars: 1, mpPerAttack: 4 })
  })

  it('schaalt min en max allebei met de skill-percentage', () => {
    const plain = meleeAttack(warrior, 1.8, null)
    const ps = meleeAttack(warrior, 1.8, { mp: 4, damagePct: 160 })
    expect(ps.max).toBeCloseTo(1.6 * plain.max, 9)
    expect(ps.min).toBeCloseTo(1.6 * plain.min, 9)
  })

  it('gebruikt STR als hoofdstat en DEX als secundaire stat, en kijkt niet naar LUK', () => {
    const withLuk = meleeAttack({ ...warrior, luk: 999 } as Parameters<typeof meleeAttack>[0], 1.8, null)
    expect(withLuk).toEqual(meleeAttack(warrior, 1.8, null))
    expect(meleeAttack({ ...warrior, str: 200 }, 1.8, null).max).toBeGreaterThan(meleeAttack(warrior, 1.8, null).max)
    // Eén punt DEX telt ongewogen (1/100 · watk), één punt STR telt met de multiplier (1,8/100 · watk).
    const base = meleeAttack(warrior, 1.8, null).max
    expect(meleeAttack({ ...warrior, dex: 31 }, 1.8, null).max - base).toBeCloseTo(0.47, 9)
    expect(meleeAttack({ ...warrior, str: 133 }, 1.8, null).max - base).toBeCloseTo(0.47 * 1.8, 9)
  })

  it('geeft bij de gemiddelde multiplier van zwaaien en steken het gemiddelde van de twee acties', () => {
    // 1H Axe: zwaai 2,4 en steek 1,2 geeft samen 1,92; min en max zijn lineair in de multiplier.
    const swing = meleeAttack(warrior, 2.4, null)
    const stab = meleeAttack(warrior, 1.2, null)
    const mean = meleeAttack(warrior, 0.6 * 2.4 + 0.4 * 1.2, null)
    expect(mean.max).toBeCloseTo(0.6 * swing.max + 0.4 * stab.max, 9)
    expect(mean.min).toBeCloseTo(0.6 * swing.min + 0.4 * stab.min, 9)
  })

  it('verandert de Thief-aanval niet: characterAttack gebruikt nog steeds LUK en STR + DEX', () => {
    // Zelfde handmatige uitkomst als in de characterAttack-tests hierboven (vóór de Warrior-wijziging vastgelegd).
    const a = characterAttack(char(), LS_LV1, LS)
    expect(a.max).toBeCloseTo(32.85, 9)
    expect(a.min).toBeCloseTo(23.1, 9)
    // STR telt bij de Thief mee als secundaire stat, LUK als hoofdstat.
    expect(characterAttack(char({ str: 5 }), null, LS).max - characterAttack(char(), null, LS).max).toBeCloseTo(0.25, 9)
    expect(characterAttack(char({ luk: 31 }), null, LS).max - characterAttack(char(), null, LS).max).toBeCloseTo(0.25 * 2.5, 9)
  })
})

describe('bowAttack', () => {
  // De formule en de constanten van een Bowman (issue #44): DEX is de hoofdstat, STR de secundaire, het schot heeft
  // multiplier 2,5 en de basis-mastery is 0,08 (data/bowman.ts). Alles hieronder is met de hand uitgerekend.
  const BOW = { weaponMult: 2.5, mastery: 0.08 }
  // Level 30 Bowman: weapon attack 50 (de pijl telt 0), DEX 100, STR 20.
  const bowman = { str: 20, dex: 100, watk: 50 }

  it('geeft het gewone schot: max = 50 · (1 + (100 · 2,5 + 20)/100) = 185 en min = 50 · (0,8 + (100 · 0,08 · 2,5 + 20)/100) = 60', () => {
    const a = bowAttack(bowman, BOW, null)
    expect(a.max).toBeCloseTo(185, 9)
    expect(a.min).toBeCloseTo(60, 9)
  })

  it('schaalt min en max met Arrow Blow lv 20 (240%): 444 en 144, en kost 14 MP', () => {
    const a = bowAttack(bowman, BOW, { mp: 14, damagePct: 240 })
    expect(a.max).toBeCloseTo(444, 9)
    expect(a.min).toBeCloseTo(144, 9)
    expect(a.mpPerAttack).toBe(14)
  })

  it('schiet één klap en één pijl per aanval, en het gewone schot kost geen MP', () => {
    expect(bowAttack(bowman, BOW, null)).toMatchObject({ stars: 1, mpPerAttack: 0 })
    expect(bowAttack(bowman, BOW, { mp: 6, damagePct: 160 })).toMatchObject({ stars: 1, mpPerAttack: 6 })
  })

  it('gebruikt DEX als hoofdstat en STR als secundaire stat, en kijkt niet naar LUK', () => {
    const base = bowAttack(bowman, BOW, null).max
    expect(bowAttack({ ...bowman, luk: 999 } as Parameters<typeof bowAttack>[0], BOW, null).max).toBe(base)
    // Eén punt STR telt ongewogen (1/100 · watk), één punt DEX telt met de multiplier (2,5/100 · watk).
    expect(bowAttack({ ...bowman, str: 21 }, BOW, null).max - base).toBeCloseTo(0.5, 9)
    expect(bowAttack({ ...bowman, dex: 101 }, BOW, null).max - base).toBeCloseTo(0.5 * 2.5, 9)
  })

  it('rekent een Arrow Blow-kill uit: 5 aanvallen, 5 pijlen, 70 MP en 576 kills per uur', () => {
    // Arrow Blow lv 20 geeft 444 en 144. Het monster heeft 1000 HP en WDEF 20, op hetzelfde level, zonder avoid.
    // Na de verdedigingscurve (#89): maxHit = 444 · 100 / 120 = 370, minHit = 144 · 100 / 120 = 120, gemiddeld 245
    // en de raakkans is 1. 1000 / 245 = 4,08, dus 5 aanvallen. Per kill: 5 · 14 = 70 MP en 5 pijlen.
    // 5 · 750 ms / 0,6 = 6,25 s per kill, dus 576 per uur.
    const attack = bowAttack(bowman, BOW, { mp: 14, damagePct: 240 })
    const e = estimateMob(char({ level: 30, ...bowman }), attack, mob({ level: 30, hp: 1000, wdef: 20 }))
    expect(e.hitChance).toBe(1)
    expect(e.attacksToKill).toBe(5)
    expect(e.starsPerKill).toBe(5)
    expect(e.mpPerKill).toBe(70)
    expect(e.killsPerHour).toBeCloseTo(576, 9)
  })
})
