import { describe, expect, it } from 'vitest'
import { advisedSetup, cheapestFor, freshStart, MAX_EQUIP_ROUNDS } from './advisedSetup'
import type { CheapestInput } from './cheapestSettings'
import { changesBetween, profileOf } from './cheapestSettings'
import { MOBS, mobDraft } from './data/spots'
import { SUBI } from './data/thief'
import { defaultEquipment, isEmptyEntry, wornName } from './equipment'
import type { Job } from './job'
import { levelInvoice } from './levelInvoice'
import { NO_POTION_CHOICE } from './potions'
import { DEFAULT_PROFILE } from './profile'

const input = (job: Job, level: number, mob: string): CheapestInput => ({
  job,
  gender: null,
  equipment: defaultEquipment(),
  drafts: [mobDraft(mob)!],
  profileDraft: { ...DEFAULT_PROFILE, level: String(level) },
  potionChoice: NO_POTION_CHOICE,
})

/** Wat je hebt na Overnemen van deze uitkomst: de equip, het profiel, de mob en de potions van Advised. */
const afterTake = (user: CheapestInput, s: ReturnType<typeof advisedSetup>): CheapestInput => ({
  ...user,
  equipment: s.equipment,
  drafts: s.result.drafts,
  profileDraft: s.result.profileDraft,
  potionChoice: s.result.potionChoice,
})

const total = (i: CheapestInput, shop: Parameters<typeof levelInvoice>[2] = []) => {
  const profile = profileOf(i)
  const inv = levelInvoice(i.drafts, profile, shop)
  return inv.kind === 'invoice' ? inv.total : null
}

describe('advisedSetup: een vast punt (Dave, 6 oktober 2026, #192)', () => {
  const cases: [Job, number, string][] = [['thief', 20, 'Snail']]
  for (const job of ['thief', 'warrior', 'bowman'] as const) {
    for (const level of [12, 20, 27, 40]) {
      MOBS.filter((_, i) => i % 5 === 0).forEach((m) => cases.push([job, level, m.name]))
    }
  }

  it('koopt na Overnemen niets meer en verandert niets meer: Advised is dan je eigen setup (Difference 0)', () => {
    let bought = 0
    for (const [job, level, mob] of cases) {
      const user = input(job, level, mob)
      const s = advisedSetup(user)
      if (s.purchases.length > 0) bought++
      const taken = afterTake(user, s)
      const again = advisedSetup(taken)
      const label = `${job} L${level} ${mob}`
      expect(again.purchases.map((p) => p.name), label + ' koopt').toEqual([])
      expect(again.result.changes, label + ' verandert').toEqual([])
      expect(again.shop, label).toBe(0)
      // Difference: het totaal van je factuur na Overnemen is dat van Advised erna.
      const mine = total(taken)
      const advised = total(afterTake(taken, again), again.purchases.map((p) => ({ ...p.horizon, name: p.name, price: p.price })))
      expect(advised, label + ' totaal').toBe(mine)
    }
    // De sweep raakt ook echt aankopen, anders bewijst hij niets.
    expect(bought).toBeGreaterThan(0)
  })

  it('geeft voor thief level 20 op Snail een uitkomst die zijn aankopen kent en niet verder dan het maximum rekent', () => {
    const user = input('thief', 20, 'Snail')
    const s = advisedSetup(user)
    expect(s.purchases.length).toBeGreaterThan(0)
    expect(s.shop).toBe(s.purchases.reduce((n, p) => n + p.price, 0))
    // Wat gekocht is, draag je in die uitkomst, en het staat per slot als gewijzigd in het record voor de Equip-popup.
    for (const p of s.purchases) {
      expect(wornName(s.equipment[p.slot])).toBe(p.name)
      expect(s.cheapest[p.slot]).toMatchObject({ cheapest: p.name, changed: true, price: p.price })
    }
    expect(MAX_EQUIP_ROUNDS).toBeGreaterThan(0)
  })

  it('noemt de stars die de factuur van Advised telt, voor een leeg Ammo-slot (#189)', () => {
    const user = { ...input('thief', 20, 'Snail'), equipment: { ...defaultEquipment(), claw: { pick: 'Steel Igor', name: '', stat: '' } } }
    const s = advisedSetup(user)
    expect(s.ammo).toBe(SUBI.name)
    const profile = profileOf(afterTake(user, s))
    const inv = levelInvoice(s.result.drafts, profile)
    const line = inv.kind === 'invoice' ? inv.lines.find((l) => l.why?.kind === 'ammo') : undefined
    expect(line?.why).toMatchObject({ kind: 'ammo', pricePerStar: SUBI.rechargePerStar })
    // Wie niets gooit, krijgt geen ammo.
    expect(advisedSetup(input('warrior', 20, 'Snail')).ammo).toBeNull()
  })

  it('noemt bij een Bowman de pijl voor het wapen van Advised, en bij een Thief met een dagger niets, net als de factuur (#189)', () => {
    // Met een Balanche koopt Advised op level 20 een War Bow of een Crossbow (voor de groei was dat een War Bow, Dave 7 oktober 2026; beide geven op Snail
    // dezelfde EXP per meso en dezelfde besparing, dus de keuze is een gelijkspel): de pijl volgt het wapen waarmee de factuur rekent, niet wat je draagt.
    const bowman = { ...input('bowman', 20, 'Snail'), equipment: { ...defaultEquipment(), claw: { pick: 'Balanche', name: '', stat: '' } } }
    const b = advisedSetup(bowman)
    expect(['War Bow', 'Crossbow']).toContain(b.equipment.claw.pick)
    expect(b.ammo).toBe(b.equipment.claw.pick === 'Crossbow' ? 'Arrows for Crossbows' : 'Arrows for Bows')
    const thief = { ...input('thief', 20, 'Snail'), profileDraft: { ...DEFAULT_PROFILE, level: '20', dagger: '1' } }
    const s = advisedSetup(thief)
    expect(s.ammo).toBeNull()
    const inv = levelInvoice(s.result.drafts, profileOf(afterTake(thief, s)))
    expect(inv.kind === 'invoice' && inv.lines.some((l) => l.why?.kind === 'ammo')).toBe(false)
  })

  it('laat het Ammo-slot en de factuur samen kloppen bij een star-prijs buiten de lijst (#199)', () => {
    const claw = { pick: 'Steel Igor', name: '', stat: '' }
    const thief = { ...input('thief', 20, 'Snail'), equipment: { ...defaultEquipment(), claw } }
    const ammoLine = (user: CheapestInput) => {
      const s = advisedSetup(user)
      const inv = levelInvoice(s.result.drafts, profileOf(afterTake(user, s)))
      return { s, line: inv.kind === 'invoice' ? inv.lines.find((l) => l.label === 'Throwing stars') : undefined }
    }
    // Een herlaadprijs die bij geen star hoort: de factuur telt stars tegen die prijs, het slot noemt die prijs.
    const odd = ammoLine({ ...thief, profileDraft: { ...thief.profileDraft, starRecharge: '0.35' } })
    expect(odd.s.ammo).toBe('Throwing stars, 0,35 meso per stuk')
    expect(odd.line?.why).toMatchObject({ kind: 'ammo', pricePerStar: 0.35 })
    // Een eigen plek zonder berekend plan: er is geen factuur, dus het slot noemt ook geen munitie.
    const custom = { id: 'eigen', name: 'Eigen plek', expPerHour: '50000', travel: '0' }
    const noPlan = ammoLine({ ...thief, drafts: [custom] })
    expect(noPlan.line).toBeUndefined()
    expect(noPlan.s.ammo).toBeNull()
    // Een Bowman heeft geen eigen pijlprijs: zijn profiel rekent altijd met de prijs van de gekozen pijl, dus daar loopt het slot niet uiteen.
    const bow = { ...input('bowman', 20, 'Snail'), equipment: { ...defaultEquipment(), claw: { pick: 'Battle Bow', name: '', stat: '' } } }
    expect(advisedSetup({ ...bow, profileDraft: { ...bow.profileDraft, starRecharge: '0.35' } }).ammo).toMatch(/^Arrows for (Bows|Crossbows)$/)
  })

  it('geeft zonder aankopen de eigen equip terug, dezelfde objecten', () => {
    const user = input('thief', 10, 'Snail')
    const s = advisedSetup(user)
    if (s.purchases.length === 0) {
      expect(s.equipment).toBe(user.equipment)
      expect(s.profile).toBe(user.profileDraft)
    }
  })
})

describe('advisedSetup: er staat altijd een wapen in het advies (Dave, 7 oktober 2026, #202)', () => {
  const JOBS_ALL: Job[] = ['thief', 'warrior', 'bowman', 'magician']
  /** Geen mob gekozen, leeg wapenslot (zoals defaultEquipment) en het voorbeeldprofiel. */
  const bare = (job: Job, level: number): CheapestInput => ({
    job,
    gender: null,
    equipment: defaultEquipment(),
    drafts: [],
    profileDraft: { ...DEFAULT_PROFILE, level: String(level) },
    potionChoice: NO_POTION_CHOICE,
  })
  /** Een Beginner (level 1 tot 9): zonder punten in de skills van de 1e job, die heb je dan nog niet (anders parst het profiel niet). */
  const beginner = (job: Job, level: number): CheapestInput => {
    const user = bare(job, level)
    return { ...user, profileDraft: { ...user.profileDraft, luckySeven: '0', energyBolt: '0', nimbleBody: '0' } }
  }
  const levels = [10, 11, 12, 15, 20, 25, 30]

  it('zet bij een leeg wapenslot een wapen in het advies: gekocht met zijn winkelprijs en aan je hand', () => {
    for (const job of JOBS_ALL) {
      for (const level of levels) {
        const label = `${job} L${level}`
        const s = advisedSetup(bare(job, level))
        const slot = s.cheapest.claw
        expect(slot.cheapest, label).not.toBeNull()
        expect(slot.changed, label).toBe(true)
        const bought = s.purchases.find((p) => p.slot === 'claw')
        expect(bought, label + ' gekocht').toBeDefined()
        expect(bought!.name, label).toBe(slot.cheapest)
        expect(bought!.price, label).toBe(slot.price)
        expect(bought!.price, label + ' prijs').toBeGreaterThan(0)
        expect(wornName(s.equipment.claw), label + ' equip').toBe(slot.cheapest)
      }
    }
  })

  it('geeft Dave\'s geval: een Thief en een Warrior op level 10 met het voorbeeldprofiel krijgen allebei een wapen', () => {
    const thief = advisedSetup(bare('thief', 10))
    expect(thief.cheapest.claw).toMatchObject({ cheapest: 'Garnier', changed: true, price: 5000 })
    const warrior = advisedSetup(bare('warrior', 10))
    expect(warrior.cheapest.claw).toMatchObject({ cheapest: 'Steel Pipe', changed: true, price: 3000 })
  })

  it('blijft een vast punt: na Overnemen koopt Advised niets meer en verandert niets meer', () => {
    for (const job of JOBS_ALL) {
      for (const level of levels) {
        const user = bare(job, level)
        const taken = afterTake(user, advisedSetup(user))
        const again = advisedSetup(taken)
        const label = `${job} L${level}`
        expect(again.purchases.map((p) => p.name), label + ' koopt').toEqual([])
        expect(again.result.changes, label + ' verandert').toEqual([])
        expect(again.shop, label).toBe(0)
      }
    }
  })

  it('zet onder level 10 het goedkoopste wapen met een prijs in de hand (#203): een Thief, Warrior of Bowman koopt er een', () => {
    const beginnerNames = ['Sword', 'Hand Axe', 'Wooden Club', 'Razor', 'Fruit Knife']
    for (const job of ['thief', 'warrior', 'bowman'] as Job[]) {
      for (const level of [1, 5, 8, 9]) {
        const s = advisedSetup(beginner(job, level))
        const label = `${job} L${level}`
        const bought = s.purchases.find((p) => p.slot === 'claw')
        expect(beginnerNames, label).toContain(bought?.name)
        expect(bought!.horizon!.to, label).toBeLessThanOrEqual(9)
        expect(wornName(s.equipment.claw), label).toBe(bought!.name)
      }
    }
  })

  it('geeft een Magician onder level 10 geen wapen en geen crash: zijn winkelwapens beginnen op level 10', () => {
    const user = bare('magician', 8)
    const s = advisedSetup(user)
    expect(s.cheapest.claw.cheapest).toBeNull()
    expect(s.purchases.some((p) => p.slot === 'claw')).toBe(false)
    expect(isEmptyEntry(s.equipment.claw)).toBe(true)
    expect(s.profile.clawWatk).toBe(user.profileDraft.clawWatk)
  })

  it('koopt een dagger onder level 10 met de dagger-vlag aan, en een ander wapen met de vlag uit (#203)', () => {
    // Een Thief of Bowman die een Sword koopt, slaat niet met LUK als hoofdstat; alleen bij een dagger staat de vlag aan.
    for (const job of ['thief', 'bowman'] as Job[]) {
      const s = advisedSetup(beginner(job, 8))
      const name = s.purchases.find((p) => p.slot === 'claw')!.name
      expect(s.profile.dagger, job).toBe(name === 'Razor' || name === 'Fruit Knife' ? '1' : '0')
    }
    expect(advisedSetup(beginner('warrior', 8)).profile.dagger).toBe('0')
  })

  it('telt de winkelprijs van het beginnerwapen op de factuur van Advised: op level 9 de volle prijs, eerder een deel (#203)', () => {
    for (const job of ['thief', 'warrior', 'bowman'] as Job[]) {
      for (const level of [3, 9]) {
        const label = `${job} L${level}`
        const user = beginner(job, level)
        const s = advisedSetup(user)
        const bought = s.purchases.find((p) => p.slot === 'claw')!
        expect(bought.price, label).toBeGreaterThan(0)
        expect(s.shop, label).toBe(s.purchases.reduce((sum, p) => sum + p.price, 0))
        const pieces = s.purchases.map((p) => ({ ...p.horizon, name: p.name, price: p.price }))
        const taken = afterTake(user, s)
        const without = total(taken)
        const withShop = total(taken, pieces)
        expect(without, label + ' zonder').not.toBeNull()
        expect(withShop! - without!, label + ' verschil').toBeGreaterThan(0)
        const inv = levelInvoice(taken.drafts, profileOf(taken), pieces)
        const line = inv.kind === 'invoice' ? inv.lines.find((l) => l.shop && l.label === bought.name) : undefined
        expect(line, label + ' regel').toBeDefined()
        expect(line!.why?.kind === 'shop' && line!.why.price, label + ' prijs op de regel').toBe(bought.price)
        expect(line!.meso, label).toBeLessThanOrEqual(bought.price)
        // De horizon stopt op level 9: op level 9 draag je het wapen nog dit ene level en betaal je de hele prijs.
        if (level === 9) expect(line!.meso, label + ' volle prijs').toBe(bought.price)
        const shopLines = inv.kind === 'invoice' ? inv.lines.filter((l) => l.shop).reduce((sum, l) => sum + l.meso, 0) : NaN
        expect(withShop! - without!, label + ' som').toBe(shopLines)
      }
    }
  })

  it('laat een gevuld wapenslot met rust: het advies rekent met je eigen wapen, niet vanaf een lege hand', () => {
    const user = { ...bare('thief', 20), equipment: { ...defaultEquipment(), claw: { pick: 'Steel Igor', name: '', stat: '' } } }
    const s = advisedSetup(user)
    expect(s.cheapest.claw.worn).toBe('Steel Igor')
    // Op level 20 is er geen betere claw in de winkel: niets te kopen, en het profiel houdt zijn eigen ATT (geen lege hand van 0).
    expect(s.purchases.find((p) => p.slot === 'claw')).toBeUndefined()
    expect(wornName(s.equipment.claw)).toBe('Steel Igor')
    expect(s.profile.clawWatk).toBe(user.profileDraft.clawWatk)
  })
})

describe('cheapestFor: Cheapest bouwt zijn setup zelf op uit job, level en de equip die je draagt (Dave, 8 oktober 2026, #263)', () => {
  // Wat een speler invulde: een eigen wapen, een mob, en meer skillpunten dan level 19 toelaat (32 in de skills van de 1e job, de pot is 28).
  const filled = (job: Job): CheapestInput => {
    const user = input(job, 19, 'Pig')
    return {
      ...user,
      equipment: { ...defaultEquipment(), claw: { pick: 'Steel Titans', name: '', stat: '' } },
      profileDraft: { ...user.profileDraft, nimbleBody: '15', luckySeven: '17' },
    }
  }
  const clean = (job: Job): CheapestInput => ({ ...input(job, 19, 'Pig'), drafts: [] })

  it('neemt job, level, geslacht, Max HP en je equip over: mob, potions, skills en AP beginnen leeg of standaard', () => {
    const user = filled('thief')
    const start = freshStart(user)
    // Je equip, met de velden die erbij horen (Dave, 8 oktober 2026): wat je draagt is gratis, en een leeg schoenenslot is je startkleding.
    expect(start.equipment.claw).toBe(user.equipment.claw)
    expect(wornName(start.equipment.shoes)).toBe('Leather Sandals')
    expect(start.drafts).toEqual([])
    expect(start.potionChoice).toBe(NO_POTION_CHOICE)
    // Het standaardprofiel, met alleen het punt in de aanvalsskill; onder level 10 ook dat niet (geen punten van de 1e job).
    expect(start.profileDraft).toEqual({ ...DEFAULT_PROFILE, level: '19', hp: DEFAULT_PROFILE.hp })
    const gear = freshStart({ ...user, profileDraft: { ...user.profileDraft, clawWatk: '13', wdef: '', lukExtra: '5', attackMs: '660' } }).profileDraft
    expect([gear.clawWatk, gear.wdef, gear.lukExtra, gear.attackMs]).toEqual(['13', DEFAULT_PROFILE.wdef, '5', '660'])
    // Een veld buiten zijn grenzen, geen heel getal of geen getal valt terug op de standaard, zodat Cheapest altijd kan rekenen (Victor, 8 oktober 2026).
    const bad = { clawWatk: '1000', wdef: '-3', attackMs: '50', starWatk: '1.5', helpfulStranger: '2', dexExtra: 'x' }
    const fixed = freshStart({ ...user, profileDraft: { ...user.profileDraft, ...bad } })
    for (const k of Object.keys(bad) as (keyof typeof bad)[]) expect(fixed.profileDraft[k], k).toBe(DEFAULT_PROFILE[k])
    expect(profileOf(fixed), 'fout in een equip-veld').not.toBeNull()
    // Een stuk boven je level telt als leeg: een Steel Titans (level 15) op level 10, en Cheapest koopt er zelf een wapen voor (Dave, 8 oktober 2026).
    const atTen = { ...user, profileDraft: { ...user.profileDraft, level: '10' } }
    expect(isEmptyEntry(freshStart(atTen).equipment.claw)).toBe(true)
    expect(freshStart(user).equipment.claw.pick).toBe('Steel Titans')
    const armed = cheapestFor(atTen)
    expect(wornName(armed.equipment.claw)).not.toBe('Steel Titans')
    expect(armed.purchases.some((p) => p.slot === 'claw')).toBe(true)
    const low = freshStart({ ...clean('thief'), profileDraft: { ...DEFAULT_PROFILE, level: '5' } }).profileDraft
    expect([low.luckySeven, low.energyBolt]).toEqual(['0', '0'])
    // Een Max HP die geen getal is, valt terug op de standaard; een getal blijft staan.
    expect(freshStart({ ...clean('thief'), profileDraft: { ...DEFAULT_PROFILE, level: '19', hp: '796' } }).profileDraft.hp).toBe('796')
    expect(freshStart({ ...clean('thief'), profileDraft: { ...DEFAULT_PROFILE, level: '19', hp: 'abc' } }).profileDraft.hp).toBe(DEFAULT_PROFILE.hp)
  })

  it('geeft dezelfde setup, ook als het ingevulde profiel niet klopt', () => {
    for (const job of ['thief', 'warrior', 'bowman', 'magician'] as const) {
      // Met dezelfde equip: alleen de skillpunten (te veel) en de mob verschillen, en die bouwt Cheapest zelf op.
      const a = cheapestFor(filled(job))
      const b = cheapestFor({ ...clean(job), equipment: filled(job).equipment })
      // Het ingevulde profiel zelf rekent niet (te veel skillpunten), Cheapest wel.
      if (job === 'thief') expect(profileOf(filled(job)), job).toBeNull()
      expect(profileOf({ ...filled(job), ...a.result }), job).not.toBeNull()
      expect(a.result.profileDraft, job).toEqual(b.result.profileDraft)
      expect(a.result.drafts, job).toEqual(b.result.drafts)
      expect(a.purchases, job).toEqual(b.purchases)
      // Het wapen dat de speler draagt, houdt Cheapest of vervangt het: er staat altijd een wapen in (#202).
      expect(isEmptyEntry(a.equipment.claw), job).toBe(false)
    }
  })

  it('geeft op de levels van 1 tot 30 een profiel dat de app kan doorrekenen, en een prijs vanaf het level waarop de job kan aanvallen (Victor, 8 oktober 2026)', () => {
    // De grensniveaus (Beginner, de questhoed op 5, het mes op 8 en 9, de 1e job op 10) en een paar daarboven; alle 30 duurt op CI te lang.
    for (const job of ['thief', 'warrior', 'bowman', 'magician'] as const) {
      for (const level of [1, 4, 5, 7, 8, 9, 10, 11, 15, 20, 25, 30]) {
        const r = cheapestFor({ ...clean(job), profileDraft: { ...DEFAULT_PROFILE, level: String(level) } }).result
        expect(profileOf({ ...clean(job), ...r }), `${job} ${level}`).not.toBeNull()
        // Een Magician valt aan met Energy Bolt, een skill van zijn 1e job: daaronder kent het model geen mob voor hem.
        if (job !== 'magician' || level >= 10) expect(typeof r.costAfter, `${job} ${level}`).toBe('number')
      }
    }
  }, 20_000)

  it('meet de wijzigingen tegen jouw stand: per skill het verschil, met een min waar Cheapest er minder heeft', () => {
    const user = filled('thief')
    const r = cheapestFor(user).result
    const skills = r.changes.find((c) => c.kind === 'skills')?.text ?? ''
    // Cheapest kent dit level 28 punten toe, de speler zette er 32 in deze twee: minstens een van beide gaat omlaag.
    const diff = (id: 'nimbleBody' | 'luckySeven') => Number(r.profileDraft[id]) - Number(user.profileDraft[id])
    expect(diff('nimbleBody') + diff('luckySeven')).toBeLessThan(0)
    for (const [id, name] of [['nimbleBody', 'Nimble Body'], ['luckySeven', 'Lucky Seven']] as const) {
      const n = diff(id)
      expect(skills.includes(`${name} `), name).toBe(n !== 0)
      if (n !== 0) expect(skills, name).toContain(`${name} ${n > 0 ? '+' : '−'}${Math.abs(n)}`)
    }
    // Een Thief met een dagger heeft Double Stab; zet Cheapest die op 0, dan staat dat in de regel (Victor, 8 oktober 2026).
    const dagger = { ...clean('thief'), profileDraft: { ...DEFAULT_PROFILE, level: '20', dagger: '1', doubleStab: '12' } }
    const withDagger = cheapestFor(dagger).result
    const lost = Number(withDagger.profileDraft.doubleStab) - 12
    if (lost !== 0) expect(withDagger.changes.find((c) => c.kind === 'skills')?.text ?? '').toContain(`Double Stab ${lost > 0 ? '+' : '−'}${Math.abs(lost)}`)
    // Zonder verschil geen regel.
    const same = { ...user, profileDraft: r.profileDraft, drafts: r.drafts, potionChoice: r.potionChoice }
    expect(changesBetween(same, same)).toEqual([])
  })
})
