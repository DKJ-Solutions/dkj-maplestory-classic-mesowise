import { describe, expect, it } from 'vitest'
import { ENERGY_BOLT_LEVELS, ENERGY_BOLT_SOURCE, MAGIC_CLAW_LEVELS, MAGIC_CLAW_SOURCE } from './magician'
import { ALL_SKILLS, isSkillKey, MAGICIAN_SKILLS, SKILL_KEYS, skillInfo, THIEF_SKILLS } from './skills'
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

describe('MAGICIAN_SKILLS', () => {
  it('heeft de zes skills van de 1e job van een Magician, met de maxima van de skillpagina\'s', () => {
    const max = Object.fromEntries(MAGICIAN_SKILLS.map((s) => [s.name, s.max]))
    expect(max).toEqual({
      'Magic Guard': 15,
      'Magic Armor': 20,
      'Improved MP Recovery': 15,
      'Max MP Increase': 15,
      'Energy Bolt': 20,
      'Magic Claw': 20,
    })
    expect(MAGICIAN_SKILLS.every((s) => s.job === 'Magician')).toBe(true)
  })

  it('heeft bij elke skill een MeowDB-pagina en een ophaaldatum, en geen sleutel die al bij een andere job staat', () => {
    for (const s of MAGICIAN_SKILLS) {
      expect(s.source.url).toMatch(/^https:\/\/meowdb\.com\/msclassic\/skills\/magician\/[a-z-]+$/)
      expect(s.source.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
    const keys = ALL_SKILLS.map((s) => s.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('zegt over Energy Bolt en Magic Claw hetzelfde als de gegevens waar het model mee rekent', () => {
    expect(skillInfo('energyBolt').max).toBe(ENERGY_BOLT_LEVELS.length)
    expect(skillInfo('magicClaw').max).toBe(MAGIC_CLAW_LEVELS.length)
    expect(skillInfo('energyBolt').source.url).toBe(ENERGY_BOLT_SOURCE.url)
    expect(skillInfo('magicClaw').source.url).toBe(MAGIC_CLAW_SOURCE.url)
  })
})
