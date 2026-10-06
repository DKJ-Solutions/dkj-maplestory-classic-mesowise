import { describe, expect, it } from 'vitest'
import { bestVerdict } from './best'
import { mobDraft, POTIONS } from './data/spots'
import { levelCost } from './levelCost'
import { levelInvoice } from './levelInvoice'
import { DEFAULT_PROFILE, parseProfile, type Profile, type ProfileDraft } from './profile'
import { NO_POTION_CHOICE, resolvePotions } from './potions'
import type { Job } from './job'

const profileOf = (draft: Partial<ProfileDraft> = {}, job: Job = 'thief'): Profile => {
  const r = parseProfile({ ...DEFAULT_PROFILE, ...draft }, job)
  if (!('profile' in r)) throw new Error(r.error)
  return r.profile
}
const thief = profileOf()
const drafts = [mobDraft('Ribbon Pig')!]
const invoiceOf = (p: Profile, d = drafts) => {
  const inv = levelInvoice(d, p)
  if (inv.kind !== 'invoice') throw new Error('geen factuur')
  return inv
}
const levelMeso = (p: Profile, d = drafts) => {
  const c = levelCost(p, bestVerdict(d, p))
  if (c.kind !== 'cost' || c.meso === null) throw new Error('geen kosten')
  return c.meso
}

describe('levelInvoice', () => {
  it('geeft geen factuur zonder profiel of zonder mob, met de kosten van het level erbij voor de reden', () => {
    expect(levelInvoice(drafts, null)).toEqual({ kind: 'none', cost: { kind: 'noProfile' } })
    const none = levelInvoice([], thief)
    expect(none.kind).toBe('none')
    expect(none.kind === 'none' && none.cost.kind).toBe('noBest')
  })

  it('zet een Thief op Ribbon Pig zijn potions en stars op de factuur, met stuks maal prijs', () => {
    const inv = invoiceOf(thief)
    expect(inv).toMatchObject({ level: 10, expToNext: 1716, mob: 'Ribbon Pig' })
    // Lucky Seven kost MP, dus ook Blue Potions.
    expect(inv.lines.map((l) => l.label)).toEqual(['Orange Potion', 'Blue Potion', 'Throwing stars'])
    const orange = inv.lines[0]
    expect(orange.qty).toBeGreaterThan(0)
    expect(orange.meso).toBe(orange.qty! * POTIONS.find((p) => p.name === 'Orange Potion')!.price)
    expect(inv.total).toBe(inv.lines.reduce((s, l) => s + l.meso, 0))
  })

  it('komt uit op de kosten van het level, op het naar boven afronden van elke regel na', () => {
    for (const p of [thief, profileOf({ level: '15' }), profileOf({}, 'warrior')]) {
      const inv = invoiceOf(p)
      const meso = levelMeso(p)
      expect(inv.total).toBeGreaterThanOrEqual(Math.floor(meso))
      // Elke regel rondt hoogstens één stuk (of één meso) naar boven af.
      const slack = inv.lines.reduce((s, l) => s + (l.qty === null ? 1 : l.meso / l.qty + 1), 0)
      expect(inv.total - meso).toBeLessThanOrEqual(slack)
    }
  })

  it('rekent met de potions die je gebruikt', () => {
    const white = { ...thief, potions: resolvePotions('thief', { ...NO_POTION_CHOICE, hp: 'White Potion' }) }
    const inv = invoiceOf(white)
    expect(inv.lines[0].label).toBe('White Potion')
    expect(inv.lines[0].meso).toBe(inv.lines[0].qty! * 350)
    expect(inv.total).toBeGreaterThan(invoiceOf(thief).total)
  })

  it('geeft een Warrior geen munitie, en een Bowman pijlen', () => {
    expect(invoiceOf(profileOf({}, 'warrior')).lines.map((l) => l.label)).not.toContain('Throwing stars')
    const bowman = profileOf({ lukExtra: '0', str: '4', dex: '60', luk: '4', clawWatk: '20', accuracy: '60' }, 'bowman')
    expect(invoiceOf(bowman).lines.map((l) => l.label)).toContain('Arrows')
  })

  it('zet potions die je zelf invulde als één bedrag zonder stuks', () => {
    const own = [{ ...drafts[0], potions: '1000' }]
    const inv = invoiceOf(thief, own)
    const line = inv.lines.find((l) => l.label === 'Potions')!
    expect(line.qty).toBeNull()
    expect(line.meso).toBe(Math.ceil(1000 * inv.hours))
  })
})
