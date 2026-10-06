import { describe, expect, it } from 'vitest'
import { bestVerdict } from './best'
import { MAGICIAN_MP_POTIONS } from './data/magician'
import { mobDraft, POTIONS } from './data/spots'
import type { Job } from './job'
import { levelCost } from './levelCost'
import {
  cheapestPotions,
  databasePotion,
  fixPotion,
  loadPotionChoice,
  NO_POTION_CHOICE,
  pickPotion,
  POTION_CHOICE_KEY,
  potionAdvice,
  potionFields,
  potionInfo,
  potionsOf,
  resolvePotions,
  savePotionChoice,
  type PotionChoice,
} from './potions'
import { DEFAULT_PROFILE, parseProfile, type Profile } from './profile'
import { HP_POTION, mpPotionFor } from './suggest'

const potion = (name: string) => [...POTIONS, ...MAGICIAN_MP_POTIONS].find((p) => p.name === name)!
const names = (list: readonly { name: string }[]) => list.map((p) => p.name)
const choice = (hp: string | null, mp: string | null): PotionChoice => ({ ...NO_POTION_CHOICE, hp, mp })

describe('potionsOf en databasePotion', () => {
  it('geeft elke job de HP-potions en de Blue Potion, en een Magician ook de Orange en de Lemon, in de volgorde van de app', () => {
    for (const job of ['thief', 'warrior', 'bowman'] as Job[]) {
      expect(names(potionsOf(job, 'hp')), job).toEqual(['Orange Potion', 'White Potion'])
      expect(names(potionsOf(job, 'mp')), job).toEqual(['Blue Potion'])
    }
    expect(names(potionsOf('magician', 'mp'))).toEqual(['Orange', 'Lemon', 'Blue Potion'])
    // Elke potion heeft een MeowDB-pagina als bron.
    for (const p of [...POTIONS, ...MAGICIAN_MP_POTIONS]) expect(p.source.url, p.name).toMatch(/^https:\/\/meowdb\.com\/msclassic\/item-db\/\d+$/)
  })

  it('valt terug op de goedkoopste bij geen keuze, of een naam die niet bij de job of de soort hoort', () => {
    expect(databasePotion('thief', 'hp', null)).toBe(HP_POTION)
    expect(databasePotion('thief', 'hp', 'Blue Potion')).toBe(HP_POTION)
    expect(databasePotion('thief', 'mp', 'Lemon')).toBe(mpPotionFor('thief'))
    expect(databasePotion('magician', 'mp', 'Lemon')).toBe(potion('Lemon'))
  })
})

describe('resolvePotions, pickPotion en fixPotion', () => {
  it('geeft zonder keuze de goedkoopste per punt, dezelfde als de berekening zonder keuze', () => {
    for (const job of ['thief', 'warrior', 'bowman', 'magician'] as Job[]) {
      expect(resolvePotions(job, NO_POTION_CHOICE), job).toEqual({ hp: HP_POTION, mp: mpPotionFor(job) })
      expect(cheapestPotions(job), job).toEqual({ hp: HP_POTION, mp: mpPotionFor(job) })
    }
  })

  it('geeft je keuze uit de database, met je correcties erover', () => {
    expect(resolvePotions('thief', choice('White Potion', null)).hp).toBe(potion('White Potion'))
    const fixed = fixPotion(fixPotion(choice('White Potion', null), 'thief', 'hp', 'price', '330')!, 'thief', 'hp', 'restores', '520')!
    expect(fixed.fix.hp).toEqual({ name: 'White Potion', price: 330, restores: 520 })
    expect(resolvePotions('thief', fixed).hp).toMatchObject({ name: 'White Potion', price: 330, hp: 520, mp: 0 })
    // De correctie van de MP-potion staat los van die van de HP-potion.
    expect(resolvePotions('thief', fixed).mp).toBe(mpPotionFor('thief'))
  })

  it('corrigeert ook de goedkoopste als je niets koos', () => {
    const fixed = fixPotion(NO_POTION_CHOICE, 'thief', 'mp', 'price', '200')!
    expect(resolvePotions('thief', fixed).mp).toMatchObject({ name: 'Blue Potion', price: 200, mp: 200 })
  })

  it('haalt een correctie weg bij een leeg vak of het getal uit de database, en weigert een ongeldig getal', () => {
    const fixed = fixPotion(choice('White Potion', null), 'thief', 'hp', 'price', '330')!
    expect(fixPotion(fixed, 'thief', 'hp', 'price', '')!.fix.hp).toEqual({})
    expect(fixPotion(fixed, 'thief', 'hp', 'price', '350')!.fix.hp).toEqual({})
    for (const bad of ['0', '-5', '12.5', 'abc', '10000000']) expect(fixPotion(fixed, 'thief', 'hp', 'price', bad), bad).toBeNull()
    // Herstel boven de 30.000 die het profiel als Max HP toelaat, is geen potion.
    expect(fixPotion(fixed, 'thief', 'hp', 'restores', '30001')).toBeNull()
  })

  it('gooit de correcties van een soort weg als je daar een andere potion kiest, en laat de andere soort staan', () => {
    let c = fixPotion(choice('White Potion', null), 'thief', 'hp', 'price', '330')!
    c = fixPotion(c, 'thief', 'mp', 'price', '200')!
    const picked = pickPotion(c, 'hp', 'Orange Potion')
    expect(picked).toEqual({ hp: 'Orange Potion', mp: null, fix: { hp: {}, mp: { name: 'Blue Potion', price: 200 } } })
  })

  it('laat een correctie niet meegaan naar een andere potion als je job wisselt (Victor, 6 oktober 2026)', () => {
    // Een Magician corrigeert zijn Lemon; als Thief kent hij geen Lemon en rekent hij met de Blue Potion, zonder die correctie.
    const lemon = fixPotion(choice(null, 'Lemon'), 'magician', 'mp', 'price', '500')!
    expect(resolvePotions('magician', lemon).mp).toMatchObject({ name: 'Lemon', price: 500 })
    expect(resolvePotions('thief', lemon).mp).toBe(mpPotionFor('thief'))
    // Corrigeer je als Thief de Blue Potion, dan vervangt dat de correctie van de Lemon.
    expect(fixPotion(lemon, 'thief', 'mp', 'restores', '210')!.fix.mp).toEqual({ name: 'Blue Potion', restores: 210 })
  })

  it('noemt de velden per soort: de prijs als kosten, het herstel als winst', () => {
    expect(potionFields('hp').map((f) => [f.label, f.tone])).toEqual([['Price', 'cost'], ['Healing', 'gain']])
    expect(potionFields('mp').map((f) => f.label)).toEqual(['Price', 'Healing'])
    // De eenheid achter het getal (Dave, 6 oktober 2026).
    expect(potionFields('hp').map((f) => f.unit)).toEqual(['meso', 'HP'])
    expect(potionFields('mp').map((f) => f.unit)).toEqual(['meso', 'MP'])
  })
})

describe('potionInfo', () => {
  it('rekent meso per punt en het deel van je balk', () => {
    const info = potionInfo(potion('Orange Potion'), 'hp', '444')
    expect(info.mesoPerPoint).toBe(0.6)
    expect(info.fillPct).toBeCloseTo((250 / 444) * 100)
    expect(potionInfo(potion('White Potion'), 'hp', '444').fillPct).toBe(100)
  })

  it('telt Improved Recovery mee', () => {
    expect(potionInfo(potion('Orange Potion'), 'hp', '500', 1.2)).toEqual({ mesoPerPoint: 0.5, fillPct: 60 })
  })

  it('laat het deel van je balk weg zonder bruikbare max: leeg, 0, negatief, geen geheel getal, geen getal of boven 30.000', () => {
    for (const max of ['', '  ', '0', '-5', '12.5', 'abc', '30001']) expect(potionInfo(potion('Blue Potion'), 'mp', max).fillPct, JSON.stringify(max)).toBeNull()
  })
})

describe('potionAdvice', () => {
  const parsed = parseProfile(DEFAULT_PROFILE)
  if (!('profile' in parsed)) throw new Error('voorbeeldprofiel ongeldig')
  const profile: Profile = parsed.profile
  const drafts = [mobDraft('Ribbon Pig')!]
  const cost = (p: Profile) => {
    const c = levelCost(p, bestVerdict(drafts, p))
    return c.kind === 'cost' ? c.meso : undefined
  }
  const advice = (p: Profile, d = drafts) => {
    const a = potionAdvice(d, p)
    if (a.kind !== 'advice') throw new Error('geen advies')
    return a
  }

  it('is niet uit te rekenen zonder profiel of zonder kosten', () => {
    expect(potionAdvice(drafts, null)).toEqual({ kind: 'none' })
    expect(potionAdvice([], profile)).toEqual({ kind: 'none' })
  })

  it('zegt blijven als je de goedkoopste gebruikt, met of zonder keuze in het profiel', () => {
    for (const p of [profile, { ...profile, potions: cheapestPotions('thief') }]) {
      expect(advice(p).switchTo).toEqual([])
      expect(advice(p).mesoChosen).toBe(cost(profile))
    }
  })

  it('rekent met je keuze, en zet de goedkoopste ernaast die dit level minder kost', () => {
    const white = { ...profile, potions: resolvePotions('thief', choice('White Potion', null)) }
    const a = advice(white)
    expect(a.switchTo).toEqual([HP_POTION])
    expect(a.mesoChosen).toBe(cost(white))
    expect(a.mesoCheapest).toBe(cost(profile))
    expect(a.mesoChosen!).toBeGreaterThan(a.mesoCheapest!)
  })

  it('rekent met je correctie, en raadt geen wissel aan zolang je potion per punt het goedkoopst blijft', () => {
    const dearer = { ...profile, potions: resolvePotions('thief', fixPotion(NO_POTION_CHOICE, 'thief', 'hp', 'price', '160')!) }
    expect(advice(dearer).mesoChosen).toBe(cost(dearer))
    expect(advice(dearer).mesoChosen!).toBeGreaterThan(cost(profile)!)
    // 160 / 250 = 0,64 per HP: nog goedkoper dan de White (0,7).
    expect(advice(dearer).switchTo).toEqual([])
  })

  it('raadt de goedkoopste andere potion aan als je correctie de jouwe duurder maakt (Victor, 6 oktober 2026)', () => {
    // Een Orange van 300 meso kost 1,2 per HP; de White kost 0,7.
    const dear = { ...profile, potions: resolvePotions('thief', fixPotion(NO_POTION_CHOICE, 'thief', 'hp', 'price', '300')!) }
    expect(advice(dear).switchTo).toEqual([potion('White Potion')])
    expect(advice(dear).mesoCheapest!).toBeLessThan(advice(dear).mesoChosen!)
  })

  it('zegt blijven bij een Magician met de Lemon: even goedkoop per MP als de Orange', () => {
    const p = parseProfile({ ...DEFAULT_PROFILE, level: '15', int: '60', luk: '4' }, 'magician')
    if (!('profile' in p)) throw new Error(p.error)
    const a = advice({ ...p.profile, potions: resolvePotions('magician', choice(null, 'Lemon')) })
    expect(a.switchTo).toEqual([])
    expect(a.mesoCheapest).toBe(a.mesoChosen)
  })

  it('ziet geen verschil als de potions op de plek niet meetellen', () => {
    const own = [{ ...drafts[0], potions: '1000' }]
    const a = advice({ ...profile, potions: resolvePotions('thief', choice('White Potion', null)) }, own)
    expect(a.switchTo).toEqual([HP_POTION])
    expect(a.mesoChosen).toBe(a.mesoCheapest)
  })
})

describe('loadPotionChoice en savePotionChoice', () => {
  const memory = (initial: Record<string, string> = {}) => {
    const data = new Map(Object.entries(initial))
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) } as unknown as Storage
  }

  it('bewaart en laadt de keuze en de correcties per soort', () => {
    const storage = memory()
    const c: PotionChoice = { hp: 'White Potion', mp: null, fix: { hp: { name: 'White Potion', price: 330 }, mp: {} } }
    expect(savePotionChoice(storage, c)).toBe(true)
    expect(loadPotionChoice(storage)).toEqual(c)
  })

  it('laadt een keuze van vóór de correcties zonder correcties', () => {
    expect(loadPotionChoice(memory({ [POTION_CHOICE_KEY]: JSON.stringify({ version: 1, hp: 'White Potion', mp: null }) }))).toEqual(choice('White Potion', null))
  })

  it('geeft "nog niet gekozen" bij lege, kapotte of vreemde opslag, en negeert een ongeldige correctie', () => {
    expect(loadPotionChoice(null)).toEqual(NO_POTION_CHOICE)
    for (const raw of ['', '{', 'null', '[]', JSON.stringify({ version: 2, hp: 'White Potion' })]) {
      expect(loadPotionChoice(memory({ [POTION_CHOICE_KEY]: raw })), raw).toEqual(NO_POTION_CHOICE)
    }
    // Een correctie zonder de naam van zijn potion telt ook niet.
    const odd = JSON.stringify({ version: 1, hp: 42, mp: 'x'.repeat(61), fix: { hp: { name: 'White Potion', price: -1, restores: 2.5 }, mp: { price: 200 } } })
    expect(loadPotionChoice(memory({ [POTION_CHOICE_KEY]: odd }))).toEqual(NO_POTION_CHOICE)
  })
})
