import { describe, expect, it } from 'vitest'
import { rankSpots } from './calc/rankSpots'
import { findKnownSpot, knownSpotPatch } from './data/spots'
import { LUCKY_SEVEN_LEVELS } from './data/thief'
import { DEFAULT_PROFILE, parseProfile, type Profile } from './profile'
import { newDraft, toSpot } from './spotDraft'
import { HP_POTION, hourPlan, isEstimated, luckySevenAt, MP_POTION, pickMonster, resolveSpot, suggestMonsters } from './suggest'

const parsed = parseProfile(DEFAULT_PROFILE)
if (!('profile' in parsed)) throw new Error('voorbeeldprofiel ongeldig')
const profile: Profile = parsed.profile

const subway = findKnownSpot('kerning-subway-line-1-area-1')!
const perionEast = findKnownSpot('perion-east-domain')!

describe('luckySevenAt', () => {
  it('geeft de waarden van de skillpagina, niet geïnterpoleerd', () => {
    expect(luckySevenAt(1)).toEqual({ level: 1, mp: 8, damagePct: 60 })
    // Het oude model interpoleerde lv 3 naar 9 MP; de skillpagina zegt 8.
    expect(luckySevenAt(3)).toEqual({ level: 3, mp: 8, damagePct: 68 })
    expect(luckySevenAt(10)).toEqual({ level: 10, mp: 11, damagePct: 96 })
    expect(luckySevenAt(20)).toEqual({ level: 20, mp: 16, damagePct: 140 })
  })

  it('is null op level 0, en klemt boven 20 op 20', () => {
    expect(luckySevenAt(0)).toBeNull()
    expect(luckySevenAt(25)).toEqual(luckySevenAt(20))
  })

  it('heeft 20 levels met oplopende schade', () => {
    expect(LUCKY_SEVEN_LEVELS).toHaveLength(20)
    for (let i = 1; i < 20; i++) expect(LUCKY_SEVEN_LEVELS[i].damagePct).toBeGreaterThan(LUCKY_SEVEN_LEVELS[i - 1].damagePct)
  })
})

describe('de goedkoopste potions', () => {
  it('zijn Orange (150 voor 250 HP) en Blue (220 voor 200 MP)', () => {
    expect(HP_POTION.name).toBe('Orange Potion')
    expect(MP_POTION.name).toBe('Blue Potion')
  })
})

describe('suggestMonsters en pickMonster', () => {
  it('rekent elk monster van de plek door, van meeste naar minste EXP per uur', () => {
    const s = suggestMonsters(profile, perionEast)
    expect(s).toHaveLength(perionEast.monsters.length)
    for (let i = 1; i < s.length; i++) expect(s[i].expPerHour).toBeLessThanOrEqual(s[i - 1].expPerHour)
    for (const x of s) {
      expect(Number.isFinite(x.estimate.killsPerHour)).toBe(true)
      expect(x.expPerHour).toBeCloseTo(x.monster.expPerKill * x.estimate.killsPerHour, 6)
    }
  })

  it('kiest het gevraagde monster, en anders het beste', () => {
    const s = suggestMonsters(profile, perionEast)
    expect(pickMonster(s, 'Stump')?.monster.name).toBe('Stump')
    expect(pickMonster(s, undefined)).toBe(s[0])
    expect(pickMonster(s, 'bestaat niet')).toBe(s[0])
    expect(pickMonster([], undefined)).toBeUndefined()
  })
})

describe('hourPlan', () => {
  const s = suggestMonsters(profile, subway)[0]

  it('schaalt het verbruik mee met de kills per uur', () => {
    const one = hourPlan(s, 100)
    const two = hourPlan(s, 200)
    expect(two.expPerHour).toBeCloseTo(2 * one.expPerHour, 9)
    expect(two.potions).toBeCloseTo(2 * one.potions, 9)
    expect(two.ammo).toBeCloseTo(2 * one.ammo, 9)
  })

  it('rekent de kosten met de prijzen uit de gegevens (handmatig na te rekenen)', () => {
    const p = hourPlan(s, 100)
    expect(p.expPerHour).toBe(2_800) // Bubbling: 28 EXP · 100
    expect(p.hpPotionsPerHour).toBeCloseTo((100 * s.estimate.hpLossPerKill) / 250, 9)
    expect(p.mpPotionsPerHour).toBeCloseTo((100 * s.estimate.mpPerKill) / 200, 9)
    expect(p.potions).toBeCloseTo(p.hpPotionsPerHour * 150 + p.mpPotionsPerHour * 220, 9)
    expect(p.ammo).toBeCloseTo(100 * s.estimate.starsPerKill * 0.3, 9)
  })

  it('kost niets bij 0 kills', () => {
    expect(hourPlan(s, 0)).toMatchObject({ expPerHour: 0, potions: 0, ammo: 0 })
  })

  it('rekent het herladen met de prijs van je eigen stars', () => {
    const tobi = suggestMonsters({ ...profile, starRecharge: 0.7 }, subway)[0]
    expect(tobi.rechargePerStar).toBe(0.7)
    expect(hourPlan(tobi, 100).ammo).toBeCloseTo(100 * tobi.estimate.starsPerKill * 0.7, 9)
  })

  it('doodt een monster met sterkere stars in minder aanvallen, dus met minder stars per kill', () => {
    const subi = suggestMonsters(profile, subway)[0]
    const ilbi = suggestMonsters({ ...profile, starWatk: 27 }, subway).find((x) => x.monster.name === subi.monster.name)!
    expect(ilbi.estimate.starsPerKill).toBeLessThanOrEqual(subi.estimate.starsPerKill)
    expect(ilbi.estimate.killsPerHour).toBeGreaterThan(subi.estimate.killsPerHour)
  })
})

describe('resolveSpot', () => {
  const chosen = { ...newDraft('a'), ...knownSpotPatch(subway.id), travel: '100' }

  it('is gewoon toSpot bij een eigen plek of zonder profiel', () => {
    const own = { ...newDraft('b'), expPerHour: '5000', potions: '10' }
    expect(resolveSpot(own, undefined, profile)).toEqual(toSpot(own))
    expect(resolveSpot(chosen, subway, null)).toEqual(toSpot(chosen))
  })

  it('vult bij een bekende plek de lege velden met het voorstel', () => {
    const s = pickMonster(suggestMonsters(profile, subway), undefined)!
    const plan = hourPlan(s, s.estimate.killsPerHour)
    const spot = resolveSpot(chosen, subway, profile)
    expect(spot.expPerHour).toBeCloseTo(plan.expPerHour, 6)
    expect(spot.cost).toEqual({ potions: plan.potions, ammo: plan.ammo, travel: 100 })
  })

  it('laat de kills per uur van de speler winnen, en alles schaalt mee', () => {
    const spot = resolveSpot({ ...chosen, kills: '300' }, subway, profile)
    expect(spot.expPerHour).toBe(28 * 300)
  })

  it('laat een ingevuld veld winnen boven het voorstel', () => {
    const spot = resolveSpot({ ...chosen, expPerHour: '1234', ammo: '0' }, subway, profile)
    expect(spot.expPerHour).toBe(1234)
    expect(spot.cost.ammo).toBe(0)
  })

  it('maakt de plek ongeldig bij onzinnige kills per uur, maar een ingevuld veld blijft winnen', () => {
    expect(resolveSpot({ ...chosen, kills: '-5' }, subway, profile).expPerHour).toBeNaN()
    expect(resolveSpot({ ...chosen, kills: 'abc' }, subway, profile).cost.potions).toBeNaN()
    const typed = resolveSpot({ ...chosen, kills: '-5', expPerHour: '900', potions: '10', ammo: '0' }, subway, profile)
    expect(typed).toMatchObject({ expPerHour: 900, cost: { potions: 10, ammo: 0, travel: 100 } })
  })

  it('noemt de EXP alleen een schatting als de app hem zelf invult', () => {
    expect(isEstimated(chosen, subway, profile)).toBe(true)
    expect(isEstimated({ ...chosen, expPerHour: '900' }, subway, profile)).toBe(false)
    expect(isEstimated(chosen, subway, null)).toBe(false)
    expect(isEstimated(chosen, undefined, profile)).toBe(false)
  })

  it('van begin tot eind: bekende plekken met invoer komen in de juiste volgorde', () => {
    // Zelfde kosten, andere kills: de plek met meer EXP per uur wint.
    const a = { ...newDraft('veel'), ...knownSpotPatch(subway.id), kills: '400', potions: '1000', ammo: '0' }
    const b = { ...newDraft('weinig'), ...knownSpotPatch(subway.id), kills: '100', potions: '1000', ammo: '0' }
    const ranked = rankSpots([b, a].map((d) => resolveSpot(d, subway, profile)))
    expect(ranked.map((r) => r.spot.id)).toEqual(['veel', 'weinig'])
    expect('expPerMeso' in ranked[0] && ranked[0].expPerMeso).toBeCloseTo((28 * 400) / 1000, 9)
  })
})
