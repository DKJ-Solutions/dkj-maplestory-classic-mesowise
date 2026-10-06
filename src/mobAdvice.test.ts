import { describe, expect, it } from 'vitest'
import { isDangerousSpot } from './best'
import { MOBS, mobDraft } from './data/spots'
import { cheapestMob, mobAdvice, type MobAdvice } from './mobAdvice'
import { DEFAULT_PROFILE, parseProfile, type Profile } from './profile'
import { newDraft } from './spotDraft'

const parsed = parseProfile(DEFAULT_PROFILE)
if (!('profile' in parsed)) throw new Error('voorbeeldprofiel ongeldig')
const profile: Profile = parsed.profile

const advice = (a: MobAdvice) => {
  if (a.kind !== 'advice') throw new Error('verwacht een advies')
  return a
}
const hunt = (name: string) => [mobDraft(name)!]

describe('mobAdvice: wanneer er niets te rekenen valt', () => {
  it('geeft none zonder profiel, zonder mob of buiten de EXP-tabel', () => {
    expect(mobAdvice(hunt('Pig'), null)).toEqual({ kind: 'none' })
    expect(mobAdvice([], profile)).toEqual({ kind: 'none' })
    expect(mobAdvice([{ ...newDraft('eigen'), name: 'Eigen plek' }], profile)).toEqual({ kind: 'none' })
    expect(mobAdvice(hunt('Pig'), { ...profile, level: 200 })).toEqual({ kind: 'none' })
  })
})

describe('mobAdvice: je mob naast de andere mobs (#122)', () => {
  // De goedkoopste veilige mob voor het voorbeeldprofiel, zoals de app hem zelf kiest.
  const winner = advice(mobAdvice(hunt('Pig'), profile)).best!

  it('kiest een mob uit de data die niet gevaarlijk is', () => {
    expect(MOBS.map((m) => m.name)).toContain(winner)
    expect(isDangerousSpot(mobDraft(winner)!, profile)).toBe(false)
  })

  it('zegt "blijf" als je al op de goedkoopste mob jaagt, met dezelfde kosten aan beide kanten', () => {
    const a = advice(mobAdvice(hunt(winner), profile))
    expect(a).toMatchObject({ hunted: winner, stay: true, best: winner })
    expect(a.mesoHunted).toBe(a.mesoBest)
  })

  it('zegt "wissel" bij een duurdere veilige mob, en de beste kost dit level minder', () => {
    const other = MOBS.map((m) => m.name).find((n) => n !== winner && !isDangerousSpot(mobDraft(n)!, profile))!
    const a = advice(mobAdvice(hunt(other), profile))
    expect(a).toMatchObject({ hunted: other, stay: false, best: winner })
    expect(typeof a.mesoBest).toBe('number')
    if (typeof a.mesoHunted === 'number') expect(a.mesoBest!).toBeLessThan(a.mesoHunted)
  })

  it('raadt een gevaarlijke mob nooit aan, ook niet als je erop jaagt', () => {
    const d = mobDraft('Dark Axe Stump')!
    expect(isDangerousSpot(d, profile)).toBe(true)
    const a = advice(mobAdvice([d], profile))
    expect(a.stay).toBe(false)
    expect(a.best).not.toBe('Dark Axe Stump')
  })

  it('rekent met je eigen getallen voor je mob: veel meer EXP per kill maakt hem de beste', () => {
    const pig = mobDraft('Pig')!
    const a = advice(mobAdvice([{ ...pig, mobExp: '100000' }], profile))
    expect(a).toMatchObject({ hunted: 'Pig', stay: true, best: 'Pig' })
  })
})

describe('cheapestMob: de mob voor wie er nog geen koos (#193)', () => {
  it('is dezelfde mob die mobAdvice de beste noemt, vanuit welke mob je ook vertrekt', () => {
    const best = cheapestMob(profile)
    expect(best).not.toBeNull()
    expect(MOBS.map((m) => m.name)).toContain(best)
    expect(isDangerousSpot(mobDraft(best!)!, profile)).toBe(false)
    for (const m of MOBS.slice(0, 6)) expect(advice(mobAdvice(hunt(m.name), profile)).best).toBe(best)
  })

  it('is de mob waarbij mobAdvice zegt: blijf', () => {
    expect(advice(mobAdvice(hunt(cheapestMob(profile)!), profile))).toMatchObject({ stay: true })
  })

  it('stelt op een level buiten de EXP-tabel niets voor (zoals mobAdvice: none)', () => {
    expect(cheapestMob({ ...profile, level: 200 })).toBeNull()
  })
})
