import { describe, expect, it } from 'vitest'
import { applyLevelUp } from './levelUp'
import type { Job } from './job'
import { DEFAULT_PROFILE, parseProfile, type Profile, type ProfileDraft } from './profile'
import { profileAfterLevelUp } from './profileLevelUp'

const COMPUTED: Job[] = ['thief', 'warrior', 'bowman', 'magician']

// Een profiel met stats die voor elke job iets anders geven, plus items (de "Extra"-velden) zodat de totalen tellen.
const draftAt = (level: number): ProfileDraft => ({
  ...DEFAULT_PROFILE,
  level: String(level),
  hp: '700',
  str: '30',
  dex: '45',
  int: '38',
  luk: '22',
  dexExtra: '3',
  intExtra: '2',
  lukExtra: '5',
  accuracy: '50',
  luckySeven: '0',
  energyBolt: '0',
})
const profileOf = (d: ProfileDraft, job: Job): Profile => {
  const r = parseProfile(d, job)
  if (!('profile' in r)) throw new Error(`profiel ongeldig: ${r.error}`)
  return r.profile
}

describe('profileAfterLevelUp (issue #145)', () => {
  // Over de grens van de HP-waarde per level (de Thief krijgt er vanaf level 10 meer) en over de hele horizon heen.
  const levels = [2, 8, 9, 10, 11, 20, 29, 30]

  for (const job of COMPUTED) {
    it(`geeft voor een ${job} dezelfde level, HP en accuracy als applyLevelUp op het gelijke concept`, () => {
      for (const level of levels) {
        const d = draftAt(level)
        const p = profileOf(d, job)
        const next = profileAfterLevelUp(p)
        const viaDraft = profileOf(applyLevelUp(d, job), job)
        expect(next.level).toBe(level + 1)
        expect(next.level).toBe(viaDraft.level)
        expect(next.hp).toBe(viaDraft.hp)
        expect(next.accuracy).toBe(viaDraft.accuracy)
        // Het volledige profiel is wat de concept-route geeft: er verandert niets anders.
        expect(next).toEqual(viaDraft)
      }
    })

    it(`laat bij een ${job} stats, skills, equipment en de rest van het profiel staan`, () => {
      const p = profileOf(draftAt(15), job)
      const next = profileAfterLevelUp(p)
      const { level, hp, accuracy, ...rest } = next
      const { level: l0, hp: h0, accuracy: a0, ...rest0 } = p
      expect(rest).toEqual(rest0)
      expect(hp).toBeGreaterThan(h0)
      expect(level).toBe(l0 + 1)
      expect(accuracy).not.toBeLessThan(a0)
    })
  }

  it('geeft een Thief boven level 10 meer HP per level dan eronder', () => {
    const gain = (level: number) => {
      const p = profileOf(draftAt(level), 'thief')
      return profileAfterLevelUp(p).hp - p.hp
    }
    expect(gain(9)).toBe(16)
    expect(gain(10)).toBe(22)
    expect(gain(11)).toBe(22)
  })

  it('verandert de invoer niet', () => {
    const p = profileOf(draftAt(12), 'warrior')
    const copy = { ...p }
    profileAfterLevelUp(p)
    expect(p).toEqual(copy)
  })

  it('geeft een job die de app niet doorrekent alleen level +1', () => {
    const p: Profile = { ...profileOf(draftAt(12), 'thief'), job: 'pirate' as unknown as Job }
    expect(profileAfterLevelUp(p)).toEqual({ ...p, level: 13 })
  })
})
