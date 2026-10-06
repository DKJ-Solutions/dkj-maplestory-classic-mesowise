import { describe, expect, it } from 'vitest'
import { pickUnder } from './best'
import { isInvalid } from './calc/rankSpots'
import { mesoCostOfLevel } from './calc/mesoCostOfLevel'
import { expToNextLevel } from './data/expTable'
import { mobDraft } from './data/spots'
import { LUCKY_SEVEN_LEVELS, NIMBLE_BODY } from './data/thief'
import { ALL_SKILLS, THIEF_SKILLS, WARRIOR_SKILLS, type SkillKey } from './data/skills'
import { IMPROVED_HP_RECOVERY, POWER_STRIKE_LEVELS, PRECISE_STRIKES_LEVELS } from './data/warrior'
import { DEFAULT_PROFILE, parseProfile, type Profile, type ProfileDraft } from './profile'
import { NOT_MODELLED, notModelled, SKILL_HORIZON_LEVELS, SKILLS, skillHorizon, skillLevels, skillPointAdvice, skillPoolUsage, skillsOf, stepSkill } from './skillPoint'
import { newDraft, type SpotDraft } from './spotDraft'

// Op level 10 heb je 1 skillpunt van de 1e job (issue #136): het voorbeeldprofiel heeft Lucky Seven 1, dus zet de fixture die op 0.
const parsed = parseProfile({ ...DEFAULT_PROFILE, luckySeven: '0' })
if (!('profile' in parsed)) throw new Error('voorbeeldprofiel ongeldig')
const profile: Profile = parsed.profile

const own = (id: string, expPerHour: number, potions: number): SpotDraft => ({
  ...newDraft(id),
  name: id,
  expPerHour: String(expPerHour),
  potions: String(potions),
})
const known = (id: string, mob: string): SpotDraft => ({ ...mobDraft(mob)!, id })

// Een bekende plek wint van een eigen plek met weinig EXP per uur, dus het profiel doet ertoe.
const drafts = [known('a', 'Ribbon Pig'), own('b', 1_000, 10_000)]

/** De mesokosten van één level op de beste plek van dat level, rechtstreeks uitgerekend. */
const levelCostOf = (p: Profile, d: readonly SpotDraft[] = drafts) => {
  const { ranked, bestId } = pickUnder(d, p)
  const best = ranked.find((r) => r.spot.id === bestId)!
  if (isInvalid(best)) throw new Error('beste plek ongeldig')
  return mesoCostOfLevel(expToNextLevel(p.level)!, best.expPerMeso)!
}

/** De mesokosten van de horizon van een skillpunt (je level plus de 4 erna, #145): elk level op dat level doorgerekend. */
const costOf = (p: Profile, d: readonly SpotDraft[] = drafts) => {
  let sum = 0
  for (let level = p.level; level < p.level + 5; level++) sum += levelCostOf({ ...p, level }, d)
  return sum
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

describe('skillHorizon', () => {
  it('loopt van je level tot en met 4 levels verder (#145)', () => {
    expect(SKILL_HORIZON_LEVELS).toBe(5)
    expect(skillHorizon(10)).toEqual({ from: 10, to: 14, truncated: false })
    expect(skillHorizon(26)).toEqual({ from: 26, to: 30, truncated: false })
  })

  it('stopt aan het eind van de EXP-tabel (lv 30), en zegt dat hij is afgekapt', () => {
    expect(skillHorizon(28)).toEqual({ from: 28, to: 30, truncated: true })
    expect(skillHorizon(30)).toEqual({ from: 30, to: 30, truncated: true })
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

  it('rekent elk level van de horizon op dat level door, niet met de EXP per meso van nu (#145)', () => {
    const advice = skillPointAdvice(drafts, profile)
    if (advice.kind !== 'advice') throw new Error('geen advies')
    // Met de EXP per meso van lv 10 voor alle vijf levels: de kosten van lv 10 maal de EXP van de horizon gedeeld door die van lv 10.
    const flat = (levelCostOf(profile) * (1_716 + 2_360 + 3_216 + 4_200 + 5_460)) / 1_716
    expect(advice.base).not.toBeCloseTo(flat, 0)
    expect(advice.base).toBeCloseTo(costOf(profile), 6)
  })

  it('kapt de horizon af aan het eind van de EXP-tabel en telt alleen de levels die er zijn', () => {
    const late = { ...profile, level: 28 }
    const advice = skillPointAdvice(drafts, late)
    if (advice.kind !== 'advice') throw new Error('geen advies')
    expect(advice).toMatchObject({ from: 28, to: 30, truncated: true })
    const sum = [28, 29, 30].reduce((t, level) => t + levelCostOf({ ...late, level }), 0)
    expect(advice.base).toBeCloseTo(sum, 6)
  })

  it('zet de grootste besparing eerst en kiest de eerste als winnaar, ook als die niet boven 0 ligt', () => {
    const advice = skillPointAdvice(drafts, profile)
    if (advice.kind !== 'advice') throw new Error('geen advies')
    const [first, second] = advice.choices
    expect(first.saving!).toBeGreaterThanOrEqual(second.saving!)
    expect(advice.left).toBeGreaterThan(0)
    expect(advice.winner).toBe(first.id)
  })

  it('kiest bij besparing 0 toch een winnaar: een vrij punt moet ergens heen', () => {
    const advice = skillPointAdvice([own('a', 40_000, 10_000), own('b', 30_000, 10_000)], profile)
    // 40.000 EXP per uur voor 10.000 meso is 4 EXP per meso; lv 10 t/m 14 vragen 1.716 + 2.360 + 3.216 + 4.200 + 5.460 = 16.952 EXP.
    expect(advice).toMatchObject({ kind: 'advice', from: 10, to: 14, truncated: false, base: 4238, robust: true })
    if (advice.kind !== 'advice') throw new Error('geen advies')
    expect(advice.left).toBeGreaterThan(0)
    for (const c of advice.choices) expect(c.saving).toBe(0)
    // Gelijke besparingen: de eerste van de lijst wint.
    expect(advice.winner).toBe(advice.choices[0].id)
    expect(advice.winner).not.toBeNull()
  })

  it('laat Nimble Body bij besparing 0 winnen van Lucky Seven als die extra kost, en toont beide', () => {
    const advice = skillPointAdvice([known('a', 'Ribbon Pig')], profile)
    if (advice.kind !== 'advice') throw new Error('geen advies')
    const nimble = advice.choices.find((c) => c.id === 'nimbleBody')!
    const lucky = advice.choices.find((c) => c.id === 'luckySeven')!
    expect(nimble.saving).toBe(0)
    expect(lucky.saving!).toBeLessThan(0)
    expect(advice.choices.map((c) => c.id)).toEqual(['nimbleBody', 'luckySeven'])
    expect(advice.winner).toBe('nimbleBody')
  })

  it('kiest bij alleen negatieve besparingen de minst negatieve als winnaar', () => {
    // Nimble Body op het maximum: alleen Lucky Seven blijft over, en die kost op deze plek extra.
    const only = { ...profile, level: 30, nimbleBody: NIMBLE_BODY.maxLevel }
    const advice = skillPointAdvice([known('a', 'Ribbon Pig')], only)
    if (advice.kind !== 'advice') throw new Error('geen advies')
    expect(advice.left).toBeGreaterThan(0)
    expect(advice.choices.map((c) => c.id)).toEqual(['luckySeven'])
    expect(advice.choices[0].saving!).toBeLessThan(0)
    expect(advice.winner).toBe('luckySeven')
  })

  it('rondt een besparing onder een halve meso af op precies 0, zodat gelijke skills allemaal "scheelt niets" zijn', () => {
    const sets = [[own('a', 40_000, 10_000), own('b', 30_000, 10_000)], drafts, [known('a', 'Ribbon Pig')]]
    for (const d of sets) {
      const advice = skillPointAdvice(d, profile)
      if (advice.kind !== 'advice') throw new Error('geen advies')
      for (const c of advice.choices) {
        expect(c.saving).not.toBeNull()
        // Nooit een rest als 1e-9 of -3e-12: ofwel precies 0 (en dan geen -0), ofwel een echt verschil van minstens een halve meso.
        expect(c.saving === 0 ? Object.is(c.saving, 0) : Math.abs(c.saving!) >= 0.5).toBe(true)
      }
    }
  })

  it('is robuust bij gelijkspel op 0: geen enkele aanname maakt een andere skill beter', () => {
    const advice = skillPointAdvice([own('a', 40_000, 10_000), own('b', 30_000, 10_000)], profile)
    expect(advice).toMatchObject({ kind: 'advice', robust: true })
    const warriorAdvice = skillPointAdvice([own('a', 40_000, 10_000)], profile)
    expect(warriorAdvice).toMatchObject({ kind: 'advice', robust: true })
  })

  it('heeft geen winnaar als er geen punt over is, ook al valt er nog iets te kiezen', () => {
    // Level 10 geeft 1 punt van de 1e job: met Lucky Seven op 1 is die pot vol.
    const full = { ...profile, luckySeven: 1 }
    expect(skillPointAdvice(drafts, full)).toMatchObject({ kind: 'advice', left: 0, choices: [], winner: null })
  })

  it('slaat een skill op het maximum over en noemt hem', () => {
    const maxed = { ...profile, level: 30, luckySeven: LUCKY_SEVEN_LEVELS.length }
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
    expect(skillPointAdvice([], profile)).toEqual({ kind: 'none' })
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
  const wDraft: ProfileDraft = { ...DEFAULT_PROFILE, lukExtra: '0', level: '20', str: '70', dex: '20', luk: '4', clawWatk: '40', weaponMult: '1.8', attackMs: '750', accuracy: '60', powerStrike: '5', preciseStrikes: '2' }
  const wParsed = parseProfile(wDraft, 'warrior')
  if (!('profile' in wParsed)) throw new Error('Warrior-profiel ongeldig')
  const warrior: Profile = wParsed.profile

  it('geeft een Warrior Power Strike, Precise Strikes, Improved HP Recovery, Max HP Increase en Iron Body en een Thief Lucky Seven en Nimble Body', () => {
    expect(skillsOf('warrior').map((s) => s.id)).toEqual(['powerStrike', 'preciseStrikes', 'improvedHpRecovery', 'maxHpIncrease', 'ironBody'])
    expect(skillsOf('thief')).toBe(SKILLS)
    expect(SKILLS.map((s) => s.id)).toEqual(['luckySeven', 'nimbleBody'])
  })

  it('geeft een job die de app niet doorrekent dezelfde skills als de standaard (de adviezen worden toch niet getoond)', () => {
    expect(skillsOf('thief')).toBe(SKILLS)
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

  it('noemt de andere skill van de 1e job van een Warrior (Slash Blast) onder "niet doorgerekend", en de Thief-lijst blijft zoals hij was', () => {
    expect(notModelled('warrior')).toEqual(['Slash Blast'])
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
    expect(advice.choices.map((c) => c.id).sort()).toEqual(['improvedHpRecovery', 'powerStrike', 'preciseStrikes'])
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
    if (advice.kind === 'advice') expect(advice.choices.map((c) => c.id).sort()).toEqual(['improvedHpRecovery', 'preciseStrikes'])
  })

  it('heeft niets te kiezen als alle Warrior-skills op het maximum staan', () => {
    expect(skillPointAdvice(drafts, { ...warrior, powerStrike: 20, preciseStrikes: 15, improvedHpRecovery: 15 })).toMatchObject({
      kind: 'advice',
      choices: [],
      winner: null,
      maxed: ['Power Strike', 'Precise Strikes', 'Improved HP Recovery'],
    })
  })

  it('zet bij Improved HP Recovery één level erbij, tot het maximum van 15, en laat de rest staan (#141)', () => {
    const hr = skillsOf('warrior').find((s) => s.id === 'improvedHpRecovery')!
    expect(hr.max).toBe(IMPROVED_HP_RECOVERY.itemRecoveryPct.length)
    expect(hr.max).toBe(15)
    expect(hr.plusOne(warrior)).toEqual({ ...warrior, improvedHpRecovery: 1 })
  })

  it('laat een punt in Improved HP Recovery de mesokosten zakken zodra de Warrior HP-potions drinkt (#141)', () => {
    const advice = skillPointAdvice(drafts, warrior)
    if (advice.kind !== 'advice') throw new Error('geen advies')
    const hr = advice.choices.find((c) => c.id === 'improvedHpRecovery')!
    expect(hr.saving!).toBeGreaterThan(0)
  })

  it('kiest als winnaar de skill met de grootste besparing', () => {
    const advice = skillPointAdvice(drafts, warrior)
    if (advice.kind !== 'advice') throw new Error('geen advies')
    const [first, second] = advice.choices
    expect(first.saving!).toBeGreaterThanOrEqual(second.saving!)
    expect(advice.winner).toBe(first.id)
  })

  it('heeft bij alleen eigen plekken toch een winnaar: het profiel raakt de kosten niet, dus elke besparing is 0', () => {
    const advice = skillPointAdvice([own('a', 40_000, 10_000), own('b', 30_000, 10_000)], warrior)
    expect(advice).toMatchObject({ kind: 'advice', robust: true })
    if (advice.kind !== 'advice') throw new Error('geen advies')
    for (const c of advice.choices) expect(c.saving).toBe(0)
    // Een vrij punt moet toch ergens heen: de eerste van de gelijke keuzes wint.
    expect(advice.left).toBeGreaterThan(0)
    expect(advice.winner).toBe(advice.choices[0].id)
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

describe('skillPoolUsage (issue #136)', () => {
  const usage = (over: Partial<ProfileDraft>, job: 'thief' | 'warrior', pool: 'beginner' | 'job') => skillPoolUsage({ ...DEFAULT_PROFILE, ...over }, job, pool)

  it('geeft wat je zette en wat je level geeft, per pot', () => {
    expect(usage({ level: '11', luckySeven: '3', nimbleBody: '1', threeSnails: '2' }, 'thief', 'job')).toEqual({ spent: 4, cap: 4 })
    expect(usage({ level: '11', luckySeven: '3', nimbleBody: '1', threeSnails: '2' }, 'thief', 'beginner')).toEqual({ spent: 2, cap: 9 })
  })

  it('telt alleen de skills die de job toont', () => {
    expect(usage({ level: '30', luckySeven: '9', powerStrike: '7' }, 'warrior', 'job')).toEqual({ spent: 7, cap: 61 })
    expect(usage({ level: '30', luckySeven: '9', powerStrike: '7' }, 'thief', 'job')).toEqual({ spent: 9, cap: 61 })
  })

  it('geeft cap null bij een level dat geen geldig getal is, en telt de rest gewoon', () => {
    for (const level of ['', 'abc', '10.5', '0', '201']) expect(usage({ level, luckySeven: '2' }, 'thief', 'job'), level).toEqual({ spent: 2, cap: null })
  })

  it('telt een ongeldig skillveld als 0', () => {
    expect(usage({ level: '10', luckySeven: 'x' }, 'thief', 'job')).toEqual({ spent: 0, cap: 1 })
  })
})

describe('skillPointAdvice: punten over (issue #136)', () => {
  it('geeft de punten die je nog over hebt in `left`', () => {
    expect(skillPointAdvice(drafts, { ...profile, level: 11 })).toMatchObject({ kind: 'advice', left: 4 })
    expect(skillPointAdvice(drafts, { ...profile, level: 11, luckySeven: 3 })).toMatchObject({ kind: 'advice', left: 1 })
  })

  it('adviseert nog gewoon zolang er een punt over is', () => {
    const advice = skillPointAdvice(drafts, profile)
    expect(advice).toMatchObject({ kind: 'advice', left: 1 })
    if (advice.kind === 'advice') expect(advice.choices.length).toBeGreaterThan(0)
  })

  it('geeft geen keuzes en geen winnaar als er geen punt meer over is, maar toch een advies met left 0', () => {
    const advice = skillPointAdvice(drafts, { ...profile, luckySeven: 1 })
    expect(advice).toMatchObject({ kind: 'advice', left: 0, choices: [], winner: null })
  })

  it('geeft bij een Warrior zonder punt over ook geen keuzes', () => {
    const warrior = { ...profile, job: 'warrior' as const, level: 10, powerStrike: 1, luckySeven: 0 }
    expect(skillPointAdvice(drafts, warrior)).toMatchObject({ kind: 'advice', left: 0, choices: [], winner: null })
  })
})

describe('minusOne en plusOne', () => {
  const warriorBase = (() => {
    const r = parseProfile({ ...DEFAULT_PROFILE, lukExtra: '0', hp: '800', str: '90', dex: '20', luk: '4', clawWatk: '40', weaponMult: '1.8', attackMs: '750', accuracy: '40', avoid: '10', wdef: '60' }, 'warrior')
    if (!('profile' in r)) throw new Error('profiel ongeldig')
    return r.profile
  })()

  it('draait bij Nimble Body plusOne exact terug, ook voor accuracy en avoid', () => {
    const nimble = SKILLS.find((s) => s.id === 'nimbleBody')!
    for (const lvl of [0, 1, 3, nimble.max - 1]) {
      const p = { ...profile, nimbleBody: lvl, accuracy: profile.accuracy + lvl, avoid: profile.avoid + lvl }
      expect(nimble.minusOne(nimble.plusOne(p))).toEqual(p)
    }
    const down = nimble.minusOne({ ...profile, nimbleBody: 2 })
    expect(down).toMatchObject({ nimbleBody: 1, accuracy: profile.accuracy - NIMBLE_BODY.accuracyPerLevel, avoid: profile.avoid - NIMBLE_BODY.avoidPerLevel })
  })

  it('draait bij Precise Strikes plusOne exact terug op elk level, ook voor accuracy', () => {
    const precise = skillsOf('warrior').find((s) => s.id === 'preciseStrikes')!
    for (let lvl = 0; lvl < precise.max; lvl++) {
      const p = { ...warriorBase, preciseStrikes: lvl }
      expect(precise.minusOne(precise.plusOne(p))).toEqual(p)
    }
  })

  it('draait de skills die alleen hun level zetten ook exact terug', () => {
    for (const s of skillsOf('warrior').filter((x) => ['powerStrike', 'improvedHpRecovery', 'ironBody'].includes(x.id))) {
      const p = { ...warriorBase, improvedHpRecovery: 3, maxHpIncrease: 3 }
      expect(s.minusOne(s.plusOne(p))).toEqual(p)
    }
  })

  it('draait Max HP Increase terug op hoogstens 1 HP na, en laat de rest staan', () => {
    const mhi = skillsOf('warrior').find((s) => s.id === 'maxHpIncrease')!
    for (const lvl of [0, 1, 3, 10]) {
      const p = { ...warriorBase, maxHpIncrease: lvl, hp: 1200 }
      const back = mhi.minusOne(mhi.plusOne(p))
      expect(back.maxHpIncrease).toBe(lvl)
      expect(Math.abs(back.hp - p.hp)).toBeLessThanOrEqual(1)
      expect({ ...back, hp: 0 }).toEqual({ ...p, hp: 0 })
    }
  })
})

describe('skillPointAdvice: de plaatsingscheck zonder punt over', () => {
  const magRaw = { ...DEFAULT_PROFILE, lukExtra: '0', hp: '600', int: '60', dex: '20', luk: '10', clawWatk: '31', accuracy: '40', avoid: '10', wdef: '40', luckySeven: '0', nimbleBody: '0' }
  const warRaw = { ...DEFAULT_PROFILE, lukExtra: '0', hp: '800', str: '90', dex: '20', luk: '4', clawWatk: '40', weaponMult: '1.8', attackMs: '750', accuracy: '40', avoid: '10', wdef: '60', luckySeven: '0', nimbleBody: '0' }
  const advise = (job: 'magician' | 'warrior' | 'thief', raw: object, mob: string) => {
    const r = parseProfile(raw as ProfileDraft, job)
    if (!('profile' in r)) throw new Error('profiel ongeldig')
    const a = skillPointAdvice([mobDraft(mob)!], r.profile)
    if (a.kind !== 'advice') throw new Error('geen advies')
    expect(a.left).toBe(0)
    return a
  }
  const MOBS_TO_TRY = ['Ribbon Pig', 'Snail', 'Pig', 'Orange Mushroom', 'Stump']

  it('geeft geen plaatsing zolang er nog een punt over is', () => {
    const a = skillPointAdvice(drafts, profile)
    if (a.kind !== 'advice') throw new Error('geen advies')
    expect(a.left).toBeGreaterThan(0)
    expect(a.placement).toBeNull()
  })

  it('geeft "better" met de besparing als een punt van A naar B de kosten verlaagt: Lucky Seven 1 naar Nimble Body', () => {
    const a = advise('thief', { ...DEFAULT_PROFILE, level: '10' }, 'Ribbon Pig')
    expect(a.placement).toMatchObject({ kind: 'better', from: 'Lucky Seven', to: 'Nimble Body' })
    // De besparing is de huidige kosten min die van de verdeling met het punt in Nimble Body.
    const alt = advise('thief', { ...DEFAULT_PROFILE, level: '10', luckySeven: '0', nimbleBody: '1' }, 'Ribbon Pig')
    const saving = a.placement && a.placement.kind === 'better' ? a.placement.saving : 0
    expect(saving).toBeCloseTo(a.base - alt.base, 6)
    expect(saving).toBeGreaterThanOrEqual(0.5)
  })

  it('geeft "good" als geen verplaatsing goedkoper is: het punt staat al in Nimble Body', () => {
    const a = advise('thief', { ...DEFAULT_PROFILE, level: '10', luckySeven: '0', nimbleBody: '1' }, 'Ribbon Pig')
    expect(a.placement).toMatchObject({ kind: 'good' })
  })

  it('geeft null als geen punt te verplaatsen valt omdat het in een skill staat die het model niet kent', () => {
    const a = advise('thief', { ...DEFAULT_PROFILE, level: '10', luckySeven: '0', nimbleBody: '0', keenEyes: '1' }, 'Ribbon Pig')
    expect(a.placement).toBeNull()
    expect(a.winner).toBeNull()
  })

  it('haalt bij een Magician met Magic Claw nooit het punt uit Energy Bolt 1, want dan is Magic Claw niet meer te leren', () => {
    for (const mob of MOBS_TO_TRY) {
      const a = advise('magician', { ...magRaw, level: '11', energyBolt: '1', magicClaw: '1', improvedMpRecovery: '2' }, mob)
      expect(a.placement).toMatchObject({ kind: 'better', from: 'Magic Claw', to: 'Improved MP Recovery' })
    }
  })

  it('haalt bij een Magician wel een punt uit Energy Bolt als Magic Claw geldig blijft (Energy Bolt 2 naar 1)', () => {
    for (const mob of MOBS_TO_TRY) {
      const a = advise('magician', { ...magRaw, level: '11', energyBolt: '2', magicClaw: '2', improvedMpRecovery: '0' }, mob)
      expect(a.placement).toMatchObject({ kind: 'better', from: 'Energy Bolt', to: 'Improved MP Recovery' })
    }
  })

  it('haalt bij een Warrior geen punt uit Improved HP Recovery 3 zolang Max HP Increase erop rust, en niet uit Max HP Increase 3 zolang Iron Body erop rust', () => {
    for (const mob of MOBS_TO_TRY) {
      const a = advise('warrior', { ...warRaw, level: '11', improvedHpRecovery: '3', maxHpIncrease: '1', powerStrike: '0', preciseStrikes: '0' }, mob)
      expect(a.placement).toMatchObject({ kind: 'better', from: 'Max HP Increase', to: 'Improved HP Recovery' })
      const b = advise('warrior', { ...warRaw, level: '12', improvedHpRecovery: '3', maxHpIncrease: '3', ironBody: '1', powerStrike: '0', preciseStrikes: '0' }, mob)
      expect(b.placement).toMatchObject({ kind: 'better', from: 'Iron Body', to: 'Improved HP Recovery' })
    }
  })

  it('haalt bij een Warrior zonder Iron Body het punt wel uit een vrije skill (Power Strike) naar Improved HP Recovery', () => {
    const a = advise('warrior', { ...warRaw, level: '12', improvedHpRecovery: '3', maxHpIncrease: '3', powerStrike: '1', preciseStrikes: '0' }, 'Snail')
    expect(a.placement).toMatchObject({ kind: 'better', from: 'Power Strike', to: 'Improved HP Recovery' })
  })
})

describe('skillPointAdvice: placement.closest bij "good"', () => {
  const adviseW = (raw: object, job: 'thief' | 'warrior', mob: string) => {
    const r = parseProfile(raw as ProfileDraft, job)
    if (!('profile' in r)) throw new Error('profiel ongeldig')
    const a = skillPointAdvice([mobDraft(mob)!], r.profile)
    if (a.kind !== 'advice') throw new Error('geen advies')
    expect(a.left).toBe(0)
    return a
  }
  const closestOf = (a: ReturnType<typeof adviseW>) => {
    if (!a.placement || a.placement.kind !== 'good') throw new Error('good verwacht')
    return a.placement.closest
  }

  it('geeft bij Nimble Body 1 de verplaatsing naar Lucky Seven met precies de extra kosten, en die is negatief', () => {
    const base = { ...DEFAULT_PROFILE, level: '10' }
    const a = adviseW({ ...base, luckySeven: '0', nimbleBody: '1' }, 'thief', 'Ribbon Pig')
    const c = closestOf(a)
    expect(c).toMatchObject({ from: 'Nimble Body', to: 'Lucky Seven' })
    // Rechtstreeks nagerekend: de kosten met het punt in Lucky Seven, via een eigen profiel.
    const alt = adviseW({ ...base, luckySeven: '1', nimbleBody: '0' }, 'thief', 'Ribbon Pig')
    expect(c!.saving).toBeCloseTo(a.base - alt.base, 6)
    expect(c!.saving).toBeLessThan(0)
  })

  it('kiest als closest de verplaatsing met de hoogste (minst negatieve) besparing, en nooit een positieve', () => {
    // Warrior met het punt in Improved HP Recovery: Power Strike en Precise Strikes zijn de alternatieven.
    const raw = { ...DEFAULT_PROFILE, lukExtra: '0', hp: '800', str: '90', dex: '20', luk: '4', clawWatk: '40', weaponMult: '1.8', attackMs: '750', accuracy: '40', avoid: '10', wdef: '60', luckySeven: '0', nimbleBody: '0', level: '10', powerStrike: '0', preciseStrikes: '0' }
    const a = adviseW({ ...raw, improvedHpRecovery: '1' }, 'warrior', 'Ribbon Pig')
    const c = closestOf(a)!
    const viaPrecise = adviseW({ ...raw, preciseStrikes: '1' }, 'warrior', 'Ribbon Pig')
    const viaPower = adviseW({ ...raw, powerStrike: '1' }, 'warrior', 'Ribbon Pig')
    const savings = { 'Precise Strikes': a.base - viaPrecise.base, 'Power Strike': a.base - viaPower.base }
    for (const s of Object.values(savings)) expect(s).toBeLessThanOrEqual(0)
    const best = Object.entries(savings).reduce((x, y) => (y[1] > x[1] ? y : x))
    expect(c.from).toBe('Improved HP Recovery')
    expect(c.to).toBe(best[0])
    expect(c.saving).toBeCloseTo(best[1], 6)
    expect(c.saving).toBeLessThanOrEqual(0)
  })

  it('heeft bij "better" geen closest: dan telt alleen de beste verplaatsing', () => {
    const a = adviseW({ ...DEFAULT_PROFILE, level: '10' }, 'thief', 'Ribbon Pig')
    expect(a.placement).toMatchObject({ kind: 'better' })
    expect(a.placement).not.toHaveProperty('closest')
  })
})

describe('skillPointAdvice: robust bij de plaatsingscheck', () => {
  const magRaw = { ...DEFAULT_PROFILE, lukExtra: '0', hp: '600', int: '60', dex: '20', luk: '10', clawWatk: '31', accuracy: '40', avoid: '10', wdef: '40', luckySeven: '0', nimbleBody: '0' }
  const adviseR = (job: 'thief' | 'magician', raw: object, mob: string) => {
    const r = parseProfile(raw as ProfileDraft, job)
    if (!('profile' in r)) throw new Error('profiel ongeldig')
    const a = skillPointAdvice([mobDraft(mob)!], r.profile)
    if (a.kind !== 'advice') throw new Error('geen advies')
    expect(a.left).toBe(0)
    return a
  }

  it('is robuust bij een stabiele "better": Lucky Seven 1 naar Nimble Body, onder elke aanname', () => {
    const a = adviseR('thief', { ...DEFAULT_PROFILE, level: '10' }, 'Ribbon Pig')
    expect(a.placement).toMatchObject({ kind: 'better' })
    expect(a.robust).toBe(true)
  })

  it('is robuust bij een stabiele "good": het punt staat al in Nimble Body', () => {
    const a = adviseR('thief', { ...DEFAULT_PROFILE, level: '10', luckySeven: '0', nimbleBody: '1' }, 'Ribbon Pig')
    expect(a.placement).toMatchObject({ kind: 'good' })
    expect(a.robust).toBe(true)
  })

  it('is niet robuust als een aanname de plaatsing laat kantelen (gevonden door te zoeken, vastgezet): Magician lv 12, Energy Bolt 2, Magic Claw 5 op Bubbling', () => {
    const a = adviseR('magician', { ...magRaw, level: '12', energyBolt: '2', magicClaw: '5', improvedMpRecovery: '0' }, 'Bubbling')
    expect(a.placement).toMatchObject({ kind: 'better', from: 'Magic Claw', to: 'Improved MP Recovery' })
    expect(a.robust).toBe(false)
  })
})
