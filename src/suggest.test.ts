import { describe, expect, it } from 'vitest'
import { estimateMob, meleeAttack } from './calc/mobModel'
import { rankSpots } from './calc/rankSpots'
import { findKnownSpot, mobDraft } from './data/spots'
import { mobGroup } from './testing/mobGroup'
import { LUCKY_SEVEN_LEVELS } from './data/thief'
import { DEFAULT_PROFILE, parseProfile, toCharacter, type Profile } from './profile'
import { newDraft, toSpot } from './spotDraft'
import { HP_POTION, hourPlan, isEstimated, luckySevenAt, MP_POTION, pickMonster, potionFactorOf, powerStrikeAt, resolveSpot, statWindowRange, suggestMonsters } from './suggest'

const parsed = parseProfile(DEFAULT_PROFILE)
if (!('profile' in parsed)) throw new Error('voorbeeldprofiel ongeldig')
const profile: Profile = parsed.profile

const bubbling = findKnownSpot('mob:Bubbling')!
const mixedMobs = mobGroup('Snail', 'Blue Snail', 'Red Snail', 'Stump', 'Dark Stump', 'Green Mushroom', 'Axe Stump', 'Dark Axe Stump')

describe('luckySevenAt', () => {
  it('geeft de waarden van de skillpagina, niet geïnterpoleerd', () => {
    expect(luckySevenAt(1)).toEqual({ level: 1, mp: 8, damagePct: 60 })
    // Het oude model interpoleerde lv 3 naar 9 MP; de skillpagina zegt 8.
    expect(luckySevenAt(3)).toEqual({ level: 3, mp: 8, damagePct: 68 })
    expect(luckySevenAt(10)).toEqual({ level: 10, mp: 11, damagePct: 96 })
    expect(luckySevenAt(20)).toEqual({ level: 20, mp: 16, damagePct: 140 })
  })

  it('is null op level 0, en klemt boven 20 op 20', () => {
    expect(luckySevenAt(0)).toBeNull()
    expect(luckySevenAt(25)).toEqual(luckySevenAt(20))
  })

  it('heeft 20 levels met oplopende schade', () => {
    expect(LUCKY_SEVEN_LEVELS).toHaveLength(20)
    for (let i = 1; i < 20; i++) expect(LUCKY_SEVEN_LEVELS[i].damagePct).toBeGreaterThan(LUCKY_SEVEN_LEVELS[i - 1].damagePct)
  })
})

describe('de goedkoopste potions', () => {
  it('zijn Orange (150 voor 250 HP) en Blue (220 voor 200 MP)', () => {
    expect(HP_POTION.name).toBe('Orange Potion')
    expect(MP_POTION.name).toBe('Blue Potion')
  })
})

describe('suggestMonsters en pickMonster', () => {
  it('rekent elk monster van de plek door, van meeste naar minste EXP per uur', () => {
    const s = suggestMonsters(profile, mixedMobs)
    expect(s).toHaveLength(mixedMobs.monsters.length)
    for (let i = 1; i < s.length; i++) expect(s[i].expPerHour).toBeLessThanOrEqual(s[i - 1].expPerHour)
    for (const x of s) {
      expect(Number.isFinite(x.estimate.killsPerHour)).toBe(true)
      expect(x.expPerHour).toBeCloseTo(x.monster.expPerKill * x.estimate.killsPerHour, 6)
    }
  })

  it('kiest het gevraagde monster, en anders het beste', () => {
    const s = suggestMonsters(profile, mixedMobs)
    expect(pickMonster(s, 'Stump')?.monster.name).toBe('Stump')
    expect(pickMonster(s, undefined)).toBe(s[0])
    expect(pickMonster(s, 'bestaat niet')).toBe(s[0])
    expect(pickMonster([], undefined)).toBeUndefined()
  })
})

describe('hourPlan', () => {
  const s = suggestMonsters(profile, bubbling)[0]

  it('schaalt het verbruik mee met de kills per uur', () => {
    const one = hourPlan(s, 100)
    const two = hourPlan(s, 200)
    expect(two.expPerHour).toBeCloseTo(2 * one.expPerHour, 9)
    expect(two.potions).toBeCloseTo(2 * one.potions, 9)
    expect(two.ammo).toBeCloseTo(2 * one.ammo, 9)
  })

  it('rekent de kosten met de prijzen uit de gegevens (handmatig na te rekenen)', () => {
    const p = hourPlan(s, 100)
    expect(p.expPerHour).toBe(2_800) // Bubbling: 28 EXP · 100
    // Max HP 444 en Max MP 363, drinken bij een halve balk: er mist 222 HP en 181,5 MP, dus de Orange (250) en de Blue (200) tellen daarvoor (#181).
    expect(p.hpPotionsPerHour).toBeCloseTo((100 * s.estimate.hpLossPerKill) / 222, 9)
    expect(p.mpPotionsPerHour).toBeCloseTo((100 * s.estimate.mpPerKill) / 181.5, 9)
    expect(p.potions).toBeCloseTo(p.hpPotionsPerHour * 150 + p.mpPotionsPerHour * 220, 9)
    expect(p.ammo).toBeCloseTo(100 * s.estimate.starsPerKill * 0.3, 9)
  })

  it('kost niets bij 0 kills', () => {
    expect(hourPlan(s, 0)).toMatchObject({ expPerHour: 0, potions: 0, ammo: 0 })
  })

  it('rekent het herladen met de prijs van je eigen stars', () => {
    const tobi = suggestMonsters({ ...profile, starRecharge: 0.7 }, bubbling)[0]
    expect(tobi.rechargePerStar).toBe(0.7)
    expect(hourPlan(tobi, 100).ammo).toBeCloseTo(100 * tobi.estimate.starsPerKill * 0.7, 9)
  })

  it('doodt een monster met sterkere stars in minder aanvallen, dus met minder stars per kill', () => {
    const subi = suggestMonsters(profile, bubbling)[0]
    const ilbi = suggestMonsters({ ...profile, starWatk: 27 }, bubbling).find((x) => x.monster.name === subi.monster.name)!
    expect(ilbi.estimate.starsPerKill).toBeLessThanOrEqual(subi.estimate.starsPerKill)
    expect(ilbi.estimate.killsPerHour).toBeGreaterThan(subi.estimate.killsPerHour)
  })
})

describe('resolveSpot', () => {
  const chosen = { ...mobDraft('Bubbling')!, id: 'a', travel: '100' }

  it('is gewoon toSpot bij een eigen plek of zonder profiel', () => {
    const own = { ...newDraft('b'), expPerHour: '5000', travel: '10' }
    expect(resolveSpot(own, undefined, profile)).toEqual(toSpot(own))
    expect(resolveSpot(chosen, bubbling, null)).toEqual(toSpot(chosen))
  })

  it('vult bij een bekende plek de lege velden met het voorstel', () => {
    const s = pickMonster(suggestMonsters(profile, bubbling), undefined)!
    const plan = hourPlan(s, s.estimate.killsPerHour)
    const spot = resolveSpot(chosen, bubbling, profile)
    expect(spot.expPerHour).toBeCloseTo(plan.expPerHour, 6)
    expect(spot.cost).toEqual({ potions: plan.potions, ammo: plan.ammo, travel: 100 })
  })

  it('laat de kills per uur van de speler winnen, en alles schaalt mee', () => {
    const spot = resolveSpot({ ...chosen, kills: '300' }, bubbling, profile)
    expect(spot.expPerHour).toBe(28 * 300)
  })

  it('laat een ingevuld veld winnen boven het voorstel', () => {
    const spot = resolveSpot({ ...chosen, expPerHour: '1234' }, bubbling, profile)
    expect(spot.expPerHour).toBe(1234)
  })

  it('maakt de plek ongeldig bij onzinnige kills per uur, maar een ingevulde EXP per uur blijft winnen', () => {
    expect(resolveSpot({ ...chosen, kills: '-5' }, bubbling, profile).expPerHour).toBeNaN()
    expect(resolveSpot({ ...chosen, kills: 'abc' }, bubbling, profile).cost.potions).toBeNaN()
    expect(resolveSpot({ ...chosen, kills: '-5', expPerHour: '900' }, bubbling, profile).expPerHour).toBe(900)
  })

  it('noemt de EXP alleen een schatting als de app hem zelf invult', () => {
    expect(isEstimated(chosen, bubbling, profile)).toBe(true)
    expect(isEstimated({ ...chosen, expPerHour: '900' }, bubbling, profile)).toBe(false)
    expect(isEstimated(chosen, bubbling, null)).toBe(false)
    expect(isEstimated(chosen, undefined, profile)).toBe(false)
  })
})

describe('resolveSpot en rankSpots samen', () => {
  it('van begin tot eind: bekende plekken zonder invoer komen op de berekende kosten in de juiste volgorde', () => {
    // Zelfde mob en kills, dus dezelfde EXP en potions; alleen de reiskosten verschillen, en de goedkoopste wint.
    const near = { ...mobDraft('Bubbling')!, id: 'dichtbij', travel: '0' }
    const far = { ...mobDraft('Bubbling')!, id: 'ver', travel: '5000' }
    const ranked = rankSpots([far, near].map((d) => resolveSpot(d, bubbling, profile)))
    expect(ranked.map((r) => r.spot.id)).toEqual(['dichtbij', 'ver'])
    const best = ranked[0]
    const c = best.spot.cost
    expect('expPerMeso' in best && best.expPerMeso).toBeCloseTo(best.spot.expPerHour / (c.potions + c.ammo + c.travel), 9)
  })
})

describe('powerStrikeAt', () => {
  it('geeft de waarden van de skillpagina, niet geïnterpoleerd', () => {
    expect(powerStrikeAt(1)).toEqual({ level: 1, mp: 4, damagePct: 160 })
    expect(powerStrikeAt(5)).toEqual({ level: 5, mp: 5, damagePct: 180 })
    expect(powerStrikeAt(19)).toEqual({ level: 19, mp: 11, damagePct: 250 })
    expect(powerStrikeAt(20)).toEqual({ level: 20, mp: 12, damagePct: 260 })
  })

  it('is null op level 0 (dan telt de gewone aanval), en klemt boven 20 op 20', () => {
    expect(powerStrikeAt(0)).toBeNull()
    expect(powerStrikeAt(25)).toEqual(powerStrikeAt(20))
  })
})

describe('Improved HP en MP Recovery: meer herstel per potion (#141)', () => {
  // De tabel van beide skills (MeowDB, skills/warrior/improved-hp-recovery en skills/magician/improved-mp-recovery):
  // +5% op level 1, 1 erbij per level tot 18% op level 14, en 20% op level 15. Hier met de hand overgenomen.
  it('geeft de factor uit de tabel: 1 op level 0, 1,05 op 1, 1,18 op 14, 1,2 op 15 en erboven', () => {
    const at = (hp: number, mp: number) => potionFactorOf({ ...profile, improvedHpRecovery: hp, improvedMpRecovery: mp })
    expect(at(0, 0)).toEqual({ hp: 1, mp: 1 })
    expect(at(1, 0).hp).toBeCloseTo(1.05, 12)
    expect(at(14, 0).hp).toBeCloseTo(1.18, 12)
    expect(at(15, 0).hp).toBeCloseTo(1.2, 12)
    expect(at(99, 0).hp).toBeCloseTo(1.2, 12)
    expect(at(0, 1).mp).toBeCloseTo(1.05, 12)
    expect(at(0, 15).mp).toBeCloseTo(1.2, 12)
    // De twee skills staan los van elkaar.
    expect(at(15, 0).mp).toBe(1)
    expect(at(0, 15).hp).toBe(1)
  })

  it('heeft zonder punten in die skills geen effect: een Thief rekent zoals altijd', () => {
    expect(suggestMonsters(profile, bubbling)[0].potionFactor).toEqual({ hp: 1, mp: 1 })
  })

  it('deelt het potionverbruik door de factor: op level 15 een zesde minder potions en potion-meso (handmatig na te rekenen)', () => {
    // Een grote balk (er mist 1000), zodat geen potion zijn herstel verspilt: hier gaat het om de factor, niet om het plafond (#181).
    const plain = { ...suggestMonsters(profile, bubbling)[0], bar: { hp: 2000, mp: 2000 } }
    const boosted = { ...plain, potionFactor: { hp: 1.2, mp: 1.2 } }
    const a = hourPlan(plain, 100)
    const b = hourPlan(boosted, 100)
    expect(b.hpPotionsPerHour).toBeCloseTo((100 * plain.estimate.hpLossPerKill) / (250 * 1.2), 9)
    expect(b.mpPotionsPerHour).toBeCloseTo((100 * plain.estimate.mpPerKill) / (200 * 1.2), 9)
    expect(b.potions).toBeCloseTo(a.potions / 1.2, 9)
    // Wat er niet aan potions hangt, blijft gelijk.
    expect(b.expPerHour).toBe(a.expPerHour)
    expect(b.ammo).toBe(a.ammo)
  })

  it('telt de HP-factor alleen bij HP-potions en de MP-factor alleen bij MP-potions', () => {
    const plain = { ...suggestMonsters(profile, bubbling)[0], bar: { hp: 2000, mp: 2000 } }
    const a = hourPlan(plain, 100)
    const hpOnly = hourPlan({ ...plain, potionFactor: { hp: 1.2, mp: 1 } }, 100)
    expect(hpOnly.hpPotionsPerHour).toBeCloseTo(a.hpPotionsPerHour / 1.2, 9)
    expect(hpOnly.mpPotionsPerHour).toBe(a.mpPotionsPerHour)
  })
})

describe('een Warrior: suggestMonsters en hourPlan', () => {
  // Level 30, 47 weapon attack, STR 132, DEX 30 (het werkvoorbeeld van de damage-gids), 1H-sword (multiplier 1,8).
  const warriorDraft = {
    ...DEFAULT_PROFILE,
    level: '30',
    hp: '1000',
    str: '132',
    dex: '30',
    luk: '4',
    clawWatk: '47',
    weaponMult: '1.8',
    attackMs: '720',
    accuracy: '80',
    avoid: '20',
    wdef: '100',
    powerStrike: '20',
  }
  const wp = (over: Partial<typeof warriorDraft> = {}): Profile => {
    const r = parseProfile({ ...warriorDraft, ...over }, 'warrior')
    if (!('profile' in r)) throw new Error('Warrior-profiel ongeldig')
    return r.profile
  }

  it('rekent met Power Strike op het gezette level: de aanval van meleeAttack, één klap, geen munitie', () => {
    const p = wp()
    const c = toCharacter(p)
    expect(c.watk).toBe(47) // geen Subi
    const attack = meleeAttack(c, 1.8, powerStrikeAt(20))
    for (const s of suggestMonsters(p, mixedMobs)) {
      const e = estimateMob(c, attack, s.monster)
      expect(s.estimate).toEqual(e)
      expect(s.estimate.starsPerKill).toBe(s.estimate.attacksToKill)
      expect(s.rechargePerStar).toBe(0)
    }
  })

  it('rekent zonder Power Strike (level 0) met de gewone aanval, en die kost geen MP', () => {
    const p = wp({ powerStrike: '0' })
    const c = toCharacter(p)
    for (const s of suggestMonsters(p, mixedMobs)) {
      expect(s.estimate).toEqual(estimateMob(c, meleeAttack(c, 1.8, null), s.monster))
      expect(s.estimate.mpPerKill).toBe(0)
    }
  })

  it('haalt met Power Strike lv 20 nooit meer klappen per kill dan met de gewone aanval, en meestal minder', () => {
    const plain = suggestMonsters(wp({ powerStrike: '0' }), mixedMobs)
    const ps = suggestMonsters(wp(), mixedMobs)
    let fewer = 0
    for (const m of mixedMobs.monsters) {
      const a = plain.find((s) => s.monster.name === m.name)!.estimate.attacksToKill
      const b = ps.find((s) => s.monster.name === m.name)!.estimate.attacksToKill
      expect(b, m.name).toBeLessThanOrEqual(a)
      if (b < a) fewer++
    }
    expect(fewer).toBeGreaterThan(0)
  })

  it('telt de MP van Power Strike mee: MP per kill = klappen · 12, en het kost potions', () => {
    const p = wp()
    const s = suggestMonsters(p, mixedMobs)[0]
    expect(s.estimate.mpPerKill).toBe(s.estimate.attacksToKill * 12)
    const plan = hourPlan(s, 100)
    expect(plan.mpPotionsPerHour).toBeCloseTo((100 * s.estimate.mpPerKill) / 181.5, 9) // Max MP 363: er mist 181,5 van de 200 (#181)
    expect(plan.mpPotionsPerHour).toBeGreaterThan(0)
    expect(plan.potions).toBeCloseTo(plan.hpPotionsPerHour * 150 + plan.mpPotionsPerHour * 220, 9)
    // Zonder de skill geen MP-potions.
    const free = hourPlan(suggestMonsters(wp({ powerStrike: '0' }), mixedMobs)[0], 100)
    expect(free.mpPotionsPerHour).toBe(0)
  })

  it('heeft geen munitiekosten, hoeveel kills per uur ook', () => {
    const s = suggestMonsters(wp(), mixedMobs)[0]
    expect(hourPlan(s, 100).ammo).toBe(0)
    expect(hourPlan(s, 12_345).ammo).toBe(0)
  })

  it('zet de Thief-munitie niet op nul: dezelfde plek met een Thief kost wel herlaad-meso', () => {
    const t = suggestMonsters(profile, mixedMobs)[0]
    expect(t.rechargePerStar).toBe(0.3)
    expect(hourPlan(t, 100).ammo).toBeGreaterThan(0)
  })

  it('neemt Improved HP Recovery mee: dezelfde kills, minder potion-meso per uur (#141)', () => {
    const plain = suggestMonsters(wp(), mixedMobs)[0]
    const s = suggestMonsters(wp({ improvedHpRecovery: '15' }), mixedMobs).find((x) => x.monster.name === plain.monster.name)!
    expect(s.potionFactor.hp).toBeCloseTo(1.2, 12)
    expect(s.estimate).toEqual(plain.estimate)
    expect(hourPlan(s, 100).hpPotionsPerHour).toBeCloseTo(hourPlan(plain, 100).hpPotionsPerHour / 1.2, 9)
    expect(hourPlan(s, 100).hpPotionsPerHour).toBeGreaterThan(0)
  })

  it('rekent Slash Blast niet mee: zijn level verandert niets aan de uitkomst', () => {
    const a = suggestMonsters(wp({ slashBlast: '0' }), mixedMobs).map((s) => s.expPerHour)
    const b = suggestMonsters(wp({ slashBlast: '20' }), mixedMobs).map((s) => s.expPerHour)
    expect(b).toEqual(a)
  })

  it('gebruikt de weapon multiplier van het profiel', () => {
    const low = suggestMonsters(wp({ weaponMult: '1' }), mixedMobs)
    const high = suggestMonsters(wp({ weaponMult: '3' }), mixedMobs)
    const sum = (l: typeof low) => l.reduce((n, s) => n + s.estimate.attacksToKill, 0)
    expect(sum(high)).toBeLessThanOrEqual(sum(low))
  })
})

describe('resolveSpot voor een Warrior', () => {
  const r = parseProfile({ ...DEFAULT_PROFILE, lukExtra: '0', level: '30', hp: '1000', str: '132', dex: '30', luk: '4', clawWatk: '47', weaponMult: '1.8', attackMs: '720', accuracy: '80', powerStrike: '20' }, 'warrior')
  if (!('profile' in r)) throw new Error('Warrior-profiel ongeldig')
  const warrior = r.profile
  const chosen = { ...mobDraft('Bubbling')!, id: 'a', travel: '100' }

  it('vult de munitie met 0 en de potions met het voorstel, en laat de reiskosten staan', () => {
    const s = pickMonster(suggestMonsters(warrior, bubbling), undefined)!
    const plan = hourPlan(s, s.estimate.killsPerHour)
    const spot = resolveSpot(chosen, bubbling, warrior)
    expect(spot.cost).toEqual({ potions: plan.potions, ammo: 0, travel: 100 })
    expect(spot.cost.potions).toBeGreaterThan(0)
    // Dezelfde plek voor de Thief kost wel munitie.
    expect(resolveSpot(chosen, bubbling, profile).cost.ammo).toBeGreaterThan(0)
  })

})

describe('statWindowRange: de Attack uit het statvenster (#108)', () => {
  const as = (job: Profile['job'], over: Partial<Record<keyof typeof DEFAULT_PROFILE, string>> = {}): Profile => {
    const r = parseProfile({ ...DEFAULT_PROFILE, ...over }, job)
    if (!('profile' in r)) throw new Error(r.error)
    return r.profile
  }

  it('geeft het voorbeeld van de damage-gids: een Warrior met 132 STR, 30 DEX, 47 ATT en 1,8 heeft 60 – 172', () => {
    // meowdb.com/msclassic/guides/explaining-the-damage-formula, "Character-window damage range: 60-172".
    expect(statWindowRange(as('warrior', { str: '132', dex: '30', clawWatk: '47', weaponMult: '1.8' }))).toEqual({ min: 60, max: 172 })
  })

  it('telt je ability points mee, niet alleen de weapon attack', () => {
    const base = statWindowRange(as('thief'))!
    expect(statWindowRange(as('thief', { luk: '80' }))!.max).toBeGreaterThan(base.max)
    expect(statWindowRange(as('warrior', { str: '60' }))!.max).toBeGreaterThan(statWindowRange(as('warrior'))!.max)
    expect(statWindowRange(as('bowman', { dex: '60' }))!.max).toBeGreaterThan(statWindowRange(as('bowman'))!.max)
  })

  it('rekent zonder skill: een geleerde Lucky Seven, Power Strike of Arrow Blow verandert het bereik niet', () => {
    expect(statWindowRange(as('thief', { level: '30', luckySeven: '20' }))).toEqual(statWindowRange(as('thief', { level: '30', luckySeven: '0' })))
    expect(statWindowRange(as('warrior', { level: '30', powerStrike: '20' }))).toEqual(statWindowRange(as('warrior', { level: '30' })))
    expect(statWindowRange(as('bowman', { level: '30', arrowBlow: '20' }))).toEqual(statWindowRange(as('bowman', { level: '30' })))
  })

  it('rondt min en max naar beneden af, zoals de gids: 60,6 wordt 60 en 172,8 wordt 172, niet 61 en 173', () => {
    const r = meleeAttack({ str: 132, dex: 30, watk: 47 }, 1.8, null)
    expect([r.min, r.max].map((x) => Math.round(x))).toEqual([61, 173])
    expect(statWindowRange(as('warrior', { str: '132', dex: '30', clawWatk: '47', weaponMult: '1.8' }))).toEqual({ min: 60, max: 172 })
  })

  it('is null voor een Magician: zijn gewone wand-aanval staat niet in de gegevens', () => {
    expect(statWindowRange(as('magician'))).toBeNull()
  })
})

describe('hourPlan en het plafond op het herstel van een potion (#181)', () => {
  const s = suggestMonsters(profile, bubbling)[0]
  const kills = 100
  const hpLoss = kills * s.estimate.hpLossPerKill
  const mpNeed = kills * s.estimate.mpPerKill + s.buffMpPerHour

  it('neemt Max HP en Max MP van het profiel mee als `bar`', () => {
    expect(s.bar).toEqual({ hp: profile.hp, mp: profile.mp })
    expect(s.bar).toEqual({ hp: 444, mp: 363 })
  })

  it('deelt door wat er mist, niet door wat de potion herstelt, als de potion meer herstelt (Orange 250 bij Max HP 444: 222)', () => {
    const plan = hourPlan(s, kills)
    expect(plan.hpPotionsPerHour).toBeCloseTo(hpLoss / 222, 9)
    expect(plan.hpPotionsPerHour).toBeGreaterThan(hpLoss / 250)
    expect(plan.mpPotionsPerHour).toBeCloseTo(mpNeed / 181.5, 9)
  })

  it('deelt door het volle herstel als de potion er onder blijft (Max 2000: er mist 1000)', () => {
    const plan = hourPlan({ ...s, bar: { hp: 2000, mp: 2000 } }, kills)
    expect(plan.hpPotionsPerHour).toBeCloseTo(hpLoss / 250, 9)
    expect(plan.mpPotionsPerHour).toBeCloseTo(mpNeed / 200, 9)
  })

  it('deelt door het volle herstel zonder Max (0: onbekend)', () => {
    const plan = hourPlan({ ...s, bar: { hp: 0, mp: 0 } }, kills)
    expect(plan.hpPotionsPerHour).toBeCloseTo(hpLoss / 250, 9)
    expect(plan.mpPotionsPerHour).toBeCloseTo(mpNeed / 200, 9)
  })

  it('kapt HP en MP los van elkaar af: alleen de HP-potion is te groot', () => {
    const plan = hourPlan({ ...s, bar: { hp: 444, mp: 2000 } }, kills)
    expect(plan.hpPotionsPerHour).toBeCloseTo(hpLoss / 222, 9)
    expect(plan.mpPotionsPerHour).toBeCloseTo(mpNeed / 200, 9)
  })

  it('geeft op het plafond zelf geen verspilling: Max HP 500 en Orange 250 geven hetzelfde als zonder plafond', () => {
    const atCap = hourPlan({ ...s, bar: { hp: 500, mp: 400 } }, kills)
    const none = hourPlan({ ...s, bar: { hp: 0, mp: 0 } }, kills)
    expect(atCap.hpPotionsPerHour).toBeCloseTo(none.hpPotionsPerHour, 9)
    expect(atCap.mpPotionsPerHour).toBeCloseTo(none.mpPotionsPerHour, 9)
  })

  it('laat Improved HP Recovery over het plafond heen: 300 herstel bij Max HP 500 telt voor 250, niet voor 300', () => {
    const plan = hourPlan({ ...s, bar: { hp: 500, mp: 0 }, potionFactor: { hp: 1.2, mp: 1 } }, kills)
    expect(plan.hpPotionsPerHour).toBeCloseTo(hpLoss / 250, 9)
    expect(plan.hpPotionsPerHour).toBeGreaterThan(hpLoss / 300)
  })

  it('telt een White (500 HP) bij Max HP 444 voor 222, en rekent de kosten met zijn prijs', () => {
    const white = { ...s, hpPotion: { ...s.hpPotion, name: 'White Potion', hp: 500, price: 350 } }
    const plan = hourPlan(white, kills)
    expect(plan.hpPotionsPerHour).toBeCloseTo(hpLoss / 222, 9)
    expect(plan.potions).toBeCloseTo(plan.hpPotionsPerHour * 350 + plan.mpPotionsPerHour * 220, 9)
  })

  it('geeft via suggestMonsters een grote Max in het profiel minder potions per uur dan een kleine (het plafond werkt door tot in het voorstel)', () => {
    const big = parseProfile({ ...DEFAULT_PROFILE, hp: '2000', mp: '2000' })
    if (!('profile' in big)) throw new Error(big.error)
    const sBig = suggestMonsters(big.profile, bubbling)[0]
    expect(sBig.bar).toEqual({ hp: 2000, mp: 2000 })
    // Zelfde kills per uur: alleen het plafond verschilt.
    expect(hourPlan(sBig, kills).hpPotionsPerHour).toBeCloseTo(hpLoss / 250, 9)
    expect(hourPlan(sBig, kills).potions).toBeLessThan(hourPlan(s, kills).potions)
  })
})
