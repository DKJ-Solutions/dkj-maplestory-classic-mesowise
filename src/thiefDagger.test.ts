// Een Thief met een dagger (issue #170): slaat met Double Stab of de gewone aanval in plaats van stars te gooien.
import { describe, expect, it } from 'vitest'
import { pickUnder } from './best'
import { ASSUMPTIONS, daggerAttack } from './calc/mobModel'
import { isInvalid } from './calc/rankSpots'
import { clawUpgradeAdvice, nextBetterWeapon } from './clawUpgrade'
import { NPC_ARROWS } from './data/bowman'
import { NPC_CLAWS } from './data/claws'
import { NPC_DAGGERS } from './data/daggers'
import { findKnownSpot, knownSpotPatch } from './data/spots'
import { DOUBLE_STAB_LEVELS } from './data/thief'
import { applyEquipChange, catalogItems, defaultEquipment, equipmentForJob, OTHER, syncArrow, syncWithEquipment, type EquipEntry, type Equipment } from './equipment'
import { applySkillPoint } from './levelUp'
import { DEFAULT_PROFILE, parseProfile, thiefWithDagger, toCharacter, totalAttack, type Profile, type ProfileDraft } from './profile'
import { DAGGER_NOT_MODELLED, DAGGER_SKILLS, NOT_MODELLED, notModelled, skillPointAdvice, skillsOf, SKILLS } from './skillPoint'
import { newDraft } from './spotDraft'
import { doubleStabAt, hourPlan, statWindowRange, suggestMonsters } from './suggest'

const pick = (name: string): EquipEntry => ({ pick: name, name: '', stat: '' })
const unknown: EquipEntry = { pick: 'unknown', name: '', stat: '' }

function parsed(d: ProfileDraft): Profile {
  const r = parseProfile(d, 'thief')
  if (!('profile' in r)) throw new Error(r.error)
  return r.profile
}

/** Een Thief van level 20 met sterke stats, de Triangular Zamadar in de hand en Double Stab op level 1. */
const daggerDraft = (over: Partial<ProfileDraft> = {}): ProfileDraft => ({
  ...applyEquipChange({ ...DEFAULT_PROFILE, level: '20', luckySeven: '0', str: '60', dex: '60', luk: '100' }, 'claw', unknown, pick('Triangular Zamadar')),
  doubleStab: '1',
  ...over,
})

const subway = findKnownSpot('kerning-subway-line-1-area-1')!
const drafts = [{ ...newDraft('a'), ...knownSpotPatch('henesys-rain-forest-east') }, { ...newDraft('b'), name: 'b', expPerHour: '1000', potions: '10000' }]

describe('thiefWithDagger en de weapon attack', () => {
  it('geldt alleen voor een Thief met dagger = 1', () => {
    expect(thiefWithDagger('thief', 1)).toBe(true)
    expect(thiefWithDagger('thief', 0)).toBe(false)
    expect(thiefWithDagger('warrior', 1)).toBe(false)
    expect(thiefWithDagger('bowman', 1)).toBe(false)
  })

  it('telt geen stars mee: de weapon attack is die van de dagger alleen, met een claw wel stars erbij', () => {
    const d = daggerDraft({ starWatk: '15' })
    expect(totalAttack(d, 'thief')).toBe(28)
    expect(toCharacter(parsed(d)).watk).toBe(28)
    const claw = { ...d, dagger: '0' }
    expect(totalAttack(claw, 'thief')).toBe(28 + 15)
    expect(toCharacter(parsed(claw)).watk).toBe(28 + 15)
  })
})

describe('suggestMonsters: een Thief met een dagger', () => {
  it('gooit niets: geen ammokosten, wel MP per kill van Double Stab, en het statvenster is de gewone dagger-aanval', () => {
    const p = parsed(daggerDraft())
    expect(p).toMatchObject({ dagger: 1, doubleStab: 1, weaponMult: 1.4, clawWatk: 28 })
    const s = suggestMonsters(p, subway)
    expect(s.length).toBeGreaterThan(0)
    for (const x of s) {
      expect(x.rechargePerStar).toBe(0)
      expect(x.estimate.mpPerKill).toBeGreaterThan(0)
      expect(hourPlan(x, x.estimate.killsPerHour).ammo).toBe(0)
    }
    const a = daggerAttack(toCharacter(p), 1.4, null, 1)
    expect(statWindowRange(p)).toEqual({ min: Math.trunc(a.min), max: Math.trunc(a.max) })
  })

  it('doubleStabAt: level 0 is niet geleerd, daarboven het level uit de tabel', () => {
    expect(doubleStabAt(0)).toBeNull()
    expect(doubleStabAt(1)).toEqual(DOUBLE_STAB_LEVELS[0])
    expect(doubleStabAt(99)).toEqual(DOUBLE_STAB_LEVELS[DOUBLE_STAB_LEVELS.length - 1])
  })

  it('rekent de MP per kill uit Double Stab: aanvallen per kill x 8 MP op skill-level 1', () => {
    for (const x of suggestMonsters(parsed(daggerDraft({ doubleStab: '1' })), subway)) {
      expect(x.estimate.mpPerKill).toBeCloseTo(x.estimate.attacksToKill * 8, 6)
    }
  })

  it('zonder punten in Double Stab telt de gewone aanval: geen MP, nog steeds geen ammokosten', () => {
    const s = suggestMonsters(parsed(daggerDraft({ doubleStab: '0' })), subway)
    expect(s.length).toBeGreaterThan(0)
    for (const x of s) {
      expect(x.estimate.mpPerKill).toBe(0)
      expect(x.rechargePerStar).toBe(0)
      expect(hourPlan(x, x.estimate.killsPerHour).ammo).toBe(0)
    }
  })

  it('Double Stab verandert de aanval ten opzichte van de gewone: andere aantallen aanvallen per kill', () => {
    const plain = suggestMonsters(parsed(daggerDraft({ doubleStab: '0' })), subway)
    const stab = suggestMonsters(parsed(daggerDraft({ doubleStab: '1' })), subway)
    expect(stab.map((x) => x.estimate.attacksToKill)).not.toEqual(plain.map((x) => x.estimate.attacksToKill))
  })

  it('regressie: met een claw (dagger = 0) gooit de Thief nog Lucky Seven, met ammokosten en MP', () => {
    const p = parsed({ ...daggerDraft(), dagger: '0', luckySeven: '1', starWatk: '15', starRecharge: '1' })
    expect(p.dagger).toBe(0)
    const s = suggestMonsters(p, subway)
    expect(s.length).toBeGreaterThan(0)
    for (const x of s) {
      expect(x.rechargePerStar).toBe(p.starRecharge)
      expect(x.estimate.mpPerKill).toBeGreaterThan(0)
      expect(x.estimate.starsPerKill).toBeGreaterThan(0)
    }
  })
})

describe('applyEquipChange: een dagger kiezen', () => {
  it('zet bij Triangular Zamadar dagger op 1, de multiplier op 1,4 en de aanvalstijd op 720', () => {
    const d = applyEquipChange({ ...DEFAULT_PROFILE, level: '20' }, 'claw', unknown, pick('Triangular Zamadar'))
    expect(d).toMatchObject({ dagger: '1', weaponMult: '1.4', attackMs: '720', clawWatk: '28' })
  })

  it('zet bij een Faster-dagger (Field Dagger) de aanvalstijd op 660', () => {
    const d = applyEquipChange({ ...DEFAULT_PROFILE, level: '20' }, 'claw', unknown, pick('Field Dagger'))
    expect(d).toMatchObject({ dagger: '1', attackMs: '660', clawWatk: '30' })
  })

  it('zet terug naar een claw: dagger weer op 0', () => {
    const on = daggerDraft()
    expect(on.dagger).toBe('1')
    expect(applyEquipChange(on, 'claw', pick('Triangular Zamadar'), pick('Garnier')).dagger).toBe('0')
  })
})

describe('clawUpgradeAdvice: het wapen-advies van een Thief met een dagger', () => {
  const dagger: Profile = parsed(daggerDraft({ level: '30' }))
  const daggerNames = new Set(NPC_DAGGERS.map((d) => d.name))

  it('kiest uit de daggers, nooit uit de claws', () => {
    const a = clawUpgradeAdvice(drafts, dagger)
    if (a.kind !== 'advice') throw new Error('advies verwacht')
    const all = [...a.choices.map((c) => c.claw), ...a.notWearable.map((w) => w.claw), ...(a.winner ? [a.winner] : [])]
    expect(all.length).toBeGreaterThan(0)
    for (const w of all) {
      expect(daggerNames.has(w.name), w.name).toBe(true)
      expect(NPC_CLAWS.some((c) => c.name === w.name), w.name).toBe(false)
    }
  })

  it('neemt alleen daggers mee waar het model meer EXP per meso mee haalt dan met je huidige', () => {
    const a = clawUpgradeAdvice(drafts, dagger)
    if (a.kind !== 'advice') throw new Error('advies verwacht')
    const epm = (p: Profile) => {
      const { ranked, bestId } = pickUnder(drafts, p, ASSUMPTIONS)
      const best = ranked.find((r) => r.spot.id === bestId)!
      if (isInvalid(best)) throw new Error('beste plek ongeldig')
      return best.expPerMeso
    }
    const base = epm(dagger)
    for (const c of a.choices) {
      const worn = { ...dagger, clawWatk: c.claw.watk, attackMs: c.claw.speed.attackMs, weaponMult: c.claw.mult! }
      expect(epm(worn), c.claw.name).toBeGreaterThan(base)
    }
  })

  it('nextBetterWeapon geeft een dagger boven je level', () => {
    const next = nextBetterWeapon({ ...dagger, level: 20 })
    expect(next).not.toBeNull()
    expect(daggerNames.has(next!.name)).toBe(true)
    expect(next!.level).toBeGreaterThan(20)
  })
})

describe('skillPoint: de skills van een Thief met een dagger', () => {
  it('skillsOf: een dagger-Thief heeft Double Stab en Nimble Body, een claw-Thief Lucky Seven en Nimble Body', () => {
    expect(skillsOf('thief', true).map((s) => s.id)).toEqual(['doubleStab', 'nimbleBody'])
    expect(skillsOf('thief', false).map((s) => s.id)).toEqual(['luckySeven', 'nimbleBody'])
    expect(skillsOf('thief').map((s) => s.id)).toEqual(SKILLS.map((s) => s.id))
    expect(DAGGER_SKILLS.map((s) => s.id)).toEqual(['doubleStab', 'nimbleBody'])
    expect(skillsOf('warrior', true)).toBe(skillsOf('warrior'))
  })

  it('notModelled: Keen Eyes, Lucky Seven, Disorder en Dark Sight voor een dagger-Thief', () => {
    expect([...notModelled('thief', true)].sort()).toEqual(['Dark Sight', 'Disorder', 'Keen Eyes', 'Lucky Seven'])
    expect(notModelled('thief', true)).toBe(DAGGER_NOT_MODELLED)
    expect(notModelled('thief', false)).toBe(NOT_MODELLED)
    expect(NOT_MODELLED).not.toContain('Lucky Seven')
    expect(NOT_MODELLED).toContain('Double Stab')
  })

  it('skillPointAdvice biedt een dagger-Thief alleen Double Stab en Nimble Body', () => {
    const a = skillPointAdvice(drafts, parsed(daggerDraft({ doubleStab: '0', luckySeven: '0' })))
    if (a.kind !== 'advice') throw new Error('geen advies')
    expect(a.choices.map((c) => c.id).sort()).toEqual(['doubleStab', 'nimbleBody'])
  })

  it('applySkillPoint zet bij een dagger-Thief een punt in Double Stab, en laat Lucky Seven met rust', () => {
    const d = daggerDraft({ doubleStab: '0', luckySeven: '0' })
    expect(applySkillPoint(d, 'doubleStab', 'thief').doubleStab).toBe('1')
    expect(applySkillPoint(d, 'luckySeven', 'thief')).toEqual(d)
  })
})

const withClaw = (entry: EquipEntry, over: Partial<Equipment> = {}): Equipment => ({ ...defaultEquipment(), claw: entry, ...over })

describe('syncWithEquipment: dagger en pijlen volgen de equipment (#170)', () => {
  it('een NPC-dagger in het wapenslot zet dagger op 1', () => {
    for (const d of NPC_DAGGERS) expect(syncWithEquipment({ ...DEFAULT_PROFILE, dagger: '0' }, withClaw(pick(d.name))).dagger, d.name).toBe('1')
  })

  it('een beginner-dagger (Razor, Fruit Knife) zet dagger op 1', () => {
    for (const n of ['Razor', 'Fruit Knife']) expect(syncWithEquipment({ ...DEFAULT_PROFILE, dagger: '0' }, withClaw(pick(n))).dagger, n).toBe('1')
  })

  it('een claw zet dagger op 0', () => {
    expect(syncWithEquipment({ ...DEFAULT_PROFILE, dagger: '1' }, withClaw(pick(NPC_CLAWS[0].name))).dagger).toBe('0')
  })

  it('een leeg (UNKNOWN) wapenslot zet dagger op 0', () => {
    expect(syncWithEquipment({ ...DEFAULT_PROFILE, dagger: '1' }, withClaw(unknown)).dagger).toBe('0')
  })

  it('een eigen item (OTHER) met de soort dagger zet dagger op 1, en alleen de soort omzetten volgt (#176)', () => {
    const own: EquipEntry = { pick: OTHER, name: 'Cass', stat: '45', weaponKind: 'dagger' }
    expect(syncWithEquipment({ ...DEFAULT_PROFILE, dagger: '0' }, withClaw(own)).dagger).toBe('1')
    expect(applyEquipChange({ ...DEFAULT_PROFILE, dagger: '0' }, 'claw', { ...own, weaponKind: 'claw' }, own).dagger).toBe('1')
    expect(applyEquipChange({ ...DEFAULT_PROFILE, dagger: '1' }, 'claw', own, { ...own, weaponKind: 'claw' }).dagger).toBe('0')
  })

  it('een eigen item (OTHER) in het wapenslot zet dagger op 0', () => {
    expect(syncWithEquipment({ ...DEFAULT_PROFILE, dagger: '1' }, withClaw({ pick: OTHER, name: 'Cass', stat: '45' })).dagger).toBe('0')
  })

  it('laat de pijlkeuze gelijk aan syncArrow en verandert verder niets', () => {
    for (const ammo of [unknown, pick('Bronze Arrows for Bows'), pick(NPC_ARROWS[0].name)]) {
      const eq = withClaw(pick('Cass'), { ammo })
      const draft = { ...DEFAULT_PROFILE, bronzeArrows: '1', level: '33' }
      const out = syncWithEquipment(draft, eq)
      expect(out.bronzeArrows).toBe(syncArrow(draft, eq).bronzeArrows)
      expect({ ...out, dagger: '', bronzeArrows: '' }).toEqual({ ...draft, dagger: '', bronzeArrows: '' })
    }
  })
})

describe('wissel van job en terug: geen dagger zonder dagger in de hand (#170)', () => {
  it('Thief met Cass -> Warrior -> Thief: wapenslot leeg, dagger 0 en Lucky Seven-pad', () => {
    const eq = withClaw(pick('Cass'))
    const asWarrior = equipmentForJob(eq, 'warrior')
    expect(asWarrior.claw.pick).toBe('unknown')
    const back = equipmentForJob(asWarrior, 'thief')
    expect(back.claw.pick).toBe('unknown')
    const synced = syncWithEquipment({ ...DEFAULT_PROFILE, dagger: '1', luckySeven: '1' }, back)
    expect(synced.dagger).toBe('0')
    const p = parsed(synced)
    expect(p.dagger).toBe(0)
    expect(thiefWithDagger('thief', p.dagger)).toBe(false)
  })

  it('zonder sync bleef dagger 1 staan: dat is wat syncWithEquipment herstelt', () => {
    const stale: ProfileDraft = { ...DEFAULT_PROFILE, dagger: '1' }
    expect(thiefWithDagger('thief', parsed(stale).dagger)).toBe(true)
    expect(thiefWithDagger('thief', parsed(syncWithEquipment(stale, defaultEquipment())).dagger)).toBe(false)
  })

  it('een Thief die zijn dagger houdt (Thief -> Thief) houdt dagger 1', () => {
    const eq = equipmentForJob(withClaw(pick('Cass')), 'thief')
    expect(eq.claw.pick).toBe('Cass')
    expect(syncWithEquipment({ ...DEFAULT_PROFILE, dagger: '0' }, eq).dagger).toBe('1')
  })
})

describe('isNpcDagger heeft geen jobcontrole nodig', () => {
  it('geen NPC-dagger staat in de wapencatalogus van Warrior, Bowman of Magician', () => {
    for (const job of ['warrior', 'bowman', 'magician'] as const) {
      const names = new Set(catalogItems('claw', job).map((i) => i.name))
      for (const d of NPC_DAGGERS) expect(names.has(d.name), `${job}: ${d.name}`).toBe(false)
    }
  })

  it('de Thief-catalogus heeft ze wel allemaal', () => {
    const names = new Set(catalogItems('claw', 'thief').map((i) => i.name))
    for (const d of NPC_DAGGERS) expect(names.has(d.name), d.name).toBe(true)
  })
})

describe('een eigen wapen met de gekozen soort rekent als die soort (#176)', () => {
  const own = (weaponKind?: 'dagger' | 'claw'): EquipEntry => ({ pick: OTHER, name: 'Mijn wapen', stat: '28', ...(weaponKind ? { weaponKind } : {}) })
  /** Het profiel zoals de app het na de keuze van het eigen wapen bewaart: de claw-aanpassing, dan de sync met de equipment. */
  const worn = (e: EquipEntry): Profile =>
    parsed({
      ...syncWithEquipment(applyEquipChange({ ...DEFAULT_PROFILE, level: '20', luckySeven: '1', doubleStab: '1', str: '60', dex: '60', luk: '100', starWatk: '15', starRecharge: '1', clawWatk: '28' }, 'claw', unknown, e), withClaw(e)),
    })

  it('als dagger: Double Stab, geen stars in de weapon attack, geen ammokosten', () => {
    const p = worn(own('dagger'))
    expect(p.dagger).toBe(1)
    expect(thiefWithDagger('thief', p.dagger)).toBe(true)
    expect(toCharacter(p).watk).toBe(p.clawWatk)
    const s = suggestMonsters(p, subway)
    expect(s.length).toBeGreaterThan(0)
    for (const x of s) {
      expect(x.rechargePerStar).toBe(0)
      expect(x.estimate.mpPerKill).toBeCloseTo(x.estimate.attacksToKill * 8, 6)
      expect(hourPlan(x, x.estimate.killsPerHour).ammo).toBe(0)
    }
  })

  it('als claw: Lucky Seven, stars in de weapon attack en ammokosten', () => {
    const p = worn(own('claw'))
    expect(p.dagger).toBe(0)
    expect(toCharacter(p).watk).toBe(p.clawWatk + 15)
    const s = suggestMonsters(p, subway)
    expect(s.length).toBeGreaterThan(0)
    for (const x of s) {
      expect(x.rechargePerStar).toBe(p.starRecharge)
      expect(x.estimate.starsPerKill).toBeGreaterThan(0)
    }
  })

  it('zonder gekozen soort geldt claw: precies de uitkomst van een eigen claw', () => {
    expect(worn(own())).toEqual(worn(own('claw')))
    expect(worn(own()).dagger).toBe(0)
  })

  it('dagger en claw geven een andere uitkomst voor dezelfde stat: het getal verandert met de keuze', () => {
    const a = suggestMonsters(worn(own('dagger')), subway).map((x) => x.estimate.attacksToKill)
    const b = suggestMonsters(worn(own('claw')), subway).map((x) => x.estimate.attacksToKill)
    expect(a).not.toEqual(b)
  })
})
