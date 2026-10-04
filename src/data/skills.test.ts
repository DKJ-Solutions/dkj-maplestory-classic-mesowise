import { describe, expect, it } from 'vitest'
import { ALL_SKILLS, isSkillKey, SKILL_KEYS, skillInfo, skillMpAt, THIEF_SKILLS } from './skills'
import { LUCKY_SEVEN_LEVELS, NIMBLE_BODY } from './thief'
import { IRON_BODY_LEVELS, POWER_STRIKE_LEVELS, SLASH_BLAST_LEVELS } from './warrior'

describe('THIEF_SKILLS', () => {
  it('heeft de drie Beginner-skills en de zes van de 1e job, elk één keer', () => {
    expect(THIEF_SKILLS.filter((s) => s.job === 'Beginner')).toHaveLength(3)
    expect(THIEF_SKILLS.filter((s) => s.job === 'Thief')).toHaveLength(6)
    expect(new Set(SKILL_KEYS).size).toBe(THIEF_SKILLS.length)
  })

  it("heeft de maxima van de klassenpagina's", () => {
    const max = Object.fromEntries(THIEF_SKILLS.map((s) => [s.name, s.max]))
    expect(max).toEqual({
      'Three Snails': 3,
      'Nimble Feet': 3,
      Recovery: 3,
      'Nimble Body': 15,
      'Keen Eyes': 15,
      'Double Stab': 20,
      Disorder: 20,
      'Dark Sight': 20,
      'Lucky Seven': 20,
    })
  })

  it('zegt over Lucky Seven en Nimble Body hetzelfde als de gegevens waar het model mee rekent', () => {
    expect(skillInfo('luckySeven').max).toBe(LUCKY_SEVEN_LEVELS.length)
    expect(skillInfo('nimbleBody').max).toBe(NIMBLE_BODY.maxLevel)
    expect(skillInfo('luckySeven').source.url).toBe('https://meowdb.com/msclassic/skills/thief/lucky-seven')
    expect(skillInfo('nimbleBody').source.url).toBe(NIMBLE_BODY.source.url)
  })

  it('heeft bij elke skill een MeowDB-pagina en een ophaaldatum', () => {
    for (const s of THIEF_SKILLS) {
      expect(s.source.url).toMatch(/^https:\/\/meowdb\.com\/msclassic\/skills\/(beginner|thief)\/[a-z-]+$/)
      expect(s.source.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

describe('MP per skill-level (#83)', () => {
  it('heeft bij elke actieve skill een MP per level, en geen bij een passieve', () => {
    const passive = ['nimbleBody', 'keenEyes', 'improvedHpRecovery', 'maxHpIncrease', 'preciseStrikes']
    for (const s of ALL_SKILLS) {
      if (passive.includes(s.key)) expect(s.mp, s.name).toBeUndefined()
      else expect(s.mp, s.name).toHaveLength(s.max)
    }
  })

  it('heeft de MP uit de tabel op de skillpagina (opgehaald op 4 oktober 2026)', () => {
    const mp = Object.fromEntries(ALL_SKILLS.filter((s) => s.mp).map((s) => [s.name, s.mp]))
    expect(mp['Three Snails']).toEqual([3, 4, 5])
    expect(mp['Nimble Feet']).toEqual([4, 7, 10])
    expect(mp.Recovery).toEqual([5, 10, 15])
    expect(mp['Double Stab']).toEqual([8, 8, 8, 8, 9, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16])
    expect(mp.Disorder).toEqual([5, 5, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 10])
    // Dark Sight: level 19 kost 32 en level 20 kost 30 (geen vaste stap), zo staat het op de pagina.
    expect(mp['Dark Sight']).toEqual([50, 49, 48, 47, 46, 45, 44, 43, 42, 41, 40, 39, 38, 37, 36, 35, 34, 33, 32, 30])
  })

  it('neemt de MP van de doorgerekende skills uit de gegevens van het model', () => {
    expect(skillInfo('luckySeven').mp).toEqual(LUCKY_SEVEN_LEVELS.map((l) => l.mp))
    expect(skillInfo('powerStrike').mp).toEqual(POWER_STRIKE_LEVELS.map((l) => l.mp))
    expect(skillInfo('slashBlast').mp).toEqual(SLASH_BLAST_LEVELS.map((l) => l.mp))
    expect(skillInfo('ironBody').mp).toEqual(IRON_BODY_LEVELS.map((l) => l.mp))
  })

  it('skillMpAt geeft de MP op het level, op level 0 die van level 1, en null bij een passieve skill', () => {
    expect(skillMpAt(skillInfo('doubleStab'), 5)).toBe(9)
    expect(skillMpAt(skillInfo('darkSight'), 20)).toBe(30)
    expect(skillMpAt(skillInfo('threeSnails'), 0)).toBe(3)
    expect(skillMpAt(skillInfo('keenEyes'), 4)).toBeNull()
  })
})

describe('isSkillKey', () => {
  it('herkent een skill en geen stat', () => {
    expect(isSkillKey('darkSight')).toBe(true)
    expect(isSkillKey('luk')).toBe(false)
  })
})
