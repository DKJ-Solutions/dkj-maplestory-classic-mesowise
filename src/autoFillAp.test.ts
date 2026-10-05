import { describe, expect, it } from 'vitest'
import { autoFillAp, autoFillMessage, autoFillPatch } from './autoFillAp'
import { apAtLevel } from './data/thief'
import { defaultEquipment, OTHER, type Equipment } from './equipment'

const wear = (patch: Partial<Record<keyof Equipment, string>>): Equipment => {
  const eq = defaultEquipment()
  for (const [slot, pick] of Object.entries(patch)) eq[slot as keyof Equipment] = { pick: pick!, name: '', stat: '' }
  return eq
}
const sum = (b: Record<string, number>) => Object.values(b).reduce((a, n) => a + n, 0)

describe('autoFillAp', () => {
  it('Thief: DEX krijgt de hoogste eis, de rest gaat naar LUK, de andere twee blijven 4', () => {
    const r = autoFillAp('thief', '30', wear({ claw: 'Steel Igor' }))
    expect(r).toMatchObject({ ok: true, base: { str: 4, dex: 20, int: 4, luk: apAtLevel(30) - 28 }, limitedBy: 'Steel Igor' })
    if (r.ok) expect(sum(r.base)).toBe(apAtLevel(30))
  })

  it('zonder equipment: secundaire stat 4, alles andere naar de hoofdstat, geen limietitem', () => {
    const r = autoFillAp('warrior', '10', defaultEquipment())
    expect(r).toMatchObject({ ok: true, base: { str: apAtLevel(10) - 12, dex: 4, int: 4, luk: 4 }, limitedBy: null, unknown: [] })
  })

  it('hoofd en secundair per job', () => {
    const lvl = '50'
    expect(autoFillAp('bowman', lvl, defaultEquipment())).toMatchObject({ ok: true, base: { dex: apAtLevel(50) - 12, str: 4 } })
    expect(autoFillAp('magician', lvl, defaultEquipment())).toMatchObject({ ok: true, base: { int: apAtLevel(50) - 12, luk: 4 } })
  })

  it('een eis op de hoofdstat wordt door de hoofdstat zelf gehaald', () => {
    // Steel Igor vraagt LUK 45; op level 30 komt LUK uit op 170 - 12 - 20 + ... ruim erboven
    const r = autoFillAp('thief', '30', wear({ claw: 'Steel Igor' }))
    if (r.ok) expect(r.base.luk).toBeGreaterThanOrEqual(45)
  })

  it('meldt dat er te weinig AP is en schrijft niets', () => {
    // Level 1: 25 AP; Steel Igor vraagt LUK 45 en DEX 20
    const r = autoFillAp('thief', '1', wear({ claw: 'Steel Igor' }))
    expect(r).toMatchObject({ ok: false, reason: 'short', have: 25, need: 20 + 4 + 4 + 45 })
    expect(autoFillMessage('thief', r)).toContain('Er is niets ingevuld')
  })

  it('een ongeldig level geeft niets', () => {
    for (const lvl of ['', 'abc', '0', '201', '10.5']) expect(autoFillAp('thief', lvl, defaultEquipment())).toMatchObject({ ok: false, reason: 'level' })
  })

  it('een eigen item en een item zonder prijs tellen als geen eis en staan in unknown', () => {
    const eq = wear({ hat: 'Brown Skullcap' })
    eq.shoes = { pick: OTHER, name: 'Mijn schoenen', stat: '5' }
    const r = autoFillAp('thief', '30', eq)
    expect(r).toMatchObject({ ok: true, unknown: ['Brown Skullcap', 'Mijn schoenen'], limitedBy: null })
    expect(autoFillMessage('thief', r)).toContain('Brown Skullcap')
  })

  it('stats buiten hoofd en secundair blijven op 4 als niets er meer voor vraagt', () => {
    const r = autoFillAp('thief', '60', wear({ claw: 'Steel Igor' }))
    expect(r.ok && r.base.int).toBe(4)
  })

  it('de melding noemt de secundaire stat met het item en de hoofdstat', () => {
    const r = autoFillAp('thief', '30', wear({ claw: 'Steel Igor' }))
    expect(autoFillMessage('thief', r)).toBe(`Ingevuld: DEX 20 (voor Steel Igor), LUK ${apAtLevel(30) - 28}.`)
  })

  it('autoFillPatch schrijft alleen de vier base-velden', () => {
    const r = autoFillAp('thief', '30', defaultEquipment())
    if (!r.ok) throw new Error('verwacht ok')
    expect(Object.keys(autoFillPatch(r.base)).sort()).toEqual(['dex', 'int', 'luk', 'str'])
  })
})

describe('itemRequirements', () => {
  it('kent de eisen van een winkelitem en niet die van leeg, ammo of een item zonder prijs', async () => {
    const { itemRequirements } = await import('./equipment')
    expect(itemRequirements('claw', { pick: 'Steel Igor', name: '', stat: '' })).toEqual({ luk: 45, dex: 20 })
    expect(itemRequirements('claw', { pick: 'unknown', name: '', stat: '' })).toBeUndefined()
    expect(itemRequirements('hat', { pick: 'Brown Skullcap', name: '', stat: '' })).toBeUndefined()
  })
})
