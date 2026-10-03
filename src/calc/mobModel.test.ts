// De gevallen komen uit de regressietests van het mob-advies-model in Daves kennisbank (de
// referentie voor issue #15), met de hand na te rekenen. Ze controleren dat de code de formules
// goed uitvoert, niet dat de formules de waarheid over het spel zijn.
import { describe, expect, it } from 'vitest'
import { ASSUMPTIONS, characterAttack, DANGER_SHARE, dampedTouch, estimateMob, hitChance, touchTaken, type Character, type MobStats } from './mobModel'

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

  it('vloert de schade op 1 bij een hoge WDEF in plaats van negatief door te rekenen', () => {
    // Iron Hog-achtig: lv 28, WDEF 500, avoid 17. D = 18 → raakkans 100/(3.1·17) > 1 → 1.
    const e = estimateMob(char(), { min: 50, max: 100, stars: 1, mpPerAttack: 0 }, mob({ level: 28, hp: 1000, wdef: 500, avoid: 17 }))
    expect(e.hitChance).toBe(1)
    expect(e.attacksToKill).toBe(1000)
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
