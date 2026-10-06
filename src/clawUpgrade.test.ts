import { describe, expect, it } from 'vitest'
import { pickUnder } from './best'
import { ASSUMPTIONS } from './calc/mobModel'
import { isInvalid } from './calc/rankSpots'
import { clawUpgradeAdvice, nextBetterWeapon, withClaw, type ClawUpgradeAdvice } from './clawUpgrade'
import { NPC_CLAWS } from './data/claws'
import { EXP_TABLE_LEVELS } from './data/expTable'
import { mobDraft } from './data/spots'
import { BOWMAN_WEAPONS } from './bowmanGear'
import { WARRIOR_WEAPONS } from './warriorGear'
import type { Weapon } from './data/types'
import { ATTACK_MS } from './data/thief'
import { DEFAULT_PROFILE, parseProfile, type Profile } from './profile'
import { newDraft, type SpotDraft } from './spotDraft'

const parsed = parseProfile(DEFAULT_PROFILE)
if (!('profile' in parsed)) throw new Error('voorbeeldprofiel ongeldig')
const base: Profile = parsed.profile
// Stats ruim genoeg voor elke claw, zodat alleen level en weapon attack bepalen wat een kandidaat is.
const strong = (over: Partial<Profile>): Profile => ({ ...base, dex: 100, luk: 100, ...over })

const own = (id: string, expPerHour: number, potions: number): SpotDraft => ({
  ...newDraft(id),
  name: id,
  expPerHour: String(expPerHour),
  potions: String(potions),
})
// "Beste" vraagt minstens twee plekken: de mob waarop je jaagt (Pig, #123) en een eigen plek met weinig EXP per uur.
const drafts = [{ ...mobDraft('Pig')!, id: 'a' }, own('b', 1_000, 10_000)]

const advice = (d: readonly SpotDraft[], p: Profile | null) => {
  const a = clawUpgradeAdvice(d, p)
  if (a.kind !== 'advice') throw new Error('advies verwacht')
  return a
}
const names = (a: Extract<ClawUpgradeAdvice, { kind: 'advice' }>) => a.choices.map((c) => c.claw.name)
const claw = (name: string) => NPC_CLAWS.find((c) => c.name === name)!

/** EXP per meso op de beste plek, rechtstreeks via pickUnder (niet via de module onder test). */
const epm = (p: Profile) => {
  const { ranked, bestId } = pickUnder(drafts, p, ASSUMPTIONS)
  const best = ranked.find((r) => r.spot.id === bestId)!
  if (isInvalid(best)) throw new Error('beste plek ongeldig')
  return best.expPerMeso
}

describe('clawUpgradeAdvice: wanneer er niets te rekenen valt', () => {
  it('geeft none zonder profiel, buiten de EXP-tabel of zonder "Beste"', () => {
    expect(clawUpgradeAdvice(drafts, null)).toEqual({ kind: 'none' })
    expect(clawUpgradeAdvice(drafts, { ...base, level: 31 })).toEqual({ kind: 'none' })
    expect(clawUpgradeAdvice([], strong({ level: 15, clawWatk: 10 }))).toEqual({ kind: 'none' })
  })

  it('heeft op het voorbeeldprofiel (lv 10, Garnier in de hand) geen kandidaat en geen winnaar', () => {
    expect(advice(drafts, base)).toMatchObject({ kind: 'advice', level: 10, choices: [], notWearable: [], winner: null, robust: true })
  })
})

describe('clawUpgradeAdvice: wie een kandidaat is', () => {
  it('neemt een claw pas mee vanaf zijn levelvereiste (lv 14 nog geen Steel Titans, lv 15 wel)', () => {
    expect(names(advice(drafts, strong({ level: 14, clawWatk: 10 })))).toEqual([])
    expect(names(advice(drafts, strong({ level: 15, clawWatk: 10 })))).toEqual(['Steel Titans'])
  })

  it('eist meer weapon attack dan je nu hebt (gelijk telt niet)', () => {
    expect(names(advice(drafts, strong({ level: 15, clawWatk: 13 })))).toEqual([])
    expect(names(advice(drafts, strong({ level: 15, clawWatk: 12 })))).toEqual(['Steel Titans'])
    // Met 17 in de hand blijven op lv 25 alleen de claws met meer dan 17 over.
    expect(names(advice(drafts, strong({ level: 25, clawWatk: 17 })))).toEqual(['Meba'])
  })

  it('zet een claw zonder genoeg LUK of DEX bij de niet-draagbare en rekent hem niet door', () => {
    const a = advice(drafts, { ...base, level: 15, luk: 30, dex: 10 })
    expect(a.notWearable).toEqual([{ claw: claw('Steel Titans'), needs: [{ stat: 'luk', amount: 5 }, { stat: 'dex', amount: 5 }] }])
    expect(a.choices).toEqual([])
    expect(a.winner).toBeNull()
  })

  it('noemt alleen het tekort dat er is: genoeg DEX laat DEX weg', () => {
    const a = advice(drafts, { ...base, level: 15, luk: 30, dex: 25 })
    expect(a.notWearable).toEqual([{ claw: claw('Steel Titans'), needs: [{ stat: 'luk', amount: 5 }] }])
  })

  it('draagt een claw bij precies genoeg stats (LUK 35, DEX 15 voor Steel Titans)', () => {
    const a = advice(drafts, { ...base, level: 15, luk: 35, dex: 15 })
    expect(a.notWearable).toEqual([])
    expect(names(a)).toEqual(['Steel Titans'])
  })

  it('splitst bij lv 20 in draagbaar en niet-draagbaar', () => {
    const a = advice(drafts, { ...base, level: 20, luk: 40, dex: 25 })
    expect(names(a)).toEqual(['Steel Titans'])
    expect(a.notWearable).toEqual([{ claw: claw('Steel Igor'), needs: [{ stat: 'luk', amount: 5 }] }])
  })
})

describe('clawUpgradeAdvice: het profiel met de claw in de hand', () => {
  it('zet weapon attack en tijd per aanval van de claw in het profiel en laat de rest staan', () => {
    const meba = claw('Meba')
    expect(withClaw(base, meba)).toEqual({ ...base, clawWatk: 19, attackMs: ATTACK_MS.faster3 })
    expect(withClaw(base, claw('Steel Titans')).attackMs).toBe(ATTACK_MS.fast4)
    expect(withClaw(base, claw('Garnier')).attackMs).toBe(ATTACK_MS.fast5)
  })

  it('rekent met de weapon attack van de kandidaat: 13 tegen 10 in de hand spaart mesos', () => {
    // De kandidaat rekent altijd met zijn eigen watk, de huidige claw bepaalt alleen de kosten zonder.
    const low = advice(drafts, strong({ level: 15, clawWatk: 10 })).choices[0]
    expect(low.saving!).toBeGreaterThan(0)
  })

  it('overschrijft de aanvalssnelheid van je huidige claw door die van de kandidaat', () => {
    // Steel Titans is Fast (4); de aanvalssnelheid van je huidige claw wordt overschreven.
    const slow = advice(drafts, strong({ level: 15, clawWatk: 12, attackMs: ATTACK_MS.fast5 })).choices[0]
    const fast = advice(drafts, strong({ level: 15, clawWatk: 12, attackMs: ATTACK_MS.faster3 })).choices[0]
    expect(slow.saving).toBeCloseTo(fast.saving!, 6)
  })

  it('wijst de snelheid niets toe in EXP per meso: sneller slaan geeft meer EXP per uur, niet per meso', () => {
    // Bewust vastgelegd (zie het rapport): tijd per aanval schaalt kills, EXP en kosten even hard mee.
    for (const ms of [ATTACK_MS.fast5, ATTACK_MS.fast4, ATTACK_MS.faster3]) {
      expect(epm(strong({ level: 15, clawWatk: 13, attackMs: ms }))).toBeCloseTo(epm(strong({ level: 15, clawWatk: 13, attackMs: 750 })), 9)
    }
  })
})

describe('clawUpgradeAdvice: de horizon', () => {
  it('loopt bij lv 15 voor Steel Titans van 15 tot 19 (vóór Steel Igor, lv 20)', () => {
    expect(advice(drafts, strong({ level: 15, clawWatk: 10 })).choices[0]).toMatchObject({ from: 15, to: 19, truncated: false })
  })

  it('loopt bij lv 20 voor Steel Igor van 20 tot 24 (vóór Meba, lv 25), en voor Steel Titans ook', () => {
    const a = advice(drafts, strong({ level: 20, clawWatk: 10 }))
    expect(names(a).sort()).toEqual(['Steel Igor', 'Steel Titans'])
    for (const c of a.choices) expect(c).toMatchObject({ from: 20, to: 24, truncated: false })
  })

  it('loopt bij lv 25 voor Meba van 25 tot 29 (vóór de Guards, lv 30)', () => {
    const a = advice(drafts, strong({ level: 25, clawWatk: 10 }))
    expect(names(a)).toContain('Meba')
    for (const c of a.choices) expect(c).toMatchObject({ from: 25, to: 29, truncated: false })
  })

  it('kapt bij lv 30 af op de laatste tabelrij en meldt dat', () => {
    const a = advice(drafts, strong({ level: 30, clawWatk: 10 }))
    expect(a.choices).toHaveLength(5)
    for (const c of a.choices) expect(c).toMatchObject({ from: 30, to: 30, truncated: true })
  })

  it('telt een claw met meer watk dan de kandidaat als einde, niet een claw met gelijke of minder', () => {
    // Steel Guards (22) en Adamantium Guards (23) hebben allebei req 30; vanaf lv 25 is Steel Guards het einde voor Meba.
    const a = advice(drafts, strong({ level: 25, clawWatk: 18 }))
    expect(a.choices.map((c) => c.to)).toEqual([29])
  })
})

describe('clawUpgradeAdvice: de besparing', () => {
  // De EXP-sommen zijn met de hand uit de tabel opgeteld, niet uit de module gehaald.
  const EXP_15_19 = 7_050 + 8_840 + 11_040 + 13_716 + 16_680 // 57.326
  const EXP_20_24 = 20_216 + 24_402 + 28_980 + 34_320 + 40_512 // 148.430
  const EXP_25_29 = 47_216 + 54_900 + 63_666 + 73_080 + 83_720 // 322.582

  it('is de som over de horizon van kosten zonder min kosten met, elk op de beste plek (lv 15, Steel Titans)', () => {
    const p = strong({ level: 15, clawWatk: 10 })
    const without = EXP_15_19 / epm(p)
    const withIt = EXP_15_19 / epm(withClaw(p, claw('Steel Titans')))
    const c = advice(drafts, p).choices[0]
    expect(c.saving).toBeCloseTo(without - withIt, 6)
    expect(c.saving).toBeCloseTo(45_406.5, 0) // een los getal ter controle van de som zelf (sinds #181 telt een potion alleen wat er mist)
    expect(c.net).toBeCloseTo(without - withIt - 7_000, 6)
  })

  it('geldt ook over een langere horizon: lv 20 (5 levels) en lv 25', () => {
    for (const [level, exp] of [[20, EXP_20_24], [25, EXP_25_29]] as const) {
      const p = strong({ level, clawWatk: 10 })
      const titans = advice(drafts, p).choices.find((c) => c.claw.name === 'Steel Titans')!
      expect(titans.saving).toBeCloseTo(exp / epm(p) - exp / epm(withClaw(p, claw('Steel Titans'))), 5)
    }
  })

  it('telt het huidige level vol mee: de horizon begint op het level van de speler', () => {
    const c = advice(drafts, strong({ level: 15, clawWatk: 10 })).choices[0]
    expect(c.from).toBe(15)
    expect(c.saving).toBeCloseTo(57_326 / epm(strong({ level: 15, clawWatk: 10 })) - 57_326 / epm(strong({ level: 15, clawWatk: 13 })), 6)
  })

  it('houdt de stats van nu vast over de hele horizon (alleen EXP per level verschilt)', () => {
    // lv 20 met Steel Titans: één epm op lv 20 voor alle vijf levels, niet een epm die met het level meegroeit.
    const p = strong({ level: 20, clawWatk: 10 })
    const c = advice(drafts, p).choices.find((x) => x.claw.name === 'Steel Titans')!
    expect(c.saving).toBeCloseTo(EXP_20_24 / epm(p) - EXP_20_24 / epm(withClaw(p, claw('Steel Titans'))), 5)
  })

  it('telt de verkoopwaarde van de oude claw niet mee: net = saving - prijs', () => {
    for (const c of advice(drafts, strong({ level: 25, clawWatk: 10 })).choices) expect(c.net).toBeCloseTo(c.saving! - c.claw.price, 6)
  })

  it('geeft een claw die niets oplevert besparing 0 en een negatieve netto (prijs gaat verloren)', () => {
    const c = advice(drafts, strong({ level: 15, clawWatk: 12 })).choices[0]
    expect(c.saving).toBeCloseTo(0, 6)
    expect(c.net).toBeCloseTo(-7_000, 6)
  })

  it('geeft besparing en netto null als het "zonder"-scenario onhaalbaar is (0 EXP op de beste plek)', () => {
    const a = advice([own('a', 0, 1_000), own('b', 0, 1_000)], strong({ level: 15, clawWatk: 10 }))
    expect(a.choices[0]).toMatchObject({ saving: null, net: null })
    expect(a.winner).toBeNull()
  })

  it('geeft besparing 0 als de beste plek niets kost (kosten 0 met en zonder)', () => {
    const a = advice([own('a', 1_000, 0), own('b', 500, 0)], strong({ level: 15, clawWatk: 10 }))
    expect(a.choices[0]).toMatchObject({ saving: 0, net: -7_000 })
  })

  it('heeft bij alleen eigen plekken nooit een winnaar: het profiel raakt de kosten niet', () => {
    const a = advice([own('a', 40_000, 10_000), own('b', 30_000, 10_000)], strong({ level: 15, clawWatk: 10 }))
    expect(a).toMatchObject({ winner: null, robust: true })
    for (const c of a.choices) expect(c.saving).toBe(0)
  })
})

describe('clawUpgradeAdvice: winnaar en robuustheid', () => {
  it('kiest de claw met de grootste netto besparing boven 0 en zet de lijst op netto, aflopend', () => {
    const a = advice(drafts, strong({ level: 25, clawWatk: 10 }))
    expect(a.winner).toBe(claw('Steel Titans'))
    expect(a.winner).toBe(a.choices[0].claw)
    expect(a.choices[0].net!).toBeGreaterThan(0)
    const nets = a.choices.map((c) => c.net!)
    expect(nets).toEqual([...nets].sort((x, y) => y - x))
  })

  it('kiest de goedkope claw als de dure hetzelfde bespaart (watk 13 en 17 geven hier dezelfde EXP per meso)', () => {
    const a = advice(drafts, strong({ level: 20, clawWatk: 10 }))
    expect(a.winner?.name).toBe('Steel Titans')
    expect(a.choices[0].saving).toBeCloseTo(a.choices[1].saving!, 6)
  })

  it('heeft geen winnaar als geen enkele claw zich terugverdient (netto onder 0)', () => {
    // Lv 24 met 12 in de hand op Axe Stumps: Steel Igor spaart ongeveer 13.036, maar kost 14.100.
    const a = advice([{ ...mobDraft('Axe Stump')!, id: 'a' }, own('b', 1_000, 10_000)], strong({ level: 24, clawWatk: 12 }))
    const igor = a.choices.find((c) => c.claw.name === 'Steel Igor')!
    expect(igor.saving!).toBeGreaterThan(0)
    expect(igor.net!).toBeLessThan(0)
    expect(a.winner).toBeNull()
  })

  it('heeft geen winnaar zonder kandidaten', () => {
    expect(advice(drafts, base).winner).toBeNull()
  })

  it('meldt robust true als dezelfde claw wint onder elke aannamevariant', () => {
    expect(advice(drafts, strong({ level: 15, clawWatk: 10 })).robust).toBe(true)
  })

  it('meldt robust false als een andere claw wint zodra één aanname naar de rand gaat', () => {
    // Lv 30 met 10 in de hand wint Steel Titans (netto ongeveer 4.213) op de Pig. De eigen plek (10.000 EXP voor 11.000 aan
    // potions) ligt er net onder; als je vaker geraakt wordt (contactsPerKill 0,6) wint die, en spaart geen claw iets.
    const a = advice([{ ...mobDraft('Pig')!, id: 'a' }, own('b', 10_000, 11_000)], strong({ level: 30, clawWatk: 10 }))
    expect(a.winner).toBe(claw('Steel Titans'))
    expect(a.robust).toBe(false)
  })
})

describe('clawUpgradeAdvice: het eerstvolgende betere wapen (next)', () => {
  const adv = (_d: readonly SpotDraft[], p: Profile) => nextBetterWeapon(p)
  const lastLevel = Math.max(...EXP_TABLE_LEVELS)

  it('noemt bij een Thief op lv 10 met een Garnier-aanval (10) de Steel Titans vanaf lv 15, niet de Garnier zelf', () => {
    // Garnier is lv 10: wie op lv 10 staat kan hem al dragen, dus "volgende" begint bij een hoger level.
    expect(adv(drafts, strong({ level: 10, clawWatk: 10 }))?.name).toBe('Steel Titans')
    expect(adv(drafts, strong({ level: 10, clawWatk: 10 }))?.level).toBe(15)
  })

  it('slaat bij een Thief wapens over die niet meer weapon attack geven dan wat je draagt', () => {
    // Met 17 ATT is Steel Igor (17) niet beter: de volgende betere is Meba (19) op lv 25.
    expect(adv(drafts, strong({ level: 12, clawWatk: 17 }))?.name).toBe('Meba')
    // De Thief-regel is alleen watk: een tragere claw met hogere watk telt.
    expect(adv(drafts, strong({ level: 10, clawWatk: 0 }))?.name).toBe('Steel Titans')
  })

  it('geeft niets meer als er geen betere claw boven je level of je aanval komt', () => {
    // Op lv 30 zijn alle claws te dragen (level <= 30), dus er is geen "volgende" meer.
    expect(adv(drafts, strong({ level: lastLevel, clawWatk: 10 }))).toBeNull()
    // Op lv 25 met de beste claw (Adamantium Guards, 23): Steel Guards (22) is niet beter, Adamantium (23) is gelijk.
    expect(adv(drafts, strong({ level: 25, clawWatk: 23 }))).toBeNull()
  })

  it('kiest bij een Thief op lv 25 met 19 ATT de eerste betere: Steel Guards (22) vóór Adamantium Guards (23)', () => {
    expect(adv(drafts, strong({ level: 25, clawWatk: 19 }))?.name).toBe('Steel Guards')
  })

  // De Warrior en de Bowman rekenen "beter" als meer schade per ms (watk x mult / aanvalstijd), niet alleen watk.
  const power = (w: Weapon) => (w.watk * (w.mult ?? 1)) / w.speed.attackMs
  const wearing = (base: Profile, w: Weapon, level: number): Profile => ({ ...base, level, clawWatk: w.watk, attackMs: w.speed.attackMs, ...(w.mult !== undefined ? { weaponMult: w.mult } : {}) })
  const expectedNext = (shop: readonly Weapon[], worn: Weapon, level: number) => shop.find((c) => c.level > level && power(c) > power(worn)) ?? null

  for (const [job, shop] of [['warrior', WARRIOR_WEAPONS], ['bowman', BOWMAN_WEAPONS]] as const) {
    it(`volgt bij een ${job} de regel meer schade per ms: het eerste duurdere wapen boven je level dat meer power geeft`, () => {
      const r = parseProfile({ ...DEFAULT_PROFILE, lukExtra: '0', level: '20', hp: '800', str: '90', dex: '80', luk: '4', clawWatk: '30', attackMs: '810', accuracy: '60', avoid: '10', wdef: '60' }, job)
      if (!('profile' in r)) throw new Error('profiel ongeldig')
      const lowest = shop[0]
      const level = lowest.level
      const p = wearing(r.profile, lowest, level)
      const got = adv(drafts, p)
      expect(got).toEqual(expectedNext(shop, lowest, level))
      expect(got).not.toBeNull()
      expect(got!.level).toBeGreaterThan(level)
      expect(power(got!)).toBeGreaterThan(power(lowest))
    })

    it(`geeft bij een ${job} met het sterkste wapen van de winkel op het hoogste level geen volgend wapen`, () => {
      const r = parseProfile({ ...DEFAULT_PROFILE, lukExtra: '0', level: '20', hp: '800', str: '90', dex: '80', luk: '4', clawWatk: '30', attackMs: '810', accuracy: '60', avoid: '10', wdef: '60' }, job)
      if (!('profile' in r)) throw new Error('profiel ongeldig')
      const strongest = shop.reduce((a, b) => (power(b) > power(a) ? b : a))
      expect(adv(drafts, wearing(r.profile, strongest, lastLevel))).toBeNull()
    })
  }
})

describe('nextBetterWeapon (rechtstreeks, uit het profiel alleen)', () => {
  it('noemt voor een Thief op lv 9 met een zwak wapen de Garnier vanaf lv 10, en rekent op lv 9 nu ook het advies uit (issue #146)', () => {
    expect(clawUpgradeAdvice(drafts, strong({ level: 9, clawWatk: 5 }))).toMatchObject({ kind: 'advice', level: 9 })
    expect(nextBetterWeapon(strong({ level: 9, clawWatk: 5 }))).toMatchObject({ name: 'Garnier', level: 10 })
  })

  it('geeft op lv 10 niet meer de Garnier maar de eerste claw boven je level die meer ATT geeft', () => {
    expect(nextBetterWeapon(strong({ level: 10, clawWatk: 5 }))?.name).toBe('Steel Titans')
    expect(nextBetterWeapon(strong({ level: 10, clawWatk: 13 }))?.name).toBe('Steel Igor')
  })

  it('geeft null als je niets beters boven je level meer kunt krijgen', () => {
    expect(nextBetterWeapon(strong({ level: 9, clawWatk: 23 }))).toBeNull()
    expect(nextBetterWeapon(strong({ level: 30, clawWatk: 1 }))).toBeNull()
  })

  it('laat het weaponMult-veld van een Bowman buiten beschouwing: zijn bogen hebben geen multiplier', () => {
    const r = parseProfile({ ...DEFAULT_PROFILE, lukExtra: '0', level: '20', hp: '800', str: '20', dex: '80', luk: '4', clawWatk: '30', attackMs: '810', accuracy: '60', avoid: '10', wdef: '60' }, 'bowman')
    if (!('profile' in r)) throw new Error('profiel ongeldig')
    const first = BOWMAN_WEAPONS[0]
    const worn: Profile = { ...r.profile, level: first.level, clawWatk: first.watk, attackMs: first.speed.attackMs, weaponMult: 1.8 }
    const next = nextBetterWeapon(worn)
    expect(next).not.toBeNull()
    expect(next).toEqual(nextBetterWeapon({ ...worn, weaponMult: 1 }))
    expect(next!.level).toBeGreaterThan(first.level)
  })

  it('telt bij een Warrior wel de multiplier uit het profiel mee', () => {
    const r = parseProfile({ ...DEFAULT_PROFILE, lukExtra: '0', level: '20', hp: '800', str: '90', dex: '20', luk: '4', clawWatk: '30', attackMs: '810', accuracy: '60', avoid: '10', wdef: '60' }, 'warrior')
    if (!('profile' in r)) throw new Error('profiel ongeldig')
    const first = WARRIOR_WEAPONS[0]
    const worn: Profile = { ...r.profile, level: first.level, clawWatk: first.watk, attackMs: first.speed.attackMs, weaponMult: first.mult ?? 1 }
    const huge: Profile = { ...worn, weaponMult: 5 }
    // Een enorme multiplier maakt wat je draagt onovertroffen: er komt geen beter wapen meer.
    expect(nextBetterWeapon(huge)).toBeNull()
  })
})

describe('clawUpgradeAdvice over alleen dit level (#188)', () => {
  it('telt de besparing alleen op je huidige level, en nooit meer dan tot je volgende upgrade', () => {
    const p = strong({ level: 15 })
    const upgrade = clawUpgradeAdvice(drafts, p) as Extract<ClawUpgradeAdvice, { kind: 'advice' }>
    const level = clawUpgradeAdvice(drafts, p, 'this-level') as Extract<ClawUpgradeAdvice, { kind: 'advice' }>
    expect(level.kind).toBe('advice')
    expect(level.choices.length).toBeGreaterThan(0)
    for (const c of level.choices) {
      expect([c.from, c.to, c.truncated]).toEqual([15, 15, false])
      const same = upgrade.choices.find((u) => u.claw === c.claw)!
      if (same.saving !== null && c.saving !== null) expect(c.saving).toBeLessThanOrEqual(same.saving)
    }
    // Een winnaar over één level is er alleen als die op dat level al meer bespaart dan hij kost.
    if (level.winner) expect(level.choices[0].net!).toBeGreaterThan(0)
  })
})
