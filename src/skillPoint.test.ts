import { describe, expect, it } from 'vitest'
import { pickUnder } from './best'
import { mesoCostOfLevel } from './calc/mesoCostOfLevel'
import { isInvalid } from './calc/rankSpots'
import { expToNextLevel } from './data/expTable'
import { knownSpotPatch } from './data/spots'
import { LUCKY_SEVEN_LEVELS, NIMBLE_BODY } from './data/thief'
import { ALL_SKILLS, THIEF_SKILLS, WARRIOR_SKILLS, type SkillKey } from './data/skills'
import { POWER_STRIKE_LEVELS, PRECISE_STRIKES_LEVELS } from './data/warrior'
import { DEFAULT_PROFILE, parseProfile, type Profile, type ProfileDraft } from './profile'
import { NOT_MODELLED, notModelled, SKILLS, skillLevels, skillPointAdvice, skillsOf, stepSkill } from './skillPoint'
import { newDraft, type SpotDraft } from './spotDraft'

const parsed = parseProfile(DEFAULT_PROFILE)
if (!('profile' in parsed)) throw new Error('voorbeeldprofiel ongeldig')
const profile: Profile = parsed.profile

const own = (id: string, expPerHour: number, potions: number): SpotDraft => ({
  ...newDraft(id),
  name: id,
  expPerHour: String(expPerHour),
  potions: String(potions),
})
const known = (id: string, spotId: string): SpotDraft => ({ ...newDraft(id), ...knownSpotPatch(spotId) })

// Een bekende plek wint van een eigen plek met weinig EXP per uur, dus het profiel doet ertoe.
const drafts = [known('a', 'henesys-rain-forest-east'), own('b', 1_000, 10_000)]

/** De mesokosten van je level op de beste plek, rechtstreeks uitgerekend. */
const costOf = (p: Profile) => {
  const { ranked, bestId } = pickUnder(drafts, p)
  const best = ranked.find((r) => r.spot.id === bestId)!
  if (isInvalid(best)) throw new Error('beste plek ongeldig')
  return mesoCostOfLevel(expToNextLevel(p.level)!, best.expPerMeso)!
}

describe('SKILLS', () => {
  it('zet bij Lucky Seven één level erbij en laat de rest staan', () => {
    const lucky = SKILLS.find((s) => s.id === 'luckySeven')!
    expect(lucky.plusOne(profile)).toEqual({ ...profile, luckySeven: profile.luckySeven + 1 })
    expect(lucky.max).toBe(LUCKY_SEVEN_LEVELS.length)
  })

  it('telt bij Nimble Body de accuracy en avoid van één level op bij je stats', () => {
    const nimble = SKILLS.find((s) => s.id === 'nimbleBody')!
    expect(nimble.plusOne(profile)).toEqual({
      ...profile,
      nimbleBody: profile.nimbleBody + 1,
      accuracy: profile.accuracy + 1,
      avoid: profile.avoid + 1,
    })
    expect(nimble.max).toBe(NIMBLE_BODY.maxLevel)
  })

  it('noemt de andere vier skills van de 1e job onder "niet doorgerekend"', () => {
    expect(NOT_MODELLED).toEqual(['Keen Eyes', 'Double Stab', 'Disorder', 'Dark Sight'])
  })

  it('noemt een doorgerekende skill niet ook onder "niet doorgerekend"', () => {
    for (const s of SKILLS) expect(NOT_MODELLED).not.toContain(s.name)
  })
})

describe('skillPointAdvice', () => {
  it('rekent per skill de mesokosten met één punt erbij, en de besparing tegen de kosten zonder', () => {
    const advice = skillPointAdvice(drafts, profile)
    if (advice.kind !== 'advice') throw new Error('geen advies')
    expect(advice.base).toBeCloseTo(costOf(profile), 6)
    expect(advice.choices).toHaveLength(2)
    for (const c of advice.choices) {
      const skill = SKILLS.find((s) => s.id === c.id)!
      expect(c.to).toBe(skill.level(profile) + 1)
      expect(c.meso).toBeCloseTo(costOf(skill.plusOne(profile)), 6)
      expect(c.saving).toBeCloseTo(advice.base - c.meso!, 6)
    }
  })

  it('zet de grootste besparing eerst en kiest die als winnaar zolang hij boven 0 ligt', () => {
    const advice = skillPointAdvice(drafts, profile)
    if (advice.kind !== 'advice') throw new Error('geen advies')
    const [first, second] = advice.choices
    expect(first.saving!).toBeGreaterThanOrEqual(second.saving!)
    expect(advice.winner).toBe(first.saving! > 0 ? first.id : null)
  })

  it('heeft geen winnaar als het profiel de kosten niet raakt (alleen eigen plekken)', () => {
    const advice = skillPointAdvice([own('a', 40_000, 10_000), own('b', 30_000, 10_000)], profile)
    expect(advice).toMatchObject({ kind: 'advice', base: 429, winner: null, robust: true })
    if (advice.kind === 'advice') for (const c of advice.choices) expect(c.saving).toBe(0)
  })

  it('slaat een skill op het maximum over en noemt hem', () => {
    const maxed = { ...profile, luckySeven: LUCKY_SEVEN_LEVELS.length }
    const advice = skillPointAdvice(drafts, maxed)
    expect(advice).toMatchObject({ kind: 'advice', maxed: ['Lucky Seven'] })
    if (advice.kind === 'advice') expect(advice.choices.map((c) => c.id)).toEqual(['nimbleBody'])
  })

  it('heeft niets te kiezen als alles op het maximum staat', () => {
    const all = { ...profile, luckySeven: LUCKY_SEVEN_LEVELS.length, nimbleBody: NIMBLE_BODY.maxLevel }
    expect(skillPointAdvice(drafts, all)).toMatchObject({ kind: 'advice', choices: [], winner: null, maxed: ['Lucky Seven', 'Nimble Body'] })
  })

  it('geeft geen advies zonder profiel, buiten de EXP-tabel of zonder "Beste"', () => {
    expect(skillPointAdvice(drafts, null)).toEqual({ kind: 'none' })
    expect(skillPointAdvice(drafts, { ...profile, level: 31 })).toEqual({ kind: 'none' })
    expect(skillPointAdvice([own('a', 40_000, 10_000)], profile)).toEqual({ kind: 'none' })
  })
})

describe('skillLevels', () => {
  const levelOf = (over: Partial<ProfileDraft>, key: SkillKey) => skillLevels({ ...DEFAULT_PROFILE, ...over }).find((s) => s.key === key)!.level

  it('geeft elke skill van een Thief tot de 2e job, met het gezette level en het maximum', () => {
    const levels = skillLevels({ ...DEFAULT_PROFILE, luckySeven: '3', keenEyes: '2', recovery: '1' })
    expect(levels.map((s) => s.key)).toEqual(THIEF_SKILLS.map((s) => s.key))
    expect(levels.find((s) => s.key === 'luckySeven')).toMatchObject({ name: 'Lucky Seven', job: 'Thief', level: 3, max: 20 })
    expect(levels.find((s) => s.key === 'keenEyes')).toMatchObject({ level: 2, max: 15 })
    expect(levels.find((s) => s.key === 'recovery')).toMatchObject({ job: 'Beginner', level: 1, max: 3 })
  })

  it('leest een veld met spaties eromheen gewoon', () => {
    expect(levelOf({ darkSight: ' 4 ' }, 'darkSight')).toBe(4)
  })

  it('accepteert 0 en het maximum', () => {
    expect(levelOf({ disorder: '0' }, 'disorder')).toBe(0)
    expect(levelOf({ nimbleFeet: '3' }, 'nimbleFeet')).toBe(3)
  })

  it.each(['', 'abc', '-1', '1.5', '21'])('geeft null bij een ongeldig veld (%j)', (text) => {
    expect(levelOf({ luckySeven: text }, 'luckySeven')).toBeNull()
  })

  it('geeft null boven het maximum van die skill', () => {
    expect(levelOf({ threeSnails: '4' }, 'threeSnails')).toBeNull()
  })

  it('kijkt alleen naar de skillvelden: een ongeldig ander veld maakt niets uit', () => {
    expect(levelOf({ level: '', luckySeven: '5' }, 'luckySeven')).toBe(5)
  })
})

describe('stepSkill', () => {
  it('gaat één level omhoog of omlaag', () => {
    expect(stepSkill('3', 1, 20)).toBe('4')
    expect(stepSkill('3', -1, 20)).toBe('2')
  })

  it('blijft binnen 0 en het maximum', () => {
    expect(stepSkill('0', -1, 20)).toBe('0')
    expect(stepSkill('20', 1, 20)).toBe('20')
    expect(stepSkill('25', -1, 20)).toBe('19')
    expect(stepSkill('-4', 1, 3)).toBe('1')
  })

  it('telt een leeg of ongeldig veld als 0', () => {
    expect(stepSkill('', 1, 15)).toBe('1')
    expect(stepSkill('abc', 1, 15)).toBe('1')
    expect(stepSkill('2.5', -1, 15)).toBe('0')
  })

  it('leest een veld met spaties eromheen', () => {
    expect(stepSkill(' 7 ', 1, 15)).toBe('8')
  })
})

describe('een Warrior: skillsOf, notModelled en skillPointAdvice', () => {
  const wDraft: ProfileDraft = { ...DEFAULT_PROFILE, level: '20', str: '70', dex: '20', luk: '4', clawWatk: '40', weaponMult: '1.8', attackMs: '750', accuracy: '60', powerStrike: '5', preciseStrikes: '2' }
  const wParsed = parseProfile(wDraft, 'warrior')
  if (!('profile' in wParsed)) throw new Error('Warrior-profiel ongeldig')
  const warrior: Profile = wParsed.profile

  it('geeft een Warrior Power Strike en Precise Strikes en een Thief Lucky Seven en Nimble Body', () => {
    expect(skillsOf('warrior').map((s) => s.id)).toEqual(['powerStrike', 'preciseStrikes'])
    expect(skillsOf('thief')).toBe(SKILLS)
    expect(SKILLS.map((s) => s.id)).toEqual(['luckySeven', 'nimbleBody'])
  })

  it('geeft een job die de app niet doorrekent dezelfde skills als de standaard (de adviezen worden toch niet getoond)', () => {
    expect(skillsOf('magician')).toBe(SKILLS)
    expect(skillsOf('bowman')).toBe(SKILLS)
  })

  it('heeft de maxima uit de spelgegevens: Power Strike 20, Precise Strikes 15', () => {
    const [ps, pr] = skillsOf('warrior')
    expect(ps.max).toBe(POWER_STRIKE_LEVELS.length)
    expect(ps.max).toBe(20)
    expect(pr.max).toBe(PRECISE_STRIKES_LEVELS.length)
    expect(pr.max).toBe(15)
  })

  it('zet bij Power Strike één level erbij en laat de rest staan', () => {
    const ps = skillsOf('warrior')[0]
    expect(ps.plusOne(warrior)).toEqual({ ...warrior, powerStrike: 6 })
  })

  it('telt bij Precise Strikes de accuracy van dat level erbij en trekt die van het vorige af (level 2 → 3: 6 → 7)', () => {
    const pr = skillsOf('warrior')[1]
    expect(pr.plusOne(warrior)).toEqual({ ...warrior, preciseStrikes: 3, accuracy: warrior.accuracy + (PRECISE_STRIKES_LEVELS[2].accuracy - PRECISE_STRIKES_LEVELS[1].accuracy) })
    expect(PRECISE_STRIKES_LEVELS[2].accuracy - PRECISE_STRIKES_LEVELS[1].accuracy).toBe(1)
    // 0 → 1 geeft de volle 5.
    expect(pr.plusOne({ ...warrior, preciseStrikes: 0 }).accuracy).toBe(warrior.accuracy + 5)
  })

  it('noemt de vier andere skills van de 1e job van een Warrior onder "niet doorgerekend", en de Thief-lijst blijft zoals hij was', () => {
    expect(notModelled('warrior')).toEqual(['Improved HP Recovery', 'Max HP Increase', 'Iron Body', 'Slash Blast'])
    expect(notModelled('thief')).toEqual(NOT_MODELLED)
    expect(NOT_MODELLED).toEqual(['Keen Eyes', 'Double Stab', 'Disorder', 'Dark Sight'])
  })

  it('noemt een doorgerekende Warrior-skill niet ook onder "niet doorgerekend", en elke 1e-job-skill staat in precies één van de twee', () => {
    const modelled = skillsOf('warrior').map((s) => s.name)
    for (const n of modelled) expect(notModelled('warrior')).not.toContain(n)
    const all = WARRIOR_SKILLS.map((s) => s.name).sort()
    expect([...modelled, ...notModelled('warrior')].sort()).toEqual(all)
  })

  it('rekent per Warrior-skill de mesokosten met één punt erbij, en de besparing tegen de kosten zonder', () => {
    const advice = skillPointAdvice(drafts, warrior)
    if (advice.kind !== 'advice') throw new Error('geen advies')
    expect(advice.base).toBeCloseTo(costOf(warrior), 6)
    expect(advice.choices.map((c) => c.id).sort()).toEqual(['powerStrike', 'preciseStrikes'])
    for (const c of advice.choices) {
      const skill = skillsOf('warrior').find((s) => s.id === c.id)!
      expect(c.to).toBe(skill.level(warrior) + 1)
      expect(c.meso).toBeCloseTo(costOf(skill.plusOne(warrior)), 6)
      expect(c.saving).toBeCloseTo(advice.base - c.meso!, 6)
    }
  })

  it('biedt een Warrior nooit een Thief-skill aan', () => {
    const advice = skillPointAdvice(drafts, warrior)
    if (advice.kind !== 'advice') throw new Error('geen advies')
    for (const c of advice.choices) expect(['luckySeven', 'nimbleBody']).not.toContain(c.id)
  })

  it('slaat een Warrior-skill op het maximum over en noemt hem bij naam', () => {
    const advice = skillPointAdvice(drafts, { ...warrior, powerStrike: 20 })
    expect(advice).toMatchObject({ kind: 'advice', maxed: ['Power Strike'] })
    if (advice.kind === 'advice') expect(advice.choices.map((c) => c.id)).toEqual(['preciseStrikes'])
  })

  it('heeft niets te kiezen als beide Warrior-skills op het maximum staan', () => {
    expect(skillPointAdvice(drafts, { ...warrior, powerStrike: 20, preciseStrikes: 15 })).toMatchObject({
      kind: 'advice',
      choices: [],
      winner: null,
      maxed: ['Power Strike', 'Precise Strikes'],
    })
  })

  it('kiest als winnaar de skill met de grootste besparing boven 0', () => {
    const advice = skillPointAdvice(drafts, warrior)
    if (advice.kind !== 'advice') throw new Error('geen advies')
    const [first, second] = advice.choices
    expect(first.saving!).toBeGreaterThanOrEqual(second.saving!)
    expect(advice.winner).toBe(first.saving! > 0 ? first.id : null)
  })

  it('heeft bij alleen eigen plekken geen winnaar: het profiel raakt de kosten niet, dus elke besparing is 0', () => {
    const advice = skillPointAdvice([own('a', 40_000, 10_000), own('b', 30_000, 10_000)], warrior)
    expect(advice).toMatchObject({ kind: 'advice', winner: null, robust: true })
    if (advice.kind === 'advice') for (const c of advice.choices) expect(c.saving).toBe(0)
  })
})

describe('skillLevels voor de Warrior', () => {
  it('geeft elke skill van de app (Thief en Warrior) als je ze zelf meegeeft, en alleen Thief-skills als standaard', () => {
    expect(skillLevels(DEFAULT_PROFILE).map((s) => s.key)).toEqual(THIEF_SKILLS.map((s) => s.key))
    const all = skillLevels({ ...DEFAULT_PROFILE, powerStrike: '7', preciseStrikes: '15' }, ALL_SKILLS)
    expect(all.map((s) => s.key)).toEqual(ALL_SKILLS.map((s) => s.key))
    expect(all.find((s) => s.key === 'powerStrike')).toMatchObject({ name: 'Power Strike', job: 'Warrior', level: 7, max: 20 })
    expect(all.find((s) => s.key === 'preciseStrikes')).toMatchObject({ level: 15, max: 15 })
  })

  it('geeft null boven het maximum van een Warrior-skill', () => {
    const all = skillLevels({ ...DEFAULT_PROFILE, powerStrike: '21', preciseStrikes: '16' }, ALL_SKILLS)
    expect(all.find((s) => s.key === 'powerStrike')!.level).toBeNull()
    expect(all.find((s) => s.key === 'preciseStrikes')!.level).toBeNull()
  })
})
