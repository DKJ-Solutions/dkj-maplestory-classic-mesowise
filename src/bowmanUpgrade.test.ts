// De upgrade-adviezen (boog of kruisboog, en armor) voor een Bowman (issue #44, stap 2) en de winkel van bowmanGear.ts.
// De Thief- en Warrior-uitkomsten staan in clawUpgrade.test.ts, armorUpgrade.test.ts en warriorUpgrade.test.ts en
// blijven daar ongewijzigd; hier alleen wat de Bowman anders doet: de winkel is die van bowmanGear.ts, de eis is STR en
// DEX (elke eis in zijn eigen stat, #69), een wapen telt als "beter" volgens het model.
import { describe, expect, it } from 'vitest'
import { armorUpgradeAdvice, type ArmorUpgradeAdvice } from './armorUpgrade'
import { BOWMAN_ARMOR, BOWMAN_WEAPONS, BRONZE_ARROW, PLAIN_ARROW, WORN_BOWMAN_ARMOR } from './bowmanGear'
import { ASSUMPTIONS } from './calc/mobModel'
import { clawUpgradeAdvice, withClaw, type ClawUpgradeAdvice } from './clawUpgrade'
import { NPC_ARMOR } from './data/armor'
import { GENDERED_WORN_BOWMAN_ARMOR, HELPFUL_STRANGER_ARROWS, NPC_ARROWS, NPC_BOWMAN_ARMOR, NPC_BOWMAN_WEAPONS } from './data/bowman'
import { NPC_CLAWS } from './data/claws'
import { mobDraft } from './data/spots'
import { COMMON_WORN_ARMOR } from './data/wornItems'
import { bestExpPerMeso } from './bestExpPerMeso'
import { growthOf } from './growth'
import { DEFAULT_PROFILE, parseProfile, type Profile } from './profile'
import { newDraft, type SpotDraft } from './spotDraft'
import { WARRIOR_ARMOR, WARRIOR_WEAPONS } from './warriorGear'

const parseB = (over: Partial<typeof DEFAULT_PROFILE>): Profile => {
  const r = parseProfile({ ...DEFAULT_PROFILE, lukExtra: '0', str: '100', dex: '100', luk: '4', clawWatk: '20', attackMs: '810', hp: '1000', accuracy: '100', avoid: '20', wdef: '50', ...over }, 'bowman')
  if (!('profile' in r)) throw new Error('Bowman-profiel ongeldig')
  return r.profile
}
/** Een Bowman met stats ruim genoeg voor elk item, zodat alleen level en wapen of armor bepalen wat een kandidaat is. */
const strong = (over: Partial<Profile> = {}): Profile => ({ ...parseB({}), ...over })

const own = (id: string, expPerHour: number, potions: number): SpotDraft => ({ ...newDraft(id), name: id, expPerHour: String(expPerHour), potions: String(potions) })
const drafts = [{ ...mobDraft('Ribbon Pig')!, id: 'a' }, own('b', 1_000, 10_000)]

/** EXP per meso op de beste plek, via bestExpPerMeso (niet via de module onder test). */
const epm = (p: Profile) => {
  const v = bestExpPerMeso(drafts, p, ASSUMPTIONS)
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

describe('bowmanGear: de data van de Bowman in de vorm van de Thief-lijsten', () => {
  it('zet elke boog en kruisboog om met zijn STR in het veld str, en houdt tijd, prijs en bron', () => {
    expect(BOWMAN_WEAPONS).toHaveLength(NPC_BOWMAN_WEAPONS.length)
    for (const w of NPC_BOWMAN_WEAPONS) {
      const c = BOWMAN_WEAPONS.find((x) => x.name === w.name)!
      expect(c, w.name).toEqual({ name: w.name, level: w.level, watk: w.watk, speed: w.speed, str: w.str, dex: w.dex, price: w.price, source: w.source })
      expect(c.mult, w.name).toBeUndefined()
    }
    // De Balanche heeft 840 ms (issue #44), niet de 810 van Normal (6) in de gedeelde tabel.
    expect(BOWMAN_WEAPONS.find((w) => w.name === 'Balanche')).toMatchObject({ level: 20, watk: 39, str: 10, dex: 45, speed: { attackMs: 840 } })
  })

  it('zet de wapens op level, zodat de horizon het eerstvolgende level pakt', () => {
    const levels = BOWMAN_WEAPONS.map((w) => w.level)
    expect(levels).toEqual([...levels].sort((a, b) => a - b))
  })

  it('zet elk stuk armor om met STR in het veld str', () => {
    expect(BOWMAN_ARMOR).toHaveLength(NPC_BOWMAN_ARMOR.length)
    expect(BOWMAN_ARMOR.find((a) => a.name === 'Hunter')).toMatchObject({ slot: 'hat', level: 25, str: 15, dex: 40, wdef: 24, price: 4_500 })
    expect(BOWMAN_ARMOR.map((a) => a.slot)).not.toContain('overall')
  })

  it('geeft de items zonder jobregel erbij die geen winkelstuk van de Bowman zijn, zonder een rij te kopiëren', () => {
    const npc = new Set(BOWMAN_ARMOR.map((a) => a.name))
    for (const a of WORN_BOWMAN_ARMOR) {
      expect(npc.has(a.name), a.name).toBe(false)
      expect([...COMMON_WORN_ARMOR, ...GENDERED_WORN_BOWMAN_ARMOR]).toContain(a)
    }
    expect(WORN_BOWMAN_ARMOR.length).toBeGreaterThan(0)
  })

  it('geeft de Brown Able Skirt (1191) en Grey Able Skirt (1192) erbij, voor vrouwen, en houdt het geslacht op de Green Able Armor Skirt (#107)', () => {
    for (const n of ['Brown Able Skirt', 'Grey Able Skirt']) {
      expect(WORN_BOWMAN_ARMOR.find((a) => a.name === n), n).toMatchObject({ slot: 'bottom', level: 15, wdef: 20, gender: 'female' })
    }
    expect(GENDERED_WORN_BOWMAN_ARMOR.every((a) => WORN_BOWMAN_ARMOR.includes(a))).toBe(true)
    expect(BOWMAN_ARMOR.filter((a) => a.gender !== undefined).map((a) => [a.name, a.gender])).toEqual([['Green Able Armor Skirt', 'female']])
  })

  it('rekent met één pijl: de gewone pijlen voor bogen en kruisbogen zijn gelijk (0 ATT en 1 meso), dus de keuze maakt niets uit', () => {
    expect(NPC_ARROWS).toHaveLength(2)
    for (const a of NPC_ARROWS) expect(a, a.name).toMatchObject({ watk: PLAIN_ARROW.watk, pricePerArrow: PLAIN_ARROW.pricePerArrow })
    expect(PLAIN_ARROW).toMatchObject({ watk: 0, pricePerArrow: 1 })
  })

  it('heeft bij Helpful Stranger twee bronze pijlen die voor bogen en kruisbogen gelijk zijn (+1 ATT en 2 meso)', () => {
    expect(HELPFUL_STRANGER_ARROWS).toHaveLength(2)
    for (const a of HELPFUL_STRANGER_ARROWS) expect(a, a.name).toMatchObject({ watk: BRONZE_ARROW.watk, pricePerArrow: BRONZE_ARROW.pricePerArrow })
    expect(BRONZE_ARROW).toMatchObject({ watk: 1, pricePerArrow: 2 })
  })
})

describe('Bowman-wapens: de winkel', () => {
  type Advice = Extract<ClawUpgradeAdvice, { kind: 'advice' }>
  const advice = (p: Profile): Advice => {
    const a = clawUpgradeAdvice(drafts, p)
    if (a.kind !== 'advice') throw new Error('advies verwacht')
    return a
  }
  const names = (a: Advice) => a.choices.map((c) => c.claw.name)
  const weapon = (name: string) => BOWMAN_WEAPONS.find((w) => w.name === name)!

  it('rekent met de bogen en kruisbogen van de Bowman en nooit met claws of Warrior-wapens', () => {
    const a = advice(strong({ level: 30 }))
    const all = [...a.choices.map((c) => c.claw), ...a.notWearable.map((u) => u.claw)]
    expect(all.length).toBeGreaterThan(0)
    for (const c of all) {
      expect(BOWMAN_WEAPONS, c.name).toContain(c)
      expect(NPC_CLAWS.map((x) => x.name), c.name).not.toContain(c.name)
      expect(WARRIOR_WEAPONS.map((x) => x.name), c.name).not.toContain(c.name)
    }
  })

  it('geeft alleen wapens waar je level voor volstaat', () => {
    for (const level of [10, 15, 20, 25, 30]) {
      for (const c of advice(strong({ level })).choices) expect(c.claw.level, `${c.claw.name} lv ${level}`).toBeLessThanOrEqual(level)
    }
  })

  it('telt een wapen als beter als het model er meer EXP per meso mee haalt dan met je huidige (brute force over heel de winkel)', () => {
    for (const current of [{ clawWatk: 10 }, { clawWatk: 30 }, { clawWatk: 44 }]) {
      const p = strong({ level: 30, ...current })
      const expected = BOWMAN_WEAPONS.filter((w) => w.level <= 30 && epm(withClaw(p, w)) > epm(p)).map((w) => w.name)
      expect(names(advice(p)).sort(), JSON.stringify(current)).toEqual(expected.sort())
    }
  })

  it('zet het wapen in het profiel met zijn weapon attack en tijd per aanval, en laat de weapon multiplier staan (withClaw)', () => {
    const p = strong({ level: 30, weaponMult: 2.6 })
    expect(withClaw(p, weapon('Balanche'))).toEqual({ ...p, clawWatk: 39, attackMs: 840 })
  })

  it('zet een wapen zonder genoeg STR of DEX bij de niet-draagbare, met het tekort per stat, DEX eerst', () => {
    // De Balanche (lv 20) vraagt STR 10 en DEX 45. Met STR 5 en DEX 40 ontbreken 5 STR en 5 DEX.
    const p = strong({ level: 20, str: 5, dex: 40, clawWatk: 5 })
    const a = advice(p)
    expect(a.notWearable.find((u) => u.claw.name === 'Balanche')).toEqual({ claw: weapon('Balanche'), needs: [{ stat: 'dex', amount: 5 }, { stat: 'str', amount: 5 }] })
    expect(names(a)).not.toContain('Balanche')
  })

  it('kijkt bij een Bowman niet naar LUK, en een hoge DEX maakt een STR-tekort niet goed', () => {
    const a = advice(strong({ level: 20, str: 5, dex: 500, luk: 500, clawWatk: 5 }))
    expect(a.notWearable.find((u) => u.claw.name === 'Balanche')).toMatchObject({ needs: [{ stat: 'str', amount: 5 }] })
  })

  it('draagt een wapen bij precies genoeg STR en DEX (Balanche 10/45), en niet bij één STR of DEX te weinig', () => {
    const exact = strong({ level: 20, str: 10, dex: 45, clawWatk: 5 })
    expect(epm(withClaw(exact, weapon('Balanche')))).toBeGreaterThan(epm(exact)) // voorwaarde: de Balanche is beter dan 5 ATT
    expect(advice(exact).notWearable.find((u) => u.claw.name === 'Balanche')).toBeUndefined()
    expect(names(advice(exact))).toContain('Balanche')
    for (const [str, dex, needs] of [[9, 45, [{ stat: 'str', amount: 1 }]], [10, 44, [{ stat: 'dex', amount: 1 }]]] as const) {
      const short = advice({ ...exact, str, dex })
      expect(short.notWearable.find((u) => u.claw.name === 'Balanche'), `${str}/${dex}`).toEqual({ claw: weapon('Balanche'), needs })
      expect(names(short)).not.toContain('Balanche')
    }
  })

  it('rekent de besparing met de hand: EXP-som over de horizon, kosten zonder min met het wapen, min de prijs', () => {
    const p = strong({ level: 15, clawWatk: 10 })
    const a = advice(p)
    expect(a.choices.length).toBeGreaterThan(0)
    for (const c of a.choices) {
      expect(c.saving, c.claw.name).toBeCloseTo(costOver(p, c.from, c.to) - costOver(p, c.from, c.to, (q) => withClaw(q, c.claw)), 5)
      expect(c.net, c.claw.name).toBeCloseTo(c.saving! - c.claw.price, 6)
      expect(c.from).toBe(15)
    }
  })

  describe('de horizon (het volgende wapen dat meer schade per milliseconde geeft: weapon attack ÷ tijd)', () => {
    it('loopt vanaf elk level van een winkelstap (10, 15, 20, 25) tot net vóór de volgende stap, boog en kruisboog allebei', () => {
      // Per stap is er een wapen met meer weapon attack ÷ tijd: War Bow 30 ÷ 810 = 0,0370 en Crossbow 32 ÷ 870 = 0,0368 (lv 10),
      // dan Composite Bow 35 ÷ 810 = 0,0432 (lv 15), Hunter's Bow 42 ÷ 810 = 0,0519 (lv 20), Battle Bow 44 ÷ 750 = 0,0587 (lv 25)
      // en Ryden 50 ÷ 810 = 0,0617 (lv 30). Elk is beter dan alles op het level ervoor, ook de Mountain Crossbow (47 ÷ 870 = 0,0540).
      for (const level of [10, 15, 20, 25]) {
        const a = advice(strong({ level, clawWatk: 5 }))
        expect(a.choices.length, `lv ${level}`).toBeGreaterThan(0)
        for (const c of a.choices) expect(c, `${c.claw.name} lv ${level}`).toMatchObject({ from: level, to: level + 4, truncated: false })
      }
    })

    it('kapt op lv 30 af op de laatste tabelrij en meldt dat', () => {
      const a = advice(strong({ level: 30, clawWatk: 5 }))
      expect(a.choices.length).toBeGreaterThan(0)
      for (const c of a.choices) expect(c).toMatchObject({ from: 30, to: 30, truncated: true })
    })
  })

  it('geeft none zonder profiel, buiten de EXP-tabel of zonder "Beste"', () => {
    expect(clawUpgradeAdvice(drafts, null)).toEqual({ kind: 'none' })
    expect(clawUpgradeAdvice(drafts, strong({ level: 31 }))).toEqual({ kind: 'none' })
    expect(clawUpgradeAdvice([], strong({ level: 20 }))).toEqual({ kind: 'none' })
  })

  it('geeft geen betere wapens als het beste wapen al in je hand is', () => {
    const p = strong({ level: 30 })
    const best = [...BOWMAN_WEAPONS].sort((a, b) => epm(withClaw(p, b)) - epm(withClaw(p, a)))[0]
    const a = advice(withClaw(p, best))
    expect(names(a)).toEqual([])
    expect(a.winner).toBeNull()
  })
})

describe('Bowman-armor: de winkel', () => {
  type Advice = Extract<ArmorUpgradeAdvice, { kind: 'advice' }>
  const advice = (p: Profile): Advice => {
    const a = armorUpgradeAdvice(drafts, p)
    if (a.kind !== 'advice') throw new Error('advies verwacht')
    return a
  }
  const names = (a: Advice) => a.choices.map((c) => c.armor.name)

  it('geeft hats, tops, bottoms en shoes van de Bowman en nooit armor van een andere klas', () => {
    const a = advice(strong({ level: 30, wdef: 0 }))
    const all = [...a.choices.map((c) => c.armor), ...a.notWearable.map((u) => u.armor)]
    expect(new Set(all.map((x) => x.slot))).toEqual(new Set(['hat', 'top', 'bottom', 'shoes']))
    for (const x of all) {
      expect(BOWMAN_ARMOR, x.name).toContain(x)
      expect(WARRIOR_ARMOR.some((y) => y.name === x.name && y !== x) || NPC_ARMOR.some((y) => y.name === x.name && y.price !== x.price), x.name).toBe(false)
    }
  })

  it('geeft op lv 10 van elk slot het stuk van lv 10, en per slot hoogstens één stuk', () => {
    const a = advice(strong({ level: 10, wdef: 0 }))
    expect([...a.choices.map((c) => c.armor.slot)].sort()).toEqual(['bottom', 'hat', 'shoes', 'top'])
    expect(names(a)).toEqual(expect.arrayContaining(['Archer Top / Avelin', 'Archer Pants', 'Hard Leather Boots']))
  })

  it('zet een stuk zonder genoeg STR of DEX bij de niet-draagbare, met het tekort per stat, DEX eerst', () => {
    // De Robin Hat (lv 20) vraagt STR 10 en DEX 30; met STR 5 en DEX 20 ontbreken 5 STR en 10 DEX.
    const a = advice({ ...strong({ level: 20, wdef: 0 }), str: 5, dex: 20 })
    const hat = a.notWearable.find((u) => u.armor.slot === 'hat')
    expect(hat).toMatchObject({ needs: [{ stat: 'dex', amount: 10 }, { stat: 'str', amount: 5 }] })
    expect(hat!.armor).toMatchObject({ name: 'Robin Hat', str: 10, dex: 30 })
  })

  it('kijkt niet naar LUK: een hoge LUK maakt een STR-tekort niet goed', () => {
    const a = advice({ ...strong({ level: 20, wdef: 0 }), str: 5, dex: 100, luk: 500 })
    expect(a.notWearable.find((u) => u.armor.slot === 'hat')).toMatchObject({ needs: [{ stat: 'str', amount: 5 }] })
  })

  it('draagt een stuk bij precies genoeg STR en DEX en toont het dan niet als niet-draagbaar', () => {
    const a = advice({ ...strong({ level: 20, wdef: 0 }), str: 10, dex: 30 })
    expect(a.notWearable.filter((u) => u.armor.slot === 'hat')).toEqual([])
    // Eén STR of DEX minder, en de Robin Hat is niet meer te dragen.
    expect(advice({ ...strong({ level: 20, wdef: 0 }), str: 9, dex: 30 }).notWearable.find((u) => u.armor.slot === 'hat')).toMatchObject({ needs: [{ stat: 'str', amount: 1 }] })
    expect(advice({ ...strong({ level: 20, wdef: 0 }), str: 10, dex: 29 }).notWearable.find((u) => u.armor.slot === 'hat')).toMatchObject({ needs: [{ stat: 'dex', amount: 1 }] })
  })

  it('geeft alleen een vrouwelijke Bowman vanaf level 15 de Green Able Armor Skirt; een man of een Bowman zonder geslacht nooit (#107)', () => {
    const SKIRT = 'Green Able Armor Skirt'
    const shown = (a: Advice) => [...a.choices.map((c) => c.armor.name), ...a.notWearable.map((u) => u.armor.name)]
    // Met DEX 0 is elk stuk met een DEX-eis niet-draagbaar, dus de rok staat dan zeker in de lijst als hij er voor je is.
    const bare = (level: number, gender: 'male' | 'female' | null) => advice({ ...strong({ level, wdef: 0, gender: gender ?? undefined }), str: 0, dex: 0 })
    // De niet-draagbare lijst heeft per slot het beste stuk, dus de rok staat er op level 15 in (op 20 wint de Hard Leather Pants).
    expect(shown(bare(15, 'female'))).toContain(SKIRT)
    for (const level of [15, 20, 30]) {
      for (const g of ['male', null] as const) {
        expect(shown(bare(level, g)), `${g} lv ${level}`).not.toContain(SKIRT)
        expect(shown(advice(strong({ level, wdef: 0, gender: g ?? undefined }))), `${g} lv ${level}`).not.toContain(SKIRT)
      }
    }
    // Onder level 15 is de rok er voor niemand, ook niet voor een vrouw.
    expect(shown(bare(14, 'female'))).not.toContain(SKIRT)
    // De rok vraagt DEX 20: met precies genoeg DEX is hij draagbaar, met één minder niet.
    const skirt = (dex: number) => advice({ ...strong({ level: 15, wdef: 0, gender: 'female' }), str: 100, dex })
    expect(skirt(19).notWearable.find((u) => u.armor.name === SKIRT)).toMatchObject({ needs: [{ stat: 'dex', amount: 1 }] })
    expect(skirt(20).notWearable.map((u) => u.armor.name)).not.toContain(SKIRT)
    // Draagt ze al een broek met 17 WDEF (de Archer Pants), dan is de rok het enige bottom-stuk dat nog een upgrade is; een man heeft er geen.
    const worn = (g: 'male' | 'female' | null) => armorUpgradeAdvice(drafts, { ...strong({ level: 15, wdef: 0, gender: g ?? undefined }), str: 100, dex: 100 }, { bottom: 17 })
    const bottomOf = (g: 'male' | 'female' | null) => {
      const a = worn(g)
      if (a.kind !== 'advice') throw new Error('advies verwacht')
      return a.choices.find((c) => c.armor.slot === 'bottom')?.armor.name
    }
    expect(bottomOf('female')).toBe(SKIRT)
    expect(bottomOf('male')).toBeUndefined()
    expect(bottomOf(null)).toBeUndefined()
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

  it('loopt de horizon tot net vóór het volgende stuk met meer WDEF in dat slot (lv 15: tot 19)', () => {
    // Hat: Feather Hat (lv 15, WDEF 18) tegen Robin Hat (lv 20, 21). Top: Leather Hoodwear (28) tegen Hard Leather Top (32).
    // Shoes: Woodsman Boots (12) tegen Huntertop (14). Bottoms hebben geen stuk van lv 15 (zie data/bowman.ts), dus daar
    // loopt het stuk van lv 10 (Archer Pants, 17) tot de Hard Leather Pants van lv 20 (23).
    const a = advice(strong({ level: 15, wdef: 0 }))
    for (const c of a.choices) expect(c, c.armor.name).toMatchObject({ from: 15, to: 19, truncated: false })
  })

  it('kapt op lv 30 af op de laatste tabelrij en meldt dat', () => {
    for (const c of advice(strong({ level: 30, wdef: 0 })).choices) expect(c).toMatchObject({ from: 30, to: 30, truncated: true })
  })

  it('geeft none zonder profiel of buiten de EXP-tabel', () => {
    expect(armorUpgradeAdvice(drafts, null)).toEqual({ kind: 'none' })
    expect(armorUpgradeAdvice(drafts, strong({ level: 31 }))).toEqual({ kind: 'none' })
  })
})
