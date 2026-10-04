import { describe, expect, it } from 'vitest'
import { skillPointCap, skillPoolOf } from './skillPoints'

describe('skillPointCap (issue #136)', () => {
  it('geeft de Beginner-pot 1 punt per level-up, tot 9', () => {
    const caps = [1, 2, 9, 10, 11, 30].map((level) => skillPointCap(level, 'beginner'))
    expect(caps).toEqual([0, 1, 8, 9, 9, 9])
  })

  it('geeft de pot van de 1e job niets onder level 10, dan 1 + 3 per level (61 op level 30)', () => {
    const caps = [1, 2, 9, 10, 11, 30].map((level) => skillPointCap(level, 'job'))
    expect(caps).toEqual([0, 0, 0, 1, 4, 61])
  })

  it('wordt nooit negatief, ook niet bij een level onder 1', () => {
    expect(skillPointCap(0, 'beginner')).toBe(0)
    expect(skillPointCap(-5, 'beginner')).toBe(0)
    expect(skillPointCap(-5, 'job')).toBe(0)
  })
})

describe('skillPoolOf', () => {
  it('zet Beginner-skills in de Beginner-pot', () => {
    expect(skillPoolOf('Beginner')).toBe('beginner')
  })

  it('zet de skills van elke 1e job in de pot van de 1e job', () => {
    for (const job of ['Thief', 'Warrior', 'Bowman', 'Magician'] as const) expect(skillPoolOf(job), job).toBe('job')
  })
})
