import { describe, expect, it } from 'vitest'
import { ASSUMPTIONS } from './calc/mobModel'
import { bestExpPerMeso } from './bestExpPerMeso'
import { skillPointCap } from './data/skillPoints'
import { isSkillKey } from './data/skills'
import { mobDraft } from './data/spots'
import { AP_PER_LEVEL, hpPerLevelFrom, mpPerLevelFrom } from './data/thief'
import { expectedStat } from './expectedStats'
import { growthCosts, growthOf } from './growth'
import { horizonCost } from './horizonCost'
import { DEFAULT_PROFILE, mainStatKey, parseProfile, skillPointsLeft, skillPointsSpent, type Profile, type ProfileDraft } from './profile'
import { NO_POTION_CHOICE, resolvePotions } from './potions'
import { newDraft, type SpotDraft } from './spotDraft'
import { clawUpgradeAdvice } from './clawUpgrade'

const own = (id: string, expPerHour: number, potions: number): SpotDraft => ({ ...newDraft(id), name: id, expPerHour: String(expPerHour), potions: String(potions) })
// "Beste" vraagt minstens twee plekken: een bekende plek en een eigen plek met weinig EXP per uur.
const drafts = [{ ...mobDraft('Ribbon Pig')!, id: 'a' }, own('b', 1_000, 10_000)]

const parse = (draft: ProfileDraft, job: Profile['job'] = 'thief'): Profile => {
  const parsed = parseProfile(draft, job)
  if (!('profile' in parsed)) throw new Error('profiel ongeldig: ' + parsed.error)
  return parsed.profile
}
/** Een Lv 20 Thief met 20 van zijn 31 skillpunten gezet (Lucky Seven 10, Nimble Body 10; 1 + 3 x 10 = 31 verdiend), dus 11 nog open. */
const thief20 = parse({ ...DEFAULT_PROFILE, level: '20', hp: '664', mp: '533', dex: '30', luk: '120', luckySeven: '10', nimbleBody: '10', accuracy: '60', avoid: '40' })
const spent = (p: Profile) => skillPointsSpent(p, p.job, 'job')

describe('growthOf: een Lv 20 Thief over zijn horizon', () => {
  const grow = growthOf(drafts, thief20)

  it('geeft op je eigen level je profiel zelf', () => {
    expect(grow(20)).toBe(thief20)
  })

  it('telt het level op, per level een', () => {
    expect([21, 22, 25, 30].map((l) => grow(l).level)).toEqual([21, 22, 25, 30])
  })

  it('zet de AP van elk level in LUK, de hoofdstat van een Thief (zoals Auto assign), en laat de andere stats staan', () => {
    expect(mainStatKey('thief')).toBe('luk')
    for (const l of [21, 22, 25]) {
      expect(grow(l).luk, `lv ${l}`).toBe(thief20.luk + AP_PER_LEVEL.amount * (l - 20))
      expect([grow(l).str, grow(l).dex, grow(l).int], `lv ${l}`).toEqual([thief20.str, thief20.dex, thief20.int])
    }
  })

  it('laat Max HP en Max MP per level groeien met de vaste waarden van de Thief', () => {
    expect(grow(21).hp).toBe(thief20.hp + hpPerLevelFrom(20))
    expect(grow(21).mp).toBe(thief20.mp + mpPerLevelFrom(20))
    expect(grow(25).hp).toBe(thief20.hp + 5 * hpPerLevelFrom(20))
  })

  it('zet de 3 skillpunten van elk level, en laat open punten open', () => {
    expect(skillPointCap(21, 'job') - skillPointCap(20, 'job')).toBe(3)
    const open = skillPointsLeft(thief20, 'job')
    expect(open).toBeGreaterThan(0)
    for (const l of [21, 22, 25]) {
      expect(spent(grow(l)) - spent(thief20), `lv ${l}`).toBe(3 * (l - 20))
      // Wat je nu nog open hebt staan, blijft open (jouw keuze): de nieuwe punten zijn gezet.
      expect(skillPointsLeft(grow(l), 'job'), `lv ${l}`).toBe(open)
    }
  })

  it('laat accuracy en evasion de formules volgen: het level-deel en LUK per level', () => {
    // Het statvenster na een level: dezelfde stats-formule als de verwachting van expectedStat, bovenop wat je nu meer of minder hebt dan die verwachting.
    const draftAt = (p: Profile): ProfileDraft => ({ ...DEFAULT_PROFILE, level: String(p.level), dex: String(p.dex), luk: String(p.luk), lukExtra: '0', nimbleBody: String(p.nimbleBody) })
    for (const l of [21, 25]) {
      const was = expectedStat('accuracy', draftAt(thief20), 'thief')!
      const now = expectedStat('accuracy', draftAt(grow(l)), 'thief')!
      expect(grow(l).accuracy - thief20.accuracy, `lv ${l}`).toBe(now - was)
      expect(grow(l).avoid).toBeGreaterThan(thief20.avoid)
    }
    expect(grow(21).accuracy).toBeGreaterThan(thief20.accuracy)
  })

  it('geeft dezelfde groei terug voor dezelfde plekken en hetzelfde profiel (voor claw, armor en star van één ronde)', () => {
    expect(growthOf(drafts, thief20)).toBe(grow)
    expect(growthOf(drafts, { ...thief20, luk: thief20.luk + 1 })).not.toBe(grow)
  })

  it('geeft op een level buiten de EXP-tabel nog een profiel, en houdt op het hoogste level de stats vast', () => {
    expect(grow(31).level).toBe(31)
    const top = growthOf(drafts, parse({ ...DEFAULT_PROFILE, level: '200', hp: '9000' }))
    expect(top(201)).toMatchObject({ level: 201, hp: 9000 })
  })
})

describe('growthOf: de AP gaan naar de hoofdstat van elke job', () => {
  it.each([['warrior', 'str'], ['bowman', 'dex'], ['magician', 'int'], ['thief', 'luk']] as const)('%s: %s', (job, stat) => {
    const p = parse({ ...DEFAULT_PROFILE, level: '20', hp: '900', mp: '400' }, job)
    const g = growthOf(drafts, p)(22)
    expect(g[stat] - p[stat]).toBe(2 * AP_PER_LEVEL.amount)
  })
})

describe('growthCosts: de horizon op het gegroeide profiel', () => {
  it('geeft op één level (this-level) hetzelfde als met één EXP per meso', () => {
    const epm = bestExpPerMeso(drafts, thief20, ASSUMPTIONS)!
    expect(growthCosts(drafts, growthOf(drafts, thief20)).without(20, 20)).toBeCloseTo(horizonCost(20, 20, epm)!, 9)
  })

  it('rekent zonder en met een upgrade op hetzelfde profiel per level, dus de besparing is het verschil per level', () => {
    const grow = growthOf(drafts, thief20)
    const costs = growthCosts(drafts, grow)
    const change = (p: Profile): Profile => ({ ...p, clawWatk: p.clawWatk + 5 })
    let want = 0
    for (let l = 20; l <= 24; l++) {
      const e0 = bestExpPerMeso(drafts, grow(l), ASSUMPTIONS)!
      const e1 = bestExpPerMeso(drafts, change(grow(l)), ASSUMPTIONS)!
      want += horizonCost(l, l, e0)! - horizonCost(l, l, e1)!
    }
    expect(costs.without(20, 24)! - costs.withIt(20, 24, change)!).toBeCloseTo(want, 6)
  })

  it('geeft null als een level niet uit te rekenen of onhaalbaar is', () => {
    const none = [own('a', 0, 1_000), own('b', 0, 1_000)]
    expect(growthCosts(none, growthOf(none, thief20)).without(20, 24)).toBeNull()
  })
})

describe('de upgrade-adviezen rekenen met de groei (Dave, 7 oktober 2026)', () => {
  it('geeft voor een claw op Lv 20 een andere besparing dan met één EXP per meso voor de hele horizon', () => {
    const p = parse({ ...DEFAULT_PROFILE, level: '20', dex: '100', luk: '100', clawWatk: '10' })
    const advice = clawUpgradeAdvice(drafts, p)
    if (advice.kind !== 'advice') throw new Error('advies verwacht')
    const c = advice.choices.find((x) => x.claw.name === 'Steel Titans')!
    const e0 = bestExpPerMeso(drafts, p, ASSUMPTIONS)!
    const e1 = bestExpPerMeso(drafts, { ...p, clawWatk: c.claw.watk }, ASSUMPTIONS)!
    const constant = horizonCost(c.from, c.to, e0)! - horizonCost(c.from, c.to, e1)!
    expect(c.saving).not.toBeNull()
    expect(Math.abs(c.saving! - constant)).toBeGreaterThan(1)
  })

  it('rekent met de groei: de besparing van een claw verschilt van die op een profiel dat alleen van level verandert', () => {
    // De AP en skillpunten van de komende levels doen zelf al schade: wat een claw dan nog toevoegt, is een ander bedrag.
    const p = parse({ ...DEFAULT_PROFILE, level: '20', dex: '100', luk: '100', clawWatk: '10' })
    const saving = (g: ReturnType<typeof growthOf>) => {
      const costs = growthCosts(drafts, g)
      return costs.without(20, 24)! - costs.withIt(20, 24, (q) => ({ ...q, clawWatk: 40 }))!
    }
    // Zonder groei: alles op het profiel van nu (alleen het level loopt).
    const frozen = (level: number): Profile => ({ ...p, level })
    expect(saving(growthOf(drafts, p))).not.toBeCloseTo(saving(frozen), 0)
  })
})

describe('growthOf: met de hand nagerekend en wat niet groeit', () => {
  it('geeft een Lv 20 Thief (DEX 100, LUK 100 + 3 van items, accuracy 33, evasion 23, HP 444, MP 363) op lv 21 en 22 deze getallen', () => {
    const p = parse({ ...DEFAULT_PROFILE, level: '20', dex: '100', luk: '100', clawWatk: '10' })
    const grow = growthOf(drafts, p)
    // Met de hand. Level 21: totale LUK 103 + 5 AP = 108; HP +22, MP +17; accuracy: floor((12 x 100 + 20 x 21 + 6 x 108 + 600) / 40) = 71 tegen 70 op lv 20 = +1;
    // evasion: floor(108 / 3) = 36 tegen 34 = +2. De skillpunten: de 3 van dit level gaan naar Lucky Seven (1 -> 4), de keuze van het model.
    expect(grow(21)).toMatchObject({ level: 21, luk: 108, hp: 466, mp: 380, accuracy: 34, avoid: 25, luckySeven: 4, nimbleBody: 0 })
    // Level 22: LUK 113; accuracy floor(2918 / 40) = 72 = +2 tegen lv 20, plus 3 van Nimble Body (3 punten, +1 per punt) = 38; evasion floor(113 / 3) = 37 = +3 plus 3 = 29.
    expect(grow(22)).toMatchObject({ level: 22, luk: 113, hp: 488, mp: 397, accuracy: 38, avoid: 29, luckySeven: 4, nimbleBody: 3 })
  })

  const GROWING = ['level', 'hp', 'mp', 'str', 'dex', 'int', 'luk', 'accuracy', 'avoid']
  const SKILL_KEYS = Object.keys(DEFAULT_PROFILE).filter((k) => isSkillKey(k))
  const bronze = parse({ ...DEFAULT_PROFILE, level: '20', hp: '900', helpfulStranger: '1', bronzeArrows: '1' }, 'bowman')
  const dagger = parse({ ...DEFAULT_PROFILE, level: '20', dagger: '1', clawWatk: '24' })
  const heavy = parse({ ...DEFAULT_PROFILE, level: '20', hp: '900', weaponMult: '2.2', clawWatk: '40', wdef: '80' }, 'warrior')
  it.each([['een Bowman met bronze pijlen', bronze], ['een Thief met een dagger', dagger], ['een Warrior met weapon multiplier 2,2', heavy]] as const)(
    'laat bij %s alles behalve level, HP, MP, de stats, accuracy, evasion en skills staan',
    (_name, p) => {
      const grow = growthOf(drafts, p)
      for (const l of [21, 22, 25]) {
        const g = grow(l)
        expect(g.level).toBe(l)
        for (const key of Object.keys(p) as (keyof Profile)[]) {
          if (GROWING.includes(key) || (SKILL_KEYS as string[]).includes(key)) continue
          expect(g[key], `${key} lv ${l}`).toEqual(p[key])
        }
      }
    },
  )

  it('houdt de pijl van een Bowman met bronze pijlen vast (1 weapon attack, 2 meso)', () => {
    expect(bronze.starWatk).toBe(1)
    expect(bronze.starRecharge).toBe(2)
    expect(growthOf(drafts, bronze)(23)).toMatchObject({ starWatk: 1, starRecharge: 2 })
  })

  it('houdt de potions van het profiel vast', () => {
    const potions = resolvePotions('thief', NO_POTION_CHOICE, thief20)
    expect(growthOf(drafts, { ...thief20, potions })(23).potions).toBe(potions)
  })

  it('onthoudt per plekkenlijst hoogstens een handvol profielen', () => {
    const first = growthOf(drafts, thief20)
    for (let i = 0; i < 20; i++) growthOf(drafts, { ...thief20, avoid: thief20.avoid + i + 1 })
    expect(growthOf(drafts, thief20)).not.toBe(first)
  })
})
