import { describe, expect, it } from 'vitest'
import { advisedSetup, MAX_EQUIP_ROUNDS } from './advisedSetup'
import type { CheapestInput } from './cheapestSettings'
import { profileOf } from './cheapestSettings'
import { MOBS, mobDraft } from './data/spots'
import { defaultEquipment, wornName } from './equipment'
import type { Job } from './job'
import { levelInvoice } from './levelInvoice'
import { NO_POTION_CHOICE } from './potions'
import { DEFAULT_PROFILE } from './profile'

const input = (job: Job, level: number, mob: string): CheapestInput => ({
  job,
  gender: null,
  equipment: defaultEquipment(),
  drafts: [mobDraft(mob)!],
  profileDraft: { ...DEFAULT_PROFILE, level: String(level) },
  potionChoice: NO_POTION_CHOICE,
})

/** Wat je hebt na Overnemen van deze uitkomst: de equip, het profiel, de mob en de potions van Advised. */
const afterTake = (user: CheapestInput, s: ReturnType<typeof advisedSetup>): CheapestInput => ({
  ...user,
  equipment: s.equipment,
  drafts: s.result.drafts,
  profileDraft: s.result.profileDraft,
  potionChoice: s.result.potionChoice,
})

const total = (i: CheapestInput, shop: Parameters<typeof levelInvoice>[2] = []) => {
  const profile = profileOf(i)
  const inv = levelInvoice(i.drafts, profile, shop)
  return inv.kind === 'invoice' ? inv.total : null
}

describe('advisedSetup: een vast punt (Dave, 6 oktober 2026, #192)', () => {
  const cases: [Job, number, string][] = [['thief', 20, 'Snail']]
  for (const job of ['thief', 'warrior', 'bowman'] as const) {
    for (const level of [12, 20, 27, 40]) {
      MOBS.filter((_, i) => i % 5 === 0).forEach((m) => cases.push([job, level, m.name]))
    }
  }

  it('koopt na Overnemen niets meer en verandert niets meer: Advised is dan je eigen setup (Difference 0)', () => {
    let bought = 0
    for (const [job, level, mob] of cases) {
      const user = input(job, level, mob)
      const s = advisedSetup(user)
      if (s.purchases.length > 0) bought++
      const taken = afterTake(user, s)
      const again = advisedSetup(taken)
      const label = `${job} L${level} ${mob}`
      expect(again.purchases.map((p) => p.name), label + ' koopt').toEqual([])
      expect(again.result.changes, label + ' verandert').toEqual([])
      expect(again.shop, label).toBe(0)
      // Difference: het totaal van je factuur na Overnemen is dat van Advised erna.
      const mine = total(taken)
      const advised = total(afterTake(taken, again), again.purchases.map((p) => ({ ...p.horizon, name: p.name, price: p.price })))
      expect(advised, label + ' totaal').toBe(mine)
    }
    // De sweep raakt ook echt aankopen, anders bewijst hij niets.
    expect(bought).toBeGreaterThan(0)
  })

  it('geeft voor thief level 20 op Snail een uitkomst die zijn aankopen kent en niet verder dan het maximum rekent', () => {
    const user = input('thief', 20, 'Snail')
    const s = advisedSetup(user)
    expect(s.purchases.length).toBeGreaterThan(0)
    expect(s.shop).toBe(s.purchases.reduce((n, p) => n + p.price, 0))
    // Wat gekocht is, draag je in die uitkomst, en het staat per slot als gewijzigd in het record voor de Equip-popup.
    for (const p of s.purchases) {
      expect(wornName(s.equipment[p.slot])).toBe(p.name)
      expect(s.cheapest[p.slot]).toMatchObject({ cheapest: p.name, changed: true, price: p.price })
    }
    expect(MAX_EQUIP_ROUNDS).toBeGreaterThan(0)
  })

  it('geeft zonder aankopen de eigen equip terug, dezelfde objecten', () => {
    const user = input('thief', 10, 'Snail')
    const s = advisedSetup(user)
    if (s.purchases.length === 0) {
      expect(s.equipment).toBe(user.equipment)
      expect(s.profile).toBe(user.profileDraft)
    }
  })
})
