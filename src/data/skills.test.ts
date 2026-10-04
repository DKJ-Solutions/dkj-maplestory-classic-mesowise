import { describe, expect, it } from 'vitest'
import { isSkillKey, SKILL_KEYS, skillInfo, THIEF_SKILLS } from './skills'
import { LUCKY_SEVEN_LEVELS, NIMBLE_BODY } from './thief'

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

describe('isSkillKey', () => {
  it('herkent een skill en geen stat', () => {
    expect(isSkillKey('darkSight')).toBe(true)
    expect(isSkillKey('luk')).toBe(false)
  })
})
