import { describe, expect, it } from 'vitest'
import { armorUpgradeAdvice, withArmor, type ArmorUpgradeAdvice } from './armorUpgrade'
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

/** Het laatste level van de horizon van een stuk, met de hand: net vóór het volgende stuk met meer WDEF in dat slot, hoogstens 30. */
const handTo = (level: number, a: Armor) => {
  const next = NPC_ARMOR.find((b) => b.slot === a.slot && b.level > level && b.wdef > a.wdef)
  return Math.min(next ? next.level - 1 : 30, 30)
}
/** De netto besparing van een stuk met de hand: EXP-som over de horizon gedeeld door de EXP per meso zonder en met het stuk, min de prijs. */
const handNet = (p: Profile, a: Armor, v: Assumptions = ASSUMPTIONS) => {
  const exp = expSum(p.level, handTo(p.level, a))
  return exp / epm(p, v) - exp / epm({ ...p, wdef: p.wdef + a.wdef }, v) - a.price
}
/** Elk stuk dat dit profiel kan dragen, met zijn netto: een brute-force blik op heel NPC_ARMOR, zonder keuze per slot. */
const wearableNets = (p: Profile, v: Assumptions = ASSUMPTIONS) =>
  NPC_ARMOR.filter((a) => a.level <= p.level && p.luk >= a.luk && p.dex >= a.dex).map((a) => ({ armor: a, net: handNet(p, a, v) }))
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
  it('geeft op lv 10 alleen de stukken van lv 10 (top, bottom, shoes; geen hat)', () => {
    expect(names(advice(drafts, strong({ level: 10 }))).sort()).toEqual(['Blue Gidder Shoes', 'Red Cloth Pants', 'Red Cloth Vest'])
  })

  it('neemt een stuk pas mee vanaf zijn levelvereiste (hoed lv 15: op lv 14 nog niet)', () => {
    expect(names(advice(drafts, strong({ level: 14 })))).not.toContain('Red Thief Hood')
    expect(names(advice(drafts, strong({ level: 15 })))).toContain('Red Thief Hood')
  })

  it('geeft één stuk per slot, op lv 25 voor elk van de vier slots', () => {
    const a = advice(drafts, strong({ level: 25 }))
    expect(names(a).sort()).toEqual(['Blue Gidder Shoes', 'Red Cloth Pants', 'Red Cloth Vest', 'Red Thief Hood'])
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

  it('draagt een stuk bij precies genoeg stats (LUK 20, DEX 0 voor Red Thief Hood)', () => {
    const a = advice(drafts, { ...base, level: 15, luk: 20, dex: 0 })
    expect(names(a)).toContain('Red Thief Hood')
    expect(a.notWearable.map((u) => u.armor.name)).not.toContain('Red Thief Hood')
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
  it('loopt bij lv 15 voor Red Thief Hood van 15 tot 19 (vóór Red Loosecap, lv 20)', () => {
    expect(choice(advice(drafts, strong({ level: 15 })), 'Red Thief Hood')).toMatchObject({ from: 15, to: 19, truncated: false })
  })

  it('stopt per slot vóór het volgende betere stuk: top lv 10 tot 19 (Red Pao, lv 20), bottom en shoes lv 10 tot 14 (lv 15)', () => {
    const a = advice(drafts, strong({ level: 10 }))
    expect(choice(a, 'Red Cloth Vest')).toMatchObject({ from: 10, to: 19, truncated: false })
    expect(choice(a, 'Red Cloth Pants')).toMatchObject({ from: 10, to: 14, truncated: false })
    expect(choice(a, 'Blue Gidder Shoes')).toMatchObject({ from: 10, to: 14, truncated: false })
  })

  it('loopt bij lv 20 voor top, bottom en hoed tot 24 (de lv 25-stukken zijn beter)', () => {
    const a = advice(drafts, strong({ level: 20 }))
    for (const n of ['Red Cloth Vest', 'Red Cloth Pants', 'Red Thief Hood']) expect(choice(a, n), n).toMatchObject({ from: 20, to: 24, truncated: false })
  })

  it('loopt bij lv 25 voor Red Thief Hood van 25 tot 29 (vóór Red Guise, lv 30)', () => {
    expect(choice(advice(drafts, strong({ level: 25 })), 'Red Thief Hood')).toMatchObject({ from: 25, to: 29, truncated: false })
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
      [15, 'Red Thief Hood', 15, 19],
      [20, 'Red Ninja Sandals', 20, 30],
      [20, 'Red Cloth Vest', 20, 24],
      [20, 'Red Cloth Pants', 20, 24],
      [20, 'Red Thief Hood', 20, 24],
      [25, 'Red Cloth Vest', 25, 29],
      [25, 'Red Cloth Pants', 25, 29],
      [25, 'Red Thief Hood', 25, 29],
      [25, 'Blue Gidder Shoes', 25, 30],
      [30, 'Red Thief Hood', 30, 30],
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
  it('heeft geen winnaar zonder kandidaten (geen enkel stuk draagbaar)', () => {
    const a = advice(drafts, { ...base, level: 15, luk: 0, dex: 0 })
    expect(a.choices).toEqual([])
    expect(a.winner).toBeNull()
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

  it('meldt robust false op lv 25 omdat bij minder contacten (0,15) geen stuk zich terugverdient, terwijl Red Cloth Vest nu wint', () => {
    const p = strong({ level: 25 })
    const a = advice(drafts, p)
    expect(a.winner).toBe(armor('Red Cloth Vest'))
    // Met de hand, EXP per meso als losse getallen bij 0,15 contacten: zonder 0,9047805, met de Vest (WDEF 24) 0,9097939.
    expect(epm(p, V_FEW_CONTACTS)).toBeCloseTo(0.9047805, 6)
    expect(epm({ ...p, wdef: p.wdef + 24 }, V_FEW_CONTACTS)).toBeCloseTo(0.9097939, 6)
    const vestNet = EXP_25_29 / 0.9047805 - EXP_25_29 / 0.9097939 - 2_000
    expect(vestNet).toBeCloseTo(-35, -1) // net onder 0: de Vest verdient zich dan niet terug
    expect(vestNet).toBeLessThan(0)
    // En geen enkel ander stuk doet het wel.
    for (const x of wearableNets(p, V_FEW_CONTACTS)) expect(x.net, x.armor.name).toBeLessThan(0)
    expect(bruteWinner(p, V_FEW_CONTACTS)).toBeNull()
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
  it('geeft op lv 15 geen winnaar: het beste stuk (Blue Gidder Shoes) staat op ongeveer -835', () => {
    const a = advice(drafts, strong({ level: 15 }))
    expect(a.winner).toBeNull()
    const top = a.choices[0]
    expect(top.armor.name).toBe('Blue Gidder Shoes')
    expect(top.net!).toBeCloseTo(-834.6, 0)
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
