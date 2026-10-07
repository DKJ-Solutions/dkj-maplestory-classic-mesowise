// Aanvulling op autoFillAp.test.ts (#157): echte catalogusitems per job, de hele catalogus als eigenschap, en de grenzen van AP en level.
import { describe, expect, it } from 'vitest'
import { autoFillAp, autoFillMessage, autoFillPatch, MAIN_SECONDARY, type AutoFillResult } from './autoFillAp'
import { apAtLevel } from './data/thief'
import type { Stat } from './data/types'
import { catalogItems, defaultEquipment, EQUIP_SLOTS, itemRequirements, NONE, OTHER, type Equipment } from './equipment'
import type { Job } from './job'

const wear = (patch: Partial<Record<keyof Equipment, string>>): Equipment => {
  const eq = defaultEquipment()
  for (const [slot, pick] of Object.entries(patch)) eq[slot as keyof Equipment] = { pick: pick!, name: '', stat: '' }
  return eq
}
/** Een claw uit de lijst en een eigen hoed: een item zonder bekende eisen. */
const withOwnHat = (claw: string): Equipment => {
  const eq = wear({ claw })
  eq.hat = { pick: OTHER, name: 'Mijn hoed', stat: '5' }
  return eq
}
const sum = (b: Record<string, number>) => Object.values(b).reduce((a, n) => a + n, 0)
const JOBS: readonly Job[] = ['thief', 'warrior', 'bowman', 'magician']
const STATS: readonly Stat[] = ['str', 'dex', 'int', 'luk']

describe('autoFillAp: hoofd en secundair per job, zonder equipment', () => {
  it.each([
    ['thief', 'luk', 'dex'],
    ['warrior', 'str', 'dex'],
    ['bowman', 'dex', 'str'],
    ['magician', 'int', 'luk'],
  ] as const)('%s: hoofdstat %s, secundair %s, de rest op 4 en alles verdeeld', (job, main, secondary) => {
    expect(MAIN_SECONDARY[job]).toEqual({ main, secondary })
    const r = autoFillAp(job, '40', defaultEquipment())
    if (!r.ok) throw new Error('verwacht ok')
    // De secundaire stat volgt wat de job op level 40 mag dragen (minstens 4), de andere twee blijven 4, de hoofdstat krijgt de rest.
    expect(r.base[secondary]).toBeGreaterThan(4)
    expect(r.base[main]).toBe(apAtLevel(40) - 8 - r.base[secondary])
    for (const s of STATS) if (s !== main && s !== secondary) expect(r.base[s]).toBe(4)
    expect(sum(r.base)).toBe(apAtLevel(40))
    expect(autoFillMessage(job, r)).toBeNull()
  })
})

describe('autoFillAp: echte items per job', () => {
  it('Thief: Steel Igor (DEX 20, LUK 45) en Red Stealer Pants (DEX 20, LUK 50): LUK haalt de hoogste LUK-eis, DEX 20', () => {
    const r = autoFillAp('thief', '20', wear({ claw: 'Steel Igor', bottom: 'Red Stealer Pants' }))
    expect(r).toMatchObject({ ok: true, base: { str: 4, dex: 20, int: 4, luk: apAtLevel(20) - 28 }, limitedBy: 'Steel Igor' })
    if (r.ok) expect(r.base.luk).toBeGreaterThanOrEqual(50)
  })

  it('Thief: de armor met de hoogste DEX-eis bepaalt het limietitem, ook als de claw minder vraagt', () => {
    const r = autoFillAp('thief', '20', wear({ claw: 'Steel Titans', hat: 'Red Guise' }))
    expect(r).toMatchObject({ ok: true, base: { dex: 20 }, limitedBy: 'Red Guise' })
    expect(autoFillMessage('thief', r)).toBeNull()
  })

  it('bij gelijke eis houdt het eerste item in slotvolgorde de eer: claw voor hat', () => {
    const r = autoFillAp('thief', '20', wear({ claw: 'Steel Igor', hat: 'Red Guise' }))
    expect(r).toMatchObject({ ok: true, base: { dex: 20 }, limitedBy: 'Steel Igor' })
  })

  it('Thief: een item met DEX 0 in de eis tilt DEX niet en wordt geen limietitem', () => {
    const r = autoFillAp('thief', '8', wear({ claw: 'Garnier' }))
    expect(r).toMatchObject({ ok: true, base: { dex: 4 }, limitedBy: null })
  })

  it('Warrior: Gladius (STR 65, DEX 30) geeft DEX 30 en STR de rest', () => {
    const r = autoFillAp('warrior', '40', wear({ claw: 'Gladius' }))
    expect(r).toMatchObject({ ok: true, base: { str: apAtLevel(40) - 38, dex: 30, int: 4, luk: 4 }, limitedBy: 'Gladius' })
    expect(autoFillMessage('warrior', r)).toBeNull()
  })

  it('Warrior: wapen en armor samen, de hoogste DEX-eis wint (Two-Handed Sword DEX 20, Silver Master Sergeant DEX 15)', () => {
    const r = autoFillAp('warrior', '20', wear({ claw: 'Two-Handed Sword', top: 'Silver Master Sergeant' }))
    expect(r).toMatchObject({ ok: true, base: { dex: 20 }, limitedBy: 'Two-Handed Sword' })
  })

  it('Warrior: een overall (Black Dragon Robe, STR 50, DEX 20) telt als eis', () => {
    const r = autoFillAp('warrior', '20', wear({ overall: 'Black Dragon Robe' }))
    expect(r).toMatchObject({ ok: true, base: { dex: 20 }, limitedBy: 'Black Dragon Robe' })
  })

  it('Warrior: top en bottom los (zoals na het wisselen van een overall) tellen allebei, overall op NONE telt niet', () => {
    const eq = wear({ top: 'Red Hwarang Shirt' })
    eq.bottom = { pick: NONE, name: '', stat: '' }
    expect(autoFillAp('warrior', '20', eq)).toMatchObject({ ok: true, base: { dex: 20 }, limitedBy: 'Red Hwarang Shirt', unknown: [] })
  })

  it('Bowman: Ryden (STR 30, DEX 65): STR is secundair, DEX is de hoofdstat', () => {
    const r = autoFillAp('bowman', '40', wear({ claw: 'Ryden' }))
    expect(r).toMatchObject({ ok: true, base: { str: 30, dex: apAtLevel(40) - 38, int: 4, luk: 4 }, limitedBy: 'Ryden' })
    expect(autoFillMessage('bowman', r)).toBeNull()
  })

  it('Magician: Wizard Staff (INT 50, LUK 20) en Jester (INT 50, LUK 20): LUK 20, INT de rest', () => {
    const r = autoFillAp('magician', '40', wear({ claw: 'Wizard Staff', hat: 'Jester' }))
    expect(r).toMatchObject({ ok: true, base: { str: 4, dex: 4, int: apAtLevel(40) - 28, luk: 20 }, limitedBy: 'Wizard Staff' })
  })

  it('een eis op een stat die geen hoofd- of secundaire stat is tilt die stat ook (ruwe invoer: Thief met een Magician-hoed)', () => {
    const r = autoFillAp('thief', '8', wear({ hat: 'Wizardry Hat' }))
    expect(r).toMatchObject({ ok: true, base: { int: 30, dex: 4, luk: apAtLevel(8) - 38 }, limitedBy: null })
  })

  it('een eigen item zonder naam heet "eigen item", staat in unknown en verandert de eisen niet', () => {
    const eq = wear({ claw: 'Steel Igor' })
    eq.cape = { pick: OTHER, name: '  ', stat: '' }
    expect(autoFillAp('thief', '20', eq)).toMatchObject({ ok: true, base: { dex: 20 }, unknown: ['eigen item'] })
  })

  it('ammo telt niet mee', () => {
    expect(autoFillAp('thief', '8', wear({ ammo: 'Subi Throwing-Stars' }))).toMatchObject({ ok: true, unknown: [], limitedBy: null })
  })
})

describe('autoFillAp: de hele catalogus per job', () => {
  // Elk catalogusitem van de job, alleen gedragen, op level 190: de uitkomst haalt de eisen, verdeelt precies apAtLevel(190)
  // en houdt elke stat op minstens 4 en (buiten de hoofdstat) op precies max(4, eis); de secundaire stat ook op de catalogus.
  for (const job of JOBS) {
    it(`${job}: elk winkelitem geeft een kloppende verdeling op level 190`, () => {
      const { main, secondary } = MAIN_SECONDARY[job]
      const bare = autoFillAp(job, '190', defaultEquipment())
      if (!bare.ok) throw new Error(`${job}: verwacht ok zonder equipment`)
      const top = bare.base[secondary]
      const topBy = bare.limitedBy
      let checked = 0
      for (const { slot } of EQUIP_SLOTS) {
        if (slot === 'ammo') continue
        for (const item of catalogItems(slot, job)) {
          // Een shield telt alleen naast een wapen voor één hand (Dave, 7 oktober 2026): de beginner Sword vraagt geen stat.
          const eq = wear(slot === 'shield' ? { claw: 'Sword', shield: item.name } : { [slot]: item.name })
          const req = itemRequirements(slot, eq[slot])
          const r = autoFillAp(job, '190', eq)
          if (!r.ok) throw new Error(`${job} ${item.name}: verwacht ok`)
          checked++
          expect(sum(r.base), item.name).toBe(apAtLevel(190))
          // De secundaire stat haalt ook wat de job op level 190 mag dragen (top); bij gelijke eis houdt het gedragen item de eer.
          const wornSec = req?.[secondary] ?? 0
          for (const s of STATS) {
            const floor = s === secondary ? Math.max(4, wornSec, top) : Math.max(4, req?.[s] ?? 0)
            expect(r.base[s], `${item.name} ${s}`).toBeGreaterThanOrEqual(floor)
            if (s !== main) expect(r.base[s], `${item.name} ${s}`).toBe(floor)
          }
          expect(r.limitedBy, `${item.name} limitedBy`).toBe(wornSec > 4 && wornSec >= top ? item.name : topBy)
        }
      }
      expect(checked).toBeGreaterThan(5)
    })
  }

  it('op level 1 (25 AP) geeft elk item ok of short precies naar de som van max(4, eis)', () => {
    for (const job of JOBS) {
      for (const { slot } of EQUIP_SLOTS) {
        if (slot === 'ammo') continue
        for (const item of catalogItems(slot, job)) {
          // Een shield telt alleen naast een wapen voor één hand (Dave, 7 oktober 2026): de beginner Sword vraagt geen stat.
          const eq = wear(slot === 'shield' ? { claw: 'Sword', shield: item.name } : { [slot]: item.name })
          const req = itemRequirements(slot, eq[slot]) ?? {}
          const need = STATS.reduce((n, s) => n + Math.max(4, req[s] ?? 0), 0)
          const r = autoFillAp(job, '1', eq)
          expect(r.ok, `${job} ${item.name}`).toBe(need <= 25)
          if (r.ok) expect(sum(r.base)).toBe(25)
          else expect(r).toMatchObject({ reason: 'short', need, have: 25 })
        }
      }
    }
  })
})

describe('autoFillAp: de grens van AP en levels', () => {
  it('level 1: 25 AP, zonder equipment 4/4/4 en 13 op de hoofdstat', () => {
    expect(autoFillAp('thief', '1', defaultEquipment())).toMatchObject({ ok: true, base: { str: 4, dex: 4, int: 4, luk: 13 } })
  })

  it('level 199 en 200: de DEX voor wat je mag dragen houdt LUK onder de 999 die een stat kan houden', () => {
    for (const lvl of ['199', '200']) {
      const r = autoFillAp('thief', lvl, defaultEquipment())
      expect(r).toMatchObject({ ok: true, base: { dex: 34 } })
      if (r.ok) expect(r.base.luk).toBeLessThanOrEqual(999)
    }
  })

  it('meer AP dan een stat kan houden: niets invullen en dat zeggen', () => {
    const r: AutoFillResult = { ok: false, reason: 'max', unknown: [], have: 1020 }
    expect(autoFillMessage('thief', r)).toBe('Je level geeft 1020 AP, meer dan één stat kan hebben (999). Er is niets ingevuld.')
  })

  it('alleen een geheel level van 1 tot 200 telt (spaties eromheen mogen)', () => {
    for (const lvl of ['0', '201', '-5', '1.5', '1e2', '0x10', '1,5', ' ', '+5']) expect(autoFillAp('thief', lvl, defaultEquipment()), lvl).toMatchObject({ ok: false, reason: 'level' })
    for (const lvl of ['1', '198', ' 30 ', '030']) expect(autoFillAp('thief', lvl, defaultEquipment()).ok, lvl).toBe(true)
  })

  it('Thief met Steel Igor: level 10 (70 AP) is net te weinig voor de 73 die het vraagt, level 11 (75) net genoeg', () => {
    const eq = wear({ claw: 'Steel Igor' })
    expect(autoFillAp('thief', '10', eq)).toMatchObject({ ok: false, reason: 'short', need: 73, have: 70 })
    expect(autoFillAp('thief', '11', eq)).toMatchObject({ ok: true, base: { str: 4, dex: 20, int: 4, luk: 47 } })
  })

  it('precies genoeg AP: Warrior met Square Shovel (STR 11, DEX 11) vraagt 30; level 1 heeft 25, level 2 precies 30', () => {
    const eq = wear({ claw: 'Square Shovel' })
    expect(apAtLevel(2)).toBe(30)
    expect(autoFillAp('warrior', '1', eq)).toMatchObject({ ok: false, reason: 'short', need: 30, have: 25 })
    expect(autoFillAp('warrior', '2', eq)).toMatchObject({ ok: true, base: { str: 11, dex: 11, int: 4, luk: 4 }, limitedBy: 'Square Shovel' })
  })

  it('een eis die het level niet haalt: niets wordt ingevuld, de melding noemt eis en tekort', () => {
    // Pointed Shovel (STR 16, DEX 16): 40 AP nodig; level 3 heeft er 35.
    const r = autoFillAp('warrior', '3', wear({ claw: 'Pointed Shovel' }))
    expect(r).toMatchObject({ ok: false, reason: 'short', need: 40, have: 35 })
    expect(autoFillMessage('warrior', r)).toBe('Je level geeft te weinig AP voor je equipment: je hebt er 35 en je equipment vraagt er 40. Er is niets ingevuld.')
  })

  it('te weinig AP en een onbekend item: de melding zegt alleen waarom er niets is ingevuld', () => {
    const r = autoFillAp('thief', '1', withOwnHat('Steel Igor'))
    expect(r).toMatchObject({ ok: false, reason: 'short', unknown: ['Mijn hoed'] })
    expect(autoFillMessage('thief', r)).toBe('Je level geeft te weinig AP voor je equipment: je hebt er 25 en je equipment vraagt er 73. Er is niets ingevuld.')
  })

  it('een ongeldig level geeft de melding om eerst een level in te vullen, en wint van een te grote eis', () => {
    expect(autoFillMessage('thief', autoFillAp('thief', '', defaultEquipment()))).toBe('Vul eerst een geldig level in. Er is niets ingevuld.')
    expect(autoFillAp('thief', 'abc', withOwnHat('Steel Igor'))).toEqual({ ok: false, reason: 'level', unknown: ['Mijn hoed'] })
  })
})

describe('autoFillPatch: alleen base AP', () => {
  it('zet getallen als tekst en raakt extra AP, accuracy, level en WDEF niet aan', () => {
    const r = autoFillAp('thief', '20', wear({ claw: 'Steel Igor' }))
    if (!r.ok) throw new Error('verwacht ok')
    const patch = autoFillPatch(r.base)
    expect(patch).toEqual({ str: '4', dex: '20', int: '4', luk: String(apAtLevel(20) - 28) })
    for (const k of ['strExtra', 'dexExtra', 'intExtra', 'lukExtra', 'accuracy', 'level', 'wdef']) expect(patch).not.toHaveProperty(k)
  })
})

describe('autoFillAp: shield-slot van de Bowman (#172)', () => {
  it('een bewaard shield telt niet mee met een boog; geen enkel shield dat een Bowman kan bereiken heeft een stat-eis', () => {
    for (const w of ['Sword', 'Razor']) for (const { name } of catalogItems('shield', 'bowman', false, w)) expect(Object.keys(itemRequirements('shield', { pick: name, name: '', stat: '' }) ?? {}), name).toEqual([])
    const bare = wear({ claw: 'Ryden' })
    const withShield = wear({ claw: 'Ryden', shield: 'Pan Lid' })
    expect(autoFillAp('bowman', '40', withShield)).toEqual(autoFillAp('bowman', '40', bare))
  })

  it('een shield met een stat-eis (alleen met geweld in de opslag) beperkt een Bowman met een boog niet, en met een wapen voor één hand wel', () => {
    // Steel Shield eist STR 20; de catalogus biedt hem een Bowman niet aan, dus dit komt alleen uit handmatig bewerkte opslag.
    const bow = wear({ claw: 'Ryden', shield: 'Steel Shield' })
    expect(autoFillAp('bowman', '40', bow)).toEqual(autoFillAp('bowman', '40', wear({ claw: 'Ryden' })))
    const sword = autoFillAp('bowman', '40', wear({ claw: 'Sword', shield: 'Steel Shield' }))
    expect(sword.ok).toBe(true)
  })
})
