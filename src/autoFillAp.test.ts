import { describe, expect, it } from 'vitest'
import { autoFillAp, autoFillMessage, autoFillPatch } from './autoFillAp'
import { apAtLevel } from './data/thief'
import { defaultEquipment, itemRequirements, OTHER, type Equipment } from './equipment'

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
    // LUK komt ruim boven 45 uit
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

  it('een eigen item telt als geen eis en staat in unknown; een item zonder prijs kent zijn eisen (#158)', () => {
    const eq = wear({ hat: 'Brown Skullcap' })
    eq.shoes = { pick: OTHER, name: 'Mijn schoenen', stat: '5' }
    const r = autoFillAp('thief', '30', eq)
    expect(r).toMatchObject({ ok: true, unknown: ['Mijn schoenen'], limitedBy: null })
    expect(autoFillMessage('thief', r)).toBeNull()
  })

  it('stats buiten hoofd en secundair blijven op 4 als niets er meer voor vraagt', () => {
    const r = autoFillAp('thief', '60', wear({ claw: 'Steel Igor' }))
    expect(r.ok && r.base.int).toBe(4)
  })

  it('na een gelukte invulling geen melding: de secundaire stat staat op de eis van het item', () => {
    const r = autoFillAp('thief', '30', wear({ claw: 'Steel Igor' }))
    expect(autoFillMessage('thief', r)).toBeNull()
  })

  it('autoFillPatch schrijft alleen de vier base-velden', () => {
    const r = autoFillAp('thief', '30', defaultEquipment())
    if (!r.ok) throw new Error('verwacht ok')
    expect(Object.keys(autoFillPatch(r.base)).sort()).toEqual(['dex', 'int', 'luk', 'str'])
  })
})

describe('itemRequirements', () => {
  it('kent de eisen van een winkelitem en van een item zonder prijs, en niet die van een onbekende naam (#158)', () => {
    expect(itemRequirements('claw', { pick: 'Steel Igor', name: '', stat: '' })).toEqual({ luk: 45, dex: 20 })
    expect(itemRequirements('claw', { pick: 'unknown', name: '', stat: '' })).toBeUndefined()
    expect(itemRequirements('hat', { pick: 'Brown Skullcap', name: '', stat: '' })).toEqual({})
  })

  it('kent de eisen van de items zonder prijs, per lijst één steekproef van de MeowDB-itempagina (#158)', () => {
    const req = (slot: Parameters<typeof itemRequirements>[0], pick: string) => itemRequirements(slot, { pick, name: '', stat: '' })
    // wornItems.ts: twee broeken van hetzelfde level met een andere eis, en een hoed zonder jobregel met een INT-eis.
    expect(req('bottom', 'Blue Cloth Pants')).toEqual({ dex: 10 })
    expect(req('bottom', 'Black Cloth Pants')).toEqual({ luk: 10 })
    expect(req('hat', 'Bronze Pride')).toEqual({ int: 40 })
    // wornWarrior.ts, bowman.ts en accessories.ts.
    expect(req('bottom', 'Steel Sergeant Kilt')).toEqual({ str: 30, dex: 10 })
    expect(req('bottom', 'Brown Able Skirt')).toEqual({ dex: 20 })
    expect(req('shield', 'Nimble Wristguard')).toEqual({ dex: 12, luk: 34 })
    expect(req('gloves', 'Dark Wolfskin')).toEqual({ dex: 15, luk: 40 })
    // Een pagina zonder vereistenblok: geen eis.
    expect(req('shoes', 'Leather Sandals')).toEqual({})
    expect(itemRequirements('top', { pick: 'Blue Pao', name: '', stat: '' })).toEqual({ dex: 10, luk: 30 })
  })
})

describe('een derde stat', () => {
  it('een eis op een stat die geen hoofd of secundair is wordt opgetild', () => {
    const r = autoFillAp('thief', '40', wear({ claw: 'Gladius' }))
    expect(r).toMatchObject({ ok: true, limits: { str: 'Gladius' } })
    expect(autoFillMessage('thief', r)).toBeNull()
  })
})
