import { describe, expect, it } from 'vitest'
import { autoFillAp, autoFillPatch } from './autoFillAp'
import { EXP_TABLE_LEVELS } from './data/expTable'
import { MOBS, mobDraft } from './data/spots'
import { defaultEquipment } from './equipment'
import { cheapestSettings, MAX_ROUNDS, profileOf as appProfile, type CheapestInput } from './cheapestSettings'
import { isComputed, type Job } from './job'
import { levelInvoice } from './levelInvoice'
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

describe('cheapestSettings zonder gekozen mob (#193)', () => {
  const input = base({ drafts: [] })
  const r = cheapestSettings(input)

  it('stelt een mob voor, als wijziging "— → mob"', () => {
    expect(r.drafts).toHaveLength(1)
    const change = r.changes.find((c) => c.kind === 'mob')
    expect(change?.text).toMatch(/^— → /)
    expect(change?.text.endsWith(r.drafts[0].name)).toBe(true)
  })

  it('kiest de goedkoopste mob voor het level: mobAdvice blijft erop staan en geen enkele andere mob is goedkoper', () => {
    const next = apply(input, r)
    const a = mobAdvice(r.drafts, profileOf(next))
    expect(a.kind === 'advice' && a.stay).toBe(true)
    const cost = (name: string) => {
      const i = { ...next, drafts: [mobDraft(name)!] }
      const inv = levelInvoice(i.drafts, appProfile(i))
      return inv.kind === 'invoice' ? inv.total : Infinity
    }
    const chosen = cost(r.drafts[0].name)
    expect(Number.isFinite(chosen)).toBe(true)
    expect(chosen).toBeLessThanOrEqual(r.costAfter as number)
  })

  it('zet de skillpunten vanuit die mob en berekent een factuur', () => {
    expect(r.changes.some((c) => c.kind === 'skills')).toBe(true)
    const after = skillPointAdvice(r.drafts, profileOf(apply(input, r)))
    expect(after.kind === 'advice' && after.left).toBe(0)
    expect(r.costBefore).toBeUndefined()
    expect(typeof r.costAfter).toBe('number')
  })

  it('is daarna idempotent', () => {
    const again = cheapestSettings(apply(input, r))
    expect(again.changes).toEqual([])
  })

  it('geeft op elk level een wijziging "— → eindmob" die eindigt op de mob die in de drafts staat, ook als een latere ronde wisselt', () => {
    let checked = 0
    for (const level of EXP_TABLE_LEVELS.filter((l) => l <= 70)) {
      const i = base({ drafts: [], profileDraft: levelTo(DEFAULT_PROFILE, level) })
      const res = cheapestSettings(i)
      if (res.drafts.length === 0) continue
      checked++
      const change = res.changes.find((c) => c.kind === 'mob')
      expect(change?.text.startsWith('— → '), `level ${level}`).toBe(true)
      expect(change?.text, `level ${level}`).toBe(`— → ${res.drafts[0].name}`)
      expect(res.rounds, `level ${level}`).toBeLessThanOrEqual(MAX_ROUNDS)
      if (typeof res.costAfter === 'number') expect(res.costAfter, `level ${level}`).toBeGreaterThanOrEqual(0)
    }
    expect(checked).toBeGreaterThan(5)
  })

  it('geeft een positief, eindig totaal op de factuur van het voorstel', () => {
    const own = base({ drafts: [], profileDraft: DEFAULT_PROFILE })
    const res = cheapestSettings(own)
    const inv = levelInvoice(res.drafts, appProfile(apply(own, res)))
    expect(inv.kind).toBe('invoice')
    if (inv.kind === 'invoice') {
      expect(Number.isFinite(inv.total)).toBe(true)
      expect(inv.total).toBeGreaterThan(0)
      for (const l of inv.lines) expect(l.meso).toBeGreaterThanOrEqual(0)
      expect(res.costAfter).toBe(inv.total)
    }
  })

  it('stelt geen mob voor als je wel een mob hebt maar je level niet in de EXP-tabel staat', () => {
    const i = base({ drafts: [mobDraft('Pig')!], profileDraft: { ...DEFAULT_PROFILE, level: '200' } })
    const res = cheapestSettings(i)
    expect(mobAdvice(i.drafts, appProfile(i)).kind).toBe('none')
    expect(res.drafts).toBe(i.drafts)
    expect(res.changes.filter((c) => c.kind === 'mob')).toEqual([])
  })

  it('een eigen plek is een keuze van de speler: Cheapest laat hem staan en wisselt geen mob', () => {
    const own = { ...newDraft('x'), name: 'Eigen plek' }
    const res = cheapestSettings(base({ drafts: [own] }))
    expect(res.drafts).toEqual([own])
    expect(res.changes.filter((c) => c.kind === 'mob')).toEqual([])
  })
})

describe('cheapestSettings en de factuur (#195)', () => {
  // De factuur rondt elke regel af op hele stuks; zonder afronding goedkoper is op de factuur niet altijd goedkoper.
  const invoiceTotal = (i: CheapestInput): number | null => {
    const inv = levelInvoice(i.drafts, appProfile(i))
    return inv.kind === 'invoice' ? inv.total : null
  }
  const at = (job: Job, level: number, mob: string): CheapestInput => {
    let d = DEFAULT_PROFILE
    while (Number(d.level) < level) d = applyLevelUp(d, job)
    return base({ job, profileDraft: d, drafts: [mobDraft(mob)!] })
  }

  it('Warrior 26 op Blue Snail: Cheapest is op de factuur niet duurder dan Profile', () => {
    const input = at('warrior', 26, 'Blue Snail')
    const r = cheapestSettings(input)
    const yours = invoiceTotal(input)
    const advised = invoiceTotal(apply(input, r))
    expect(yours).not.toBeNull()
    expect(advised as number).toBeLessThanOrEqual(yours as number)
    expect(r.costBefore).toBe(yours)
    expect(r.costAfter).toBe(advised)
  })

  it('geldt voor elke job die rekent, op een rij levels en elke mob', () => {
    for (const job of (['thief', 'warrior', 'bowman', 'magician'] as Job[]).filter(isComputed)) {
      for (const level of [10, 15, 20, 25, 26, 30]) {
        for (const m of MOBS) {
          const input = at(job, level, m.name)
          const yours = invoiceTotal(input)
          const advised = invoiceTotal(apply(input, cheapestSettings(input)))
          if (yours === null || advised === null) continue
          expect(advised, `${job} ${level} ${m.name}`).toBeLessThanOrEqual(yours)
        }
      }
    }
  }, 60000)
})
