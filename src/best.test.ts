import { describe, expect, it } from 'vitest'
import { ASSUMPTION_VARIANTS, bestVerdict, isDangerousSpot, resolveAll } from './best'
import { expPerMeso } from './calc/expPerMeso'
import { ASSUMPTIONS, type Assumptions } from './calc/mobModel'
import { findKnownSpot, knownSpotPatch, mobDraft } from './data/spots'
import { DEFAULT_PROFILE, parseProfile, type Profile } from './profile'
import { newDraft, type SpotDraft } from './spotDraft'
import { suggestMonsters } from './suggest'

const parsed = parseProfile(DEFAULT_PROFILE)
if (!('profile' in parsed)) throw new Error('voorbeeldprofiel ongeldig')
const profile: Profile = parsed.profile

const subway = findKnownSpot('kerning-subway-line-1-area-1')!
const perionEast = findKnownSpot('perion-east-domain')!

const own = (id: string, expPerHour: number, potions: number): SpotDraft => ({
  ...newDraft(id),
  name: id,
  expPerHour: String(expPerHour),
  potions: String(potions),
})
const known = (id: string, spotId: string, over: Partial<SpotDraft> = {}): SpotDraft => ({
  ...newDraft(id),
  ...knownSpotPatch(spotId),
  ...over,
})
const ratio = (d: SpotDraft, a: Assumptions = ASSUMPTIONS) => {
  const s = resolveAll([d], profile, a)[0]
  return expPerMeso(s.expPerHour, s.cost)
}

describe('ASSUMPTION_VARIANTS', () => {
  it('zet steeds één aanname op de rand en laat de andere staan', () => {
    expect(ASSUMPTION_VARIANTS).toEqual([
      { timeEfficiency: 0.6, contactsPerKill: 0.15 },
      { timeEfficiency: 0.6, contactsPerKill: 0.6 },
      { timeEfficiency: 0.4, contactsPerKill: 0.3 },
      { timeEfficiency: 0.8, contactsPerKill: 0.3 },
    ])
  })
})

describe('isDangerousSpot', () => {
  it('volgt het gekozen monster, en is false bij een eigen plek of zonder profiel', () => {
    const options = suggestMonsters(profile, perionEast)
    const dangerous = options.find((s) => s.estimate.dangerous)
    const safe = options.find((s) => !s.estimate.dangerous)
    expect(dangerous).toBeDefined()
    expect(safe).toBeDefined()
    expect(isDangerousSpot(known('x', perionEast.id, { monster: dangerous!.monster.name }), profile)).toBe(true)
    expect(isDangerousSpot(known('x', perionEast.id, { monster: safe!.monster.name }), profile)).toBe(false)
    expect(isDangerousSpot(known('x', perionEast.id, { monster: dangerous!.monster.name }), null)).toBe(false)
    expect(isDangerousSpot(own('x', 1, 1), profile)).toBe(false)
  })
})

describe('bestVerdict', () => {
  it('is robuust bij alleen eigen plekken: de aannames doen er dan niet toe', () => {
    const v = bestVerdict([own('a', 10_000, 1_000), own('b', 10_000, 2_000)], profile)
    expect(v).toMatchObject({ bestId: 'a', robust: true })
  })

  it('is niet robuust als een andere plek wint zodra één aanname naar de rand gaat', () => {
    // Een bekende plek met vaste kills: timeEfficiency doet dan niets, maar vaker geraakt worden
    // (contactsPerKill 0,6) maakt de potions duurder. De eigen plek zit daar precies tussenin.
    const k = known('bekend', subway.id, { kills: '300' })
    const base = ratio(k)
    const worse = ratio(k, { ...ASSUMPTIONS, contactsPerKill: 0.6 })
    expect(worse).toBeLessThan(base)
    expect(isDangerousSpot(k, profile)).toBe(false)
    const exp = resolveAll([k], profile)[0].expPerHour
    const mid = (base + worse) / 2
    const v = bestVerdict([k, own('eigen', exp, exp / mid)], profile)
    expect(v.bestId).toBe('bekend')
    expect(v.robust).toBe(false)
  })

  it('is niet robuust als minder aanvalstijd de winnaar onder de ondergrens duwt', () => {
    // Bij een geschatte plek schalen EXP en kosten samen mee met de kills, dus EXP per meso blijft
    // gelijk. Maar bij timeEfficiency 0,4 zakt de EXP per uur naar 2/3, en dan onder de helft van
    // de eigen plek (1,7 keer zoveel EXP per uur, maar een tiende van de EXP per meso).
    const k = known('bekend', subway.id)
    const exp = resolveAll([k], profile)[0].expPerHour
    const slow = resolveAll([k], profile, { ...ASSUMPTIONS, timeEfficiency: 0.4 })[0].expPerHour
    expect(slow).toBeCloseTo((exp * 2) / 3, 6)
    const ownExp = exp * 1.7
    const v = bestVerdict([k, own('eigen', ownExp, ownExp / (ratio(k) / 10))], profile)
    expect(v.bestId).toBe('bekend')
    expect(v.robust).toBe(false)
  })

  it('blijft robuust als de winnaar onder elke variant ruim voorligt', () => {
    const k = known('bekend', subway.id, { kills: '300' })
    const exp = resolveAll([k], profile)[0].expPerHour
    const v = bestVerdict([k, own('duur', exp, (exp / ratio(k)) * 100)], profile)
    expect(v).toMatchObject({ bestId: 'bekend', robust: true })
  })

  it('geeft een gevaarlijke plek het label niet, ook als hij bovenaan staat', () => {
    const dangerous = suggestMonsters(profile, perionEast).find((s) => s.estimate.dangerous)!
    const k = known('eng', perionEast.id, { monster: dangerous.monster.name, expPerHour: '10000', potions: '1', ammo: '0' })
    const v = bestVerdict([k, own('veilig', 10_000, 1_000)], profile)
    expect(v.ranked[0].spot.id).toBe('eng')
    expect(v.bestId).toBe('veilig')
    expect(v.excluded.get('eng')).toBe('dangerous')
  })

  it('is robuust en zonder winnaar zonder plek', () => {
    expect(bestVerdict([], profile)).toMatchObject({ bestId: null, robust: true })
  })

  // Eén plek is de mob waarop je jaagt (Dave, 4 oktober 2026): daar rekent de app mee, er valt niets te kiezen.
  it('neemt de enige plek als winnaar, robuust en zonder uitsluitingen', () => {
    expect(bestVerdict([own('a', 1, 1)], profile)).toMatchObject({ bestId: 'a', robust: true, excluded: new Map() })
  })

  it('neemt een enige plek ook als hij gevaarlijk is: je jaagt er toch', () => {
    const d = mobDraft('Dark Axe Stump')!
    expect(isDangerousSpot(d, profile)).toBe(true)
    expect(bestVerdict([d], profile)).toMatchObject({ bestId: d.id, excluded: new Map() })
  })

  it('geeft geen winnaar als de enige plek ongeldig is', () => {
    expect(bestVerdict([{ ...own('a', 1, 1), expPerHour: '' }], profile).bestId).toBeNull()
  })
})
