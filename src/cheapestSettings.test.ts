import { describe, expect, it } from 'vitest'
import { autoFillAp, autoFillPatch } from './autoFillAp'
import { MOBS, mobDraft } from './data/spots'
import { defaultEquipment } from './equipment'
import { cheapestSettings, MAX_ROUNDS, type CheapestInput } from './cheapestSettings'
import { applyLevelUp } from './levelUp'
import { mobAdvice } from './mobAdvice'
import { NO_POTION_CHOICE, resolvePotions } from './potions'
import { DEFAULT_PROFILE, parseProfile, type ProfileDraft } from './profile'
import { skillPointAdvice } from './skillPoint'
import { newDraft } from './spotDraft'

const levelTo = (d: ProfileDraft, level: number): ProfileDraft => {
  let out = d
  while (Number(out.level) < level) out = applyLevelUp(out, 'thief')
  return out
}
const base = (over: Partial<CheapestInput> = {}): CheapestInput => ({
  job: 'thief',
  gender: null,
  equipment: defaultEquipment(),
  drafts: [mobDraft('Pig')!],
  profileDraft: levelTo(DEFAULT_PROFILE, 20),
  potionChoice: NO_POTION_CHOICE,
  ...over,
})
const profileOf = (i: CheapestInput) => {
  const p = parseProfile(i.profileDraft, i.job, i.gender)
  if (!('profile' in p)) throw new Error('ongeldig')
  return { ...p.profile, potions: resolvePotions(i.job, i.potionChoice) }
}
const apply = (i: CheapestInput, r: ReturnType<typeof cheapestSettings>): CheapestInput => ({ ...i, drafts: r.drafts, profileDraft: r.profileDraft, potionChoice: r.potionChoice })

describe('cheapestSettings: een level-20 Thief', () => {
  const input = base()
  const r = cheapestSettings(input)

  it('maakt het level goedkoper, nooit duurder', () => {
    expect(typeof r.costBefore).toBe('number')
    expect(typeof r.costAfter).toBe('number')
    expect(r.costAfter as number).toBeLessThanOrEqual(r.costBefore as number)
    expect(r.costAfter as number).toBeLessThan((r.costBefore as number) / 2)
    expect(r.changes.length).toBeGreaterThan(0)
    expect(r.rounds).toBeGreaterThan(0)
    expect(r.rounds).toBeLessThanOrEqual(MAX_ROUNDS)
  })

  it('saving is voor min na', () => {
    expect(r.saving).toBe((r.costBefore as number) - (r.costAfter as number))
  })

  it('is idempotent: opnieuw toepassen verandert niets en laat de objecten staan', () => {
    const next = apply(input, r)
    const again = cheapestSettings(next)
    expect(again.changes).toEqual([])
    expect(again.rounds).toBe(0)
    expect(again.saving).toBe(0)
    expect(again.drafts).toBe(next.drafts)
    expect(again.profileDraft).toBe(next.profileDraft)
    expect(again.potionChoice).toBe(next.potionChoice)
  })

  it('laat de equipment ongemoeid', () => {
    const eq = defaultEquipment()
    const snapshot = JSON.stringify(eq)
    cheapestSettings(base({ equipment: eq }))
    expect(JSON.stringify(eq)).toBe(snapshot)
  })

  it('zet alle skillpunten (0 over) als er punten waren', () => {
    const before = skillPointAdvice(input.drafts, profileOf(input))
    expect(before.kind === 'advice' && before.left).toBeGreaterThan(0)
    const after = skillPointAdvice(r.drafts, profileOf(apply(input, r)))
    expect(after.kind === 'advice' && after.left).toBe(0)
    expect(r.changes.some((c) => c.kind === 'skills')).toBe(true)
  })

  it('eindigt op de mob die mobAdvice kiest', () => {
    const a = mobAdvice(r.drafts, profileOf(apply(input, r)))
    expect(a.kind).toBe('advice')
    if (a.kind === 'advice') {
      expect(a.stay).toBe(true)
      expect(r.drafts).toHaveLength(1)
      expect(r.drafts[0].name).toBe(a.hunted)
    }
  })

  it('vult de base AP in zoals Auto assign', () => {
    const ap = autoFillAp('thief', r.profileDraft.level, input.equipment)
    expect(ap.ok).toBe(true)
    if (ap.ok) for (const [k, v] of Object.entries(autoFillPatch(ap.base))) expect(r.profileDraft[k as keyof ProfileDraft]).toBe(v)
  })
})

describe('cheapestSettings: randgevallen', () => {
  it('doet niets zonder profiel dat de app kan doorrekenen', () => {
    const input = base({ profileDraft: { ...DEFAULT_PROFILE, level: 'abc' } })
    const r = cheapestSettings(input)
    expect(r.changes).toEqual([])
    expect(r.rounds).toBe(0)
    expect(r.costBefore).toBeUndefined()
    expect(r.costAfter).toBeUndefined()
    expect(r.saving).toBeNull()
    expect(r.drafts).toBe(input.drafts)
    expect(r.profileDraft).toBe(input.profileDraft)
    expect(r.potionChoice).toBe(input.potionChoice)
  })

  it('geeft saving null als de kosten niet uit te rekenen zijn (eigen plek zonder getallen)', () => {
    const input = base({ drafts: [{ ...newDraft('x'), name: 'Eigen plek' }] })
    const r = cheapestSettings(input)
    expect(r.saving === null || typeof r.saving === 'number').toBe(true)
    if (typeof r.costBefore !== 'number' || typeof r.costAfter !== 'number') expect(r.saving).toBeNull()
    else expect(r.saving).toBe(r.costBefore - r.costAfter)
  })

  it('houdt nooit meer dan MAX_ROUNDS rondes aan, voor elke mob als startpunt', () => {
    for (const m of MOBS.slice(0, 12)) {
      const input = base({ drafts: [mobDraft(m.name)!] })
      const r = cheapestSettings(input)
      expect(r.rounds).toBeLessThanOrEqual(MAX_ROUNDS)
      if (typeof r.costBefore === 'number' && typeof r.costAfter === 'number') expect(r.costAfter).toBeLessThanOrEqual(r.costBefore + 1e-6)
    }
  })

  it('laat het object staan van wat niet veranderde', () => {
    const first = cheapestSettings(base())
    const settled = apply(base(), first)
    const r = cheapestSettings(settled)
    expect(r.drafts).toBe(settled.drafts)
    expect(r.potionChoice).toBe(settled.potionChoice)
  })

  it('kiest niet opnieuw een andere mob als je al op de beste staat', () => {
    const settled = apply(base(), cheapestSettings(base()))
    expect(cheapestSettings(settled).changes.filter((c) => c.kind === 'mob')).toEqual([])
  })
})
