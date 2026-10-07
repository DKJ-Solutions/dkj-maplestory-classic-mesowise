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
    // Level 20: niets dat je op je level mag dragen vraagt meer DEX dan Steel Igor.
    const r = autoFillAp('thief', '20', wear({ claw: 'Steel Igor' }))
    expect(r).toMatchObject({ ok: true, base: { str: 4, dex: 20, int: 4, luk: apAtLevel(20) - 28 }, limitedBy: 'Steel Igor' })
    if (r.ok) expect(sum(r.base)).toBe(apAtLevel(20))
  })

  it('zonder equipment: secundaire stat 4, alles andere naar de hoofdstat, geen limietitem', () => {
    const r = autoFillAp('warrior', '10', defaultEquipment())
    expect(r).toMatchObject({ ok: true, base: { str: apAtLevel(10) - 12, dex: 4, int: 4, luk: 4 }, limitedBy: null, unknown: [] })
  })

  it('hoofd en secundair per job; zonder equipment volgt de secundaire stat wat je op je level mag dragen', () => {
    const lvl = '50'
    expect(autoFillAp('bowman', lvl, defaultEquipment())).toMatchObject({ ok: true, base: { dex: apAtLevel(50) - 38, str: 30 }, limitedBy: 'Ryden' })
    expect(autoFillAp('magician', lvl, defaultEquipment())).toMatchObject({ ok: true, base: { int: apAtLevel(50) - 28, luk: 20 }, limitedBy: 'Wizard Staff' })
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
    const r = autoFillAp('thief', '8', eq)
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

describe('autoFillAp: items die je nog niet draagt (Dave, 5 oktober 2026)', () => {
  it('een Thief zonder equipment krijgt DEX voor wat hij op zijn level mag dragen', () => {
    expect(autoFillAp('thief', '8', defaultEquipment())).toMatchObject({ ok: true, base: { dex: 4 }, limitedBy: null })
    expect(autoFillAp('thief', '10', defaultEquipment())).toMatchObject({ ok: true, base: { dex: 10 }, limitedBy: 'Blue Cloth Pants' })
    expect(autoFillAp('thief', '20', defaultEquipment())).toMatchObject({ ok: true, base: { dex: 20 }, limitedBy: 'Steel Igor' })
    expect(autoFillAp('thief', '40', defaultEquipment())).toMatchObject({ ok: true, base: { dex: 34, luk: apAtLevel(40) - 42 }, limitedBy: 'Seclusion Wristguard' })
  })

  it('een item boven je level telt niet: Steel Igor (level 20) tilt DEX niet op level 15', () => {
    const r = autoFillAp('thief', '15', defaultEquipment())
    if (!r.ok) throw new Error('verwacht ok')
    expect(r.base.dex).toBeLessThan(20)
    expect(r.limitedBy).not.toBe('Steel Igor')
  })

  it('wat je draagt en hoger vraagt wint van de catalogus; bij gelijke eis houdt het gedragen item de eer', () => {
    expect(autoFillAp('thief', '10', wear({ claw: 'Steel Igor' }))).toMatchObject({ ok: false, reason: 'short' })
    expect(autoFillAp('thief', '11', wear({ claw: 'Steel Igor' }))).toMatchObject({ ok: true, base: { dex: 20 }, limitedBy: 'Steel Igor' })
    expect(autoFillAp('warrior', '40', wear({ claw: 'Gladius' }))).toMatchObject({ ok: true, base: { dex: 30 }, limitedBy: 'Gladius' })
  })

  it('te weinig AP voor de toekomstige eis: de secundaire stat krijgt wat er past, de hoofdstat haalt nog wat je draagt', () => {
    // Ruwe invoer: STR 50 (Red Cross Shield), INT 50 (Red Lutia) en LUK 50 (Red Stealer Pants) gedragen. Level 32 geeft 180 AP:
    // er blijft 30 over voor DEX, minder dan de 34 van Seclusion Wristguard. Level 30 (170): de 20 die shield en broek vragen; het shield komt eerst in slotvolgorde.
    // Een shield telt alleen naast een wapen voor één hand (Dave, 7 oktober 2026): de Razor vraagt geen stat.
    const eq = wear({ claw: 'Razor', shield: 'Red Cross Shield', gloves: 'Red Lutia', bottom: 'Red Stealer Pants' })
    expect(autoFillAp('thief', '32', eq)).toMatchObject({ ok: true, base: { str: 50, dex: 30, int: 50, luk: 50 }, limitedBy: 'Seclusion Wristguard' })
    expect(autoFillAp('thief', '30', eq)).toMatchObject({ ok: true, base: { str: 50, dex: 20, int: 50, luk: 50 }, limitedBy: 'Red Cross Shield' })
    expect(autoFillAp('thief', '29', eq)).toMatchObject({ ok: false, reason: 'short', need: 170, have: 165 })
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
