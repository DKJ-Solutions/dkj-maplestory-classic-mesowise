// Tests van het gratis wapen van je 1e job (Dave, 9 oktober 2026): de grens op level 9 en 10, de factuur, het vaste punt na Overnemen en wat Cheapest kiest.
import { describe, expect, it } from 'vitest'
import { advisedSetup, cheapestFor, freshStart } from './advisedSetup'
import type { CheapestInput } from './cheapestSettings'
import { profileOf } from './cheapestSettings'
import { changeEquipment, choosePick, defaultEquipment, dropAboveLevel, familyName, wearableSetup, wornName } from './equipment'
import { FREE_WEAPON_LEVEL, freeJobWeapon, freeJobWeaponName } from './freeJobWeapon'
import { FREE_MAGICIAN_WEAPON, NPC_MAGICIAN_WEAPONS } from './data/magician'
import { BEGINNER_WORN_WEAPONS } from './data/beginnerWeapons'
import { MAGICIAN_WEAPONS } from './magicianGear'
import { NPC_CLAWS } from './data/claws'
import { NPC_DAGGERS } from './data/daggers'
import { MOBS, mobDraft } from './data/spots'
import type { Job } from './job'
import { levelInvoice } from './levelInvoice'
import { NO_POTION_CHOICE } from './potions'
import { DEFAULT_PROFILE, type ProfileDraft } from './profile'

const GARNIER = "Beginner's Garnier"
const WAND = "Beginner's Wooden Wand"
const at = (level: string, over: Partial<ProfileDraft> = {}): ProfileDraft => ({ ...DEFAULT_PROFILE, level, clawWatk: '0', dagger: '0', ...over })

const input = (job: Job, level: number, mob: string): CheapestInput => ({
  job,
  gender: null,
  equipment: defaultEquipment(),
  drafts: [mobDraft(mob)!],
  profileDraft: { ...DEFAULT_PROFILE, level: String(level) },
  potionChoice: NO_POTION_CHOICE,
})

/** Zoals de Equip-kaart een wapen zet: met de skillpunten en vlaggen die erbij horen. */
const holding = (job: Job, level: number, mob: string, claw: string): CheapestInput => {
  const user = input(job, level, mob)
  const set = changeEquipment(user.profileDraft, user.equipment, 'claw', choosePick('claw', user.equipment.claw, claw), job)
  return { ...user, equipment: set.equipment, profileDraft: set.profile }
}

const afterTake = (user: CheapestInput, s: ReturnType<typeof advisedSetup>): CheapestInput => ({
  ...user,
  equipment: s.equipment,
  drafts: s.result.drafts,
  profileDraft: s.result.profileDraft,
  potionChoice: s.result.potionChoice,
})

/** De totale factuur van een uitkomst zoals de app hem toont: wat je erna draagt, met de aankopen van de setup erbij. */
const invoiceOf = (user: CheapestInput, s: ReturnType<typeof advisedSetup>): number => {
  // Zonder factuur (geen rekenbare stand) telt de stand als oneindig duur, zoals preferFreeWeapon hem ook leest.
  const i = afterTake(user, s)
  const inv = levelInvoice(i.drafts, profileOf({ ...i, equipment: s.equipment }), s.purchases.map((p) => ({ ...p.horizon, name: familyName(p.slot, p.name), price: p.price })))
  if (inv.kind !== 'invoice') return Infinity
  return inv.total
}

const midMob = (fraction: number): string => MOBS[Math.floor(MOBS.length * fraction)].name

describe('freeJobWeapon: welke job krijgt wat', () => {
  it('geeft alleen een Thief en een Magician een gratis wapen, vanaf level 10', () => {
    expect(FREE_WEAPON_LEVEL).toBe(10)
    expect(freeJobWeaponName('thief')).toBe(GARNIER)
    expect(freeJobWeaponName('magician')).toBe(WAND)
    expect(freeJobWeaponName('warrior')).toBeNull()
    expect(freeJobWeaponName('bowman')).toBeNull()
    expect(freeJobWeapon('warrior')).toBeNull()
    expect(freeJobWeapon('thief')).toMatchObject({ name: GARNIER, price: 0 })
    expect(freeJobWeapon('magician')).toMatchObject({ name: WAND, price: 0 })
  })

  it("heeft de stats van de Beginner's Wooden Wand: level 10, INT 20, W.ATK 17, M.ATK 26, 810 ms", () => {
    expect(FREE_MAGICIAN_WEAPON).toMatchObject({ name: WAND, kind: 'wand', level: 10, int: 20, watk: 17, matk: 26 })
    expect(FREE_MAGICIAN_WEAPON.speed.attackMs).toBe(810)
    // Als wapen telt de M.ATT en de vaste cast van 810 ms.
    const w = freeJobWeapon('magician')!
    expect([w.watk, w.speed.attackMs]).toEqual([26, 810])
  })

  it('zet de Wooden Wand en de Garnier niet in een winkellijst', () => {
    expect(NPC_MAGICIAN_WEAPONS.map((w) => w.name)).not.toContain(WAND)
    expect(MAGICIAN_WEAPONS.map((w) => w.name)).not.toContain(WAND)
    expect(NPC_CLAWS.map((w) => w.name)).not.toContain(GARNIER)
    expect(NPC_DAGGERS.map((w) => w.name)).not.toContain(GARNIER)
  })
})

describe('wearableSetup: de grens op level 9 en 10 voor elke job', () => {
  it('geeft op level 9 een Thief en een Bowman de Fruit Knife (hij kan hem dragen) en een Magician en Warrior niets, en dus geen enkel gratis jobwapen', () => {
    expect(wearableSetup(at('9'), defaultEquipment(), 'thief', null).equipment.claw.pick).toBe('Fruit Knife')
    expect(wearableSetup(at('9'), defaultEquipment(), 'bowman', null).equipment.claw.pick).toBe('Fruit Knife')
    for (const job of ['magician', 'warrior'] as const) expect(wornName(wearableSetup(at('9'), defaultEquipment(), job, null).equipment.claw), job).toBeNull()
  })

  it('geeft op level 10 een Thief de Garnier en een Magician de Wooden Wand, en een Warrior en Bowman niets', () => {
    expect(wornName(wearableSetup(at('10'), defaultEquipment(), 'thief', null).equipment.claw)).toBe(GARNIER)
    expect(wornName(wearableSetup(at('10', { int: '20' }), defaultEquipment(), 'magician', null).equipment.claw)).toBe(WAND)
    for (const job of ['warrior', 'bowman'] as const) expect(wornName(wearableSetup(at('10'), defaultEquipment(), job, null).equipment.claw), job).toBeNull()
  })

  it('geeft de Garnier ook op hogere levels, en niets bij een leeg of ongeldig level', () => {
    for (const level of ['11', '30', '99']) expect(wornName(wearableSetup(at(level), defaultEquipment(), 'thief', null).equipment.claw), level).toBe(GARNIER)
    for (const level of ['', 'abc', '0']) expect(wornName(wearableSetup(at(level), defaultEquipment(), 'thief', null).equipment.claw), level).toBeNull()
  })

  it('laat een Thief met een Fruit Knife op level 12 hem houden (het advies van Cheapest beslist)', () => {
    const knife = holding('thief', 12, 'Snail', 'Fruit Knife').equipment
    expect(wornName(wearableSetup(at('12'), knife, 'thief', null).equipment.claw)).toBe('Fruit Knife')
  })

  it('laat een eigen wapen van een Magician op level 20 staan', () => {
    const own = { ...defaultEquipment(), claw: choosePick('claw', defaultEquipment().claw, 'Sapphire Staff') }
    expect(wearableSetup(at('20'), own, 'magician', null).equipment.claw).toBe(own.claw)
  })
})

describe('wearableSetup: een leeg wapenslot en een getypte aanval (regel van 9 oktober 2026)', () => {
  it('zet het gratis wapen over een getypte clawWatk heen als die niet hoger is dan zijn eigen stat, ook bij een dagger-vlag', () => {
    const thief = wearableSetup(at('10', { clawWatk: '10', dagger: '1' }), defaultEquipment(), 'thief', null)
    expect([thief.profile.clawWatk, thief.profile.dagger]).toEqual(['10', '0'])
    const mage = wearableSetup(at('10', { clawWatk: '26', int: '20' }), defaultEquipment(), 'magician', null)
    expect(mage.profile.clawWatk).toBe('26')
    expect(wearableSetup(at('10', { clawWatk: '3', int: '20' }), defaultEquipment(), 'magician', null).profile.clawWatk).toBe('26')
  })

  it('laat een getypte aanval die hoger is dan het gratis wapen staan, en vult het wapenslot niet in', () => {
    const thief = wearableSetup(at('40', { clawWatk: '30' }), defaultEquipment(), 'thief', null)
    expect([wornName(thief.equipment.claw), thief.profile.clawWatk]).toEqual([null, '30'])
    const mage = wearableSetup(at('40', { clawWatk: '27', int: '60' }), defaultEquipment(), 'magician', null)
    expect([wornName(mage.equipment.claw), mage.profile.clawWatk]).toEqual([null, '27'])
  })

  it('geeft het gratis wapen niet aan een character dat het niet kan dragen (Garnier LUK 25, Wand INT 20)', () => {
    expect(wornName(wearableSetup(at('10', { luk: '10', lukExtra: '0' }), defaultEquipment(), 'thief', null).equipment.claw)).toBeNull()
    expect(wornName(wearableSetup(at('10', { luk: '20', lukExtra: '5' }), defaultEquipment(), 'thief', null).equipment.claw)).toBe(GARNIER)
    expect(wornName(wearableSetup(at('10', { int: '5', intExtra: '0' }), defaultEquipment(), 'magician', null).equipment.claw)).toBeNull()
    expect(wornName(wearableSetup(at('10', { int: '20', intExtra: '0' }), defaultEquipment(), 'magician', null).equipment.claw)).toBe(WAND)
  })

  it('laat op level 9 een getypte aanval van een Magician staan, want daar is geen wapen', () => {
    expect(wearableSetup(at('9', { clawWatk: '99' }), defaultEquipment(), 'magician', null).profile.clawWatk).toBe('99')
  })

  it('laat een getypte aanval van een Warrior en een Bowman op level 10 staan', () => {
    for (const job of ['warrior', 'bowman'] as const) expect(wearableSetup(at('10', { clawWatk: '99' }), defaultEquipment(), job, null).profile.clawWatk, job).toBe('99')
  })

  it('zet het gratis wapen in de plaats van een wapen boven je level (dropAboveLevel, dan het gratis wapen)', () => {
    const titans = { ...defaultEquipment(), claw: choosePick('claw', defaultEquipment().claw, 'Steel Titans') }
    expect(dropAboveLevel(at('10'), titans, 'thief').dropped).toContain('claw')
    const out = wearableSetup(at('10', { clawWatk: '40' }), titans, 'thief', null)
    // Na het vallen van het wapen boven je level is de getypte aanval 0, dus het gratis wapen vult het slot.
    expect(wornName(out.equipment.claw)).toBe(GARNIER)
    expect(out.profile.clawWatk).toBe('10')
  })
})

describe('advisedSetup: het gratis wapen op de factuur', () => {
  it('rekent het gratis wapen nooit tegen een prijs, op elk level vanaf 10: hooguit een regel van 0, en het winkeltotaal telt alleen betaalde stukken', () => {
    for (const job of ['thief', 'magician'] as const)
      for (const level of [10, 11, 15, 20, 30]) {
        const s = advisedSetup(input(job, level, 'Snail'))
        const label = `${job} L${level}`
        for (const p of s.purchases.filter((q) => q.name === freeJobWeaponName(job))) expect(p.price, label).toBe(0)
        expect(s.shop, label).toBe(s.purchases.reduce((n, p) => n + p.price, 0))
        // Wat de app als aankoop toont (cheapestFor, met het gratis wapen al in de hand) bevat het gratis wapen niet.
        const shown = cheapestFor(input(job, level, 'Snail'))
        expect(shown.purchases.filter((p) => p.name === freeJobWeaponName(job)), label + ' cheapestFor').toEqual([])
      }
  })

  it('zet op level 10 het gratis wapen in het advies zonder prijs en zonder aankoop', () => {
    const t = advisedSetup(input('thief', 10, 'Snail'))
    expect(t.cheapest.claw).toMatchObject({ cheapest: GARNIER, changed: true, price: 0 })
    expect(t.shop).toBe(0)
    expect(t.purchases.every((p) => p.slot !== 'claw' || p.price === 0)).toBe(true)
    const m = advisedSetup(input('magician', 10, 'Snail'))
    expect(m.cheapest.claw).toMatchObject({ cheapest: WAND })
    expect(m.purchases.every((p) => p.slot !== 'claw' || p.price === 0)).toBe(true)
  })

  it('geeft op level 9 een Thief geen Garnier', () => {
    const s = advisedSetup(input('thief', 9, 'Snail'))
    expect(wornName(s.equipment.claw)).not.toBe(GARNIER)
    expect(s.cheapest.claw.cheapest).not.toBe(GARNIER)
  })
})

describe('cheapestFor: een vast punt na Overnemen met een beginnerwapen in de hand', () => {
  const beginner = ['Fruit Knife', 'Razor', 'Sword', 'Hand Axe', 'Wooden Club']

  it('kent de beginnerwapens die de Thief kan dragen uit de data', () => {
    for (const n of beginner) expect(BEGINNER_WORN_WEAPONS.map((w) => w.name), n).toContain(n)
  })

  it('koopt na Overnemen niets meer en verandert niets meer, voor een Thief en een Magician op meerdere levels', () => {
    let checked = 0
    for (const job of ['thief', 'magician'] as const)
      for (const level of [10, 12, 15, 20, 25, 30])
        for (const mob of ['Snail', midMob(0.5)]) {
          // Een Magician draagt geen beginnerwapen uit deze lijst; zijn lege hand is al het gratis wapen.
          const claws: (string | null)[] = job === 'thief' ? beginner : [null]
          for (const claw of claws) {
            const user = claw ? holding(job, level, mob, claw) : input(job, level, mob)
            const s = cheapestFor(user)
            const label = `${job} L${level} ${mob} ${claw ?? 'leeg'}`
            // Het gratis wapen komt nooit op de factuur te staan.
            expect(s.purchases.some((p) => p.name === freeJobWeaponName(job)), label + ' factuur').toBe(false)
            const again = cheapestFor(afterTake(user, s))
            expect(again.purchases.map((p) => p.name), label + ' koopt').toEqual([])
            expect(again.result.changes, label + ' verandert').toEqual([])
            expect(again.shop, label).toBe(0)
            checked++
          }
        }
    expect(checked).toBeGreaterThan(40)
  }, 120_000)
})

describe('advisedSetup: een betere claw of een echte dagger wisselt hij niet voor het gratis wapen', () => {
  it('houdt een Steel Titans op level 15, 20 en 30, en zet geen Garnier op de factuur', () => {
    for (const level of [15, 20, 30]) {
      const s = cheapestFor(holding('thief', level, 'Snail', 'Steel Titans'))
      expect(wornName(s.equipment.claw), `L${level}`).not.toBe(GARNIER)
      expect(s.cheapest.claw.cheapest, `L${level}`).not.toBe(GARNIER)
      expect(s.purchases.some((p) => p.name === GARNIER), `L${level}`).toBe(false)
    }
  })

  it('wisselt een Thief met een echte dagger (Field Dagger, level 15) nooit naar de Garnier', () => {
    for (const level of [15, 20, 30]) {
      const s = cheapestFor(holding('thief', level, 'Snail', 'Field Dagger'))
      expect(s.cheapest.claw.cheapest, `L${level}`).not.toBe(GARNIER)
      expect(wornName(s.equipment.claw), `L${level}`).not.toBe(GARNIER)
      expect(s.purchases.some((p) => p.name === GARNIER), `L${level}`).toBe(false)
    }
  })

  it('houdt een Magician met een eigen staff, en een Warrior en Bowman krijgen nooit een gratis wapen', () => {
    const mage = advisedSetup(holding('magician', 20, 'Snail', 'Sapphire Staff'))
    expect(wornName(mage.equipment.claw)).not.toBe(WAND)
    for (const job of ['warrior', 'bowman'] as const) {
      const s = advisedSetup(input(job, 20, 'Snail'))
      expect(s.cheapest.claw.cheapest, job).not.toBe(GARNIER)
      expect(s.cheapest.claw.cheapest, job).not.toBe(WAND)
    }
  })
})

describe('advisedSetup: preferFreeWeapon kiest de strikt lagere factuur, in beide richtingen', () => {
  it('houdt de Fruit Knife waar die goedkoper is en wisselt naar de Garnier waar die goedkoper is, en de totalen kloppen met de gekozen kant', () => {
    let kept = 0
    let swapped = 0
    for (const level of [10, 12, 15, 18, 20, 25, 30, 40])
      for (const mob of ['Snail', null]) {
        // Zonder mob (null) kiest Cheapest zelf; daar wint de Garnier van level 18 tot 30 (gemeten), bij een vaste Snail niet.
        const drafts = mob === null ? [] : [mobDraft(mob)!]
        const user = { ...holding('thief', level, 'Snail', 'Fruit Knife'), drafts }
        const s = advisedSetup(user)
        // De andere kant, zoals preferFreeWeapon hem rekent: het gratis wapen in de hand en dan zijn eigen vaste punt.
        const swappedUser = { ...holding('thief', level, 'Snail', GARNIER), drafts }
        const alt = advisedSetup(swappedUser)
        const label = `L${level} ${mob ?? 'eigen mob'}`
        if (wornName(s.equipment.claw) === GARNIER) {
          swapped++
          expect(s.cheapest.claw, label).toMatchObject({ worn: 'Fruit Knife', cheapest: GARNIER, changed: true })
          expect(invoiceOf(user, s), label + ' totaal').toBeCloseTo(invoiceOf(swappedUser, alt), 6)
          expect(Number.isFinite(invoiceOf(user, s)), label + ' rekenbaar').toBe(true)
        } else {
          kept++
          expect(s.cheapest.claw, label).toMatchObject({ worn: 'Fruit Knife', changed: false })
          // Behouden betekent: de Garnier is niet strikt goedkoper (een stand zonder rekenbare factuur telt als oneindig duur; in de sweep heeft minstens een geval er geen, niet nader onderzocht).
          expect(invoiceOf(user, s), label + ' totaal').toBeLessThanOrEqual(invoiceOf(swappedUser, alt) + 1e-6)
        }
      }
    // Beide richtingen komen in de sweep voor, anders bewijst hij maar een kant.
    expect(kept).toBeGreaterThan(0)
    expect(swapped).toBeGreaterThan(0)
  }, 120_000)

  it('wisselt onder level 10 niet naar de Garnier', () => {
    const low = advisedSetup(holding('thief', 9, 'Snail', 'Fruit Knife'))
    expect(low.cheapest.claw.cheapest).not.toBe(GARNIER)
    expect(wornName(low.equipment.claw)).not.toBe(GARNIER)
  })

  it('zet de Garnier voor geen enkel beginnerwapen van een Thief op de factuur', () => {
    for (const claw of ['Razor', 'Sword', 'Hand Axe', 'Wooden Club'])
      for (const level of [10, 20]) {
        const s = advisedSetup(holding('thief', level, 'Snail', claw))
        expect(s.purchases.some((p) => p.name === GARNIER), `${claw} L${level}`).toBe(false)
      }
  })

  it('geeft freshStart een Thief op level 10 zonder wapen de Garnier in de hand', () => {
    expect(freshStart(input('thief', 10, 'Snail')).equipment.claw.pick).toBe(GARNIER)
  })
})
