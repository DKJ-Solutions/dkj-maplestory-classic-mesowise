// De upgrade-adviezen (wapen en armor) voor een Warrior (issue #42, stap 2). De Thief-uitkomsten zelf staan in
// clawUpgrade.test.ts en armorUpgrade.test.ts en blijven daar ongewijzigd; hier alleen wat de Warrior anders doet:
// een wapen telt als "beter" volgens het model (niet op weapon attack), de eis is STR, en de winkel is die van warriorGear.ts.
import { describe, expect, it } from 'vitest'
import { armorUpgradeAdvice, type ArmorUpgradeAdvice } from './armorUpgrade'
import { ASSUMPTIONS } from './calc/mobModel'
import { clawUpgradeAdvice, withClaw, type ClawUpgradeAdvice } from './clawUpgrade'
import { NPC_ARMOR } from './data/armor'
import { NPC_CLAWS } from './data/claws'
import { mobDraft } from './data/spots'
import type { ArmorPiece, Claw } from './data/types'
import { bestExpPerMeso } from './bestExpPerMeso'
import { growthOf } from './growth'
import { DEFAULT_PROFILE, parseProfile, type Profile } from './profile'
import { newDraft, type SpotDraft } from './spotDraft'
import { WARRIOR_ARMOR, WARRIOR_WEAPONS } from './warriorGear'
import { NPC_WARRIOR_ARMOR, NPC_WARRIOR_WEAPONS } from './data/warrior'

const parseW = (over: Partial<typeof DEFAULT_PROFILE>): Profile => {
  const r = parseProfile({ ...DEFAULT_PROFILE, lukExtra: '0', str: '100', dex: '100', luk: '4', clawWatk: '30', weaponMult: '1.8', attackMs: '750', hp: '1000', accuracy: '100', avoid: '20', wdef: '50', ...over }, 'warrior')
  if (!('profile' in r)) throw new Error('Warrior-profiel ongeldig')
  return r.profile
}
/** Een Warrior met stats ruim genoeg voor elk item, zodat alleen level en wapen of armor bepalen wat een kandidaat is. */
const strong = (over: Partial<Profile> = {}): Profile => ({ ...parseW({}), ...over })

const own = (id: string, expPerHour: number, potions: number): SpotDraft => ({ ...newDraft(id), name: id, expPerHour: String(expPerHour), travel: String(potions) })
// De mob waarop je jaagt (#123): Stump. Waar een sterke Warrior een Stump met elk wapen in één klap velt, telt de schade
// niet en rekent de test op de taaiere Dark Stump (toughDrafts).
const drafts = [{ ...mobDraft('Stump')!, id: 'a' }, own('b', 1_000, 10_000)]
const toughDrafts = [{ ...mobDraft('Dark Stump')!, id: 'a' }, own('b', 1_000, 10_000)]

/** EXP per meso op de beste plek, via bestExpPerMeso (niet via de module onder test). */
const epm = (p: Profile, d: readonly SpotDraft[] = drafts) => {
  const v = bestExpPerMeso(d, p, ASSUMPTIONS)
  if (v === undefined) throw new Error('geen beste plek')
  return v
}

// EXP tot het volgende level, met de hand uit de tabel overgenomen, los van expToNextLevel.
const EXP_AT: Record<number, number> = {
  10: 1_716, 11: 2_360, 12: 3_216, 13: 4_200, 14: 5_460, 15: 7_050, 16: 8_840, 17: 11_040, 18: 13_716, 19: 16_680,
  20: 20_216, 21: 24_402, 22: 28_980, 23: 34_320, 24: 40_512, 25: 47_216, 26: 54_900, 27: 63_666, 28: 73_080, 29: 83_720, 30: 95_700,
}
/**
 * De mesokosten van level from t/m to met de hand: per level de EXP gedeeld door de EXP per meso op het gegroeide profiel van dat level
 * (growth.ts, Dave, 7 oktober 2026: het karakter groeit over de horizon mee), met `change` erbij (een wapen, een stuk armor).
 */
const costOver = (p: Profile, from: number, to: number, change: (q: Profile) => Profile = (q) => q) => {
  const grown = growthOf(drafts, p)
  let sum = 0
  for (let l = from; l <= to; l++) sum += EXP_AT[l] / epm(change(grown(l)))
  return sum
}

describe('Warrior-wapens: de winkel', () => {
  type Advice = Extract<ClawUpgradeAdvice, { kind: 'advice' }>
  const advice = (p: Profile, d: readonly SpotDraft[] = drafts): Advice => {
    const a = clawUpgradeAdvice(d, p)
    if (a.kind !== 'advice') throw new Error('advies verwacht')
    return a
  }
  const names = (a: Advice) => a.choices.map((c) => c.claw.name)
  const weapon = (name: string) => WARRIOR_WEAPONS.find((w) => w.name === name)!

  it('rekent met de wapens van de Warrior en nooit met Thief-claws', () => {
    const a = advice(strong({ level: 30 }), toughDrafts)
    const all = [...a.choices.map((c) => c.claw), ...a.notWearable.map((u) => u.claw)]
    expect(all.length).toBeGreaterThan(0)
    for (const c of all) {
      expect(WARRIOR_WEAPONS, c.name).toContain(c)
      expect(NPC_CLAWS.map((x) => x.name), c.name).not.toContain(c.name)
    }
  })

  it('geeft alleen wapens waar je level voor volstaat', () => {
    for (const level of [10, 15, 20, 25, 30]) {
      const a = advice(strong({ level }))
      for (const c of a.choices) expect(c.claw.level, `${c.claw.name} lv ${level}`).toBeLessThanOrEqual(level)
    }
  })

  it('telt een wapen als beter als het model er meer EXP per meso mee haalt dan met je huidige (brute force over heel de winkel)', () => {
    for (const current of [{ clawWatk: 30, weaponMult: 1.8 }, { clawWatk: 40, weaponMult: 2.6 }, { clawWatk: 55, weaponMult: 2.7 }]) {
      const p = strong({ level: 30, ...current })
      const expected = WARRIOR_WEAPONS.filter((w) => w.level <= 30 && epm(withClaw(p, w)) > epm(p)).map((w) => w.name)
      expect(names(advice(p)).sort(), JSON.stringify(current)).toEqual(expected.sort())
    }
  })

  it('neemt een wapen met MINDER weapon attack mee als zijn multiplier de schade toch verhoogt (Square Hammer 42 × 2,6 tegen 47 × 1,8)', () => {
    // De Thief-regel (alleen meer weapon attack) zou dit wapen weglaten. Het model zegt: meer schade, dus meer EXP per meso.
    const p = strong({ level: 30, str: 125, dex: 40, clawWatk: 47, weaponMult: 1.8, attackMs: 720 })
    const hammer = weapon('Square Hammer')
    expect(hammer.watk).toBeLessThan(47)
    expect(epm(withClaw(p, hammer))).toBeGreaterThan(epm(p))
    expect(names(advice(p))).toContain('Square Hammer')
  })

  it('laat een wapen met MEER weapon attack weg als het model er niet meer EXP per meso mee haalt (Gladius 47 × 1,8 tegen 40 × 2,6)', () => {
    // De Thief-regel zou Gladius wel aanbieden. Met STR 100 geeft het wapen met de hogere multiplier meer schade.
    const p = strong({ level: 30, str: 125, dex: 60, clawWatk: 40, weaponMult: 2.6 })
    const gladius = weapon('Gladius')
    expect(gladius.watk).toBeGreaterThan(40)
    expect(epm(withClaw(p, gladius), toughDrafts)).toBeLessThan(epm(p, toughDrafts))
    expect(names(advice(p, toughDrafts))).not.toContain('Gladius')
  })

  it('zet een wapen zonder genoeg STR of DEX bij de niet-draagbare, met het tekort in STR (de hoofdstat eerst)', () => {
    // Gladius vraagt STR 65 en DEX 30 (lv 30). Met STR 60 en DEX 20 ontbreken 5 STR en 10 DEX.
    const p = strong({ level: 30, str: 60, dex: 20, clawWatk: 10, weaponMult: 1 })
    const a = advice(p)
    const gladius = a.notWearable.find((u) => u.claw.name === 'Gladius')
    expect(gladius).toEqual({ claw: weapon('Gladius'), needs: [{ stat: 'str', amount: 5 }, { stat: 'dex', amount: 10 }] })
    expect(names(a)).not.toContain('Gladius')
  })

  it('kijkt bij een Warrior niet naar LUK: een hoge LUK maakt een STR-tekort niet goed', () => {
    const a = advice(strong({ level: 30, str: 60, dex: 20, luk: 500, clawWatk: 10, weaponMult: 1 }))
    const gladius = a.notWearable.find((u) => u.claw.name === 'Gladius')
    expect(gladius).toMatchObject({ needs: [{ stat: 'str', amount: 5 }, { stat: 'dex', amount: 10 }] })
  })

  it('draagt een wapen bij precies genoeg STR en DEX (Eloon 50/20), en niet bij één STR of DEX te weinig', () => {
    const eloon = weapon('Eloon')
    expect([eloon.str, eloon.dex]).toEqual([50, 20])
    const exact = strong({ level: 30, str: 50, dex: 20, clawWatk: 10, weaponMult: 1 })
    expect(epm(withClaw(exact, eloon))).toBeGreaterThan(epm(exact)) // voorwaarde: Eloon is een beter wapen
    const a = advice(exact)
    expect(a.notWearable.find((u) => u.claw.name === 'Eloon')).toBeUndefined()
    expect(names(a)).toContain('Eloon')
    for (const [str, dex, needs] of [[49, 20, [{ stat: 'str', amount: 1 }]], [50, 19, [{ stat: 'dex', amount: 1 }]]] as const) {
      const short = advice({ ...exact, str, dex })
      expect(short.notWearable.find((u) => u.claw.name === 'Eloon'), `${str}/${dex}`).toEqual({ claw: eloon, needs })
      expect(names(short)).not.toContain('Eloon')
    }
  })

  it('zet het wapen in het profiel met zijn weapon attack, tijd per aanval EN weapon multiplier (withClaw)', () => {
    const p = strong({ level: 30 })
    const gladius = weapon('Gladius')
    expect(withClaw(p, gladius)).toEqual({ ...p, clawWatk: 47, attackMs: 720, weaponMult: 1.8 })
    const axe = weapon("Fireman's Axe")
    expect(withClaw(p, axe)).toMatchObject({ clawWatk: 47, attackMs: 720, weaponMult: 1.92 })
  })

  it('laat de weapon multiplier van het profiel staan bij een Thief-claw (die heeft er geen)', () => {
    const p = strong({ weaponMult: 2.6 })
    const claw: Claw = NPC_CLAWS[0]
    expect(claw.mult).toBeUndefined()
    expect(withClaw(p, claw)).toEqual({ ...p, clawWatk: claw.watk, attackMs: claw.speed.attackMs })
  })

  it('rekent de besparing met de hand: EXP-som over de horizon, kosten zonder min met het wapen, min de prijs', () => {
    const p = strong({ level: 15, clawWatk: 20, weaponMult: 1.2 })
    const a = advice(p)
    expect(a.choices.length).toBeGreaterThan(0)
    for (const c of a.choices) {
      expect(c.saving, c.claw.name).toBeCloseTo(costOver(p, c.from, c.to) - costOver(p, c.from, c.to, (q) => withClaw(q, c.claw)), 5)
      expect(c.net, c.claw.name).toBeCloseTo(c.saving! - c.claw.price, 6)
      expect(c.from).toBe(15)
    }
  })

  describe('de horizon (het volgende wapen dat meer schade per milliseconde geeft: weapon attack × multiplier ÷ tijd)', () => {
    it('loopt voor Iron Axe (lv 20, 35 × 2,6 ÷ 750 = 0,1213) tot 24: pas Broadsword (lv 25, 45 × 2,5 ÷ 750 = 0,15) is beter', () => {
      // Mithril Axe (45 × 1,92 ÷ 750 = 0,1152), Eloon (42 × 1,8 ÷ 720 = 0,105) en Fusion Mace (41 × 1,92 ÷ 720 = 0,1093) zijn dat niet.
      const a = advice(strong({ level: 20, str: 60, dex: 20, clawWatk: 10, weaponMult: 1 }))
      const iron = a.choices.find((c) => c.claw.name === 'Iron Axe')
      expect(iron).toBeDefined()
      expect(iron).toMatchObject({ from: 20, to: 24, truncated: false })
    })

    it('kapt op lv 30 af op de laatste tabelrij en meldt dat', () => {
      const a = advice(strong({ level: 30, clawWatk: 10, weaponMult: 1 }))
      expect(a.choices.length).toBeGreaterThan(0)
      for (const c of a.choices) expect(c).toMatchObject({ from: 30, to: 30, truncated: true })
    })

    it('eindigt nooit vóór het level van de speler en nooit na het einde van de tabel (30)', () => {
      for (const level of [10, 15, 20, 25, 30]) {
        for (const c of advice(strong({ level, clawWatk: 10, weaponMult: 1 })).choices) {
          expect(c.from).toBe(level)
          expect(c.to, `${c.claw.name} lv ${level}`).toBeGreaterThanOrEqual(level)
          expect(c.to, `${c.claw.name} lv ${level}`).toBeLessThanOrEqual(30)
        }
      }
    })
  })

  it('geeft none zonder profiel, buiten de EXP-tabel of zonder "Beste"', () => {
    expect(clawUpgradeAdvice(drafts, null)).toEqual({ kind: 'none' })
    expect(clawUpgradeAdvice(drafts, strong({ level: 31 }))).toEqual({ kind: 'none' })
    expect(clawUpgradeAdvice([], strong({ level: 20 }))).toEqual({ kind: 'none' })
  })

  it('geeft geen betere wapens als het beste wapen al in je hand is', () => {
    const best = [...WARRIOR_WEAPONS].filter((w) => w.level <= 30).sort((a, b) => epm(withClaw(strong({ level: 30 }), b)) - epm(withClaw(strong({ level: 30 }), a)))[0]
    const a = advice(withClaw(strong({ level: 30 }), best))
    expect(names(a)).toEqual([])
    expect(a.winner).toBeNull()
  })

  it('verandert niets voor de Thief: dezelfde claws en dezelfde regel (meer weapon attack)', () => {
    const r = parseProfile({ ...DEFAULT_PROFILE, lukExtra: '0', level: '15', luk: '100', dex: '100', clawWatk: '10' })
    if (!('profile' in r)) throw new Error('profiel ongeldig')
    const a = advice(r.profile)
    expect(names(a)).toEqual(['Steel Titans'])
    for (const c of a.choices) expect(NPC_CLAWS).toContain(c.claw)
  })
})

describe('Warrior-armor: de winkel', () => {
  type Advice = Extract<ArmorUpgradeAdvice, { kind: 'advice' }>
  const advice = (p: Profile): Advice => {
    const a = armorUpgradeAdvice(drafts, p)
    if (a.kind !== 'advice') throw new Error('advies verwacht')
    return a
  }
  const names = (a: Advice) => a.choices.map((c) => c.armor.name)
  const armor = (name: string) => WARRIOR_ARMOR.find((x) => x.name === name)!

  it('geeft alleen hats en shoes van de Warrior: tops en broeken heeft de winkel nog niet, en nooit Thief-armor', () => {
    const a = advice(strong({ level: 30, wdef: 0 }))
    const all = [...a.choices.map((c) => c.armor), ...a.notWearable.map((u) => u.armor)]
    expect(all.length).toBeGreaterThan(0)
    for (const x of all) {
      expect(['hat', 'shoes'], x.name).toContain(x.slot)
      expect(WARRIOR_ARMOR, x.name).toContain(x)
      expect(NPC_ARMOR.map((y) => y.name), x.name).not.toContain(x.name)
    }
  })

  it('geeft op lv 10 alleen de hat van lv 10 (Bronze Koif) en nog geen shoes (die beginnen op lv 15)', () => {
    // De White Bandana (#55, geen jobregel, geen eis) is op lv 10 ook draagbaar, maar de Koif geeft voor dezelfde
    // 1.200 meso 22 WDEF tegen 15, dus de Koif wint de hat.
    expect(WARRIOR_ARMOR.find((a) => a.name === 'White Bandana')).toMatchObject({ level: 10, wdef: 15, str: 0, dex: 0, price: 1_200 })
    expect(names(advice(strong({ level: 10 })))).toEqual(['Bronze Koif'])
  })

  it('neemt shoes pas mee vanaf lv 15', () => {
    expect(names(advice(strong({ level: 14 })))).not.toContain('Bronze Grieves')
    const a15 = names(advice(strong({ level: 15 })))
    expect(a15.some((n) => ['Bronze Grieves', 'Steel Grieves'].includes(n))).toBe(true)
  })

  it('geeft per slot hoogstens één stuk', () => {
    const a = advice(strong({ level: 30 }))
    expect(new Set(a.choices.map((c) => c.armor.slot)).size).toBe(a.choices.length)
  })

  it('zet een stuk zonder genoeg STR of DEX bij de niet-draagbare, met het tekort in STR', () => {
    // Bronze Football Helmet (lv 20) vraagt STR 30 en DEX 10; met STR 25 en DEX 4 ontbreken 5 STR en 6 DEX.
    const a = advice({ ...strong({ level: 20, wdef: 0 }), str: 25, dex: 4 })
    const helm = a.notWearable.find((u) => u.armor.slot === 'hat')
    expect(helm).toMatchObject({ needs: [{ stat: 'str', amount: 5 }, { stat: 'dex', amount: 6 }] })
    expect(WARRIOR_ARMOR).toContain(helm!.armor)
    expect(helm!.armor.str).toBe(30)
    expect(helm!.armor.dex).toBe(10)
  })

  it('kijkt niet naar LUK: een hoge LUK maakt een STR-tekort niet goed', () => {
    const a = advice({ ...strong({ level: 20, wdef: 0 }), str: 25, dex: 100, luk: 500 })
    const helm = a.notWearable.find((u) => u.armor.slot === 'hat')
    expect(helm).toMatchObject({ needs: [{ stat: 'str', amount: 5 }] })
  })

  it('draagt een stuk bij precies genoeg STR en DEX en toont het dan niet als niet-draagbaar', () => {
    const a = advice({ ...strong({ level: 20, wdef: 0 }), str: 30, dex: 10 })
    expect(a.notWearable.filter((u) => u.armor.slot === 'hat')).toEqual([])
    const hat = a.choices.find((c) => c.armor.slot === 'hat')!
    expect(hat.armor.str).toBeLessThanOrEqual(30)
    expect(hat.armor.dex).toBeLessThanOrEqual(10)
  })

  it('rekent de besparing met de hand: EXP-som over de horizon, kosten zonder min met het stuk (WDEF erbij), min de prijs', () => {
    const p = strong({ level: 15, wdef: 0 })
    const a = advice(p)
    expect(a.choices.length).toBeGreaterThan(0)
    for (const c of a.choices) {
      expect(c.saving, c.armor.name).toBeCloseTo(costOver(p, c.from, c.to) - costOver(p, c.from, c.to, (q) => ({ ...q, wdef: q.wdef + c.armor.wdef })), 5)
      expect(c.net, c.armor.name).toBeCloseTo(c.saving! - c.armor.price, 6)
    }
  })

  it('loopt de horizon tot net vóór het volgende stuk met meer WDEF in dat slot (hats en shoes lv 15: tot 19)', () => {
    // Hats: Bronze Football Helmet (lv 20, WDEF 30) volgt op Bronze Full Helm (lv 15, WDEF 26). Shoes: Brown High Boots (lv 20, WDEF 21) op Bronze Grieves (lv 15, WDEF 18).
    const a = advice(strong({ level: 15, wdef: 0 }))
    expect(a.choices.length).toBeGreaterThan(0)
    for (const c of a.choices) expect(c, c.armor.name).toMatchObject({ from: 15, to: 19, truncated: false })
  })

  it('kapt op lv 30 af op de laatste tabelrij en meldt dat', () => {
    for (const c of advice(strong({ level: 30, wdef: 0 })).choices) expect(c).toMatchObject({ from: 30, to: 30, truncated: true })
  })

  it('geeft none zonder profiel of buiten de EXP-tabel', () => {
    expect(armorUpgradeAdvice(drafts, null)).toEqual({ kind: 'none' })
    expect(armorUpgradeAdvice(drafts, strong({ level: 31 }))).toEqual({ kind: 'none' })
  })

  it('rekent ook onder lv 10, nu de EXP-tabel bij lv 1 begint (issue #146)', () => {
    expect(armorUpgradeAdvice(drafts, strong({ level: 9 }))).toMatchObject({ kind: 'advice', level: 9 })
  })

  it('verandert niets voor de Thief: dezelfde winkel en de eis in LUK', () => {
    const r = parseProfile({ ...DEFAULT_PROFILE, lukExtra: '0', level: '25', luk: '35', dex: '10', str: '999' })
    if (!('profile' in r)) throw new Error('profiel ongeldig')
    const a = advice(r.profile)
    for (const c of a.choices) expect(NPC_ARMOR).toContain(c.armor)
    // STR telt voor een Thief niet mee voor de eis: de Tiberian-groep (LUK 40) kan met LUK 35 niet.
    expect(names(a)).not.toContain('Red Tiberian')
    expect(a.notWearable.some((u: { armor: ArmorPiece }) => u.armor.name === 'Red Tiberian' || u.armor.slot === 'top')).toBe(true)
  })

  it('kent de Warrior-stukken die de winkel noemt (Bronze Full Helm: lv 15, STR 20, WDEF 26)', () => {
    expect(armor('Bronze Full Helm')).toMatchObject({ level: 15, str: 20, dex: 0, wdef: 26, slot: 'hat' })
  })
})

describe('Warrior-gear in de gedeelde vorm (issue #69)', () => {
  it('houdt de STR-eis in `str` en zet niets in `luk`', () => {
    for (const [shown, data] of [...WARRIOR_WEAPONS.map((w, i) => [w, NPC_WARRIOR_WEAPONS[i]] as const), ...WARRIOR_ARMOR.map((a, i) => [a, NPC_WARRIOR_ARMOR[i]] as const)]) {
      expect(shown.name).toBe(data.name)
      expect(shown, shown.name).toMatchObject({ str: data.str, dex: data.dex })
      expect(shown, shown.name).not.toHaveProperty('luk')
    }
  })
})
