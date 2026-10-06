import { describe, expect, it } from 'vitest'
import { bestVerdict } from './best'
import { mobDraft, POTIONS } from './data/spots'
import { levelCost } from './levelCost'
import { levelInvoice, type AmmoWhy, type InvoiceLine, type PotionWhy } from './levelInvoice'
import { DEFAULT_PROFILE, parseProfile, type Profile, type ProfileDraft } from './profile'
import { NO_POTION_CHOICE, resolvePotions } from './potions'
import type { Job } from './job'

const profileOf = (draft: Partial<ProfileDraft> = {}, job: Job = 'thief'): Profile => {
  const r = parseProfile({ ...DEFAULT_PROFILE, ...draft }, job)
  if (!('profile' in r)) throw new Error(r.error)
  return r.profile
}
const thief = profileOf()
/** Een regel met de uitleg van een potion; de munitie heeft sinds #192 een eigen uitleg (AmmoWhy). */
const isPotionLine = (l: InvoiceLine): l is InvoiceLine & { why: PotionWhy } => l.why !== undefined && l.why.kind !== 'ammo'
const drafts = [mobDraft('Ribbon Pig')!]
const invoiceOf = (p: Profile, d = drafts) => {
  const inv = levelInvoice(d, p)
  if (inv.kind !== 'invoice') throw new Error('geen factuur')
  return inv
}
const levelMeso = (p: Profile, d = drafts) => {
  const c = levelCost(p, bestVerdict(d, p))
  if (c.kind !== 'cost' || c.meso === null) throw new Error('geen kosten')
  return c.meso
}

describe('levelInvoice', () => {
  it('geeft geen factuur zonder profiel of zonder mob, met de kosten van het level erbij voor de reden', () => {
    expect(levelInvoice(drafts, null)).toEqual({ kind: 'none', cost: { kind: 'noProfile' } })
    const none = levelInvoice([], thief)
    expect(none.kind).toBe('none')
    expect(none.kind === 'none' && none.cost.kind).toBe('noBest')
  })

  it('zet een Thief op Ribbon Pig zijn potions en stars op de factuur, met stuks maal prijs', () => {
    const inv = invoiceOf(thief)
    expect(inv).toMatchObject({ level: 10, expToNext: 1716, mob: 'Ribbon Pig' })
    // Lucky Seven kost MP, dus ook Blue Potions.
    expect(inv.lines.map((l) => l.label)).toEqual(['Orange Potion', 'Blue Potion', 'Throwing stars'])
    const orange = inv.lines[0]
    expect(orange.qty).toBeGreaterThan(0)
    expect(orange.meso).toBe(orange.qty! * POTIONS.find((p) => p.name === 'Orange Potion')!.price)
    expect(inv.total).toBe(inv.lines.reduce((s, l) => s + l.meso, 0))
  })

  it('komt uit op de kosten van het level, op het naar boven afronden van elke regel na', () => {
    for (const p of [thief, profileOf({ level: '15' }), profileOf({}, 'warrior')]) {
      const inv = invoiceOf(p)
      const meso = levelMeso(p)
      expect(inv.total).toBeGreaterThanOrEqual(Math.floor(meso))
      // Elke regel rondt hoogstens één stuk (of één meso) naar boven af.
      const slack = inv.lines.reduce((s, l) => s + (l.qty === null ? 1 : l.qty === 0 ? 0 : l.meso / l.qty + 1), 0)
      expect(inv.total - meso).toBeLessThanOrEqual(slack)
    }
  })

  it('legt bij elke potion uit hoe het aantal ontstaat, met precies het getal dat naar boven wordt afgerond (Victor, 6 oktober 2026)', () => {
    for (const p of [thief, profileOf({ level: '15' }), profileOf({}, 'warrior'), { ...thief, potions: resolvePotions('thief', { ...NO_POTION_CHOICE, hp: 'White Potion' }) }]) {
      for (const line of invoiceOf(p).lines.filter(isPotionLine)) {
        const w = line.why!
        // Het aantal is het exacte getal naar boven afgerond, en dat getal is wat je kwijt bent gedeeld door één potion.
        expect(line.qty).toBe(Math.max(0, Math.ceil(w.exact - 1e-9)))
        expect(w.exact).toBeCloseTo(w.need / w.restores, 9)
        expect(w.need).toBeCloseTo((w.perKill * w.killsPerHour + w.buffPerHour) * w.hours, 6)
        if (w.kind === 'hp') expect(w.hits! * w.touch!).toBeCloseTo(w.perKill, 9)
      }
    }
  })

  it('rekent met de potions die je gebruikt', () => {
    const white = { ...thief, potions: resolvePotions('thief', { ...NO_POTION_CHOICE, hp: 'White Potion' }) }
    const inv = invoiceOf(white)
    expect(inv.lines[0].label).toBe('White Potion')
    expect(inv.lines[0].meso).toBe(inv.lines[0].qty! * 350)
    expect(inv.total).toBeGreaterThan(invoiceOf(thief).total)
  })

  it('zet je MP-potion er ook op als je dit level geen MP gebruikt, met × 0 (Dave, 6 oktober 2026)', () => {
    // Een Warrior zonder Power Strike slaat zonder MP.
    const inv = invoiceOf(profileOf({ powerStrike: '0' }, 'warrior'))
    const blue = inv.lines.find((l) => l.label === 'Blue Potion')!
    expect(blue).toMatchObject({ qty: 0, meso: 0 })
    expect(blue.why).toMatchObject({ kind: 'mp', perKill: 0, need: 0, exact: 0 })
    expect(inv.lines.map((l) => l.label).slice(0, 2)).toEqual(['Orange Potion', 'Blue Potion'])
  })

  it('geeft een Warrior geen munitie, en een Bowman pijlen', () => {
    expect(invoiceOf(profileOf({}, 'warrior')).lines.map((l) => l.label)).not.toContain('Throwing stars')
    const bowman = profileOf({ lukExtra: '0', str: '4', dex: '60', luk: '4', clawWatk: '20', accuracy: '60' }, 'bowman')
    expect(invoiceOf(bowman).lines.map((l) => l.label)).toContain('Arrows')
  })

  it('noemt munitie die een Warrior zelf invulde Ammo, en geen Throwing stars', () => {
    const own = [{ ...drafts[0], ammo: '100' }]
    const labels = invoiceOf(profileOf({}, 'warrior'), own).lines.map((l) => l.label)
    expect(labels).toContain('Ammo')
    expect(labels).not.toContain('Throwing stars')
  })

  it('zet potions die je zelf invulde als één bedrag zonder stuks', () => {
    const own = [{ ...drafts[0], potions: '1000' }]
    const inv = invoiceOf(thief, own)
    const line = inv.lines.find((l) => l.label === 'Potions')!
    expect(line.qty).toBeNull()
    expect(line.meso).toBe(Math.ceil(1000 * inv.hours))
  })
})

describe('levelInvoice en het plafond op het herstel van een potion (#181)', () => {
  const potionLines = (p: Profile) => invoiceOf(p).lines.filter(isPotionLine)
  const big = profileOf({ hp: '2000', mp: '2000' })

  it('zet bij een kleine balk het effectieve herstel in `restores` en het volle in `full` (Orange 250 bij Max HP 444: 222; Blue 200 bij Max MP 363: 181,5)', () => {
    const [orange, blue] = potionLines(thief).map((l) => l.why!)
    expect(thief.hp).toBe(444)
    expect(orange).toMatchObject({ kind: 'hp', restores: 222, full: 250 })
    expect(blue).toMatchObject({ kind: 'mp', restores: 181.5, full: 200 })
  })

  it('zet restores gelijk aan full als de potion binnen het plafond blijft (Max 2000)', () => {
    for (const w of potionLines(big).map((l) => l.why!)) expect(w.restores).toBe(w.full)
    expect(potionLines(big)[0].why).toMatchObject({ restores: 250, full: 250 })
  })

  it('deelt het getal dat naar boven wordt afgerond door `restores`, en het aantal is dat getal naar boven afgerond', () => {
    for (const p of [thief, big, profileOf({ level: '15' })]) {
      for (const line of potionLines(p)) {
        const w = line.why!
        expect(w.exact).toBeCloseTo(w.need / w.restores, 9)
        expect(line.qty).toBe(Math.max(0, Math.ceil(w.exact - 1e-9)))
        expect(w.restores).toBeLessThanOrEqual(w.full)
      }
    }
  })

  it('geeft bij een kleine balk meer potions dan bij een grote, in de verhouding full / restores', () => {
    const small = potionLines(thief)[0].why!
    const large = potionLines(big)[0].why!
    // Zelfde need (alleen het plafond verschilt), dus exact verhoudt zich als 250 / 222.
    expect(small.need).toBeCloseTo(large.need, 6)
    expect(small.exact / large.exact).toBeCloseTo(250 / 222, 9)
    expect(potionLines(thief)[0].qty!).toBeGreaterThan(potionLines(big)[0].qty!)
  })

  it('houdt full vast bij Improved HP Recovery en kapt restores af: een Warrior met Improved HP Recovery 15 (1,2) telt 300 volle HP, bij Max HP 500 voor 250', () => {
    const warrior = profileOf({ hp: '500', level: '30', improvedHpRecovery: '15' }, 'warrior')
    const w = potionLines(warrior)[0].why!
    expect(warrior.hp).toBe(500)
    expect(w.full).toBeCloseTo(250 * 1.2, 9)
    expect(w.restores).toBe(250)
  })

  it('maakt het level duurder met een kleine balk dan met een grote: het plafond doet er echt iets', () => {
    expect(levelMeso(thief)).toBeGreaterThan(levelMeso(big))
    expect(invoiceOf(thief).total).toBeGreaterThan(invoiceOf(big).total)
  })
})

describe('levelInvoice: de uitleg achter het aantal stars (Dave, 6 oktober 2026, #192)', () => {
  const ammoLine = (p: Profile) => invoiceOf(p).lines.find((l): l is InvoiceLine & { why: AmmoWhy } => l.why?.kind === 'ammo')

  it('rekent het aantal stars uit met precies de getallen die de uitleg toont, en het bedrag met de herlaadprijs', () => {
    for (const p of [thief, profileOf({ level: '15' }), profileOf({ level: '20', luckySeven: '10' })]) {
      const line = ammoLine(p)!
      const w = line.why
      expect(line.label).toBe('Throwing stars')
      // Aanvallen per kill: de HP van de mob gedeeld door de verwachte schade per aanval, naar boven afgerond.
      expect(w.attacksToKill).toBe(Math.ceil(w.mobHp / (w.starsPerAttack * w.avgHit * w.hitChance)))
      expect(w.perKill).toBe(w.attacksToKill * w.starsPerAttack)
      expect(w.exact).toBeCloseTo(w.perKill * w.killsPerHour * w.hours, 6)
      expect(line.qty).toBe(Math.max(0, Math.ceil(w.exact - 1e-9)))
      expect(line.meso).toBe(Math.ceil(line.qty! * w.pricePerStar))
      expect(w.mob).toBe(invoiceOf(p).mob)
      expect(w.hours).toBeCloseTo(invoiceOf(p).hours, 9)
    }
  })

  it('geeft Lucky Seven twee stars per aanval en een gewone aanval één', () => {
    expect(ammoLine(profileOf({ level: '20', luckySeven: '10' }))!.why.starsPerAttack).toBe(2)
    expect(ammoLine(profileOf({ luckySeven: '0' }))!.why.starsPerAttack).toBe(1)
  })

  it('zet geen munitie en dus geen uitleg op de factuur van een job die niets gooit', () => {
    expect(ammoLine(profileOf({ powerStrike: '0' }, 'warrior'))).toBeUndefined()
  })
})
