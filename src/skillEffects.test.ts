// Wat skills aan je totalen veranderen (issue #139): de buffs (Iron Body, Magic Armor, Focus) en Max HP Increase, van de pure
// module tot het skillpunt-advies. De getallen zijn met de hand uit de tabellen van data/warrior.ts, data/magician.ts en
// data/bowman.ts nagerekend, niet uit de code onder test.
import { describe, expect, it } from 'vitest'
import { pickUnder } from './best'
import { estimateMob, meleeAttack, type MobStats } from './calc/mobModel'
import { isInvalid } from './calc/rankSpots'
import { mesoCostOfLevel } from './calc/mesoCostOfLevel'
import { expToNextLevel } from './data/expTable'
import { findKnownSpot, knownSpotPatch } from './data/spots'
import type { Job } from './job'
import { DEFAULT_PROFILE, parseProfile, toCharacter, type Profile, type ProfileDraft } from './profile'
import { buffBonus, ironBodyDef, maxHpAfterPoint, skillEffectText } from './skillEffects'
import { skillPointAdvice, skillsOf } from './skillPoint'
import { newDraft, type SpotDraft } from './spotDraft'
import { hourPlan, MP_POTION, suggestMonsters, type MonsterSuggestion } from './suggest'

const parsed = parseProfile(DEFAULT_PROFILE)
if (!('profile' in parsed)) throw new Error('voorbeeldprofiel ongeldig')
// Het voorbeeldprofiel: WDEF 72, accuracy 33, avoid 23, geen buffs.
const profile: Profile = parsed.profile

const parse = (job: Job, over: Partial<ProfileDraft>): Profile => {
  const r = parseProfile({ ...DEFAULT_PROFILE, ...over }, job)
  if (!('profile' in r)) throw new Error(`${job}-profiel ongeldig: ${r.key}`)
  return r.profile
}

describe('ironBodyDef', () => {
  it('geeft een procent van je WDEF, naar beneden afgerond', () => {
    expect(ironBodyDef(72, 1)).toBe(3) // 5%: 3,6
    expect(ironBodyDef(72, 5)).toBe(6) // 9%: 6,48
    expect(ironBodyDef(72, 19)).toBe(16) // 23%: 16,56
    expect(ironBodyDef(72, 20)).toBe(18) // 25%: 18
  })

  it('geeft niets op level 0 of zonder WDEF', () => {
    expect(ironBodyDef(72, 0)).toBe(0)
    expect(ironBodyDef(0, 20)).toBe(0)
  })
})

describe('buffBonus', () => {
  it('is nul zonder buffs', () => {
    expect(buffBonus(profile)).toEqual({ wdef: 0, accuracy: 0, avoid: 0, mpPerHour: 0 })
  })

  it('telt Iron Body als procent van je WDEF en kost 15 MP per cast: level 5 is 9% van 72 en 360 s, dus 150 MP per uur', () => {
    // Level 5: 5 + 4 = 9%; duur 300 + 15 x 4 = 360 s; 15 x 3600 / 360 = 150.
    expect(buffBonus({ ...profile, ironBody: 5 })).toEqual({ wdef: 6, accuracy: 0, avoid: 0, mpPerHour: 150 })
    // Level 1: 5%, 300 s: 15 x 3600 / 300 = 180. Level 20: 25%, 600 s: 90.
    expect(buffBonus({ ...profile, ironBody: 1 })).toEqual({ wdef: 3, accuracy: 0, avoid: 0, mpPerHour: 180 })
    expect(buffBonus({ ...profile, ironBody: 20 })).toEqual({ wdef: 18, accuracy: 0, avoid: 0, mpPerHour: 90 })
  })

  it('telt Magic Armor als vast getal, niet als procent: level 1 is +40 DEF voor 8 MP per 300 s, dus 96 MP per uur', () => {
    expect(buffBonus({ ...profile, magicArmor: 1 })).toEqual({ wdef: 40, accuracy: 0, avoid: 0, mpPerHour: 96 })
    // Level 11: 80 DEF, 13 MP per 450 s: 13 x 3600 / 450 = 104. Level 20: 120 DEF, 16 MP per 600 s: 96.
    expect(buffBonus({ ...profile, magicArmor: 11 })).toEqual({ wdef: 80, accuracy: 0, avoid: 0, mpPerHour: 104 })
    expect(buffBonus({ ...profile, magicArmor: 20 })).toEqual({ wdef: 120, accuracy: 0, avoid: 0, mpPerHour: 96 })
  })

  it('telt Focus als accuracy en evasion: level 20 is +20 accuracy, +25 evasion en 16 MP per 300 s, dus 192 MP per uur', () => {
    expect(buffBonus({ ...profile, focus: 20 })).toEqual({ wdef: 0, accuracy: 20, avoid: 25, mpPerHour: 192 })
    // Level 1: +1 accuracy, +5 evasion, 8 MP per 70 s: 28 800 / 70. Level 10: +10, +14, 10 MP per 170 s: 36 000 / 170.
    const one = buffBonus({ ...profile, focus: 1 })
    expect([one.wdef, one.accuracy, one.avoid]).toEqual([0, 1, 5])
    expect(one.mpPerHour).toBeCloseTo(28_800 / 70, 9)
    const ten = buffBonus({ ...profile, focus: 10 })
    expect([ten.accuracy, ten.avoid]).toEqual([10, 14])
    expect(ten.mpPerHour).toBeCloseTo(36_000 / 170, 9)
  })

  it('telt de buffs bij elkaar op: de MP per uur is de som, de DEF van Iron Body komt uit je WDEF zonder die van Magic Armor', () => {
    // Iron Body 5: floor(72 x 9 / 100) = 6; Magic Armor 6: +60; Focus 20: +20 / +25. MP: 150 + 96 + 192 = 438.
    expect(buffBonus({ ...profile, ironBody: 5, magicArmor: 6, focus: 20 })).toEqual({ wdef: 66, accuracy: 20, avoid: 25, mpPerHour: 438 })
  })

  it('telt een passief niet (Max HP Increase, Nimble Body, Precise Strikes zitten al in je statvenster)', () => {
    expect(buffBonus({ ...profile, maxHpIncrease: 5, nimbleBody: 5, preciseStrikes: 5 })).toEqual({ wdef: 0, accuracy: 0, avoid: 0, mpPerHour: 0 })
  })
})

describe('toCharacter telt de buffs erbij', () => {
  it('laat een profiel zonder buffs zoals het was', () => {
    expect(toCharacter(profile)).toMatchObject({ wdef: 72, accuracy: 33, avoid: 23 })
  })

  it('zet Iron Body, Magic Armor en Focus bovenop WDEF, accuracy en avoid van het statvenster, en laat de rest staan', () => {
    const base = toCharacter(profile)
    const c = toCharacter({ ...profile, ironBody: 5, magicArmor: 6, focus: 20 })
    expect(c.wdef).toBe(72 + 6 + 60)
    expect(c.accuracy).toBe(33 + 20)
    expect(c.avoid).toBe(23 + 25)
    expect({ ...c, wdef: 0, accuracy: 0, avoid: 0 }).toEqual({ ...base, wdef: 0, accuracy: 0, avoid: 0 })
  })
})

describe('suggestMonsters en hourPlan: de MP om je buffs aan te houden', () => {
  const subway = findKnownSpot('kerning-subway-line-1-area-1')!

  it('zet de MP per uur van de buffs op elk voorstel, en 0 zonder buffs', () => {
    expect(suggestMonsters(profile, subway)[0].buffMpPerHour).toBe(0)
    for (const s of suggestMonsters({ ...profile, ironBody: 5, magicArmor: 6, focus: 20 }, subway)) expect(s.buffMpPerHour).toBe(438)
  })

  it('telt de upkeep bij de MP-potions: 200 MP per uur extra is precies één Blue Potion (200 MP) per uur', () => {
    const s = suggestMonsters(profile, subway)[0]
    const without = hourPlan({ ...s, buffMpPerHour: 0 }, 100)
    const withBuff = hourPlan({ ...s, buffMpPerHour: 200 }, 100)
    expect(MP_POTION.mp).toBe(200)
    expect(withBuff.mpPotionsPerHour - without.mpPotionsPerHour).toBeCloseTo(1, 9)
    expect(withBuff.potions - without.potions).toBeCloseTo(MP_POTION.price, 9)
    // De HP-potions en de EXP blijven staan.
    expect(withBuff.hpPotionsPerHour).toBe(without.hpPotionsPerHour)
    expect(withBuff.expPerHour).toBe(without.expPerHour)
  })

  it('kost de upkeep ook als je niets killt: de buff blijft aan staan', () => {
    const s = suggestMonsters(profile, subway)[0]
    const idle = hourPlan({ ...s, buffMpPerHour: 100 }, 0)
    expect(idle.mpPotionsPerHour).toBe(0.5) // 100 MP / 200 MP per potion
    expect(idle.potions).toBeCloseTo(110, 9) // 0,5 x 220
    expect(idle.expPerHour).toBe(0)
  })

  it('rekent met de hand na wat Magic Armor op een zwaar monster uitspaart, en wat het aan MP kost', () => {
    // Level 20; het monster is level 20 (dus geen demping), raakt altijd (accuracy 1000) en doet 1000 per tik.
    // Taken = Raw x (1 - DEF / (DEF + 5 x (20 + 40) + 1,2 x Raw)) = 1000 x (1 - DEF / (DEF + 1500)); hp-verlies per kill = 0,3 x Taken.
    const mob: MobStats = { level: 20, hp: 100_000, wdef: 0, avoid: 0, accuracy: 1000, touch: { min: 1000, max: 1000 } }
    const plan = (p: Profile) => {
      const c = toCharacter(p)
      const estimate = estimateMob(c, meleeAttack(c, 1.8, null), mob)
      const s: MonsterSuggestion = {
        monster: { ...mob, name: 'testmonster', expPerKill: 1, source: { url: 'https://example.invalid', retrieved: '2026-10-04' } },
        estimate,
        expPerHour: 0,
        rechargePerStar: 0,
        mpPotion: MP_POTION,
        buffMpPerHour: buffBonus(p).mpPerHour,
      }
      return { s, h: hourPlan(s, 1000) }
    }
    const bare = plan({ ...profile, level: 20, wdef: 60 })
    const armored = plan({ ...profile, level: 20, wdef: 60, magicArmor: 1 })
    // DEF 60: 1000 x 1500 / 1560 = 961,538...; hp-verlies 288,4615... per kill.
    expect(bare.s.estimate.touchTaken).toBeCloseTo(1_500_000 / 1560, 6)
    expect(bare.s.estimate.hpLossPerKill).toBeCloseTo((0.3 * 1_500_000) / 1560, 6)
    // DEF 60 + 40 = 100: 1000 x 1500 / 1600 = 937,5; hp-verlies 281,25 per kill.
    expect(armored.s.estimate.touchTaken).toBeCloseTo(937.5, 9)
    expect(armored.s.estimate.hpLossPerKill).toBeCloseTo(281.25, 9)
    // Melee kost geen MP per kill, dus alle MP is upkeep: 96 per uur.
    expect(bare.s.estimate.mpPerKill).toBe(0)
    expect(armored.h.mpPotionsPerHour).toBeCloseTo(96 / 200, 9)
    // 1000 kills per uur, Orange Potion 250 HP voor 150: 1000 x 281,25 / 250 x 150 = 168 750 aan HP-potions; Blue 0,48 x 220 = 105,6.
    expect(armored.h.potions).toBeCloseTo(168_750 + 105.6, 6)
    expect(bare.h.potions).toBeCloseTo(((1000 * 0.3 * 1_500_000) / 1560 / 250) * 150, 6)
    // De DEF bespaart ± 4 221 per uur en de upkeep kost 105,60: per saldo goedkoper.
    expect(bare.h.potions - armored.h.potions).toBeCloseTo(173_076.923077 - 168_855.6, 3)
    expect(armored.h.potions).toBeLessThan(bare.h.potions)
  })

  it('maakt Iron Body op een zacht monster juist duurder: 3 DEF bespaart minder aan HP-potions dan 180 MP per uur kost', () => {
    // Zelfde monster maar 100 per tik: Taken = 100 x (1 - DEF / (DEF + 300 + 120)); DEF 60: 87,5; DEF 63: 100 x 420 / 483 = 86,9565...
    const mob: MobStats = { level: 20, hp: 100_000, wdef: 0, avoid: 0, accuracy: 1000, touch: { min: 100, max: 100 } }
    const loss = (p: Profile) => {
      const c = toCharacter(p)
      return estimateMob(c, meleeAttack(c, 1.8, null), mob).hpLossPerKill
    }
    expect(loss({ ...profile, level: 20, wdef: 60 })).toBeCloseTo(0.3 * 87.5, 9)
    expect(loss({ ...profile, level: 20, wdef: 60, ironBody: 1 })).toBeCloseTo((0.3 * 42_000) / 483, 9)
    // 100 kills per uur: HP-potions 100 x 26,25 / 250 x 150 = 1 575 tegen 1 565,22 (bespaart 9,78); upkeep 180 / 200 x 220 = 198.
    const saved = ((100 * (0.3 * 87.5 - (0.3 * 42_000) / 483)) / 250) * 150
    expect(saved).toBeCloseTo(9.7826, 3)
    expect(saved).toBeLessThan((180 / 200) * 220)
  })
})

describe('skillEffectText', () => {
  it('geeft niets op level 0', () => {
    for (const key of ['nimbleBody', 'preciseStrikes', 'maxHpIncrease', 'ironBody', 'magicArmor', 'focus', 'criticalShot', 'maxMpIncrease'] as const) {
      expect(skillEffectText(key, 0, 72), key).toBeNull()
    }
  })

  it('noemt bij Nimble Body accuracy en evasion, 1 per level, en niets boven het maximum (15)', () => {
    expect(skillEffectText('nimbleBody', 3, null)).toBe('+3 Accuracy, +3 Evasion')
    expect(skillEffectText('nimbleBody', 15, null)).toBe('+15 Accuracy, +15 Evasion')
    expect(skillEffectText('nimbleBody', 16, null)).toBeNull()
  })

  it('noemt bij Precise Strikes accuracy en crit uit de tabel: level 1 is +5 / +1%, level 15 is +20 / +5%', () => {
    expect(skillEffectText('preciseStrikes', 1, null)).toBe('+5 Accuracy, +1% Crit. Rate')
    expect(skillEffectText('preciseStrikes', 15, null)).toBe('+20 Accuracy, +5% Crit. Rate')
    expect(skillEffectText('preciseStrikes', 16, null)).toBeNull()
  })

  it('noemt bij Max HP Increase het procent: level 1 is 10%, level 15 is 25%', () => {
    expect(skillEffectText('maxHpIncrease', 1, 72)).toBe('+10% Max HP')
    expect(skillEffectText('maxHpIncrease', 15, 72)).toBe('+25% Max HP')
    expect(skillEffectText('maxHpIncrease', 16, 72)).toBeNull()
  })

  it('noemt bij Iron Body de DEF uit je profiel met het procent, en zonder geldige DEF alleen het procent', () => {
    expect(skillEffectText('ironBody', 5, 72)).toBe('+6 DEF (9%)')
    expect(skillEffectText('ironBody', 20, 72)).toBe('+18 DEF (25%)')
    expect(skillEffectText('ironBody', 5, null)).toBe('+9% DEF')
    // Een WDEF van 0 is een geldig getal: +0 DEF.
    expect(skillEffectText('ironBody', 5, 0)).toBe('+0 DEF (9%)')
    expect(skillEffectText('ironBody', 21, 72)).toBeNull()
  })

  it('noemt bij Magic Armor de vaste DEF, ook zonder WDEF in het profiel', () => {
    expect(skillEffectText('magicArmor', 6, null)).toBe('+60 DEF en Magic Def')
    expect(skillEffectText('magicArmor', 20, 72)).toBe('+120 DEF en Magic Def')
    expect(skillEffectText('magicArmor', 21, 72)).toBeNull()
  })

  it('noemt bij Focus accuracy en evasion: level 10 is +10 / +14, level 20 is +20 / +25', () => {
    expect(skillEffectText('focus', 10, null)).toBe('+10 Accuracy, +14 Evasion')
    expect(skillEffectText('focus', 20, null)).toBe('+20 Accuracy, +25 Evasion')
    expect(skillEffectText('focus', 21, null)).toBeNull()
  })

  it('noemt bij Critical Shot en Max MP Increase het procent', () => {
    expect(skillEffectText('criticalShot', 15, null)).toBe('+20% Crit. Rate')
    expect(skillEffectText('maxMpIncrease', 2, null)).toBe('+11% Max MP')
  })

  it('geeft niets voor een aanval of een skill zonder stat', () => {
    for (const key of ['powerStrike', 'luckySeven', 'energyBolt', 'slashBlast', 'magicGuard', 'eyeOfAmazon'] as const) {
      expect(skillEffectText(key, 5, 72), key).toBeNull()
    }
  })
})

describe('maxHpAfterPoint', () => {
  it('zet bij het eerste punt 10% erbovenop', () => {
    expect(maxHpAfterPoint(1000, 0)).toBe(1100)
  })

  it('haalt de basis uit je Max HP en zet het nieuwe procent erop: 1 120 bij level 3 (12%) wordt 1 130 bij level 4 (13%)', () => {
    expect(maxHpAfterPoint(1120, 3)).toBe(1130)
    // Level 14 (23%) naar 15 (25%): 1 230 / 1,23 x 1,25 = 1 250.
    expect(maxHpAfterPoint(1230, 14)).toBe(1250)
    // Op het maximum (15) is er geen volgend level: de Max HP blijft gelijk.
    expect(maxHpAfterPoint(1250, 15)).toBe(1250)
  })

  it('rondt naar beneden af', () => {
    expect(maxHpAfterPoint(105, 0)).toBe(115) // 115,5
    expect(maxHpAfterPoint(800, 3)).toBe(807) // 800 x 113 / 112 = 807,14
  })
})

describe('het skillpunt-advies telt de nieuwe skills mee', () => {
  const own = (id: string, expPerHour: number, potions: number): SpotDraft => ({ ...newDraft(id), name: id, expPerHour: String(expPerHour), potions: String(potions) })
  const known = (id: string, spotId: string): SpotDraft => ({ ...newDraft(id), ...knownSpotPatch(spotId) })
  const costOf = (drafts: readonly SpotDraft[], p: Profile) => {
    const { ranked, bestId } = pickUnder(drafts, p)
    const best = ranked.find((r) => r.spot.id === bestId)!
    if (isInvalid(best)) throw new Error('beste plek ongeldig')
    return mesoCostOfLevel(expToNextLevel(p.level)!, best.expPerMeso)!
  }
  const ids = (p: Profile, drafts: readonly SpotDraft[] = [own('b', 1_000, 10_000)]) => {
    const advice = skillPointAdvice(drafts, p)
    if (advice.kind !== 'advice') throw new Error('geen advies')
    return advice.choices.map((c) => c.id).sort()
  }

  const warriorDraft = { level: '20', hp: '800', str: '90', dex: '20', luk: '4', clawWatk: '40', weaponMult: '1.8', attackMs: '750', accuracy: '60', avoid: '10', wdef: '60', powerStrike: '5', preciseStrikes: '2' }
  const magicianDraft = { level: '20', hp: '600', int: '60', dex: '20', luk: '10', clawWatk: '31', accuracy: '40', avoid: '10', wdef: '40', energyBolt: '5', magicClaw: '0' }
  const bowmanDraft = { level: '20', hp: '800', str: '20', dex: '80', luk: '4', clawWatk: '30', attackMs: '810', accuracy: '60', avoid: '10', wdef: '60', arrowBlow: '5' }

  it('biedt een Warrior Max HP Increase pas als Improved HP Recovery 3 is, en Iron Body pas als Max HP Increase 3 is', () => {
    const base = ['powerStrike', 'preciseStrikes']
    expect(ids(parse('warrior', { ...warriorDraft, improvedHpRecovery: '2' }))).toEqual(base)
    expect(ids(parse('warrior', { ...warriorDraft, improvedHpRecovery: '3' }))).toEqual([...base, 'maxHpIncrease'].sort())
    expect(ids(parse('warrior', { ...warriorDraft, improvedHpRecovery: '3', maxHpIncrease: '2' }))).toEqual([...base, 'maxHpIncrease'].sort())
    expect(ids(parse('warrior', { ...warriorDraft, improvedHpRecovery: '3', maxHpIncrease: '3' }))).toEqual([...base, 'ironBody', 'maxHpIncrease'].sort())
  })

  it('laat een Warrior die een skill al heeft hem verder zetten, ook zonder de voorwaarde', () => {
    expect(ids(parse('warrior', { ...warriorDraft, maxHpIncrease: '1' }))).toContain('maxHpIncrease')
    expect(ids(parse('warrior', { ...warriorDraft, ironBody: '1' }))).toContain('ironBody')
  })

  it('biedt een Magician Magic Armor pas als Magic Guard 3 is', () => {
    expect(ids(parse('magician', { ...magicianDraft, magicGuard: '2' }))).toEqual(['energyBolt', 'magicClaw'])
    expect(ids(parse('magician', { ...magicianDraft, magicGuard: '3' }))).toEqual(['energyBolt', 'magicArmor', 'magicClaw'])
    expect(ids(parse('magician', { ...magicianDraft, magicGuard: '0', magicArmor: '1' }))).toContain('magicArmor')
  })

  it('biedt een Bowman Focus pas als The Eye of Amazon 3 is', () => {
    expect(ids(parse('bowman', { ...bowmanDraft, eyeOfAmazon: '2' }))).toEqual(['arrowBlow'])
    expect(ids(parse('bowman', { ...bowmanDraft, eyeOfAmazon: '3' }))).toEqual(['arrowBlow', 'focus'])
    expect(ids(parse('bowman', { ...bowmanDraft, eyeOfAmazon: '0', focus: '1' }))).toContain('focus')
  })

  it('zet bij Max HP Increase de Max HP omhoog (800 bij level 3 wordt 807) en bij een buff alleen het skill-level, want de buff staat niet in je profiel', () => {
    const w = parse('warrior', { ...warriorDraft, improvedHpRecovery: '3', maxHpIncrease: '3', ironBody: '4' })
    const get = (id: string) => skillsOf('warrior').find((s) => s.id === id)!
    expect(get('maxHpIncrease').plusOne(w)).toEqual({ ...w, maxHpIncrease: 4, hp: 807 })
    expect(get('ironBody').plusOne(w)).toEqual({ ...w, ironBody: 5 })
    const m = parse('magician', { ...magicianDraft, magicGuard: '3' })
    expect(skillsOf('magician').find((s) => s.id === 'magicArmor')!.plusOne(m)).toEqual({ ...m, magicArmor: 1 })
    const b = parse('bowman', { ...bowmanDraft, eyeOfAmazon: '3' })
    expect(skillsOf('bowman').find((s) => s.id === 'focus')!.plusOne(b)).toEqual({ ...b, focus: 1 })
  })

  it('heeft de maxima uit de spelgegevens: Max HP Increase 15, Iron Body 20, Magic Armor 20, Focus 20', () => {
    expect(skillsOf('warrior').find((s) => s.id === 'maxHpIncrease')!.max).toBe(15)
    expect(skillsOf('warrior').find((s) => s.id === 'ironBody')!.max).toBe(20)
    expect(skillsOf('magician').find((s) => s.id === 'magicArmor')!.max).toBe(20)
    expect(skillsOf('bowman').find((s) => s.id === 'focus')!.max).toBe(20)
  })

  it('laat Magic Armor de kosten van het level dalen op een plek waar monsters hard raken, en rekent ze als het model van toCharacter', () => {
    // Een Magician op level 20 op de Rain-Forest East of Henesys: Magic Armor 1 (+40 DEF) bespaart meer aan HP-potions dan 96 MP per uur kost.
    const drafts = [known('a', 'henesys-rain-forest-east')]
    const m = parse('magician', { ...magicianDraft, magicGuard: '3' })
    const advice = skillPointAdvice(drafts, m)
    if (advice.kind !== 'advice') throw new Error('geen advies')
    const armor = advice.choices.find((c) => c.id === 'magicArmor')!
    expect(armor.to).toBe(1)
    expect(armor.saving!).toBeGreaterThan(0)
    expect(advice.winner).toBe('magicArmor')
    // Dezelfde kosten rechtstreeks, met het skill-level in het profiel gezet in plaats van via plusOne.
    expect(advice.base).toBeCloseTo(costOf(drafts, m), 6)
    expect(armor.meso).toBeCloseTo(costOf(drafts, { ...m, magicArmor: 1 }), 6)
    expect(armor.saving).toBeCloseTo(costOf(drafts, m) - costOf(drafts, { ...m, magicArmor: 1 }), 6)
  })

  it('laat Iron Body en Focus de kosten stijgen waar hun upkeep zwaarder weegt dan wat ze geven (geen winnaar, negatieve besparing)', () => {
    const drafts = [known('a', 'henesys-rain-forest-east')]
    const w = parse('warrior', { ...warriorDraft, improvedHpRecovery: '3', maxHpIncrease: '3' })
    const wAdvice = skillPointAdvice(drafts, w)
    const b = parse('bowman', { ...bowmanDraft, eyeOfAmazon: '3' })
    const bAdvice = skillPointAdvice(drafts, b)
    if (wAdvice.kind !== 'advice' || bAdvice.kind !== 'advice') throw new Error('geen advies')
    const iron = wAdvice.choices.find((c) => c.id === 'ironBody')!
    const focus = bAdvice.choices.find((c) => c.id === 'focus')!
    expect(iron.saving!).toBeLessThan(0)
    expect(iron.meso).toBeCloseTo(costOf(drafts, { ...w, ironBody: 1 }), 6)
    expect(focus.saving!).toBeLessThan(0)
    expect(focus.meso).toBeCloseTo(costOf(drafts, { ...b, focus: 1 }), 6)
    expect(wAdvice.winner).toBeNull()
    expect(bAdvice.winner).toBeNull()
  })

  it('telt Max HP Increase als Max HP: op een plek waar niets gevaarlijk is, verandert het de kosten niet', () => {
    const drafts = [known('a', 'henesys-rain-forest-east')]
    const w = parse('warrior', { ...warriorDraft, improvedHpRecovery: '3' })
    const advice = skillPointAdvice(drafts, w)
    if (advice.kind !== 'advice') throw new Error('geen advies')
    const hp = advice.choices.find((c) => c.id === 'maxHpIncrease')!
    expect(hp.saving).toBe(0)
    expect(hp.meso).toBe(advice.base)
  })
})
