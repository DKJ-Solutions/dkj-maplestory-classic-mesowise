import { describe, expect, it } from 'vitest'
import type { ArmorChoice, ArmorUpgradeAdvice } from './armorUpgrade'
import { advisedEquipment, buyTexts, cheapestEquipment, countedAmmo, OWN_AMMO } from './cheapestEquip'
import type { ClawUpgradeAdvice } from './clawUpgrade'
import type { ArmorPiece, ArmorSlot } from './data/types'
import { changeEquipment, choosePick, defaultEquipment, EQUIP_SLOTS, OTHER, type Equipment } from './equipment'
import type { Job } from './job'
import { DEFAULT_PROFILE, parseProfile, type Profile, type ProfileDraft } from './profile'

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
  ({ kind: 'advice', level: 10, choices: [], notWearable: [], winner: winner === null ? null : { name: winner, price: 5000 }, robust: true }) as unknown as ClawUpgradeAdvice

describe('cheapestEquipment (#188)', () => {
  it('houdt zonder advies elk slot op wat je draagt', () => {
    const r = cheapestEquipment(SLOTS, wearing({ claw: 'Garnier', hat: 'Brown Bandana' }), NONE, NONE)
    expect(r.claw).toEqual({ worn: 'Garnier', cheapest: 'Garnier', changed: false, price: null, option: null })
    expect(r.hat).toEqual({ worn: 'Brown Bandana', cheapest: 'Brown Bandana', changed: false, price: null, option: null })
    expect(r.top).toEqual({ worn: null, cheapest: null, changed: false, price: null, option: null })
  })

  it('zet het wapen op de winnaar van het wapenadvies, en laat het staan zonder winnaar', () => {
    const eq = wearing({ claw: 'Garnier' })
    expect(cheapestEquipment(SLOTS, eq, clawAdvice('Steel Titans'), NONE).claw).toEqual({ worn: 'Garnier', cheapest: 'Steel Titans', changed: true, price: 5000, option: null })
    expect(cheapestEquipment(SLOTS, eq, clawAdvice(null), NONE).claw.cheapest).toBe('Garnier')
  })

  it('neemt elk armorstuk dat zich terugverdient, en geen stuk met netto besparing 0, negatief of onbekend', () => {
    const advice = armorAdvice([choice(piece('hat', 'Hat A'), 50), choice(piece('shoes', 'Shoes A'), 0), choice(piece('gloves', 'Gloves A'), -10), choice(piece('cape', 'Cape A'), null)])
    const r = cheapestEquipment(SLOTS, wearing({ shoes: 'Old Shoes' }), NONE, advice)
    expect(r.hat).toEqual({ worn: null, cheapest: 'Hat A', changed: true, price: 100, option: null, horizon: { from: 1, to: 2, truncated: false } })
    expect(r.shoes.cheapest).toBe('Old Shoes')
    expect(r.gloves.cheapest).toBeNull()
    expect(r.cape.cheapest).toBeNull()
  })

  it('maakt top en bottom leeg voor een overall', () => {
    const r = cheapestEquipment(SLOTS, wearing({ top: 'Shirt', bottom: 'Pants' }), NONE, armorAdvice([choice(piece('overall', 'Robe'), 80)]))
    expect(r.overall).toEqual({ worn: null, cheapest: 'Robe', changed: true, price: 100, option: null, horizon: { from: 1, to: 2, truncated: false } })
    expect(r.top).toEqual({ worn: 'Shirt', cheapest: null, changed: true, price: null, option: null })
    expect(r.bottom).toEqual({ worn: 'Pants', cheapest: null, changed: true, price: null, option: null })
  })

  it('zet bij een paar top en bottom allebei, en maakt de overall leeg', () => {
    const pair = choice(piece('top', 'Shirt B'), 60, { with: piece('bottom', 'Pants B') })
    const r = cheapestEquipment(SLOTS, wearing({ overall: 'Robe' }), NONE, armorAdvice([pair]))
    expect(r.top.cheapest).toBe('Shirt B')
    expect(r.bottom.cheapest).toBe('Pants B')
    expect(r.overall).toEqual({ worn: 'Robe', cheapest: null, changed: true, price: null, option: null })
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

  it('neemt een losse top en een losse bottom allebei: samen maken ze de overall leeg zonder te botsen', () => {
    const advice = armorAdvice([choice(piece('top', 'Shirt B'), 50), choice(piece('bottom', 'Pants B'), 30)])
    const r = cheapestEquipment(SLOTS, wearing({ top: 'Shirt', bottom: 'Pants' }), NONE, advice)
    expect(r.top.cheapest).toBe('Shirt B')
    expect(r.bottom.cheapest).toBe('Pants B')
    expect(r.overall.cheapest).toBeNull()
  })

  it('laat bij een losse top over een overall de bottom niet leeg als een ander stuk hem vult', () => {
    const advice = armorAdvice([choice(piece('top', 'Shirt B'), 50, { bare: 'bottom' }), choice(piece('bottom', 'Pants B'), 30, { bare: 'top' })])
    const r = cheapestEquipment(SLOTS, wearing({ overall: 'Robe' }), NONE, advice)
    expect(r.top.cheapest).toBe('Shirt B')
    expect(r.bottom.cheapest).toBe('Pants B')
    expect(r.overall).toEqual({ worn: 'Robe', cheapest: null, changed: true, price: null, option: null })
  })

  it('laat een losse top vallen naast een paar dat de top al vult', () => {
    const advice = armorAdvice([choice(piece('top', 'Shirt P'), 90, { with: piece('bottom', 'Pants P') }), choice(piece('top', 'Shirt B'), 40)])
    const r = cheapestEquipment(SLOTS, wearing({}), NONE, advice)
    expect(r.top.cheapest).toBe('Shirt P')
    expect(r.bottom.cheapest).toBe('Pants P')
  })

  it('geeft bij een paar elke helft zijn eigen prijs', () => {
    const top = { ...piece('top', 'Shirt P'), price: 300 } as ArmorPiece
    const bottom = { ...piece('bottom', 'Pants P'), price: 250 } as ArmorPiece
    const r = cheapestEquipment(SLOTS, wearing({ overall: 'Robe' }), NONE, armorAdvice([choice(top, 90, { with: bottom })]))
    expect(r.top.price).toBe(300)
    expect(r.bottom.price).toBe(250)
    expect(r.overall.price).toBeNull()
  })

  it('noemt bij een slot dat leeg blijft het beste stuk dat zich niet terugverdient, met prijs en besparing', () => {
    const advice = armorAdvice([choice(piece('hat', 'Hat A'), 50), choice(piece('shoes', 'Shoes A'), -20), choice(piece('overall', 'Robe'), -5)])
    const r = cheapestEquipment(SLOTS, wearing({ gloves: 'Old Gloves' }), clawAdvice(null), advice)
    expect(r.hat.option).toBeNull()
    expect(r.shoes).toEqual({ worn: null, cheapest: null, changed: false, price: null, option: { name: 'Shoes A', price: 100, saving: -20 } })
    expect(r.overall.option).toEqual({ name: 'Robe', price: 100, saving: -5 })
    expect(r.gloves.option).toBeNull()
  })

  it('noemt geen stuk in een slot dat leeg raakt door een gekocht stuk (een overall over top en bottom)', () => {
    const advice = armorAdvice([choice(piece('overall', 'Robe'), 80), choice(piece('top', 'Shirt B'), -10)])
    const r = cheapestEquipment(SLOTS, wearing({}), NONE, advice)
    expect(r.top.cheapest).toBeNull()
    expect(r.top.option).toBeNull()
  })

  it('geeft alleen de gevraagde slots terug', () => {
    expect(Object.keys(cheapestEquipment(['claw', 'hat'], wearing({}), NONE, NONE))).toEqual(['claw', 'hat'])
  })
})

describe('advisedEquipment (#192)', () => {
  const profile = { ...DEFAULT_PROFILE }
  const slotsOf = (eq: Equipment, claw: ClawUpgradeAdvice = NONE, armor: ArmorUpgradeAdvice = NONE) => cheapestEquipment(SLOTS, eq, claw, armor)

  it('geeft zonder wijziging dezelfde objecten terug, en geen winkelprijs', () => {
    const eq = wearing({ claw: 'Garnier', hat: 'White Bandana' })
    const r = advisedEquipment('thief', profile, eq, slotsOf(eq))
    expect(r.equipment).toBe(eq)
    expect(r.profile).toBe(profile)
    expect(r.shop).toBe(0)
    expect(r.purchases).toEqual([])
  })

  it('zet het winkelstuk in het slot zoals een keuze op de Equip-kaart, met het profiel dat daarbij hoort, en telt de prijs', () => {
    const eq = wearing({ claw: 'Garnier' })
    const r = advisedEquipment('thief', profile, eq, slotsOf(eq, clawAdvice('Steel Titans')))
    expect(r.equipment.claw).toEqual(choosePick('claw', eq.claw, 'Steel Titans'))
    expect(r.shop).toBe(5000)
    expect(r.purchases).toEqual([{ slot: 'claw', name: 'Steel Titans', price: 5000 }])
    // Het profiel volgt exact wat een keuze op de kaart doet.
    expect(r.profile).toEqual(changeEquipment(profile, eq, 'claw', choosePick('claw', eq.claw, 'Steel Titans'), 'thief').profile)
    expect(r.profile.clawWatk).not.toBe(profile.clawWatk)
    // Wat je niet koopt blijft je eigen entry.
    expect(r.equipment.hat).toBe(eq.hat)
  })

  it('telt de prijzen van alle stukken op, en laat een slot dat leeg raakt bekend leeg worden', () => {
    const eq = wearing({ overall: 'Sauna Robe' })
    const advice = armorAdvice([choice(piece('hat', 'Hat A'), 50), choice(piece('top', 'Top A'), 40, { bare: 'bottom' })])
    const r = advisedEquipment('thief', profile, eq, slotsOf(eq, NONE, advice))
    expect(r.equipment.hat.pick).toBe('Hat A')
    expect(r.equipment.top.pick).toBe('Top A')
    expect(r.equipment.overall.pick).not.toBe('Sauna Robe')
    expect(r.equipment.bottom.pick).toBe('empty')
    expect(r.shop).toBe(200)
    // Eén aankoop per stuk, en hun prijzen samen zijn de winkelprijs.
    expect(r.purchases.map((p) => p.name)).toEqual(['Hat A', 'Top A'])
    expect(r.purchases.reduce((s, p) => s + p.price, 0)).toBe(r.shop)
  })
})

describe('buyTexts (#192)', () => {
  it('noemt het wapen en de armor die je koopt, en geeft null als er niets te kopen valt', () => {
    const eq = wearing({ claw: 'Garnier' })
    const advice = armorAdvice([choice(piece('hat', 'Hat A'), 50), choice(piece('shoes', 'Shoes A'), 20)])
    expect(buyTexts(cheapestEquipment(SLOTS, eq, clawAdvice('Steel Titans'), advice))).toEqual({ att: 'Koop Steel Titans', def: 'Koop Hat A, Shoes A' })
    expect(buyTexts(cheapestEquipment(SLOTS, eq, NONE, NONE))).toEqual({ att: null, def: null })
  })
})

describe('countedAmmo: de munitie die de factuur telt, voor een leeg Ammo-slot van Advised (#189)', () => {
  const parsed = (job: Job, over: Partial<ProfileDraft> = {}): Profile => {
    const r = parseProfile({ ...DEFAULT_PROFILE, level: '20', ...over }, job)
    if (!('profile' in r)) throw new Error(r.error)
    return r.profile
  }
  const weapon = (pick: string) => ({ pick, name: '', stat: '' })

  it('geeft een Thief zonder keuze de Subi, en anders de star met de herlaadprijs uit zijn profiel', () => {
    expect(countedAmmo(parsed('thief'), weapon('Steel Igor'))).toBe('Subi Throwing Stars')
    expect(countedAmmo(parsed('thief', { starWatk: '17', starRecharge: '0.4' }), weapon('Steel Igor'))).toBe('Wolbi Throwing Stars')
    // Een gecorrigeerde W.ATT van dezelfde star verandert niet welke star het is: de herlaadprijs telt.
    expect(countedAmmo(parsed('thief', { starWatk: '18', starRecharge: '0.4' }), weapon('Steel Igor'))).toBe('Wolbi Throwing Stars')
  })

  it('geeft een algemeen label met de prijs als de herlaadprijs bij geen star of pijl uit de lijst hoort (#199)', () => {
    expect(countedAmmo(parsed('thief', { starRecharge: '0.35' }), weapon('Steel Igor'))).toBe('Throwing stars, 0,35 meso per stuk')
    // Een Bowman rekent altijd met de prijs van zijn pijl (parseProfile), dus een getypte prijs verandert niets.
    expect(countedAmmo(parsed('bowman', { starRecharge: '0.35' }), weapon('Battle Bow'))).toBe('Arrows for Bows')
    // Zonder herlaadprijs telt de factuur de munitiekosten van de plek: niets te noemen.
    expect(countedAmmo(parsed('thief', { starRecharge: '0' }), weapon('Steel Igor'))).toBeNull()
  })

  it('noemt geen munitie als je zelf het bedrag voor de munitie van de plek invulde (#199)', () => {
    expect(countedAmmo(parsed('thief'), weapon('Steel Igor'), true)).toBe(OWN_AMMO)
    expect(countedAmmo(parsed('bowman'), weapon('Battle Bow'), true)).toBe(OWN_AMMO)
    // Wie niets gooit houdt null, ook met een eigen bedrag.
    expect(countedAmmo(parsed('warrior'), weapon(''), true)).toBeNull()
  })

  it('geeft niets voor wie niets gooit: een Thief met een dagger, een Beginner, een Warrior of een Magician', () => {
    expect(countedAmmo(parsed('thief', { dagger: '1' }), weapon('Steel Igor'))).toBeNull()
    expect(countedAmmo(parsed('thief', { level: '9', luckySeven: '0' }), weapon('Steel Igor'))).toBeNull()
    expect(countedAmmo(parsed('warrior'), weapon(''))).toBeNull()
    expect(countedAmmo(parsed('magician'), weapon(''))).toBeNull()
  })

  it('geeft een Bowman de gewone pijl voor zijn boog of kruisboog, en de bronze alleen met Helpful Stranger', () => {
    expect(countedAmmo(parsed('bowman'), weapon('Battle Bow'))).toBe('Arrows for Bows')
    expect(countedAmmo(parsed('bowman'), weapon('Balanche'))).toBe('Arrows for Crossbows')
    expect(countedAmmo(parsed('bowman', { helpfulStranger: '1', bronzeArrows: '1' }), weapon('Balanche'))).toBe('Bronze Arrows for Crossbows')
    expect(countedAmmo(parsed('bowman', { helpfulStranger: '0', bronzeArrows: '1' }), weapon('Battle Bow'))).toBe('Arrows for Bows')
  })

  it('geeft een Bowman met een eigen wapen de pijl voor een boog, zoals de berekening (PLAIN_ARROW)', () => {
    expect(countedAmmo(parsed('bowman'), weapon(OTHER))).toBe('Arrows for Bows')
  })
})

describe('cheapestEquipment: het vereiste wapen (#202)', () => {
  const weapon = { claw: { name: 'Garnier', price: 5000 }, from: 10, to: 14, truncated: false } as unknown as Parameters<typeof cheapestEquipment>[4]

  it('zet het wapen in het wapenslot als het advies geen winnaar heeft, met prijs en horizon', () => {
    for (const advice of [NONE, clawAdvice(null)]) {
      const r = cheapestEquipment(SLOTS, defaultEquipment(), advice, NONE, weapon)
      expect(r.claw).toEqual({ worn: null, cheapest: 'Garnier', changed: true, price: 5000, option: null, horizon: { from: 10, to: 14, truncated: false } })
    }
  })

  it('negeert het wapen als het advies een winnaar heeft', () => {
    const r = cheapestEquipment(SLOTS, defaultEquipment(), clawAdvice('Steel Titans'), NONE, weapon)
    expect(r.claw.cheapest).toBe('Steel Titans')
    expect(r.claw.price).toBe(5000)
  })

  it('verandert niets zonder wapen (null is de standaard)', () => {
    expect(cheapestEquipment(SLOTS, defaultEquipment(), NONE, NONE).claw.cheapest).toBeNull()
  })
})
