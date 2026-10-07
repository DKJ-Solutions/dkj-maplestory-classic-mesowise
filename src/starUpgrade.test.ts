import { describe, expect, it } from 'vitest'
import { advisedSetup } from './advisedSetup'
import { profileOf, type CheapestInput } from './cheapestSettings'
import { MOBS, mobDraft } from './data/spots'
import { SUBI, THROWING_STARS } from './data/thief'
import { applyEquipChange, defaultEquipment, OTHER, wornName } from './equipment'
import type { Job } from './job'
import { levelInvoice } from './levelInvoice'
import { NO_POTION_CHOICE } from './potions'
import { DEFAULT_PROFILE, type ProfileDraft } from './profile'
import { starUpgradeAdvice } from './starUpgrade'
import { bestExpPerMeso } from './bestExpPerMeso'
import { ASSUMPTIONS } from './calc/mobModel'
import { growthOf } from './growth'

// Advised rekent met de stats die het zelf zet (cheapestSettings), dus de uitkomst per profiel loopt via advisedSetup en niet via het ruwe profiel.

const WOLBI = THROWING_STARS.find((t) => t.name.startsWith('Wolbi'))!
const MOKBI = THROWING_STARS.find((t) => t.name.startsWith('Mokbi'))!

/** Een Thief met een eigen claw van `claw` ATT in de hand: Advised koopt dan geen wapen en het advies gaat alleen over de stars. */
const thief = (mob: string, level: number, claw: number, profile: Partial<ProfileDraft> = {}, job: Job = 'thief'): CheapestInput => ({
  job,
  gender: null,
  equipment: { ...defaultEquipment(), claw: { pick: OTHER, name: 'Eigen claw', stat: String(claw) } },
  drafts: [mobDraft(mob)!],
  profileDraft: { ...DEFAULT_PROFILE, level: String(level), clawWatk: String(claw), ...profile },
  potionChoice: NO_POTION_CHOICE,
})

describe('starUpgradeAdvice: Advised koopt alleen NPC-stars, afgeschreven als equipment (#198)', () => {
  it('heeft een koopprijs voor Subi en Wolbi, met bron en datum, en voor geen enkele andere star', () => {
    expect(SUBI.buy).toMatchObject({ price: 500, source: { url: 'https://meowdb.com/msclassic/item-db/294', retrieved: '2026-10-07' } })
    expect(WOLBI.buy).toMatchObject({ price: 1000, source: { url: 'https://meowdb.com/msclassic/item-db/295', retrieved: '2026-10-07' } })
    expect(THROWING_STARS.filter((t) => t.buy).map((t) => t.name)).toEqual([SUBI.name, WOLBI.name])
  })

  // Een Thief die Mokbi draagt (0,5 per star) en Wolbi (0,4 per star) overweegt: dat loont op level 15 met 5 ATT, want het herladen weegt zwaarder dan 2 ATT.
  // (Voor de groei, Dave 7 oktober 2026, loonde het ook op level 10 met 15 ATT: met de skillpunten en AP van elk level gooit hij sneller en gebruikt hij minder stars.)
  const mokbi = (level: number, claw = 15) => thief('Snail', level, claw, { starWatk: String(MOKBI.watk), starRecharge: String(MOKBI.rechargePerStar) })

  it('koopt Wolbi als dat het level goedkoper maakt dan de set kost, met de prijs en horizon van de set', () => {
    const user = mokbi(15, 5)
    const s = advisedSetup(user)
    const bought = s.purchases.find((p) => p.slot === 'ammo')
    expect(bought).toMatchObject({ name: WOLBI.name, price: 1000, horizon: { from: 15 } })
    expect(s.shop).toBeGreaterThanOrEqual(1000)
    // Overnemen zet de star in het profiel en in het Ammo-slot, zoals een keuze op de Equip-kaart.
    expect(wornName(s.equipment.ammo)).toBe(WOLBI.name)
    expect(s.profile.starWatk).toBe(String(WOLBI.watk))
    expect(s.profile.starRecharge).toBe(String(WOLBI.rechargePerStar))
    expect(s.ammo).toBe(WOLBI.name)
    expect(s.cheapest.ammo).toMatchObject({ changed: true, cheapest: WOLBI.name, price: 1000 })
  })

  it('schrijft de set af op de factuur: een level betaalt zijn deel van de 1.000, niet de hele prijs', () => {
    const user = mokbi(15, 5)
    const s = advisedSetup(user)
    const bought = s.purchases.find((p) => p.slot === 'ammo')!
    const p = profileOf({ ...user, equipment: s.equipment, drafts: s.result.drafts, profileDraft: s.result.profileDraft, potionChoice: s.result.potionChoice })
    const inv = levelInvoice(s.result.drafts, p, [{ ...bought.horizon!, name: bought.name, price: bought.price }])
    const line = inv.kind === 'invoice' ? inv.lines.find((l) => l.shop && l.label === WOLBI.name) : undefined
    expect(line?.meso).toBeGreaterThan(0)
    expect(line?.meso).toBeLessThan(1000)
  })

  it('houdt Subi als Wolbi zich niet terugverdient, en koopt dan niets', () => {
    const user = thief('Snail', 20, 40)
    expect(starUpgradeAdvice(user.drafts, profileOf(user))).toBeNull()
    const s = advisedSetup(user)
    expect(s.purchases.some((p) => p.slot === 'ammo')).toBe(false)
    expect(s.cheapest.ammo.changed).toBe(false)
  })

  it('koopt Subi terug als je een Wolbi draagt waar de goedkopere herlading het level goedkoper maakt, ook dat met afschrijving', () => {
    const user = thief('Snail', 15, 30, { starWatk: String(WOLBI.watk), starRecharge: String(WOLBI.rechargePerStar) })
    const s = advisedSetup(user)
    expect(s.purchases.find((p) => p.slot === 'ammo')).toMatchObject({ name: SUBI.name, price: 500 })
    expect(s.profile.starRecharge).toBe(String(SUBI.rechargePerStar))
  })

  it('telt de star die je draagt als van jou: de Wolbi die je koopt, kost daarna niets meer', () => {
    const user = mokbi(15, 5)
    const s = advisedSetup(user)
    const again = { ...user, equipment: s.equipment, drafts: s.result.drafts, profileDraft: s.result.profileDraft, potionChoice: s.result.potionChoice }
    expect(starUpgradeAdvice(again.drafts, profileOf(again))).toBeNull()
  })

  it('koopt nooit een star buiten het NPC-paar: wie Mokbi draagt, krijgt hooguit Subi of Wolbi', () => {
    for (const level of [10, 12, 15, 20]) {
      const user = mokbi(level)
      const bought = advisedSetup(user).purchases.find((p) => p.slot === 'ammo')
      expect(bought === undefined || [SUBI.name, WOLBI.name].includes(bought.name), 'L' + level).toBe(true)
    }
    const pick = starUpgradeAdvice([mobDraft('Snail')!], profileOf(thief('Snail', 10, 15, { starWatk: '27', starRecharge: '0.9' })))
    expect(pick === null || [SUBI, WOLBI].includes(pick.star)).toBe(true)
  })

  it('laat een eigen bedrag voor de munitie met rust: de factuur telt dat bedrag, niet de star', () => {
    const user = mokbi(10)
    const own = { ...user, drafts: [{ ...user.drafts[0], ammo: '300' }] }
    expect(starUpgradeAdvice(own.drafts, profileOf(own))).toBeNull()
  })

  it('laat een onbekende herlaadprijs met rust: die star is van jou en de app kent hem niet', () => {
    const user = thief('Stump', 10, 10, { starRecharge: '0.35' })
    expect(starUpgradeAdvice(user.drafts, profileOf(user))).toBeNull()
  })

  it('geeft geen star-advies aan wie niets gooit: een Warrior, een Thief met een dagger of een Thief onder level 10', () => {
    const warrior = thief('Stump', 10, 10, {}, 'warrior')
    expect(starUpgradeAdvice(warrior.drafts, profileOf(warrior))).toBeNull()
    const dagger = thief('Stump', 10, 10, { dagger: '1' })
    expect(starUpgradeAdvice(dagger.drafts, profileOf(dagger))).toBeNull()
    const beginner = thief('Stump', 8, 10)
    expect(starUpgradeAdvice(beginner.drafts, profileOf(beginner))).toBeNull()
    expect(advisedSetup(beginner).purchases.some((p) => p.slot === 'ammo')).toBe(false)
  })

  it('is een vast punt: na Overnemen koopt Advised niets meer en verandert niets meer, ook met een gedragen Mokbi of Wolbi', () => {
    let bought = 0
    const held: Partial<ProfileDraft>[] = [{}, { starWatk: '19', starRecharge: '0.5' }, { starWatk: '17', starRecharge: '0.4' }]
    for (const m of MOBS.slice(0, 5)) {
      for (const level of [10, 12, 15, 20]) {
        for (const claw of [5, 15, 30]) {
          for (const star of held) {
            const user = thief(m.name, level, claw, star)
            const s = advisedSetup(user)
            if (s.purchases.some((p) => p.slot === 'ammo')) bought++
            const taken: CheapestInput = { ...user, equipment: s.equipment, drafts: s.result.drafts, profileDraft: s.result.profileDraft, potionChoice: s.result.potionChoice }
            const again = advisedSetup(taken)
            const label = `${m.name} L${level} claw ${claw} ${JSON.stringify(star)}`
            expect(again.purchases.map((p) => p.name), label).toEqual([])
            expect(again.result.changes, label).toEqual([])
            expect(again.shop, label).toBe(0)
          }
        }
      }
    }
    expect(bought).toBeGreaterThan(0)
  }, 60000)

  it('past applyEquipChange toe op Wolbi: de herlaadprijs volgt de star', () => {
    const p = applyEquipChange(DEFAULT_PROFILE, 'ammo', defaultEquipment().ammo, { pick: WOLBI.name, name: '', stat: '' })
    expect(p.starRecharge).toBe(String(WOLBI.rechargePerStar))
  })
})

// EXP van level N naar N+1 voor N = 10 tot en met 30, hier uit de tabel overgetikt (niet via expToNextLevel), zodat de verwachting onafhankelijk is.
const EXP_10_TO_30 = [1716, 2360, 3216, 4200, 5460, 7050, 8840, 11040, 13716, 16680, 20216, 24402, 28980, 34320, 40512, 47216, 54900, 63666, 73080, 83720, 95700]
const expSum = (from: number, to: number) => EXP_10_TO_30.slice(from - 10, to - 10 + 1).reduce((a, b) => a + b, 0)
const heldMokbi = (level: number, claw = 15) => thief('Snail', level, claw, { starWatk: String(MOKBI.watk), starRecharge: String(MOKBI.rechargePerStar) })

describe('starUpgradeAdvice: het getal zelf (#198)', () => {
  // Met de hand: saving = som over de levels van de horizon van EXP x (1/EPM zonder - 1/EPM met de star), elk level op zijn eigen gegroeide profiel (growth.ts); net = saving - prijs van de set.
  const hand = (user: CheapestInput, name: string, to: number) => {
    const profile = profileOf(user)!
    const grown = growthOf(user.drafts, profile)
    const star = THROWING_STARS.find((t) => t.name === name)!
    let saving = 0
    for (let l = profile.level; l <= to; l++) {
      const base = bestExpPerMeso(user.drafts, grown(l), ASSUMPTIONS)!
      const withIt = bestExpPerMeso(user.drafts, { ...grown(l), starWatk: star.watk, starRecharge: star.rechargePerStar }, ASSUMPTIONS)!
      saving += expSum(l, l) * (1 / base - 1 / withIt)
    }
    return { saving, net: saving - star.buy!.price }
  }

  it('rekent saving en net uit met de hand-berekende EXP-som, tot net voor de volgende betere claw', () => {
    // Claw 15 op level 10: de volgende betere claw vraagt level 20, dus de horizon is level 10 tot en met 19 (74.278 EXP).
    expect(expSum(10, 19)).toBe(74278)
    const user = heldMokbi(10)
    const pick = starUpgradeAdvice(user.drafts, profileOf(user))!
    expect(pick).not.toBeNull()
    expect([pick.from, pick.to, pick.truncated]).toEqual([10, 19, false])
    const h = hand(user, pick.star.name, 19)
    expect(pick.saving).toBeCloseTo(h.saving, 6)
    expect(pick.net).toBeCloseTo(h.net, 6)
    expect(pick.price).toBe(pick.star.buy!.price)
    expect(pick.net).toBeGreaterThan(0)
  })

  it('kiest de grootste netto besparing van de twee NPC-stars', () => {
    const user = heldMokbi(10)
    const pick = starUpgradeAdvice(user.drafts, profileOf(user))!
    const other = [SUBI, WOLBI].find((t) => t !== pick.star)!
    expect(pick.net).toBeGreaterThanOrEqual(hand(user, other.name, 19).net)
  })

  it('knipt de horizon af op het einde van de EXP-tabel (level 30) zonder volgende betere claw, met truncated', () => {
    const user = heldMokbi(10, 200)
    const pick = starUpgradeAdvice(user.drafts, profileOf(user))!
    expect([pick.from, pick.to, pick.truncated]).toEqual([10, 30, true])
    const h = hand(user, pick.star.name, 30)
    expect(pick.saving).toBeCloseTo(h.saving, 6)
    expect(pick.net).toBeCloseTo(h.net, 6)
  })

  it('geeft geen advies voor een level buiten de EXP-tabel (31)', () => {
    const beyond = heldMokbi(31, 200)
    expect(starUpgradeAdvice(beyond.drafts, profileOf(beyond))).toBeNull()
  })

  it('schrijft de set af met de hand-berekende deelprijs: level 15 van 15 tot en met 19 betaalt 1.000 x 7.050 / 57.326, naar boven afgerond', () => {
    // 1000 x 7050 / 57326 = 122,98 meso, afgerond naar boven op 123. (Voor de groei was het level 10 met 15 ATT: 1000 x 1716 / 74278 = 24.)
    expect(expSum(15, 19)).toBe(57326)
    const user = heldMokbi(15, 5)
    const s = advisedSetup(user)
    const bought = s.purchases.find((p) => p.slot === 'ammo')!
    expect(bought).toMatchObject({ name: WOLBI.name, price: 1000, horizon: { from: 15, to: 19 } })
    const p = profileOf({ ...user, equipment: s.equipment, drafts: s.result.drafts, profileDraft: s.result.profileDraft, potionChoice: s.result.potionChoice })
    const inv = levelInvoice(s.result.drafts, p, [{ ...bought.horizon!, name: bought.name, price: bought.price }])
    const line = inv.kind === 'invoice' ? inv.lines.find((l) => l.shop && l.label === WOLBI.name) : undefined
    expect(line?.meso).toBe(123)
  })
})
