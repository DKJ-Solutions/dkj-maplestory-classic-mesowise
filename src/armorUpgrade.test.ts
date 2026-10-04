import { describe, expect, it } from 'vitest'
import { armorUpgradeAdvice, replacedWdef, withArmor, type ArmorUpgradeAdvice } from './armorUpgrade'
import { ASSUMPTION_VARIANTS } from './best'
import { ASSUMPTIONS, type Assumptions } from './calc/mobModel'
import { NPC_ARMOR } from './data/armor'
import { knownSpotPatch } from './data/spots'
import type { Armor } from './data/types'
import { horizonCost } from './horizonCost'
import { bestExpPerMeso } from './mesoCostAt'
import { DEFAULT_PROFILE, parseProfile, type Profile } from './profile'
import { newDraft, type SpotDraft } from './spotDraft'

const parsed = parseProfile(DEFAULT_PROFILE)
if (!('profile' in parsed)) throw new Error('voorbeeldprofiel ongeldig')
const base: Profile = parsed.profile
// Stats ruim genoeg voor elk stuk, zodat alleen het level bepaalt wat een kandidaat is.
const strong = (over: Partial<Profile>): Profile => ({ ...base, dex: 100, luk: 100, ...over })

const own = (id: string, expPerHour: number, potions: number): SpotDraft => ({
  ...newDraft(id),
  name: id,
  expPerHour: String(expPerHour),
  potions: String(potions),
})
// "Beste" vraagt minstens twee plekken: een bekende plek en een eigen plek met weinig EXP per uur.
const drafts = [{ ...newDraft('a'), ...knownSpotPatch('henesys-rain-forest-east') }, own('b', 1_000, 10_000)]

type Advice = Extract<ArmorUpgradeAdvice, { kind: 'advice' }>
const advice = (d: readonly SpotDraft[], p: Profile | null): Advice => {
  const a = armorUpgradeAdvice(d, p)
  if (a.kind !== 'advice') throw new Error('advies verwacht')
  return a
}
const names = (a: Advice) => a.choices.map((c) => c.armor.name)
const armor = (name: string) => NPC_ARMOR.find((x) => x.name === name)!
const choice = (a: Advice, name: string) => a.choices.find((c) => c.armor.name === name)!

/** EXP per meso op de beste plek (via bestExpPerMeso, niet via de module onder test). */
const epm = (p: Profile, a: Assumptions = ASSUMPTIONS) => {
  const v = bestExpPerMeso(drafts, p, a)
  if (v === undefined) throw new Error('geen beste plek')
  return v
}

// EXP tot het volgende level, met de hand uit de tabel overgenomen (level 10 t/m 30), los van expToNextLevel.
const EXP_AT: Record<number, number> = {
  10: 1_716, 11: 2_360, 12: 3_216, 13: 4_200, 14: 5_460, 15: 7_050, 16: 8_840, 17: 11_040, 18: 13_716, 19: 16_680,
  20: 20_216, 21: 24_402, 22: 28_980, 23: 34_320, 24: 40_512, 25: 47_216, 26: 54_900, 27: 63_666, 28: 73_080, 29: 83_720, 30: 95_700,
}
const expSum = (from: number, to: number) => {
  let sum = 0
  for (let l = from; l <= to; l++) sum += EXP_AT[l]
  return sum
}
// EXP-sommen met de hand opgeteld.
const EXP_10_19 = 74_278
const EXP_15_19 = 57_326
const EXP_20_24 = 148_430
const EXP_25_29 = 322_582
const EXP_30 = 95_700
const EXP_20_30 = 566_712

/** De winkel met de hand: een stuk zonder geslacht past iedereen, een stuk met geslacht alleen dat geslacht (en niemand zolang het geslacht niet gekozen is). Los van fitsGender. */
const shopHand = (gender: 'male' | 'female' | null) => NPC_ARMOR.filter((b) => b.gender === undefined || b.gender === gender)

/** Het laatste level van de horizon van een stuk, met de hand: net vóór het volgende stuk met meer WDEF in dat slot, hoogstens 30. */
const handTo = (level: number, a: Armor, gender: 'male' | 'female' | null = null) => {
  const next = shopHand(gender).find((b) => b.slot === a.slot && b.level > level && b.wdef > a.wdef)
  return Math.min(next ? next.level - 1 : 30, 30)
}
/** De netto besparing van een stuk met de hand: EXP-som over de horizon gedeeld door de EXP per meso zonder en met het stuk, min de prijs. */
const handNet = (p: Profile, a: Armor, v: Assumptions = ASSUMPTIONS) => {
  const exp = expSum(p.level, handTo(p.level, a, p.gender ?? null))
  return exp / epm(p, v) - exp / epm({ ...p, wdef: p.wdef + a.wdef }, v) - a.price
}
/** Elk stuk dat dit profiel kan dragen, met zijn netto: een brute-force blik op heel NPC_ARMOR, zonder keuze per slot. */
const wearableNets = (p: Profile, v: Assumptions = ASSUMPTIONS) =>
  shopHand(p.gender ?? null).filter((a) => a.level <= p.level && p.luk >= a.luk && p.dex >= a.dex).map((a) => ({ armor: a, net: handNet(p, a, v) }))
/** De winnaar volgens brute force: het stuk met de hoogste netto, mits boven 0. */
const bruteWinner = (p: Profile, v: Assumptions = ASSUMPTIONS): Armor | null => {
  const best = wearableNets(p, v).reduce<{ armor: Armor; net: number } | null>((m, x) => (!m || x.net > m.net ? x : m), null)
  return best && best.net > 0 ? best.armor : null
}
const LEVELS = Array.from({ length: 21 }, (_, i) => 10 + i)
// Variant 0 is de aanname "minder contacten per kill" (0,15).
const V_FEW_CONTACTS = ASSUMPTION_VARIANTS[0]

describe('armorUpgradeAdvice: wanneer er niets te rekenen valt', () => {
  it('geeft none zonder profiel, buiten de EXP-tabel of zonder "Beste"', () => {
    expect(armorUpgradeAdvice(drafts, null)).toEqual({ kind: 'none' })
    expect(armorUpgradeAdvice(drafts, strong({ level: 9 }))).toEqual({ kind: 'none' })
    expect(armorUpgradeAdvice(drafts, strong({ level: 31 }))).toEqual({ kind: 'none' })
    expect(armorUpgradeAdvice([own('a', 40_000, 10_000)], strong({ level: 15 }))).toEqual({ kind: 'none' })
  })

  it('rekent op de randen van de tabel wel: lv 10 en lv 30', () => {
    expect(advice(drafts, strong({ level: 10 })).level).toBe(10)
    expect(advice(drafts, strong({ level: 30 })).level).toBe(30)
  })
})

describe('armorUpgradeAdvice: per slot het beste draagbare stuk', () => {
  it('geeft op lv 10 alleen de stukken van lv 10 (hat, top, bottom, shoes)', () => {
    expect(names(advice(drafts, strong({ level: 10 }))).sort()).toEqual(['Blue Gidder Shoes', 'Red Cloth Pants', 'Red Cloth Vest', 'Red Ghetto Beanie'])
  })

  it('neemt een stuk pas mee vanaf zijn levelvereiste (hoed lv 15: op lv 14 nog niet)', () => {
    // Red Thief Hood (lv 15) is op lv 15 wel een kandidaat, maar de Red Ghetto Beanie wint het hoedslot (zie lv 25 hieronder), dus kijk naar alle draagbare stukken.
    expect(wearableNets(strong({ level: 14 })).map((x) => x.armor.name)).not.toContain('Red Thief Hood')
    expect(wearableNets(strong({ level: 15 })).map((x) => x.armor.name)).toContain('Red Thief Hood')
    expect(names(advice(drafts, strong({ level: 14 })))).not.toContain('Red Thief Hood')
  })

  it('geeft één stuk per slot, op lv 25 voor elk van de vier slots (de Red Ghetto Beanie wint het hoedslot van de Red Thief Hood)', () => {
    const a = advice(drafts, strong({ level: 25 }))
    expect(names(a).sort()).toEqual(['Blue Gidder Shoes', 'Red Cloth Pants', 'Red Cloth Vest', 'Red Ghetto Beanie'])
    // Met de hand: dezelfde horizon (25 t/m 29) en maar 3 WDEF minder, maar 700 mesos goedkoper: de Beanie levert netto meer op.
    expect(handTo(25, armor('Red Ghetto Beanie'))).toBe(handTo(25, armor('Red Thief Hood')))
    expect(handNet(strong({ level: 25 }), armor('Red Ghetto Beanie'))).toBeGreaterThan(handNet(strong({ level: 25 }), armor('Red Thief Hood')))
    expect(new Set(a.choices.map((c) => c.armor.slot)).size).toBe(a.choices.length)
  })

  it('kiest per slot het stuk met de hoogste NETTO, niet dat met de hoogste WDEF (met de hand nagerekend, elk level)', () => {
    for (const level of LEVELS) {
      const p = strong({ level })
      const a = advice(drafts, p)
      for (const slot of ['hat', 'top', 'bottom', 'shoes'] as const) {
        const inSlot = wearableNets(p).filter((x) => x.armor.slot === slot)
        const got = a.choices.find((c) => c.armor.slot === slot)
        if (inSlot.length === 0) {
          expect(got, `${slot} lv ${level}`).toBeUndefined()
          continue
        }
        const best = Math.max(...inSlot.map((x) => x.net))
        expect(got!.net, `${slot} lv ${level}`).toBeCloseTo(best, 6)
        expect(handNet(p, got!.armor), `${slot} lv ${level}`).toBeCloseTo(best, 6)
      }
    }
  })

  it('zet een stuk dat je level toestaat maar dat te veel LUK/DEX vraagt, niet bij de keuzes', () => {
    // Lv 25, LUK 35, DEX 10: Tiberian, Brown Sneak en Brown Sneak Pants (40/15) kunnen nog niet.
    const a = advice(drafts, { ...base, level: 25, luk: 35, dex: 10 })
    for (const n of ['Red Tiberian', 'Brown Sneak', 'Brown Sneak Pants']) expect(names(a)).not.toContain(n)
    for (const c of a.choices) {
      expect(c.armor.luk, c.armor.name).toBeLessThanOrEqual(35)
      expect(c.armor.dex, c.armor.name).toBeLessThanOrEqual(10)
    }
    expect(a.choices).toHaveLength(4)
  })
})

describe('armorUpgradeAdvice: niet draagbaar', () => {
  it('noemt per slot het beste stuk dat je niet kunt dragen, met het juiste tekort', () => {
    const a = advice(drafts, { ...base, level: 25, luk: 35, dex: 10 })
    expect(a.notWearable).toEqual([
      { armor: armor('Red Tiberian'), needLuk: 5, needDex: 5 },
      { armor: armor('Brown Sneak'), needLuk: 5, needDex: 5 },
      // Bij bottom is Brown Sneak Pants (WDEF 26) het beste stuk dat nog niet draagbaar is.
      { armor: armor('Brown Sneak Pants'), needLuk: 5, needDex: 5 },
    ])
  })

  it('noemt alleen het tekort dat er is: genoeg DEX geeft needDex 0, genoeg LUK needLuk 0', () => {
    const dexOk = advice(drafts, { ...base, level: 20, luk: 25, dex: 50 })
    expect(dexOk.notWearable.find((u) => u.armor.name === 'Red Loosecap')).toEqual({ armor: armor('Red Loosecap'), needLuk: 5, needDex: 0 })
    const lukOk = advice(drafts, { ...base, level: 25, luk: 100, dex: 5 })
    expect(lukOk.notWearable.find((u) => u.armor.name === 'Red Tiberian')).toEqual({ armor: armor('Red Tiberian'), needLuk: 0, needDex: 10 })
  })

  it('draagt een stuk bij precies genoeg stats (LUK 20, DEX 0 voor Red Thief Hood; LUK 19 niet)', () => {
    const a = advice(drafts, { ...base, level: 15, luk: 20, dex: 0 })
    expect(a.notWearable.map((u) => u.armor.name)).not.toContain('Red Thief Hood')
    expect(wearableNets({ ...base, level: 15, luk: 20, dex: 0 }).map((x) => x.armor.name)).toContain('Red Thief Hood')
    // Eén LUK minder: de Hood kan niet, de Red Ghetto Beanie (LUK 10) wel.
    const b = advice(drafts, { ...base, level: 15, luk: 19, dex: 0 })
    expect(b.notWearable).toContainEqual({ armor: armor('Red Thief Hood'), needLuk: 1, needDex: 0 })
    expect(names(b)).toContain('Red Ghetto Beanie')
  })

  it('rekent een niet-draagbaar stuk niet door', () => {
    const a = advice(drafts, { ...base, level: 25, luk: 35, dex: 10 })
    for (const u of a.notWearable) expect(names(a)).not.toContain(u.armor.name)
  })

  it('heeft niets niet-draagbaar als alles draagbaar is', () => {
    expect(advice(drafts, strong({ level: 25 })).notWearable).toEqual([])
  })
})

describe('armorUpgradeAdvice: het profiel met het stuk erbij', () => {
  it('telt de WDEF van het stuk op bij die van het profiel en laat de rest staan', () => {
    expect(withArmor(base, armor('Red Pao'))).toEqual({ ...base, wdef: base.wdef + 32 })
  })
})

describe('armorUpgradeAdvice: de horizon', () => {
  it('loopt bij lv 15 voor Red Ghetto Beanie van 15 tot 19 (vóór Red Loosecap, lv 20; de Red Thief Hood van lv 15 telt niet als "later")', () => {
    expect(choice(advice(drafts, strong({ level: 15 })), 'Red Ghetto Beanie')).toMatchObject({ from: 15, to: 19, truncated: false })
  })

  it('stopt per slot vóór het volgende betere stuk: top lv 10 tot 19 (Red Pao, lv 20), hat, bottom en shoes lv 10 tot 14 (lv 15)', () => {
    const a = advice(drafts, strong({ level: 10 }))
    expect(choice(a, 'Red Ghetto Beanie')).toMatchObject({ from: 10, to: 14, truncated: false })
    expect(choice(a, 'Red Cloth Vest')).toMatchObject({ from: 10, to: 19, truncated: false })
    expect(choice(a, 'Red Cloth Pants')).toMatchObject({ from: 10, to: 14, truncated: false })
    expect(choice(a, 'Blue Gidder Shoes')).toMatchObject({ from: 10, to: 14, truncated: false })
  })

  it('loopt bij lv 20 voor top en bottom tot 24 (de lv 25-stukken zijn beter)', () => {
    const a = advice(drafts, strong({ level: 20 }))
    for (const n of ['Red Cloth Vest', 'Red Cloth Pants']) expect(choice(a, n), n).toMatchObject({ from: 20, to: 24, truncated: false })
  })

  it('stopt bij lv 20 voor de hoed (Red Ghetto Beanie) al op 21: de Red Baseball Cap (lv 22, WDEF 22, zonder jobregel, #55) is eerder beter dan de lv 25-hoed', () => {
    // Voor #55 liep de hoed tot 24 (Red Tiberian, lv 25). De Red Baseball Cap heeft WDEF 22 > 15 op lv 22, dus de horizon eindigt op 21.
    // EXP met de hand: level 20 (20.216) + level 21 (24.402) = 44.618.
    expect(expSum(20, 21)).toBe(44_618)
    expect(choice(advice(drafts, strong({ level: 20 })), 'Red Ghetto Beanie')).toMatchObject({ from: 20, to: 21, truncated: false })
  })

  it('loopt bij lv 25 voor Red Ghetto Beanie van 25 tot 29 (vóór Red Guise, lv 30)', () => {
    expect(choice(advice(drafts, strong({ level: 25 })), 'Red Ghetto Beanie')).toMatchObject({ from: 25, to: 29, truncated: false })
  })

  it('kapt af op de laatste tabelrij (lv 30) als er geen beter stuk meer komt, en meldt dat', () => {
    // Red Ninja Sandals: Red Enamel Boots is lv 20, dus niet "later": de horizon is niet eindig en wordt afgekapt.
    expect(choice(advice(drafts, strong({ level: 20 })), 'Red Ninja Sandals')).toMatchObject({ from: 20, to: 30, truncated: true })
    for (const c of advice(drafts, strong({ level: 30 })).choices) expect(c).toMatchObject({ from: 30, to: 30, truncated: true })
  })

  it('kapt niet af als het volgende stuk nog binnen de tabel valt, en wel bij schoenen op lv 25', () => {
    const a = advice(drafts, strong({ level: 25 }))
    for (const c of a.choices.filter((x) => x.armor.slot !== 'shoes')) expect(c.truncated, c.armor.name).toBe(false)
    expect(choice(a, 'Blue Gidder Shoes')).toMatchObject({ from: 25, to: 30, truncated: true })
  })

  it('komt voor elke keuze op elk level overeen met de horizon met de hand (net vóór het volgende betere stuk)', () => {
    for (const level of LEVELS) {
      for (const c of advice(drafts, strong({ level })).choices) {
        expect(c, `${c.armor.name} lv ${level}`).toMatchObject({ from: level, to: handTo(level, c.armor) })
      }
    }
  })
})

describe('armorUpgradeAdvice: de besparing, met de hand nagerekend', () => {
  it('is volledig met de hand uit te rekenen: lv 20, Red Ninja Sandals (WDEF 12, 1.800 mesos), 20 t/m 30', () => {
    // EXP 148.430 + 322.582 + 95.700 = 566.712; EXP per meso zonder en met de sandalen (WDEF 72 en 84) als losse getallen.
    expect(EXP_20_24 + EXP_25_29 + EXP_30).toBe(EXP_20_30)
    const e0 = 0.811766602598203
    const e1 = 0.8163425463624694
    const p = strong({ level: 20 })
    expect(epm(p)).toBeCloseTo(e0, 12)
    expect(epm({ ...p, wdef: p.wdef + 12 })).toBeCloseTo(e1, 12)
    const saving = EXP_20_30 / e0 - EXP_20_30 / e1
    expect(saving).toBeCloseTo(3_913.3, 1)
    const c = choice(advice(drafts, p), 'Red Ninja Sandals')
    expect(c.saving).toBeCloseTo(saving, 6)
    expect(c.net).toBeCloseTo(saving - 1_800, 6)
    expect(c.net).toBeCloseTo(2_113.3, 1)
  })

  it('is volledig met de hand uit te rekenen: lv 25, Red Cloth Vest (WDEF 24, 2.000 mesos), 25 t/m 29', () => {
    const e0 = 0.8189959910591013
    const e1 = 0.8272487131223927
    const p = strong({ level: 25 })
    expect(epm(p)).toBeCloseTo(e0, 12)
    expect(epm({ ...p, wdef: p.wdef + 24 })).toBeCloseTo(e1, 12)
    const saving = EXP_25_29 / e0 - EXP_25_29 / e1
    expect(saving).toBeCloseTo(3_929.3, 1)
    const c = choice(advice(drafts, p), 'Red Cloth Vest')
    expect(c.saving).toBeCloseTo(saving, 6)
    expect(c.net).toBeCloseTo(saving - 2_000, 6)
  })

  it('is kosten zonder min kosten met over de horizon, elk op de beste plek (lv 15, Red Cloth Vest, 15 t/m 19)', () => {
    const p = strong({ level: 15 })
    const c = choice(advice(drafts, p), 'Red Cloth Vest')
    const without = EXP_15_19 / epm(p)
    const withIt = EXP_15_19 / epm({ ...p, wdef: p.wdef + 24 })
    expect(c.saving).toBeCloseTo(without - withIt, 6)
    expect(c.net).toBeCloseTo(without - withIt - 2_000, 6)
  })

  it('geldt voor elke keuze op elk level met zijn eigen horizon (EXP-som met de hand gedeeld door de EXP per meso)', () => {
    const cases: [number, string, number, number][] = [
      [10, 'Red Cloth Vest', 10, 19],
      [10, 'Red Cloth Pants', 10, 14],
      [10, 'Blue Gidder Shoes', 10, 14],
      [10, 'Red Ghetto Beanie', 10, 14],
      [15, 'Red Ghetto Beanie', 15, 19],
      [20, 'Red Ninja Sandals', 20, 30],
      [20, 'Red Cloth Vest', 20, 24],
      [20, 'Red Cloth Pants', 20, 24],
      [20, 'Red Ghetto Beanie', 20, 21], // de Red Baseball Cap (lv 22, WDEF 22) is eerder beter dan de Red Tiberian (lv 25), zie de horizon hierboven
      [25, 'Red Cloth Vest', 25, 29],
      [25, 'Red Cloth Pants', 25, 29],
      [25, 'Red Ghetto Beanie', 25, 29],
      [25, 'Blue Gidder Shoes', 25, 30],
      [30, 'Red Ghetto Beanie', 30, 30],
    ]
    for (const [level, name, from, to] of cases) {
      const p = strong({ level })
      const exp = expSum(from, to)
      const want = exp / epm(p) - exp / epm({ ...p, wdef: p.wdef + armor(name).wdef })
      const c = choice(advice(drafts, p), name)
      expect(c, `${name} lv ${level}`).toMatchObject({ from, to })
      expect(c.saving, `${name} lv ${level}`).toBeCloseTo(want, 6)
      expect(c.net, `${name} lv ${level}`).toBeCloseTo(want - armor(name).price, 6)
    }
  })

  it('heeft EXP-sommen met de hand die kloppen met de losse levelwaarden', () => {
    expect(expSum(10, 19)).toBe(EXP_10_19)
    expect(expSum(15, 19)).toBe(EXP_15_19)
    expect(expSum(20, 24)).toBe(EXP_20_24)
    expect(expSum(25, 29)).toBe(EXP_25_29)
    expect(expSum(30, 30)).toBe(EXP_30)
  })

  it('houdt de stats van nu vast over de hele horizon, en telt het huidige level vol mee', () => {
    // Eén epm (van het level van nu) voor alle levels van de horizon, geen epm die met het level meegroeit.
    const p = strong({ level: 25 })
    const c = choice(advice(drafts, p), 'Red Cloth Vest')
    expect(c.from).toBe(25)
    expect(c.saving).toBeCloseTo(EXP_25_29 * (1 / epm(p) - 1 / epm({ ...p, wdef: p.wdef + 24 })), 5)
  })

  it('telt de verkoopwaarde van het oude stuk niet mee: net = saving - prijs', () => {
    for (const c of advice(drafts, strong({ level: 25 })).choices) expect(c.net).toBeCloseTo(c.saving! - c.armor.price, 6)
  })

  it('geeft besparing en netto null als het "zonder"-scenario onhaalbaar is (0 EXP op de beste plek)', () => {
    const a = advice([own('a', 0, 1_000), own('b', 0, 1_000)], strong({ level: 15 }))
    for (const c of a.choices) expect(c).toMatchObject({ saving: null, net: null })
    expect(a.winner).toBeNull()
  })

  it('geeft besparing 0 en netto -prijs als de beste plek niets kost', () => {
    const a = advice([own('a', 1_000, 0), own('b', 500, 0)], strong({ level: 15 }))
    for (const c of a.choices) expect(c).toMatchObject({ saving: 0, net: -c.armor.price })
  })

  it('heeft bij alleen eigen plekken nooit een winnaar: het profiel raakt de kosten niet', () => {
    const a = advice([own('a', 40_000, 10_000), own('b', 30_000, 10_000)], strong({ level: 15 }))
    expect(a).toMatchObject({ winner: null, robust: true })
    for (const c of a.choices) expect(c.saving).toBe(0)
  })
})

describe('armorUpgradeAdvice: meer WDEF geeft nooit minder besparing (de "nee is zeker"-belofte)', () => {
  const horizons: [number, number][] = [[10, 19], [15, 19], [20, 24], [25, 29], [30, 30], [20, 30]]

  it('geeft EXP per meso dat niet daalt als de WDEF stijgt, op elk level, onder elke aanname', () => {
    for (const level of [10, 15, 20, 25, 30]) {
      for (const a of [ASSUMPTIONS, ...ASSUMPTION_VARIANTS]) {
        for (const wdef0 of [0, 72, 300]) {
          let prev = -Infinity
          for (let extra = 0; extra <= 80; extra++) {
            const v = epm({ ...strong({ level }), wdef: wdef0 + extra }, a)
            expect(v, `lv ${level} wdef ${wdef0 + extra}`).toBeGreaterThanOrEqual(prev)
            prev = v
          }
        }
      }
    }
  })

  it('geeft een besparing over elke horizon die niet daalt als het stuk meer WDEF heeft', () => {
    for (const level of [10, 15, 20, 25, 30]) {
      const p = strong({ level })
      for (const [from, to] of horizons) {
        const without = horizonCost(from, to, epm(p))!
        let prev = -Infinity
        for (let wdef = 0; wdef <= 80; wdef++) {
          const saving = without - horizonCost(from, to, epm({ ...p, wdef: p.wdef + wdef }))!
          expect(saving, `lv ${level} ${from}-${to} +${wdef}`).toBeGreaterThanOrEqual(prev)
          prev = saving
        }
      }
    }
  })
})

describe('armorUpgradeAdvice: winnaar en robuustheid', () => {
  it('heeft geen winnaar zonder kandidaten (geen enkel stuk draagbaar): LUK 0 en DEX 0, en de hoed die zonder eis te dragen is, draag je al', () => {
    // Sinds #55 is de White Bandana (lv 10, WDEF 15, geen LUK- of DEX-eis) voor elk profiel vanaf lv 10 draagbaar; zonder hoed aan
    // zou LUK 0 dus niet meer "niets draagbaar" geven. Met hoed 15 aan is de Bandana geen upgrade (niet strikt meer WDEF), de Red
    // Thief Hood (LUK 20) is niet draagbaar en de rest (top, bottom, schoenen) vraagt LUK 10: nu is er echt geen kandidaat.
    const a = armorUpgradeAdvice(drafts, { ...base, level: 15, luk: 0, dex: 0 }, { hat: 15 })
    if (a.kind !== 'advice') throw new Error('advies verwacht')
    expect(a.choices).toEqual([])
    expect(a.winner).toBeNull()
  })

  it('heeft met LUK 0 en DEX 0 op lv 15 alleen de White Bandana als kandidaat (geen eis, #55), en die verdient zich niet terug', () => {
    const p = { ...base, level: 15, luk: 0, dex: 0 }
    const a = advice(drafts, p)
    expect(names(a)).toEqual(['White Bandana'])
    // Met de hand: horizon 15 t/m 19 (de Red Loosecap, lv 20, is beter), EXP 57.326, WDEF +15, prijs 1.200.
    expect(choice(a, 'White Bandana')).toMatchObject({ from: 15, to: 19, truncated: false })
    const saving = EXP_15_19 / epm(p) - EXP_15_19 / epm({ ...p, wdef: p.wdef + 15 })
    expect(choice(a, 'White Bandana').saving).toBeCloseTo(saving, 6)
    expect(saving).toBeLessThan(1_200)
    expect(a.winner).toBeNull()
  })

  it('kiest bij gelijke netto het eerste stuk van de lijst: de White Bandana is een kopie van de Red Ghetto Beanie (WDEF 15, 1.200, zelfde horizon)', () => {
    for (const level of [10, 15, 20, 25]) {
      const a = advice(drafts, strong({ level }))
      const beanie = a.choices.find((c) => c.armor.name === 'Red Ghetto Beanie')
      expect(beanie, `lv ${level}`).toBeDefined()
      expect(handNet(strong({ level }), armor('White Bandana'))).toBeCloseTo(handNet(strong({ level }), armor('Red Ghetto Beanie')), 9)
      expect(a.choices.some((c) => c.armor.name === 'White Bandana'), `lv ${level}`).toBe(false)
    }
  })

  it('kiest het stuk met de grootste netto besparing boven 0 en sorteert de lijst op netto, aflopend', () => {
    const a = advice(drafts, strong({ level: 20 }))
    expect(a.winner).toBe(armor('Red Ninja Sandals'))
    expect(a.winner).toBe(a.choices[0].armor)
    expect(a.choices[0].net!).toBeGreaterThan(0)
    const nets = a.choices.map((c) => c.net!)
    expect(nets).toEqual([...nets].sort((x, y) => y - x))
  })

  it('kiest in een slot een goedkoper stuk met minder WDEF als dat netto meer oplevert (lv 20 schoenen)', () => {
    const p = strong({ level: 20 })
    const a = advice(drafts, p)
    // Het topstuk (Red Enamel Boots, WDEF 14, 3.600) bespaart meer dan de Red Ninja Sandals (WDEF 12, 1.800), maar kost het dubbele.
    const boots = armor('Red Enamel Boots')
    const sandals = armor('Red Ninja Sandals')
    expect(boots.wdef).toBeGreaterThan(sandals.wdef)
    const savingOf = (x: Armor) => EXP_20_30 / epm(p) - EXP_20_30 / epm({ ...p, wdef: p.wdef + x.wdef })
    expect(savingOf(boots)).toBeGreaterThan(savingOf(sandals))
    expect(savingOf(boots) - boots.price).toBeLessThan(savingOf(sandals) - sandals.price)
    expect(names(a)).toContain('Red Ninja Sandals')
    expect(names(a)).not.toContain('Red Enamel Boots')
    expect(a.winner).toBe(sandals)
  })

  it('heeft geen winnaar als geen enkel stuk zich terugverdient (netto onder 0): lv 15 en lv 30', () => {
    for (const level of [15, 30]) {
      const a = advice(drafts, strong({ level }))
      expect(a.winner, `lv ${level}`).toBeNull()
      for (const c of a.choices) expect(c.net!, `${c.armor.name} lv ${level}`).toBeLessThan(0)
    }
  })

  it('houdt de "nee"-belofte: zonder winnaar verdient geen enkel draagbaar stuk van NPC_ARMOR zich terug (brute force, los van de keuze per slot)', () => {
    let nos = 0
    const profiles = [
      ...LEVELS.map((level) => strong({ level })),
      ...LEVELS.map((level) => ({ ...base, level, luk: 35, dex: 10 })),
      ...LEVELS.map((level) => ({ ...base, level, luk: 20, dex: 0 })),
    ]
    for (const p of profiles) {
      const a = advice(drafts, p)
      const tag = `lv ${p.level} luk ${p.luk}`
      if (a.winner === null) {
        nos++
        for (const x of wearableNets(p)) expect(x.net, `${x.armor.name} ${tag}`).toBeLessThanOrEqual(1e-9)
      }
      // En andersom: de winnaar is het stuk met de hoogste netto van allemaal.
      expect(a.winner, tag).toBe(bruteWinner(p))
    }
    expect(nos).toBeGreaterThan(5)
  })

  it('zet "niet uit te rekenen" (net null) achteraan, en heeft dan geen winnaar', () => {
    const a = advice([own('a', 0, 1_000), own('b', 0, 1_000)], strong({ level: 25 }))
    expect(a.choices.every((c) => c.net === null)).toBe(true)
    expect(a.winner).toBeNull()
  })

  it('meldt robust true als dezelfde uitkomst geldt onder elke aannamevariant (lv 15: nergens een winnaar)', () => {
    expect(advice(drafts, strong({ level: 15 })).robust).toBe(true)
    // Handcontrole: onder geen enkele variant verdient een van de stukken zich terug.
    const p = strong({ level: 15 })
    for (const v of ASSUMPTION_VARIANTS) {
      for (const x of wearableNets(p, v)) expect(x.net, x.armor.name).toBeLessThan(0)
    }
  })

  it('meldt robust false op lv 20 omdat bij minder contacten (0,15) een ander stuk wint: Blue Gidder Shoes in plaats van Red Ninja Sandals', () => {
    const p = strong({ level: 20 })
    const a = advice(drafts, p)
    expect(a.winner).toBe(armor('Red Ninja Sandals'))
    expect(V_FEW_CONTACTS.contactsPerKill).toBe(0.15)
    // Met de hand: bij 0,15 contacten is Gidder (ongeveer 438 netto) beter dan Sandals (ongeveer 157), beide nog boven 0.
    const gidder = handNet(p, armor('Blue Gidder Shoes'), V_FEW_CONTACTS)
    const sandals = handNet(p, armor('Red Ninja Sandals'), V_FEW_CONTACTS)
    expect(gidder).toBeGreaterThan(0)
    expect(sandals).toBeGreaterThan(0)
    expect(gidder).toBeGreaterThan(sandals)
    expect(bruteWinner(p, V_FEW_CONTACTS)).toBe(armor('Blue Gidder Shoes'))
    expect(a.robust).toBe(false)
  })

  it('meldt robust false op lv 25 omdat bij minder contacten (0,15) alleen de goedkope Red Ghetto Beanie zich nog terugverdient, terwijl Red Cloth Vest nu wint (de White Bandana is daarbij gelijk aan de Beanie)', () => {
    const p = strong({ level: 25 })
    const a = advice(drafts, p)
    expect(a.winner).toBe(armor('Red Cloth Vest'))
    // Met de hand, EXP per meso als losse getallen bij 0,15 contacten: zonder 0,9047805, met de Vest (WDEF 24) 0,9097939.
    expect(epm(p, V_FEW_CONTACTS)).toBeCloseTo(0.9047805, 6)
    expect(epm({ ...p, wdef: p.wdef + 24 }, V_FEW_CONTACTS)).toBeCloseTo(0.9097939, 6)
    const vestNet = EXP_25_29 / 0.9047805 - EXP_25_29 / 0.9097939 - 2_000
    expect(vestNet).toBeCloseTo(-35, -1) // net onder 0: de Vest verdient zich dan niet terug
    expect(vestNet).toBeLessThan(0)
    // Met de hand, de Beanie (WDEF 15, 1.200 mesos): EXP per meso bij 0,15 contacten 0,9079706, dus ongeveer +53 netto.
    expect(epm({ ...p, wdef: p.wdef + 15 }, V_FEW_CONTACTS)).toBeCloseTo(0.9079706, 6)
    const beanieNet = EXP_25_29 / 0.9047805 - EXP_25_29 / 0.9079706 - 1_200
    expect(beanieNet).toBeCloseTo(52.6, 0)
    expect(handNet(p, armor('Red Ghetto Beanie'), V_FEW_CONTACTS)).toBeCloseTo(beanieNet, 0)
    // De White Bandana (#55, WDEF 15, 1.200, zelfde horizon 25 t/m 29) is een kopie van de Beanie: dezelfde netto, ongeveer +53.
    // Bij gelijkspel wint de eerste van de lijst, dus de Beanie.
    expect(handNet(p, armor('White Bandana'), V_FEW_CONTACTS)).toBeCloseTo(beanieNet, 0)
    // Geen enkel ander stuk doet het dan wel: alleen de Beanie en de Bandana staan boven 0, dus de Beanie wint onder deze aanname.
    for (const x of wearableNets(p, V_FEW_CONTACTS).filter((y) => !['Red Ghetto Beanie', 'White Bandana'].includes(y.armor.name))) expect(x.net, x.armor.name).toBeLessThan(0)
    expect(bruteWinner(p, V_FEW_CONTACTS)).toBe(armor('Red Ghetto Beanie'))
    expect(a.robust).toBe(false)
  })

  it('meldt robust precies dan als elke variant dezelfde winnaar heeft als de standaard (brute force, lv 10 t/m 30)', () => {
    let trues = 0
    let falses = 0
    for (const level of LEVELS) {
      const p = strong({ level })
      const main = bruteWinner(p)
      const want = ASSUMPTION_VARIANTS.every((v) => bruteWinner(p, v) === main)
      expect(advice(drafts, p).robust, `lv ${level}`).toBe(want)
      if (want) trues++
      else falses++
    }
    expect(trues).toBeGreaterThan(0)
    expect(falses).toBeGreaterThan(0)
  })
})

describe('armorUpgradeAdvice: wat de standaardwaarden geven (Cody, luk/dex 100)', () => {
  it('geeft op lv 15 geen winnaar: het beste stuk (Red Ghetto Beanie) staat op ongeveer -659', () => {
    const a = advice(drafts, strong({ level: 15 }))
    expect(a.winner).toBeNull()
    const top = a.choices[0]
    expect(top.armor.name).toBe('Red Ghetto Beanie')
    expect(top.net!).toBeCloseTo(-658.7, 0)
    // Met de hand: EXP 15 t/m 19 (57.326) bij EXP per meso 0,8050842 zonder en 0,8112513 met WDEF 15, min 1.200 mesos.
    expect(EXP_15_19 / 0.8050842 - EXP_15_19 / 0.8112513 - 1_200).toBeCloseTo(-658.7, 0)
    // De Blue Gidder Shoes, tot nu toe de beste, komen er net achter (ongeveer -835).
    expect(choice(a, 'Blue Gidder Shoes').net!).toBeCloseTo(-834.6, 0)
  })

  it('geeft op lv 20 Red Ninja Sandals als winnaar met ongeveer +2.113', () => {
    const a = advice(drafts, strong({ level: 20 }))
    expect(a.winner).toBe(armor('Red Ninja Sandals'))
    expect(a.choices[0].net!).toBeCloseTo(2_113.3, 0)
    expect(a.robust).toBe(false)
  })

  it('geeft op lv 25 Red Cloth Vest als winnaar met ongeveer +1.929, en elk slot is positief', () => {
    const a = advice(drafts, strong({ level: 25 }))
    expect(a.winner).toBe(armor('Red Cloth Vest'))
    expect(a.choices[0].net!).toBeCloseTo(1_929.3, 0)
    expect(a.choices.every((c) => c.net! > 0)).toBe(true)
    expect(a.choices).toHaveLength(4)
    expect(a.robust).toBe(false)
  })
})

// ---- Het worn-pad: je weet wat je in een slot draagt ----
type Worn = NonNullable<Parameters<typeof armorUpgradeAdvice>[2]>
const adviceW = (p: Profile | null, worn: Worn): Advice => {
  const a = armorUpgradeAdvice(drafts, p, worn)
  if (a.kind !== 'advice') throw new Error('advies verwacht')
  return a
}
/** De WDEF in het profiel met dit stuk erbij, met de hand: het gedragen stuk (w) eraf (niet onder 0), het nieuwe erbij. */
const handWdef = (p: Profile, a: Armor, w: number) => Math.max(0, p.wdef - w) + a.wdef
/** Netto met vervanging, met de hand: EXP-som over de horizon gedeeld door EXP per meso zonder en met het stuk, min de prijs. */
const handNetW = (p: Profile, a: Armor, w: number, v: Assumptions = ASSUMPTIONS) => {
  const exp = expSum(p.level, handTo(p.level, a))
  return exp / epm(p, v) - exp / epm({ ...p, wdef: handWdef(p, a, w) }, v) - a.price
}
/** De kandidaten met worn, brute force over heel NPC_ARMOR (met de geslachtsregel van shopHand): draagbaar, level genoeg en meer WDEF dan wat je draagt. */
const wornNets = (p: Profile, worn: Worn, v: Assumptions = ASSUMPTIONS) =>
  shopHand(p.gender ?? null).filter((a) => a.level <= p.level && p.luk >= a.luk && p.dex >= a.dex && a.wdef > (worn[a.slot] ?? -Infinity)).map((a) => ({
    armor: a,
    net: handNetW(p, a, worn[a.slot] ?? 0, v),
  }))
const bruteWinnerW = (p: Profile, worn: Worn, v: Assumptions = ASSUMPTIONS): Armor | null => {
  const best = wornNets(p, worn, v).reduce<{ armor: Armor; net: number } | null>((m, x) => (!m || x.net > m.net ? x : m), null)
  return best && best.net > 0 ? best.armor : null
}

describe('armorUpgradeAdvice met worn: kandidaatfilter', () => {
  it('neemt alleen stukken met meer WDEF dan wat je draagt (lv 25 schoenen: draag je Sandals 12, dan alleen Enamel Boots 14)', () => {
    const a = adviceW(strong({ level: 25 }), { shoes: 12 })
    expect(choice(a, 'Red Enamel Boots').armor.wdef).toBe(14)
    expect(names(a)).not.toContain('Blue Gidder Shoes')
    expect(names(a)).not.toContain('Red Ninja Sandals')
  })

  it('neemt een stuk met gelijke WDEF niet mee (strikt meer): draag je de Boots 14, dan geen schoenkeuze', () => {
    expect(adviceW(strong({ level: 25 }), { shoes: 14 }).choices.filter((c) => c.armor.slot === 'shoes')).toEqual([])
    expect(adviceW(strong({ level: 25 }), { shoes: 13 }).choices.some((c) => c.armor.slot === 'shoes')).toBe(true)
  })

  it('geeft geen keuze voor een slot waar je het beste stuk al draagt, en laat andere slots ongemoeid', () => {
    const p = strong({ level: 30 })
    const a = adviceW(p, { top: 40 })
    expect(a.choices.some((c) => c.armor.slot === 'top')).toBe(false)
    const without = advice(drafts, p)
    for (const slot of ['hat', 'bottom', 'shoes'] as const) {
      expect(a.choices.find((c) => c.armor.slot === slot)?.armor, slot).toBe(without.choices.find((c) => c.armor.slot === slot)?.armor)
    }
  })

  it('geeft bij worn 0 (niets aan) dezelfde kandidaten als zonder worn, met replaces 0 in plaats van undefined', () => {
    const p = strong({ level: 25 })
    const plain = advice(drafts, p)
    const zero = adviceW(p, { hat: 0, top: 0, bottom: 0, shoes: 0 })
    expect(zero.choices.map((c) => [c.armor.name, c.net, c.saving])).toEqual(plain.choices.map((c) => [c.armor.name, c.net, c.saving]))
    expect(zero.choices.every((c) => c.replaces === 0)).toBe(true)
    expect(zero.winner).toBe(plain.winner)
  })

  it('laat LUK/DEX bepalen wat draagbaar is, ook met worn (lv 25, LUK 35, DEX 10, hoed 22 aan: geen hoedkeuze)', () => {
    // Red Tiberian (WDEF 24) vraagt LUK 40 en DEX 15: niet draagbaar. Sinds #55 is de Red Baseball Cap (WDEF 22, geen eis) er wel,
    // dus de gedragen hoed is 22 (niet 21, dan was de Cap een upgrade): niet strikt meer WDEF, en zo blijft alleen de LUK/DEX-poort over.
    const a = adviceW({ ...base, level: 25, luk: 35, dex: 10 }, { hat: 22 })
    expect(a.choices.some((c) => c.armor.slot === 'hat')).toBe(false)
    expect(a.notWearable.map((u) => u.armor.name)).toContain('Red Tiberian')
  })

  it('laat bij hoed 21 aan (lv 25, LUK 35, DEX 10) alleen de Red Baseball Cap over: zonder eis draagbaar, de Red Tiberian niet', () => {
    const a = adviceW({ ...base, level: 25, luk: 35, dex: 10 }, { hat: 21 })
    expect(a.choices.filter((c) => c.armor.slot === 'hat').map((c) => c.armor.name)).toEqual(['Red Baseball Cap'])
  })

  it('neemt de hoed lv 15 (WDEF 18) mee bij gedragen 17, en niet bij gedragen 18', () => {
    const p = strong({ level: 15 })
    expect(names(adviceW(p, { hat: 17 }))).toContain('Red Thief Hood')
    expect(names(adviceW(p, { hat: 18 }))).not.toContain('Red Thief Hood')
  })
})

describe('armorUpgradeAdvice met worn: replaces', () => {
  it('zet replaces op de gedragen WDEF van het slot, en undefined bij een onbekend slot', () => {
    const a = adviceW(strong({ level: 25 }), { shoes: 12, top: 24 })
    expect(a.choices.find((c) => c.armor.slot === 'shoes')!.replaces).toBe(12)
    expect(a.choices.find((c) => c.armor.slot === 'top')!.replaces).toBe(24)
    expect(a.choices.find((c) => c.armor.slot === 'hat')!.replaces).toBeUndefined()
    expect(a.choices.find((c) => c.armor.slot === 'bottom')!.replaces).toBeUndefined()
  })

  it('heeft zonder worn overal replaces undefined', () => {
    for (const c of advice(drafts, strong({ level: 25 })).choices) expect(c.replaces).toBeUndefined()
  })
})

describe('armorUpgradeAdvice met worn: netto met vervanging, met de hand', () => {
  it('lv 20, Red Ninja Sandals (12) aan, Enamel Boots (14, 3.600): WDEF 72 - 12 + 14 = 74, horizon 20 t/m 30', () => {
    const p = strong({ level: 20 })
    const c = choice(adviceW(p, { shoes: 12 }), 'Red Enamel Boots')
    expect(handWdef(p, armor('Red Enamel Boots'), 12)).toBe(74)
    const saving = EXP_20_30 / epm(p) - EXP_20_30 / epm({ ...p, wdef: 74 })
    expect(c).toMatchObject({ from: 20, to: 30, truncated: true, replaces: 12 })
    expect(c.saving).toBeCloseTo(saving, 6)
    expect(c.net).toBeCloseTo(saving - 3_600, 6)
  })

  it('geeft een kleinere netto dan zonder worn (lv 20, Red Pao bovenop een Red Cloth Vest van 24: +8 WDEF in plaats van +32)', () => {
    const p = strong({ level: 20 })
    const w = choice(adviceW(p, { top: 24 }), 'Red Pao')
    expect(w.net!).toBeLessThan(handNet(p, armor('Red Pao')))
    expect(w.net!).toBeCloseTo(handNetW(p, armor('Red Pao'), 24), 6)
    expect(w.net!).toBeCloseTo(EXP_20_24 / epm(p) - EXP_20_24 / epm({ ...p, wdef: 72 + 8 }) - 6_000, 6)
  })

  it('komt voor elke keuze op elk level, bij elke gedragen set, overeen met de hand', () => {
    const sets: Worn[] = [{ top: 24 }, { shoes: 10, bottom: 17 }, { hat: 0, top: 0 }, { hat: 18, top: 32, bottom: 23, shoes: 12 }, { bottom: 5 }]
    for (const level of LEVELS) {
      const p = strong({ level })
      for (const worn of sets) {
        const a = adviceW(p, worn)
        for (const c of a.choices) {
          expect(c.net, `${c.armor.name} lv ${level} ${JSON.stringify(worn)}`).toBeCloseTo(handNetW(p, c.armor, worn[c.armor.slot] ?? 0), 6)
        }
        // En per slot is de gekozen netto de hoogste onder de kandidaten.
        for (const slot of ['hat', 'top', 'bottom', 'shoes'] as const) {
          const inSlot = wornNets(p, worn).filter((x) => x.armor.slot === slot)
          const got = a.choices.find((c) => c.armor.slot === slot)
          if (inSlot.length === 0) expect(got, `${slot} lv ${level}`).toBeUndefined()
          else expect(got!.net, `${slot} lv ${level} ${JSON.stringify(worn)}`).toBeCloseTo(Math.max(...inSlot.map((x) => x.net)), 6)
        }
      }
    }
  })

  it('trekt niet meer af dan er is: gedragen WDEF boven de profiel-WDEF geeft de WDEF van alleen het nieuwe stuk', () => {
    // Profiel-WDEF 5, gedragen 12: WDEF wordt max(0, 5 - 12) + 14 = 14, niet 5 - 12 + 14 = 7.
    const p = strong({ level: 20, wdef: 5 })
    expect(handWdef(p, armor('Red Enamel Boots'), 12)).toBe(14)
    const c = choice(adviceW(p, { shoes: 12 }), 'Red Enamel Boots')
    expect(c.net!).toBeCloseTo(EXP_20_30 / epm(p) - EXP_20_30 / epm({ ...p, wdef: 14 }) - 3_600, 6)
  })

  it('geeft withArmor met replaced de WDEF max(0, wdef - gedragen) + stuk', () => {
    expect(withArmor(base, armor('Red Pao'), 24).wdef).toBe(72 - 24 + 32)
    expect(withArmor({ ...base, wdef: 5 }, armor('Red Pao'), 24).wdef).toBe(32)
    expect(withArmor(base, armor('Red Pao')).wdef).toBe(72 + 32)
  })

  it('laat een stuk dat je al draagt niet meer winnen (lv 20: zonder worn wint Red Ninja Sandals)', () => {
    const p = strong({ level: 20 })
    expect(advice(drafts, p).winner).toBe(armor('Red Ninja Sandals'))
    const a = adviceW(p, { shoes: 12 })
    expect(a.winner).not.toBe(armor('Red Ninja Sandals'))
    expect(a.winner).toBe(bruteWinnerW(p, { shoes: 12 }))
  })

  it('kiest de winnaar zoals brute force, op elk level en bij verschillende gedragen sets', () => {
    const sets: Worn[] = [{ shoes: 12 }, { top: 32 }, { hat: 18, top: 24, bottom: 17, shoes: 10 }, {}]
    for (const level of LEVELS) {
      const p = strong({ level })
      for (const worn of sets) expect(adviceW(p, worn).winner, `lv ${level} ${JSON.stringify(worn)}`).toBe(bruteWinnerW(p, worn))
    }
  })
})

describe('armorUpgradeAdvice met worn: niet draagbaar', () => {
  // Lv 25, LUK 35, DEX 10: Tiberian (hat 24), Brown Sneak (top 36) en Brown Sneak Pants (bottom 26) kunnen nog niet.
  // Het beste draagbare stuk: Loosecap 21, Red Pao 32, Pao Bottoms 23.
  const p = { ...base, level: 25, luk: 35, dex: 10 }
  const slotsOf = (a: Advice) => a.notWearable.map((u) => u.armor.slot).sort()

  it('noemt zonder worn alle drie de slots', () => {
    expect(slotsOf(adviceW(p, {}))).toEqual(['bottom', 'hat', 'top'])
  })

  it('noemt een slot niet als je al evenveel WDEF draagt als het geblokkeerde stuk (gelijk is geen verbetering)', () => {
    expect(slotsOf(adviceW(p, { hat: 24 }))).toEqual(['bottom', 'top'])
    expect(slotsOf(adviceW(p, { top: 36 }))).toEqual(['bottom', 'hat'])
    expect(slotsOf(adviceW(p, { bottom: 26 }))).toEqual(['hat', 'top'])
  })

  it('noemt een slot wel als je net minder draagt dan het geblokkeerde stuk', () => {
    expect(slotsOf(adviceW(p, { hat: 23 }))).toContain('hat')
    expect(slotsOf(adviceW(p, { top: 35 }))).toContain('top')
    expect(slotsOf(adviceW(p, { bottom: 25 }))).toContain('bottom')
  })

  it('noemt een slot niet als je meer draagt dan het geblokkeerde stuk', () => {
    expect(slotsOf(adviceW(p, { hat: 30, top: 50, bottom: 40 }))).toEqual([])
  })

  it('blijft het beste draagbare stuk als drempel gebruiken als je minder draagt (top 20 < 32: Brown Sneak 36 wordt genoemd)', () => {
    expect(slotsOf(adviceW(p, { top: 20 }))).toContain('top')
    // Zonder worn is niets aan (WDEF 0) gelijk aan niets ingevuld.
    expect(adviceW(p, { hat: 0, top: 0, bottom: 0, shoes: 0 }).notWearable).toEqual(adviceW(p, {}).notWearable)
  })

  it('geeft het tekort ongewijzigd door, ook als worn is ingevuld', () => {
    const u = adviceW(p, { hat: 23 }).notWearable.find((x) => x.armor.slot === 'hat')
    expect(u).toEqual({ armor: armor('Red Tiberian'), needLuk: 5, needDex: 5 })
  })
})

describe('armorUpgradeAdvice met worn: robuustheid', () => {
  it('past worn ook toe onder elke aannamevariant: robust is precies "elke variant dezelfde winnaar" (brute force)', () => {
    let trues = 0
    let falses = 0
    const sets: Worn[] = [{ shoes: 12 }, { top: 32, hat: 18 }, { bottom: 0 }]
    for (const level of LEVELS) {
      const p = strong({ level })
      for (const worn of sets) {
        const main = bruteWinnerW(p, worn)
        const want = ASSUMPTION_VARIANTS.every((v) => bruteWinnerW(p, worn, v) === main)
        const a = adviceW(p, worn)
        expect(a.winner, `lv ${level} ${JSON.stringify(worn)}`).toBe(main)
        expect(a.robust, `lv ${level} ${JSON.stringify(worn)}`).toBe(want)
        if (want) trues++
        else falses++
      }
    }
    expect(trues).toBeGreaterThan(0)
    expect(falses).toBeGreaterThan(0)
  })
})

describe('armorUpgradeAdvice: een lege worn is het oude gedrag', () => {
  it('geeft met {} exact hetzelfde als zonder derde argument, op elk level en voor elk profiel', () => {
    const profiles = [...LEVELS.map((level) => strong({ level })), ...LEVELS.map((level) => ({ ...base, level, luk: 35, dex: 10 })), ...LEVELS.map((level) => ({ ...base, level, luk: 0, dex: 0 }))]
    for (const p of profiles) {
      expect(armorUpgradeAdvice(drafts, p, {}), `lv ${p.level} luk ${p.luk}`).toEqual(armorUpgradeAdvice(drafts, p))
    }
    expect(armorUpgradeAdvice(drafts, null, {})).toEqual({ kind: 'none' })
    expect(armorUpgradeAdvice(drafts, strong({ level: 31 }), { top: 5 })).toEqual({ kind: 'none' })
  })

  it('geeft met {} dezelfde nettos als de oude handberekening (wdef + stuk.wdef)', () => {
    for (const level of LEVELS) {
      const p = strong({ level })
      for (const c of adviceW(p, {}).choices) expect(c.net, `${c.armor.name} lv ${level}`).toBeCloseTo(handNet(p, c.armor), 6)
    }
  })

  it('geeft een worn voor één slot geen invloed op de andere slots', () => {
    const p = strong({ level: 25 })
    const plain = advice(drafts, p)
    const a = adviceW(p, { shoes: 12 })
    for (const slot of ['hat', 'top', 'bottom'] as const) {
      const x = a.choices.find((c) => c.armor.slot === slot)!
      const y = plain.choices.find((c) => c.armor.slot === slot)!
      expect(x.armor, slot).toBe(y.armor)
      expect(x.net, slot).toBeCloseTo(y.net!, 9)
    }
  })

  it('verandert de invoer niet', () => {
    const worn = Object.freeze({ shoes: 12 })
    expect(() => armorUpgradeAdvice(drafts, strong({ level: 25 }), worn)).not.toThrow()
    expect(worn).toEqual({ shoes: 12 })
  })
})

describe('replacedWdef: wat een stuk vervangt, met de overall (issue #50)', () => {
  it('geeft voor top, bottom, hat en shoes het gedragen stuk in dat slot', () => {
    expect(replacedWdef('top', { top: 32, bottom: 23 })).toBe(32)
    expect(replacedWdef('bottom', { top: 32, bottom: 23 })).toBe(23)
    expect(replacedWdef('hat', { top: 32 })).toBeUndefined()
    expect(replacedWdef('shoes', { shoes: 0 })).toBe(0)
  })

  it('geeft voor een overall top en bottom samen, of de gedragen overall', () => {
    expect(replacedWdef('overall', { top: 32, bottom: 23 })).toBe(55)
    expect(replacedWdef('overall', { overall: 75 })).toBe(75)
  })

  it('telt een onbekende helft als leeg, en is onbekend als van beide helften niets bekend is', () => {
    expect(replacedWdef('overall', { top: 32 })).toBe(32)
    expect(replacedWdef('overall', { bottom: 23, hat: 15 })).toBe(23)
    expect(replacedWdef('overall', {})).toBeUndefined()
    expect(replacedWdef('overall', { hat: 15, shoes: 10 })).toBeUndefined()
  })

  it('laat een top of bottom een gedragen overall vervangen (de andere helft is dan leeg)', () => {
    expect(replacedWdef('top', { overall: 75 })).toBe(75)
    expect(replacedWdef('bottom', { overall: 75 })).toBe(75)
  })
})

describe('armorUpgradeAdvice met een gedragen overall', () => {
  // De Thief-winkel verkoopt geen overall, dus hier gaat het om een top of bottom die een overall vervangt.
  it('rekent een top of bottom als vervanging van de overall: geen keuze zonder meer WDEF dan de overall, anders replaces = de WDEF van de overall', () => {
    const p = strong({ level: 30 })
    const strongOverall = adviceW(p, { overall: 75 })
    expect(strongOverall.choices.some((c) => c.armor.slot === 'top' || c.armor.slot === 'bottom')).toBe(false)
    const weak = adviceW(p, { overall: 20 })
    expect(weak.choices.find((c) => c.armor.slot === 'top')!.replaces).toBe(20)
    expect(weak.choices.find((c) => c.armor.slot === 'bottom')!.replaces).toBe(20)
  })

  it('rekent hat en shoes ongewijzigd als je een overall draagt', () => {
    const p = strong({ level: 25 })
    const withOverall = adviceW(p, { overall: 75, shoes: 12 })
    const without = adviceW(p, { shoes: 12 })
    const pick = (a: Advice, slot: string) => a.choices.find((c) => c.armor.slot === slot)
    expect(pick(withOverall, 'shoes')).toEqual(pick(without, 'shoes'))
    expect(pick(withOverall, 'hat')).toEqual(pick(without, 'hat'))
  })
})

describe('armorUpgradeAdvice met een overall als kandidaat (geinjecteerd: de winkel verkoopt er nog geen)', () => {
  // NPC_ARMOR is de enige bron van kandidaten; een test zet er tijdelijk een overall in en haalt hem weer weg.
  const fakeOverall = (over: Partial<Armor> = {}): Armor => ({ name: 'Test Overall', slot: 'overall', level: 20, wdef: 60, luk: 0, dex: 0, price: 5_000, source: armor('Red Pao').source, ...over })
  const withInjected = <T>(a: Armor, fn: () => T): T => {
    const list = NPC_ARMOR as Armor[]
    list.push(a)
    try {
      return fn()
    } finally {
      list.splice(list.indexOf(a), 1)
    }
  }
  const p = strong({ level: 25 })

  it('rekent een overall tegen top plus bottom: replaces = som, en het netto komt overeen met de WDEF wdef - 55 + 60 met de hand', () => {
    const o = fakeOverall()
    withInjected(o, () => {
      const c = choice(adviceW(p, { top: 32, bottom: 23 }), o.name)
      expect(c.replaces).toBe(55)
      const exp = expSum(p.level, handTo(p.level, o))
      expect(c.net!).toBeCloseTo(exp / epm(p) - exp / epm({ ...p, wdef: handWdef(p, o, 55) }) - o.price, 6)
    })
  })

  it('biedt een overall alleen aan met meer WDEF dan top plus bottom samen: gelijk of minder is geen upgrade', () => {
    const worn = { top: 32, bottom: 23 }
    withInjected(fakeOverall({ wdef: 55 }), () => expect(names(adviceW(p, worn))).not.toContain('Test Overall'))
    withInjected(fakeOverall({ wdef: 54 }), () => expect(names(adviceW(p, worn))).not.toContain('Test Overall'))
    withInjected(fakeOverall({ wdef: 56 }), () => expect(names(adviceW(p, worn))).toContain('Test Overall'))
  })

  it('telt bij een deels bekende top en bottom alleen de bekende helft, en bij niets bekends als onbekend (gerekend als leeg)', () => {
    const o = fakeOverall()
    withInjected(o, () => {
      expect(choice(adviceW(p, { top: 32 }), o.name).replaces).toBe(32)
      expect(choice(adviceW(p, { bottom: 23 }), o.name).replaces).toBe(23)
      const unk = choice(adviceW(p, { hat: 10 }), o.name)
      expect(unk.replaces).toBeUndefined()
      const exp = expSum(p.level, handTo(p.level, o))
      expect(unk.net!).toBeCloseTo(exp / epm(p) - exp / epm({ ...p, wdef: p.wdef + o.wdef }) - o.price, 6)
    })
  })

  it('vergelijkt een overall met een gedragen overall, niet met top en bottom die er in WornWdef naast staan', () => {
    const worn = { overall: 70, top: 5, bottom: 5 }
    withInjected(fakeOverall({ wdef: 60 }), () => expect(names(adviceW(p, worn))).not.toContain('Test Overall'))
    withInjected(fakeOverall({ wdef: 80 }), () => expect(choice(adviceW(p, worn), 'Test Overall').replaces).toBe(70))
  })

  it('geeft een niet-draagbare overall door in notWearable', () => {
    withInjected(fakeOverall({ luk: 500, wdef: 90 }), () => {
      const a = adviceW(p, {})
      expect(a.notWearable.map((u) => u.armor.name)).toContain('Test Overall')
      expect(names(a)).not.toContain('Test Overall')
    })
  })

  it('haalt de geinjecteerde overall weer uit de winkel', () => {
    withInjected(fakeOverall(), () => undefined)
    expect(NPC_ARMOR.some((a) => a.slot === 'overall')).toBe(false)
  })
})

describe('armorUpgradeAdvice en het geslacht (issue #55)', () => {
  const wp = parseProfile(DEFAULT_PROFILE, 'warrior')
  if (!('profile' in wp)) throw new Error('Warrior-profiel ongeldig')
  const warriorBase: Profile = wp.profile
  const withGender = (p: Profile, gender: 'male' | 'female' | null): Profile => (gender ? { ...p, gender } : p)
  const warrior = (level: number, gender: 'male' | 'female' | null = null) => withGender({ ...warriorBase, level, str: 100, dex: 100 }, gender)
  const thief = (level: number, gender: 'male' | 'female' | null = null) => withGender(strong({ level }), gender)
  const GENDERED_THIEF = ['Blue One-lined T-Shirt', 'Pink Starry Shirt', 'Red Qi Pao Skirt']
  /** Met de hand: de naam van elk stuk dat voor één geslacht is, zoals de bron het zegt (los van de data in de code). */
  const FEMALE_ONLY = ['Pink Starry Shirt', 'Red Qi Pao Skirt', 'Orange Lolica Armor', 'Rookie Pants', 'Red Lamelle', 'Blue Shark', 'Red Ramel Skirt', 'Blue Shark Skirt', 'Steel Fitted Mail', 'Dark Engrit']
  const MALE_ONLY = ['Blue One-lined T-Shirt', 'Brown Lolico Armor', 'Brown Lolico Pants', 'Brown Corporal', 'Blue Sergeant', 'Silver Master Sergeant', 'Red Hwarang Shirt', 'Brown Corporal Pants', 'Steel Sergeant Kilt', 'Silver Master Sergeant Kilt', 'Red Martial Arts Pants', 'Blue Kendo Robe', 'Black Dragon Robe']
  const shown = (a: Advice) => [...a.choices.map((c) => c.armor.name), ...a.notWearable.map((u) => u.armor.name)]

  it('toont zonder geslacht nooit een stuk voor één geslacht: niet bij de keuzes, niet bij niet-draagbaar (Thief en Warrior, elk level)', () => {
    for (const level of LEVELS) {
      for (const p of [thief(level), warrior(level), { ...thief(level), luk: 0, dex: 0 }, { ...warrior(level), str: 0, dex: 0 }]) {
        const a = advice(drafts, p)
        for (const n of shown(a)) {
          expect(GENDERED_THIEF, `${n} lv ${level}`).not.toContain(n)
          expect(FEMALE_ONLY, `${n} lv ${level}`).not.toContain(n)
          expect(MALE_ONLY, `${n} lv ${level}`).not.toContain(n)
        }
      }
    }
  })

  it('laat het geslacht de horizon bepalen: zonder geslacht loopt de Red Cloth Vest (lv 10) tot 19, met een geslacht stopt hij op 11 (het T-shirt van lv 12 is beter)', () => {
    // Met de hand: Red Cloth Vest WDEF 24, de T-shirts van lv 12 hebben 26.
    expect(choice(advice(drafts, thief(10)), 'Red Cloth Vest')).toMatchObject({ from: 10, to: 19 })
    for (const g of ['male', 'female'] as const) expect(choice(advice(drafts, thief(10, g)), 'Red Cloth Vest')).toMatchObject({ from: 10, to: 11 })
  })

  it('laat een Thief-vrouw de Red Qi Pao Skirt (lv 22, LUK 34, DEX 12) als beste niet-draagbare broek zien bij LUK 33, en een man of onbekend niet; het geslacht verandert de horizon van de Red Cloth Pants', () => {
    const short = (g: 'male' | 'female' | null) => advice(drafts, { ...thief(22, g), luk: 33, dex: 12 }).notWearable.map((u) => u.armor.name)
    expect(short('female')).toContain('Red Qi Pao Skirt')
    expect(short('male')).not.toContain('Red Qi Pao Skirt')
    expect(short(null)).not.toContain('Red Qi Pao Skirt')
    expect(wearableNets(thief(22, 'female')).map((x) => x.armor.name)).toContain('Red Qi Pao Skirt')
    // Zonder de Skirt loopt de bottom-horizon van de Red Cloth Pants (lv 20, WDEF 23) tot 24; met de Skirt (WDEF 24, lv 22) stopt hij op 21.
    expect(choice(advice(drafts, thief(20)), 'Red Cloth Pants')).toMatchObject({ from: 20, to: 24 })
    expect(choice(advice(drafts, thief(20, 'female')), 'Red Cloth Pants')).toMatchObject({ from: 20, to: 21 })
    expect(choice(advice(drafts, thief(20, 'male')), 'Red Cloth Pants')).toMatchObject({ from: 20, to: 24 })
  })

  it('laat een mannelijke Warrior van lv 20 de Blue Kendo Robe als overall-kandidaat krijgen en nooit een vrouwenstuk', () => {
    const a = advice(drafts, warrior(20, 'male'))
    expect(a.choices.find((c) => c.armor.slot === 'overall')?.armor.name).toBe('Blue Kendo Robe')
    for (const n of shown(a)) expect(FEMALE_ONLY, n).not.toContain(n)
    expect(shown(a)).not.toContain('Steel Fitted Mail')
    expect(shown(a)).not.toContain('Dark Engrit')
  })

  it('toont een mannelijke Warrior op elk level nooit een vrouwenstuk', () => {
    for (const level of LEVELS) for (const n of shown(advice(drafts, warrior(level, 'male')))) expect(FEMALE_ONLY, `${n} lv ${level}`).not.toContain(n)
  })

  it('laat een vrouwelijke Warrior de Steel Fitted Mail (lv 15) bereiken en nooit een mannenstuk', () => {
    const a = advice(drafts, warrior(15, 'female'))
    expect(a.choices.find((c) => c.armor.slot === 'overall')?.armor.name).toBe('Steel Fitted Mail')
    for (const level of LEVELS) for (const n of shown(advice(drafts, warrior(level, 'female')))) expect(MALE_ONLY, `${n} lv ${level}`).not.toContain(n)
    // Op lv 14 kan hij nog niet.
    expect(shown(advice(drafts, warrior(14, 'female')))).not.toContain('Steel Fitted Mail')
  })

  it('laat de horizon van de top van een vrouw op lv 10 (Orange Lolica Armor, WDEF 35) lopen tot de volgende betere vrouwen- of unisex-top, niet tot een mannentop', () => {
    // Met de hand: de mannen-top Brown Corporal (lv 15, WDEF 40) telt voor haar niet; de T-shirts (26) zijn niet beter; Red Lamelle (lv 20, WDEF 45) wel.
    const top = (g: 'male' | 'female') => advice(drafts, warrior(10, g)).choices.find((c) => c.armor.slot === 'top')!
    expect(top('female').armor.name).toBe('Orange Lolica Armor')
    expect(top('female')).toMatchObject({ from: 10, to: 19 })
    expect(top('male').armor.name).toBe('Brown Lolico Armor')
    expect(top('male')).toMatchObject({ from: 10, to: 14 })
  })

  it('geeft zonder geslacht voor een Warrior alleen hoed en schoenen en de unisex-stukken (geen top, bottom of overall met geslacht)', () => {
    const a = advice(drafts, warrior(20))
    expect(a.choices.map((c) => c.armor.slot).sort()).toEqual(['hat', 'shoes'])
    expect(a.notWearable.every((u) => u.armor.slot === 'hat' || u.armor.slot === 'shoes')).toBe(true)
  })
})
