import { describe, expect, it } from 'vitest'
import { armorUpgradeAdvice, replacedWdef, withArmor, type ArmorUpgradeAdvice } from './armorUpgrade'
import { ASSUMPTION_VARIANTS } from './best'
import { ASSUMPTIONS, type Assumptions } from './calc/mobModel'
import { NPC_ARMOR } from './data/armor'
import { mobDraft } from './data/spots'
import type { ArmorPiece } from './data/types'
import { growthOf } from './growth'
import { MAGICIAN_ARMOR } from './magicianGear'
import { bestExpPerMeso } from './bestExpPerMeso'
import { DEFAULT_PROFILE, parseProfile, type Profile } from './profile'
import { newDraft, type SpotDraft } from './spotDraft'
import { WARRIOR_ARMOR } from './warriorGear'

const parsed = parseProfile(DEFAULT_PROFILE)
if (!('profile' in parsed)) throw new Error('voorbeeldprofiel ongeldig')
const base: Profile = parsed.profile
// Stats ruim genoeg voor elk stuk, zodat alleen het level bepaalt wat een kandidaat is.
const strong = (over: Partial<Profile>): Profile => ({ ...base, dex: 100, luk: 100, ...over })

const own = (id: string, expPerHour: number, potions: number): SpotDraft => ({
  ...newDraft(id),
  name: id,
  expPerHour: String(expPerHour),
  travel: String(potions),
})
// "Beste" vraagt minstens twee plekken: een bekende plek en een eigen plek met weinig EXP per uur.
const drafts = [{ ...mobDraft('Ribbon Pig')!, id: 'a' }, own('b', 1_000, 10_000)]

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

/**
 * De mesokosten van level from t/m to met de hand: per level de EXP (EXP_AT) gedeeld door de EXP per meso op het profiel van dat level. Het karakter
 * groeit over de horizon mee (growth.ts, Dave, 7 oktober 2026), dus elk level heeft zijn eigen profiel; `wdef` is de WDEF die op elk level geldt (standaard die van nu).
 */
const costOver = (p: Profile, from: number, to: number, wdef: number = p.wdef, v: Assumptions = ASSUMPTIONS) => {
  const grown = growthOf(drafts, p)
  let sum = 0
  for (let l = from; l <= to; l++) sum += EXP_AT[l] / epm({ ...grown(l), wdef }, v)
  return sum
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
const handTo = (level: number, a: ArmorPiece, gender: 'male' | 'female' | null = null) => {
  const next = shopHand(gender).find((b) => b.slot === a.slot && b.level > level && b.wdef > a.wdef)
  return Math.min(next ? next.level - 1 : 30, 30)
}
/** De netto besparing van een stuk met de hand: EXP-som over de horizon gedeeld door de EXP per meso zonder en met het stuk, min de prijs. */
const handNet = (p: Profile, a: ArmorPiece, v: Assumptions = ASSUMPTIONS) => {
  const to = handTo(p.level, a, p.gender ?? null)
  return costOver(p, p.level, to, p.wdef, v) - costOver(p, p.level, to, p.wdef + a.wdef, v) - a.price
}
/** Elk stuk dat dit profiel kan dragen, met zijn netto: een brute-force blik op heel NPC_ARMOR, zonder keuze per slot. */
const wearableNets = (p: Profile, v: Assumptions = ASSUMPTIONS) =>
  shopHand(p.gender ?? null).filter((a) => a.level <= p.level && p.luk >= a.luk && p.dex >= a.dex).map((a) => ({ armor: a, net: handNet(p, a, v) }))
/** De winnaar volgens brute force: het stuk met de hoogste netto, mits boven 0. */
const bruteWinner = (p: Profile, v: Assumptions = ASSUMPTIONS): ArmorPiece | null => {
  const best = wearableNets(p, v).reduce<{ armor: ArmorPiece; net: number } | null>((m, x) => (!m || x.net > m.net ? x : m), null)
  return best && best.net > 0 ? best.armor : null
}
const LEVELS = Array.from({ length: 21 }, (_, i) => 10 + i)
// Variant 0 is de aanname "minder contacten per kill" (0,15).
const V_FEW_CONTACTS = ASSUMPTION_VARIANTS[0]

describe('armorUpgradeAdvice: wanneer er niets te rekenen valt', () => {
  it('geeft none zonder profiel, buiten de EXP-tabel of zonder "Beste"', () => {
    expect(armorUpgradeAdvice(drafts, null)).toEqual({ kind: 'none' })
    expect(armorUpgradeAdvice(drafts, strong({ level: 31 }))).toEqual({ kind: 'none' })
    expect(armorUpgradeAdvice([], strong({ level: 15 }))).toEqual({ kind: 'none' })
  })

  it('rekent ook onder lv 10, nu de EXP-tabel bij lv 1 begint (issue #146)', () => {
    expect(armorUpgradeAdvice(drafts, strong({ level: 9 }))).toMatchObject({ kind: 'advice', level: 9 })
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
      { armor: armor('Red Tiberian'), needs: [{ stat: 'luk', amount: 5 }, { stat: 'dex', amount: 5 }] },
      { armor: armor('Brown Sneak'), needs: [{ stat: 'luk', amount: 5 }, { stat: 'dex', amount: 5 }] },
      // Bij bottom is Brown Sneak Pants (WDEF 26) het beste stuk dat nog niet draagbaar is.
      { armor: armor('Brown Sneak Pants'), needs: [{ stat: 'luk', amount: 5 }, { stat: 'dex', amount: 5 }] },
    ])
  })

  it('noemt alleen het tekort dat er is: genoeg DEX laat DEX weg, genoeg LUK laat LUK weg', () => {
    const dexOk = advice(drafts, { ...base, level: 20, luk: 25, dex: 50 })
    expect(dexOk.notWearable.find((u) => u.armor.name === 'Red Loosecap')).toEqual({ armor: armor('Red Loosecap'), needs: [{ stat: 'luk', amount: 5 }] })
    const lukOk = advice(drafts, { ...base, level: 25, luk: 100, dex: 5 })
    expect(lukOk.notWearable.find((u) => u.armor.name === 'Red Tiberian')).toEqual({ armor: armor('Red Tiberian'), needs: [{ stat: 'dex', amount: 10 }] })
  })

  it('draagt een stuk bij precies genoeg stats (LUK 20, DEX 0 voor Red Thief Hood; LUK 19 niet)', () => {
    const a = advice(drafts, { ...base, level: 15, luk: 20, dex: 0 })
    expect(a.notWearable.map((u) => u.armor.name)).not.toContain('Red Thief Hood')
    expect(wearableNets({ ...base, level: 15, luk: 20, dex: 0 }).map((x) => x.armor.name)).toContain('Red Thief Hood')
    // Eén LUK minder: de Hood kan niet, de Red Ghetto Beanie (LUK 10) wel.
    const b = advice(drafts, { ...base, level: 15, luk: 19, dex: 0 })
    expect(b.notWearable).toContainEqual({ armor: armor('Red Thief Hood'), needs: [{ stat: 'luk', amount: 1 }] })
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
    // Blue Gidder Shoes: Red Enamel Boots is lv 20, dus niet "later", en de Red Ninja Sandals (lv 15) ook niet: de horizon is niet eindig en wordt afgekapt.
    expect(choice(advice(drafts, strong({ level: 20 })), 'Blue Gidder Shoes')).toMatchObject({ from: 20, to: 30, truncated: true })
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
  it('is volledig met de hand uit te rekenen: lv 20, Blue Gidder Shoes (WDEF 10, 1.200 mesos), 20 t/m 30', () => {
    // EXP 148.430 + 322.582 + 95.700 = 566.712; per level de EXP gedeeld door de EXP per meso van het gegroeide profiel van dat level (zonder en met WDEF 72 + 10).
    expect(EXP_20_24 + EXP_25_29 + EXP_30).toBe(EXP_20_30)
    const p = strong({ level: 20 })
    const saving = costOver(p, 20, 30) - costOver(p, 20, 30, p.wdef + 10)
    // Voor de groei (Dave, 7 oktober 2026) was dit 4.406,8 met de Red Ninja Sandals, bij één EXP per meso voor alle levels.
    expect(saving).toBeCloseTo(2_294.2, 1)
    const c = choice(advice(drafts, p), 'Blue Gidder Shoes')
    expect(c.saving).toBeCloseTo(saving, 6)
    expect(c.net).toBeCloseTo(saving - 1_200, 6)
    expect(c.net).toBeCloseTo(1_094.2, 1)
  })

  it('is volledig met de hand uit te rekenen: lv 25, Red Cloth Vest (WDEF 24, 2.000 mesos), 25 t/m 29', () => {
    const p = strong({ level: 25 })
    const saving = costOver(p, 25, 29) - costOver(p, 25, 29, p.wdef + 24)
    // Voor de groei was dit 4.424,9 (één EXP per meso voor alle levels).
    expect(saving).toBeCloseTo(3_863.7, 1)
    const c = choice(advice(drafts, p), 'Red Cloth Vest')
    expect(c.saving).toBeCloseTo(saving, 6)
    expect(c.net).toBeCloseTo(saving - 2_000, 6)
  })

  it('is kosten zonder min kosten met over de horizon, elk op de beste plek (lv 15, Red Cloth Vest, 15 t/m 19)', () => {
    const p = strong({ level: 15 })
    const c = choice(advice(drafts, p), 'Red Cloth Vest')
    const without = costOver(p, 15, 19)
    const withIt = costOver(p, 15, 19, p.wdef + 24)
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
      [20, 'Blue Gidder Shoes', 20, 30],
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
      const want = costOver(p, from, to) - costOver(p, from, to, p.wdef + armor(name).wdef)
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

  it('telt het huidige level vol mee, en laat je karakter over de horizon groeien (growth.ts): niet één EXP per meso voor alle levels', () => {
    const p = strong({ level: 25 })
    const c = choice(advice(drafts, p), 'Red Cloth Vest')
    expect(c.from).toBe(25)
    expect(c.saving).toBeCloseTo(costOver(p, 25, 29) - costOver(p, 25, 29, p.wdef + 24), 5)
    // Het oude antwoord (de stats van nu over de hele horizon) is een ander getal: het profiel van level 29 is niet dat van level 25.
    const constant = EXP_25_29 * (1 / epm(p) - 1 / epm({ ...p, wdef: p.wdef + 24 }))
    expect(Math.abs(c.saving! - constant)).toBeGreaterThan(1)
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
        const without = costOver(p, from, to)
        let prev = -Infinity
        for (let wdef = 0; wdef <= 80; wdef++) {
          const saving = without - costOver(p, from, to, p.wdef + wdef)
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
    const saving = costOver(p, 15, 19) - costOver(p, 15, 19, p.wdef + 15)
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
    expect(a.winner).toBe(armor('Blue Gidder Shoes'))
    expect(a.winner).toBe(a.choices[0].armor)
    expect(a.choices[0].net!).toBeGreaterThan(0)
    const nets = a.choices.map((c) => c.net!)
    expect(nets).toEqual([...nets].sort((x, y) => y - x))
  })

  it('kiest in een slot een goedkoper stuk met minder WDEF als dat netto meer oplevert (lv 20 schoenen)', () => {
    const p = strong({ level: 20 })
    const a = advice(drafts, p)
    // Het topstuk (Red Enamel Boots, WDEF 14, 3.600) bespaart meer dan de Blue Gidder Shoes (WDEF 10, 1.200), maar kost het driedubbele.
    const boots = armor('Red Enamel Boots')
    const sandals = armor('Blue Gidder Shoes')
    expect(boots.wdef).toBeGreaterThan(sandals.wdef)
    const savingOf = (x: ArmorPiece) => costOver(p, 20, 30) - costOver(p, 20, 30, p.wdef + x.wdef)
    expect(savingOf(boots)).toBeGreaterThan(savingOf(sandals))
    expect(savingOf(boots) - boots.price).toBeLessThan(savingOf(sandals) - sandals.price)
    expect(names(a)).toContain('Blue Gidder Shoes')
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

  it('meldt robust true als dezelfde uitkomst geldt onder elke aannamevariant (lv 16: nergens een winnaar)', () => {
    // Op lv 15 gold sinds #181 dat bij 0,6 contacten de Beanie en de Bandana zich net terugverdienden (ongeveer +19); sinds de groei (Dave, 7 oktober 2026) niet meer.
    expect(advice(drafts, strong({ level: 15 })).robust).toBe(true)
    expect(advice(drafts, strong({ level: 16 })).robust).toBe(true)
    // Handcontrole: onder geen enkele variant verdient een van de stukken zich terug.
    for (const level of [15, 16]) {
      const p = strong({ level })
      for (const v of ASSUMPTION_VARIANTS) {
        for (const x of wearableNets(p, v)) expect(x.net, `${x.armor.name} lv ${level}`).toBeLessThan(0)
      }
    }
  })

  it('meldt robust false op lv 20 omdat bij minder contacten (0,15) geen stuk zich nog terugverdient: Blue Gidder Shoes staat dan op ongeveer -53', () => {
    const p = strong({ level: 20 })
    const a = advice(drafts, p)
    expect(a.winner).toBe(armor('Blue Gidder Shoes'))
    expect(V_FEW_CONTACTS.contactsPerKill).toBe(0.15)
    // Met de hand: bij 0,15 contacten is Gidder ongeveer -53 netto (bij de standaardwaarden +1.094): geen winnaar meer. (Voor de groei won hier bij 0,15 nog Gidder boven Sandals.)
    expect(handNet(p, armor('Blue Gidder Shoes'), V_FEW_CONTACTS)).toBeCloseTo(-52.9, 0)
    expect(bruteWinner(p, V_FEW_CONTACTS)).toBeNull()
    expect(a.robust).toBe(false)
  })

  it('meldt robust false op lv 25: bij minder contacten (0,15) wint de Red Ghetto Beanie (ongeveer +31) in plaats van de Red Cloth Vest, en op lv 26 verdient geen stuk zich dan nog terug', () => {
    const p = strong({ level: 25 })
    const a = advice(drafts, p)
    expect(a.winner).toBe(armor('Red Cloth Vest'))
    // Met de hand, per level de EXP gedeeld door de EXP per meso van het gegroeide profiel, bij 0,15 contacten: de Beanie (WDEF 15, 1.200) ongeveer +31, de Vest (WDEF 24, 2.000) ongeveer -68.
    // (Voor de groei, Dave 7 oktober 2026, won hier bij 0,15 ook de Vest, met ongeveer +212 tegen +211.)
    const beanieNet = costOver(p, 25, 29, undefined, V_FEW_CONTACTS) - costOver(p, 25, 29, p.wdef + 15, V_FEW_CONTACTS) - 1_200
    const vestNet = costOver(p, 25, 29, undefined, V_FEW_CONTACTS) - costOver(p, 25, 29, p.wdef + 24, V_FEW_CONTACTS) - 2_000
    expect(beanieNet).toBeCloseTo(31.2, 0)
    expect(vestNet).toBeCloseTo(-68.2, 0)
    expect(handNet(p, armor('Red Ghetto Beanie'), V_FEW_CONTACTS)).toBeCloseTo(beanieNet, 0)
    expect(bruteWinner(p, V_FEW_CONTACTS)).toBe(armor('Red Ghetto Beanie'))
    expect(a.robust).toBe(false)
    // Lv 26: bij 0,15 contacten verdient geen stuk zich nog terug, terwijl de Vest bij de standaardwaarden wint.
    const p26 = strong({ level: 26 })
    expect(advice(drafts, p26).winner).toBe(armor('Red Cloth Vest'))
    expect(bruteWinner(p26, V_FEW_CONTACTS)).toBeNull()
    expect(advice(drafts, p26).robust).toBe(false)
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
  it('geeft op lv 15 geen winnaar: het beste stuk (Red Ghetto Beanie) staat op ongeveer -590', () => {
    const a = advice(drafts, strong({ level: 15 }))
    expect(a.winner).toBeNull()
    const top = a.choices[0]
    expect(top.armor.name).toBe('Red Ghetto Beanie')
    // Voor de groei (Dave, 7 oktober 2026) was dit -590,4; de levels erna zijn nu makkelijker, dus een stuk WDEF bespaart minder.
    expect(top.net!).toBeCloseTo(-671.4, 0)
    // Met de hand: 15 t/m 19, de EXP per level gedeeld door de EXP per meso van het gegroeide profiel, zonder en met WDEF 15, min 1.200 mesos.
    expect(costOver(strong({ level: 15 }), 15, 19) - costOver(strong({ level: 15 }), 15, 19, 72 + 15) - 1_200).toBeCloseTo(-671.4, 0)
    // De Blue Gidder Shoes, tot nu toe de beste, komen er net achter (was ongeveer -788).
    expect(choice(a, 'Blue Gidder Shoes').net!).toBeCloseTo(-843.2, 0)
  })

  it('geeft op lv 20 Blue Gidder Shoes als winnaar met ongeveer +1.094 (voor de groei: Red Ninja Sandals met +2.607)', () => {
    const a = advice(drafts, strong({ level: 20 }))
    expect(a.winner).toBe(armor('Blue Gidder Shoes'))
    expect(a.choices[0].net!).toBeCloseTo(1_094.2, 0)
    expect(a.robust).toBe(false)
  })

  it('geeft op lv 25 Red Cloth Vest als winnaar met ongeveer +1.864 (voor de groei: +2.425), en elk slot is positief', () => {
    const a = advice(drafts, strong({ level: 25 }))
    expect(a.winner).toBe(armor('Red Cloth Vest'))
    expect(a.choices[0].net!).toBeCloseTo(1_863.7, 0)
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
const handWdef = (p: Profile, a: ArmorPiece, w: number) => Math.max(0, p.wdef - w) + a.wdef
/** Netto met vervanging, met de hand: EXP-som over de horizon gedeeld door EXP per meso zonder en met het stuk, min de prijs. */
const handNetW = (p: Profile, a: ArmorPiece, w: number, v: Assumptions = ASSUMPTIONS) => {
  const to = handTo(p.level, a)
  return costOver(p, p.level, to, p.wdef, v) - costOver(p, p.level, to, handWdef(p, a, w), v) - a.price
}
/** De kandidaten met worn, brute force over heel NPC_ARMOR (met de geslachtsregel van shopHand): draagbaar, level genoeg en meer WDEF dan wat je draagt. */
const wornNets = (p: Profile, worn: Worn, v: Assumptions = ASSUMPTIONS) =>
  shopHand(p.gender ?? null).filter((a) => a.level <= p.level && p.luk >= a.luk && p.dex >= a.dex && a.wdef > (worn[a.slot] ?? -Infinity)).map((a) => ({
    armor: a,
    net: handNetW(p, a, worn[a.slot] ?? 0, v),
  }))
const bruteWinnerW = (p: Profile, worn: Worn, v: Assumptions = ASSUMPTIONS): ArmorPiece | null => {
  const best = wornNets(p, worn, v).reduce<{ armor: ArmorPiece; net: number } | null>((m, x) => (!m || x.net > m.net ? x : m), null)
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
    const saving = costOver(p, 20, 30) - costOver(p, 20, 30, 74)
    expect(c).toMatchObject({ from: 20, to: 30, truncated: true, replaces: 12 })
    expect(c.saving).toBeCloseTo(saving, 6)
    expect(c.net).toBeCloseTo(saving - 3_600, 6)
  })

  it('geeft een kleinere netto dan zonder worn (lv 20, Red Pao bovenop een Red Cloth Vest van 24: +8 WDEF in plaats van +32)', () => {
    const p = strong({ level: 20 })
    const w = choice(adviceW(p, { top: 24 }), 'Red Pao')
    expect(w.net!).toBeLessThan(handNet(p, armor('Red Pao')))
    expect(w.net!).toBeCloseTo(handNetW(p, armor('Red Pao'), 24), 6)
    expect(w.net!).toBeCloseTo(costOver(p, 20, 24) - costOver(p, 20, 24, 72 + 8) - 6_000, 6)
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
    expect(c.net!).toBeCloseTo(costOver(p, 20, 30) - costOver(p, 20, 30, 14) - 3_600, 6)
  })

  it('geeft withArmor met replaced de WDEF max(0, wdef - gedragen) + stuk', () => {
    expect(withArmor(base, armor('Red Pao'), 24).wdef).toBe(72 - 24 + 32)
    expect(withArmor({ ...base, wdef: 5 }, armor('Red Pao'), 24).wdef).toBe(32)
    expect(withArmor(base, armor('Red Pao')).wdef).toBe(72 + 32)
  })

  it('laat een stuk dat je al draagt niet meer winnen (lv 20: zonder worn wint Blue Gidder Shoes)', () => {
    const p = strong({ level: 20 })
    expect(advice(drafts, p).winner).toBe(armor('Blue Gidder Shoes'))
    const a = adviceW(p, { shoes: 10 })
    expect(a.winner).not.toBe(armor('Blue Gidder Shoes'))
    expect(a.winner).toBe(bruteWinnerW(p, { shoes: 10 }))
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
    expect(u).toEqual({ armor: armor('Red Tiberian'), needs: [{ stat: 'luk', amount: 5 }, { stat: 'dex', amount: 5 }] })
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

  it('is onbekend bij een gedragen overall met onbekende WDEF, ook als er top of bottom naast staan (issue #118)', () => {
    for (const slot of ['top', 'bottom', 'overall'] as const) {
      expect(replacedWdef(slot, { overallWorn: true }), slot).toBeUndefined()
      expect(replacedWdef(slot, { overallWorn: true, top: 32, bottom: 23 }), slot).toBeUndefined()
      expect(replacedWdef(slot, { overallWorn: true, overall: 75, top: 32 }), slot).toBe(75)
    }
    expect(replacedWdef('hat', { overallWorn: true, hat: 15 })).toBe(15)
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

// NPC_ARMOR is de enige bron van kandidaten; een test zet er tijdelijk een overall in en haalt hem weer weg.
const fakeOverall = (over: Partial<ArmorPiece> = {}): ArmorPiece => ({ name: 'Test Overall', slot: 'overall', level: 20, wdef: 60, luk: 0, dex: 0, price: 5_000, source: armor('Red Pao').source, ...over })
const withInjected = <T>(a: ArmorPiece, fn: () => T): T => {
  const list = NPC_ARMOR as ArmorPiece[]
  list.push(a)
  try {
    return fn()
  } finally {
    list.splice(list.indexOf(a), 1)
  }
}

describe('armorUpgradeAdvice met een overall als kandidaat (geinjecteerd: de winkel verkoopt er nog geen)', () => {
  const p = strong({ level: 25 })
  // De horizon van de overall (WDEF 60) met de hand (#87): op lv 30 geven Dark Silver Stealer (40) en Red Stealer
  // Pants (29) samen 69, meer dan 60, dus hij loopt tot 29 en niet tot de tabelrand.
  const OVERALL_TO = 29

  it('rekent een overall tegen top plus bottom: replaces = som, en het netto komt overeen met de WDEF wdef - 55 + 60 met de hand', () => {
    const o = fakeOverall()
    withInjected(o, () => {
      const c = choice(adviceW(p, { top: 32, bottom: 23 }), o.name)
      expect(c.replaces).toBe(55)
      expect(c).toMatchObject({ from: 25, to: OVERALL_TO })
      expect(c.net!).toBeCloseTo(costOver(p, p.level, OVERALL_TO) - costOver(p, p.level, OVERALL_TO, handWdef(p, o, 55)) - o.price, 6)
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
      expect(unk.net!).toBeCloseTo(costOver(p, p.level, OVERALL_TO) - costOver(p, p.level, OVERALL_TO, p.wdef + o.wdef) - o.price, 6)
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

  it('laat de horizon van de top van een vrouw op lv 10 (Orange Lolica Armor, WDEF 35) lopen tot haar volgende upgrade van het lijf, niet tot een mannentop', () => {
    // Met de hand: de mannen-top Brown Corporal (lv 15, WDEF 40) telt voor haar niet; de T-shirts (26) zijn niet beter.
    // Haar overall Steel Fitted Mail (lv 15, WDEF 75) is meer dan de top met haar beste broek tot lv 15 (Rookie Pants, 25):
    // 75 > 35 + 25, dus de horizon stopt op 14 (#87), vóór de betere top Red Lamelle (lv 20).
    const top = (g: 'male' | 'female') => advice(drafts, warrior(10, g)).choices.find((c) => c.armor.slot === 'top')!
    expect(top('female').armor.name).toBe('Orange Lolica Armor')
    expect(top('female')).toMatchObject({ from: 10, to: 14 })
    expect(top('male').armor.name).toBe('Brown Lolico Armor')
    expect(top('male')).toMatchObject({ from: 10, to: 14 })
  })

  it('geeft zonder geslacht voor een Warrior alleen hoed en schoenen en de unisex-stukken (geen top, bottom of overall met geslacht)', () => {
    const a = advice(drafts, warrior(20))
    expect(a.choices.map((c) => c.armor.slot).sort()).toEqual(['hat', 'shoes'])
    expect(a.notWearable.every((u) => u.armor.slot === 'hat' || u.armor.slot === 'shoes')).toBe(true)
  })
})

describe('armorUpgradeAdvice: het lijf, overall tegen top + bottom (issue #87)', () => {
  const mp = parseProfile(DEFAULT_PROFILE, 'magician')
  if (!('profile' in mp)) throw new Error('Magician-profiel ongeldig')
  const mage = (level: number): Profile => ({ ...mp.profile, level, int: 200, luk: 200 })
  const wp = parseProfile(DEFAULT_PROFILE, 'warrior', 'male')
  if (!('profile' in wp)) throw new Error('Warrior-profiel ongeldig')
  const warriorMan = (level: number): Profile => ({ ...wp.profile, level, str: 100, dex: 100 })
  const piece = (list: readonly ArmorPiece[], name: string) => list.find((x) => x.name.startsWith(name))!
  const robe = piece(MAGICIAN_ARMOR, 'Doros Robe')
  const splitTop = piece(MAGICIAN_ARMOR, 'Split Piece')
  const splitPants = piece(MAGICIAN_ARMOR, 'Split Pants')
  const pairOf = (a: Advice) => a.choices.find((c) => c.with !== undefined)

  it('weegt op lv 25 bij de Magician de Doros Robe tegen Split Piece + Split Pants, elk met de hand nagerekend', () => {
    // Met de hand: geen later lijfstuk in de Magician-winkel, dus beide lopen tot de tabelrand (lv 30, afgekapt).
    const p = mage(25)
    const a = advice(drafts, p)
    const o = a.choices.find((c) => c.armor === robe)!
    expect(o).toMatchObject({ from: 25, to: 30, truncated: true, price: 13_500, replaces: undefined })
    expect(o.net!).toBeCloseTo(costOver(p, 25, 30) - costOver(p, 25, 30, p.wdef + 40) - 13_500, 6)
    // Elk paar top + bottom met de hand: WDEF en prijs opgeteld, over dezelfde horizon. Het paar in de keuzes is dat met de hoogste netto.
    const pairNet = (t: ArmorPiece, b: ArmorPiece) => costOver(p, 25, 30) - costOver(p, 25, 30, p.wdef + t.wdef + b.wdef) - t.price - b.price
    const halves = (slot: 'top' | 'bottom') => MAGICIAN_ARMOR.filter((x) => x.slot === slot && x.level <= 25)
    const nets = halves('top').flatMap((t) => halves('bottom').map((b) => ({ t, b, net: pairNet(t, b) })))
    expect(nets).toHaveLength(4)
    const handBest = nets.reduce((m, x) => (x.net > m.net ? x : m))
    const pair = pairOf(a)!
    expect([pair.armor, pair.with]).toEqual([handBest.t, handBest.b])
    expect(pair).toMatchObject({ from: 25, to: 30, truncated: true, price: handBest.t.price + handBest.b.price, replaces: undefined })
    expect(pair.net!).toBeCloseTo(handBest.net, 6)
    // Split Piece + Split Pants (19 + 13 = 32 WDEF, 10.800) is gewogen, en verliest het van het goedkopere paar.
    expect(nets.find((x) => x.t === splitTop && x.b === splitPants)!.net).toBeLessThan(handBest.net)
    // Het paar is een eigen keuze naast de losse top en bottom.
    expect(a.choices.filter((c) => c.armor === pair.armor)).toHaveLength(2)
  })

  it('rekent een paar tegen wat een overall vervangt: top en bottom samen, of de gedragen overall', () => {
    const p = mage(25)
    expect(pairOf(adviceW(p, { top: 13, bottom: 9 }))!.replaces).toBe(22)
    expect(pairOf(adviceW(p, { overall: 20 }))!.replaces).toBe(20)
    // Geeft het paar niet meer dan wat je draagt, dan is het geen upgrade: 32 tegen een overall van 32 of 40.
    expect(pairOf(adviceW(p, { overall: 32 }))).toBeUndefined()
    expect(pairOf(adviceW(p, { overall: 40 }))).toBeUndefined()
  })

  it('biedt geen paar aan zonder overall op tafel: de Thief-winkel heeft er geen, en zonder gedragen overall', () => {
    for (const level of LEVELS) expect(pairOf(advice(drafts, strong({ level }))), `lv ${level}`).toBeUndefined()
    expect(pairOf(advice(drafts, mage(24)))).toBeUndefined()
  })

  it('biedt de Thief met een gedragen overall wel een paar, en meldt bij een losse top dat de broek leeg raakt', () => {
    // Lv 25, overall van 30 aan: een losse top vervangt de overall en de broek is dan leeg (Red Cloth Vest, 24, is
    // dan geen upgrade, Red Pao, 32, wel); een paar vervangt de overall ook, en daar mag de Red Cloth Vest weer in.
    const p = strong({ level: 25 })
    const a = adviceW(p, { overall: 30 })
    const top = a.choices.find((c) => c.armor.slot === 'top' && !c.with)!
    expect(top.armor.wdef).toBeGreaterThan(30)
    expect(top).toMatchObject({ replaces: 30, bare: 'bottom' })
    const pair = pairOf(a)!
    expect(pair).toMatchObject({ replaces: 30, price: pair.armor.price + pair.with!.price })
    expect(pair.armor.wdef + pair.with!.wdef).toBeGreaterThan(30)
    expect(pair.bare).toBeUndefined()
    // Zonder gedragen overall is er geen lege helft.
    for (const c of adviceW(p, { top: 20, bottom: 10 }).choices) expect(c.bare, c.armor.name).toBeUndefined()
  })

  it('laat de horizon van een top of bottom stoppen vóór een betere overall (Magician lv 20: Doros Robe op lv 25)', () => {
    // Met de hand: de beste top en bottom tot lv 25 zijn Split Piece (19) en Split Pants (13). Elke top geeft hoogstens
    // 19 + 13 = 32 en elke bottom hoogstens 13 + 19 = 32, minder dan de 40 van de robe, dus elk stopt op 24 in plaats van 30.
    const a = advice(drafts, mage(20))
    const halves = a.choices.filter((c) => c.armor.slot === 'top' || c.armor.slot === 'bottom')
    expect(halves.map((c) => c.armor.slot).sort()).toEqual(['bottom', 'top'])
    for (const c of halves) expect(c, c.armor.name).toMatchObject({ from: 20, to: 24, truncated: false })
    // Een lv 20-profiel ziet de robe nog niet als kandidaat, dus ook nog geen paar.
    expect(pairOf(a)).toBeUndefined()
  })

  it('laat de horizon van een overall stoppen vóór een beter paar (Warrior-man lv 20: Blue Kendo Robe)', () => {
    // Met de hand: Blue Kendo Robe 85; op lv 25 geven Silver Master Sergeant (50) en de Kilt (37) samen 87, dus tot 24.
    const a = advice(drafts, warriorMan(20))
    const kendo = a.choices.find((c) => c.armor === piece(WARRIOR_ARMOR, 'Blue Kendo Robe'))!
    expect(kendo).toMatchObject({ from: 20, to: 24 })
    // Het paar met de hoogste netto is Brown Lolico Armor + Brown Lolico Pants (35 + 25 = 60, 2.000 + 1.600): het stopt
    // op 24, want de top van lv 25 (Silver Master Sergeant, 50) is beter dan 35.
    const pair = pairOf(a)!
    expect([pair.armor.name, pair.with!.name]).toEqual(['Brown Lolico Armor', 'Brown Lolico Pants'])
    expect(pair).toMatchObject({ from: 20, to: 24, price: 3_600 })
  })

  it('heeft een paar als winnaar alleen als het de grootste netto boven 0 heeft, en dan staat het vooraan', () => {
    for (const p of [mage(25), mage(30), warriorMan(20), warriorMan(25), warriorMan(30)]) {
      const a = advice(drafts, p)
      const best = a.choices[0]
      if (a.winner) {
        expect(a.winner).toBe(best.armor)
        expect(best.net!).toBeGreaterThan(0)
      }
      for (const c of a.choices) if (c.net !== null && best.net !== null) expect(c.net).toBeLessThanOrEqual(best.net)
    }
  })
})

describe('armorUpgradeAdvice: een gedragen overall met onbekende WDEF (issue #118)', () => {
  const pairOf = (a: Advice) => a.choices.find((c) => c.with !== undefined)

  it('biedt de Thief met die overall een paar aan, en meldt bij een losse top of bottom de lege helft', () => {
    // De Thief-winkel heeft geen overall: alleen de gedragen overall zet het paar op tafel. Wat hij vervangt is onbekend.
    const p = strong({ level: 25 })
    const a = adviceW(p, { overallWorn: true })
    const pair = pairOf(a)!
    expect(pair).toMatchObject({ replaces: undefined, price: pair.armor.price + pair.with!.price })
    expect(pair.bare).toBeUndefined()
    expect(a.choices.find((c) => c.armor.slot === 'top' && !c.with)).toMatchObject({ replaces: undefined, bare: 'bottom' })
    expect(a.choices.find((c) => c.armor.slot === 'bottom')).toMatchObject({ replaces: undefined, bare: 'top' })
    // Zonder gedragen overall: geen paar en geen lege helft, zoals altijd.
    const none = adviceW(p, {})
    expect(pairOf(none)).toBeUndefined()
    for (const c of none.choices) expect(c.bare, c.armor.name).toBeUndefined()
  })

  it('rekent met onbekende WDEF hetzelfde als zonder overall, op het paar en de lege helft na', () => {
    // Onbekend telt als leeg (zie de kop), dus de losse stukken zijn dezelfde keuzes als met een lege worn.
    for (const level of [15, 20, 25, 30]) {
      const p = strong({ level })
      const strip = ({ bare: _, ...c }: Advice['choices'][number]) => c
      const solo = adviceW(p, { overallWorn: true }).choices.filter((c) => !c.with).map(strip)
      expect(solo, `lv ${level}`).toEqual(adviceW(p, {}).choices.map(strip))
    }
  })

  it('laat een losse top die de broek leeg laat, tegen een latere overall rekenen met de beste broek van dat level (de keuze bij punt 2)', () => {
    // Met de hand: een overall van 45 op lv 27. Elke top tot lv 25 geeft met de beste broek van lv 27 (Brown Sneak Pants,
    // 26) meer dan 45 (24 + 26 = 50), dus de overall beëindigt hem niet; de Dark Silver Stealer (40, lv 30) wel: tot 29.
    // Telde de lege broek als 0, dan zou elke top (hoogstens 36) al op 26 stoppen.
    const p = strong({ level: 25 })
    withInjected(fakeOverall({ level: 27, wdef: 45 }), () => {
      const tops = adviceW(p, { overallWorn: true }).choices.filter((c) => c.armor.slot === 'top' && !c.with)
      expect(tops).toHaveLength(1)
      expect(tops[0]).toMatchObject({ bare: 'bottom', from: 25, to: 29, truncated: false })
    })
  })
})

describe('armorUpgradeAdvice: niets beters meer (de basis van "Upgrade complete")', () => {
  it('heeft geen keuzes en geen geblokkeerd stuk als je in elk slot meer WDEF draagt dan de winkel biedt', () => {
    const worn = { hat: 999, top: 999, bottom: 999, overall: 999, shoes: 999, shield: 999, gloves: 999, cape: 999, earrings: 999 }
    const a = armorUpgradeAdvice(drafts, strong({ level: 30 }), worn)
    if (a.kind !== 'advice') throw new Error('advies verwacht')
    expect(a.choices).toEqual([])
    expect(a.notWearable).toEqual([])
    expect(a.winner).toBeNull()
  })

  it('heeft wel keuzes als je niets draagt, dus is de upgrade niet af', () => {
    const a = advice(drafts, strong({ level: 30 }))
    expect(a.choices.length + a.notWearable.length).toBeGreaterThan(0)
  })
})

describe('armorUpgradeAdvice over alleen dit level (#188)', () => {
  it('telt de besparing alleen op je huidige level, en nooit meer dan tot je volgende upgrade', () => {
    const p = strong({ level: 15 })
    const upgrade = armorUpgradeAdvice(drafts, p) as Advice
    const level = armorUpgradeAdvice(drafts, p, {}, 'this-level') as Advice
    expect(level.kind).toBe('advice')
    expect(level.choices.length).toBeGreaterThan(0)
    for (const c of level.choices) {
      expect([c.from, c.to, c.truncated]).toEqual([15, 15, false])
      const same = upgrade.choices.find((u) => u.armor === c.armor && u.with === c.with)
      if (same && same.saving !== null && c.saving !== null) expect(c.saving).toBeLessThanOrEqual(same.saving)
      if (c.saving !== null) expect(c.net).toBe(c.saving - c.price)
    }
  })
})

describe('armorUpgradeAdvice: een gelijke besparing (#230)', () => {
  // Een tweeling van het beste stuk met 1 WDEF meer, geprijsd zodat hij 0,1 meso meer netto geeft: op hele mesos een gelijkspel,
  // dus wint het goedkopere origineel, niet de afrondingsruis (zoals bij de wapens, #227).
  it('zet bij gelijke netto besparing op hele mesos het goedkoopste stuk voor', () => {
    for (const level of [15, 20, 25]) {
      const p = strong({ level })
      const a = advice(drafts, p).choices.find((c) => !c.with)!
      const twin = (over: Partial<ArmorPiece>): ArmorPiece => ({ ...a.armor, name: 'Test Twin', wdef: a.armor.wdef + 1, ...over })
      const d = withInjected(twin({}), () => choice(advice(drafts, p), 'Test Twin').net!) - a.net!
      expect(d, `lv ${level}`).toBeGreaterThan(0.1) // voorwaarde: de tweeling is na de prijsaanpassing echt duurder
      const t = twin({ price: a.armor.price + d - 0.1 })
      withInjected(t, () => {
        const got = advice(drafts, p)
        // Voorwaarde: het is echt een gelijkspel op hele mesos (anders zegt deze test niets).
        expect(Math.round(a.net! + 0.1), `lv ${level}`).toBe(Math.round(a.net!))
        expect(names(got), `lv ${level}`).toContain(a.armor.name)
        expect(names(got), `lv ${level}`).not.toContain('Test Twin')
      })
    }
  })

  it('ordent elke gelijke netto besparing op prijs en dan op WDEF', () => {
    for (const level of LEVELS) {
      const c = advice(drafts, strong({ level })).choices
      for (let i = 1; i < c.length; i++) {
        const [x, y] = [c[i - 1], c[i]]
        if (x.net === null || y.net === null || Math.round(x.net) !== Math.round(y.net)) continue
        expect(x.price, `${x.armor.name} vóór ${y.armor.name}`).toBeLessThanOrEqual(y.price)
        if (x.price === y.price) expect(x.armor.wdef + (x.with?.wdef ?? 0)).toBeGreaterThanOrEqual(y.armor.wdef + (y.with?.wdef ?? 0))
      }
    }
  })
})
