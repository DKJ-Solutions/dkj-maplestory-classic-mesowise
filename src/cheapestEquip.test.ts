import { describe, expect, it } from 'vitest'
import type { ArmorChoice, ArmorUpgradeAdvice } from './armorUpgrade'
import { cheapestEquipment } from './cheapestEquip'
import type { ClawUpgradeAdvice } from './clawUpgrade'
import type { ArmorPiece, ArmorSlot } from './data/types'
import { defaultEquipment, EQUIP_SLOTS, type Equipment } from './equipment'

const SLOTS = EQUIP_SLOTS.map((s) => s.slot)
const NONE = { kind: 'none' } as const

const wearing = (picks: Partial<Record<keyof Equipment, string>>): Equipment => {
  const eq = defaultEquipment()
  for (const [slot, pick] of Object.entries(picks)) eq[slot as keyof Equipment] = { pick: pick!, name: '', stat: '' }
  return eq
}
const piece = (slot: ArmorSlot, name: string): ArmorPiece => ({ slot, name, wdef: 1, level: 1, price: 100, source: { url: '', retrieved: '' } }) as unknown as ArmorPiece
const choice = (armor: ArmorPiece, net: number | null, extra: Partial<ArmorChoice> = {}): ArmorChoice =>
  ({ armor, price: 100, from: 1, to: 2, truncated: false, saving: net, net, replaces: undefined, ...extra })
const armorAdvice = (choices: ArmorChoice[]): ArmorUpgradeAdvice => ({ kind: 'advice', level: 10, choices, notWearable: [], winner: choices[0]?.armor ?? null, robust: true })
const clawAdvice = (winner: string | null): ClawUpgradeAdvice =>
  ({ kind: 'advice', level: 10, choices: [], notWearable: [], winner: winner === null ? null : { name: winner }, robust: true }) as unknown as ClawUpgradeAdvice

describe('cheapestEquipment (#188)', () => {
  it('houdt zonder advies elk slot op wat je draagt', () => {
    const r = cheapestEquipment(SLOTS, wearing({ claw: 'Garnier', hat: 'Brown Bandana' }), NONE, NONE)
    expect(r.claw).toEqual({ worn: 'Garnier', cheapest: 'Garnier', changed: false })
    expect(r.hat).toEqual({ worn: 'Brown Bandana', cheapest: 'Brown Bandana', changed: false })
    expect(r.top).toEqual({ worn: null, cheapest: null, changed: false })
  })

  it('zet het wapen op de winnaar van het wapenadvies, en laat het staan zonder winnaar', () => {
    const eq = wearing({ claw: 'Garnier' })
    expect(cheapestEquipment(SLOTS, eq, clawAdvice('Steel Titans'), NONE).claw).toEqual({ worn: 'Garnier', cheapest: 'Steel Titans', changed: true })
    expect(cheapestEquipment(SLOTS, eq, clawAdvice(null), NONE).claw.cheapest).toBe('Garnier')
  })

  it('neemt elk armorstuk dat zich terugverdient, en geen stuk met netto besparing 0, negatief of onbekend', () => {
    const advice = armorAdvice([choice(piece('hat', 'Hat A'), 50), choice(piece('shoes', 'Shoes A'), 0), choice(piece('gloves', 'Gloves A'), -10), choice(piece('cape', 'Cape A'), null)])
    const r = cheapestEquipment(SLOTS, wearing({ shoes: 'Old Shoes' }), NONE, advice)
    expect(r.hat).toEqual({ worn: null, cheapest: 'Hat A', changed: true })
    expect(r.shoes.cheapest).toBe('Old Shoes')
    expect(r.gloves.cheapest).toBeNull()
    expect(r.cape.cheapest).toBeNull()
  })

  it('maakt top en bottom leeg voor een overall', () => {
    const r = cheapestEquipment(SLOTS, wearing({ top: 'Shirt', bottom: 'Pants' }), NONE, armorAdvice([choice(piece('overall', 'Robe'), 80)]))
    expect(r.overall).toEqual({ worn: null, cheapest: 'Robe', changed: true })
    expect(r.top).toEqual({ worn: 'Shirt', cheapest: null, changed: true })
    expect(r.bottom).toEqual({ worn: 'Pants', cheapest: null, changed: true })
  })

  it('zet bij een paar top en bottom allebei, en maakt de overall leeg', () => {
    const pair = choice(piece('top', 'Shirt B'), 60, { with: piece('bottom', 'Pants B') })
    const r = cheapestEquipment(SLOTS, wearing({ overall: 'Robe' }), NONE, armorAdvice([pair]))
    expect(r.top.cheapest).toBe('Shirt B')
    expect(r.bottom.cheapest).toBe('Pants B')
    expect(r.overall).toEqual({ worn: 'Robe', cheapest: null, changed: true })
  })

  it('maakt bij een losse top over een overall ook de bottom leeg (bare)', () => {
    const r = cheapestEquipment(SLOTS, wearing({ overall: 'Robe' }), NONE, armorAdvice([choice(piece('top', 'Shirt B'), 40, { bare: 'bottom' })]))
    expect(r.top.cheapest).toBe('Shirt B')
    expect(r.overall.cheapest).toBeNull()
    expect(r.bottom.cheapest).toBeNull()
  })

  it('laat een stuk vallen dat een slot raakt dat een stuk met meer netto besparing al nam', () => {
    const advice = armorAdvice([choice(piece('overall', 'Robe'), 90), choice(piece('top', 'Shirt B'), 30), choice(piece('hat', 'Hat A'), 20)])
    const r = cheapestEquipment(SLOTS, wearing({}), NONE, advice)
    expect(r.overall.cheapest).toBe('Robe')
    expect(r.top.cheapest).toBeNull()
    expect(r.hat.cheapest).toBe('Hat A')
  })

  it('geeft alleen de gevraagde slots terug', () => {
    expect(Object.keys(cheapestEquipment(['claw', 'hat'], wearing({}), NONE, NONE))).toEqual(['claw', 'hat'])
  })
})
