import { describe, expect, it } from 'vitest'
import { MAGICIAN_MP_POTIONS } from './data/magician'
import { POTIONS } from './data/spots'
import { mobDraft } from './data/spots'
import type { Job } from './job'
import { levelCost } from './levelCost'
import { bestVerdict } from './best'
import { DEFAULT_PROFILE, parseProfile, type Profile } from './profile'
import {
  cheapestPotions,
  loadPotionChoice,
  NO_POTION_CHOICE,
  POTION_CHOICE_KEY,
  potionAdvice,
  potionOptions,
  resolvePotions,
  savePotionChoice,
} from './potions'
import { HP_POTION, mpPotionFor } from './suggest'

const names = (list: readonly { potion: { name: string } }[]) => list.map((o) => o.potion.name)

describe('potionOptions', () => {
  it('geeft elke job de HP-potions en de Blue Potion, van goedkoop naar duur per punt', () => {
    for (const job of ['thief', 'warrior', 'bowman'] as Job[]) {
      const o = potionOptions(job, '444', '363')
      expect(names(o.hp), job).toEqual(['Orange Potion', 'White Potion'])
      expect(names(o.mp), job).toEqual(['Blue Potion'])
    }
  })

  it('geeft een Magician de Orange en de Lemon erbij; bij gelijke prijs per MP blijft de volgorde van de data', () => {
    const o = potionOptions('magician', '200', '500')
    expect(names(o.mp)).toEqual(['Orange', 'Lemon', 'Blue Potion'])
    expect(o.mp.map((x) => x.mesoPerPoint)).toEqual([1, 1, 1.1])
  })

  it('markeert precies de potion waarmee de berekening rekent', () => {
    for (const job of ['thief', 'warrior', 'bowman', 'magician'] as Job[]) {
      const o = potionOptions(job, '444', '363')
      expect(o.hp.filter((x) => x.used).map((x) => x.potion), job).toEqual([HP_POTION])
      expect(o.mp.filter((x) => x.used).map((x) => x.potion), job).toEqual([mpPotionFor(job)])
    }
  })

  it('rekent herstel, meso per punt en het deel van je balk uit de bronwaarden', () => {
    const o = potionOptions('thief', '444', '363')
    const orange = o.hp[0]
    expect(orange).toMatchObject({ kind: 'hp', restores: 250, mesoPerPoint: 0.6 })
    expect(orange.fillPct).toBeCloseTo((250 / 444) * 100)
    expect(o.mp[0]).toMatchObject({ kind: 'mp', restores: 200, mesoPerPoint: 1.1 })
    // De bronnen: elke potion op de kaart heeft een MeowDB-pagina.
    for (const p of [...POTIONS, ...MAGICIAN_MP_POTIONS]) expect(p.source.url, p.name).toMatch(/^https:\/\/meowdb\.com\/msclassic\/item-db\/\d+$/)
  })

  it('houdt bij een gelijkspel de volgorde van de app, ook met Improved MP Recovery (factor 1,1 en 1,15)', () => {
    for (const mp of [1, 1.05, 1.1, 1.15, 1.2]) {
      const o = potionOptions('magician', '200', '500', { hp: 1, mp })
      expect(names(o.mp), String(mp)).toEqual(['Orange', 'Lemon', 'Blue Potion'])
      expect(o.mp[0].used, String(mp)).toBe(true)
    }
  })

  it('laat het deel van je balk weg boven de 30.000 die het profiel toelaat', () => {
    expect(potionOptions('thief', '30000', '30001').hp[0].fillPct).toBeCloseTo((250 / 30000) * 100)
    expect(potionOptions('thief', '30000', '30001').mp[0].fillPct).toBeNull()
  })

  it('vult nooit meer dan je hele balk', () => {
    expect(potionOptions('thief', '100', '50').hp.map((x) => x.fillPct)).toEqual([100, 100])
  })

  it('laat het deel van je balk weg zonder bruikbare max: leeg, 0, negatief, geen geheel getal of geen getal', () => {
    for (const max of ['', '  ', '0', '-5', '12.5', 'abc']) {
      const o = potionOptions('thief', max, max)
      expect([...o.hp, ...o.mp].every((x) => x.fillPct === null), JSON.stringify(max)).toBe(true)
    }
  })

  it('telt Improved HP en MP Recovery mee in herstel, prijs per punt en balk', () => {
    const o = potionOptions('warrior', '500', '200', { hp: 1.2, mp: 1 })
    expect(o.hp[0]).toMatchObject({ restores: 300, mesoPerPoint: 0.5, fillPct: 60 })
    expect(o.mp[0]).toMatchObject({ restores: 200, mesoPerPoint: 1.1, fillPct: 100 })
  })
})

const potion = (name: string) => [...POTIONS, ...MAGICIAN_MP_POTIONS].find((p) => p.name === name)!

describe('resolvePotions', () => {
  it('geeft zonder keuze de goedkoopste per punt, dezelfde als de berekening zonder keuze', () => {
    for (const job of ['thief', 'warrior', 'bowman', 'magician'] as Job[]) {
      expect(resolvePotions(job, NO_POTION_CHOICE), job).toEqual({ hp: HP_POTION, mp: mpPotionFor(job) })
      expect(cheapestPotions(job), job).toEqual({ hp: HP_POTION, mp: mpPotionFor(job) })
    }
  })

  it('geeft je keuze terug als hij bij je job en de soort hoort', () => {
    expect(resolvePotions('thief', { hp: 'White Potion', mp: 'Blue Potion' })).toEqual({ hp: potion('White Potion'), mp: potion('Blue Potion') })
    expect(resolvePotions('magician', { hp: null, mp: 'Lemon' }).mp).toBe(potion('Lemon'))
  })

  it('valt per soort terug op de goedkoopste bij een naam die niet bij de job of de soort hoort', () => {
    // De Lemon is alleen voor een Magician; Blue Potion herstelt geen HP; een onbekende naam bestaat niet.
    expect(resolvePotions('thief', { hp: 'Blue Potion', mp: 'Lemon' })).toEqual({ hp: HP_POTION, mp: mpPotionFor('thief') })
    expect(resolvePotions('warrior', { hp: 'Elixir', mp: '' })).toEqual({ hp: HP_POTION, mp: mpPotionFor('warrior') })
  })

  it('markeert in potionOptions je keuze als gebruikt, en de goedkoopste apart', () => {
    const o = potionOptions('thief', '444', '363', undefined, resolvePotions('thief', { hp: 'White Potion', mp: null }))
    expect(o.hp.map((x) => [x.potion.name, x.used, x.cheapest])).toEqual([
      ['Orange Potion', false, true],
      ['White Potion', true, false],
    ])
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

  it('is niet uit te rekenen zonder profiel of zonder kosten', () => {
    expect(potionAdvice(drafts, null)).toEqual({ kind: 'none' })
    expect(potionAdvice([], profile)).toEqual({ kind: 'none' })
  })

  it('zegt blijven als je de goedkoopste gebruikt, met of zonder keuze in het profiel', () => {
    for (const p of [profile, { ...profile, potions: cheapestPotions('thief') }]) {
      const a = potionAdvice(drafts, p)
      expect(a.kind === 'advice' && a.stay).toBe(true)
      expect(a.kind === 'advice' && a.mesoChosen).toBe(cost(profile))
    }
  })

  it('rekent met je keuze, en zet de goedkoopste ernaast die dit level minder kost', () => {
    const white = { ...profile, potions: resolvePotions('thief', { hp: 'White Potion', mp: null }) }
    const a = potionAdvice(drafts, white)
    if (a.kind !== 'advice') throw new Error('geen advies')
    expect(a.stay).toBe(false)
    expect(a.cheapest).toEqual(cheapestPotions('thief'))
    expect(a.mesoChosen).toBe(cost(white))
    expect(a.mesoCheapest).toBe(cost(profile))
    expect(a.mesoChosen!).toBeGreaterThan(a.mesoCheapest!)
  })

  it('ziet geen verschil als je de potionkosten van je mob zelf invult', () => {
    const own = [{ ...drafts[0], potions: '1000' }]
    const a = potionAdvice(own, { ...profile, potions: resolvePotions('thief', { hp: 'White Potion', mp: null }) })
    if (a.kind !== 'advice') throw new Error('geen advies')
    expect(a.stay).toBe(false)
    expect(a.mesoChosen).toBe(a.mesoCheapest)
  })
})

describe('loadPotionChoice en savePotionChoice', () => {
  const memory = (initial: Record<string, string> = {}) => {
    const data = new Map(Object.entries(initial))
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) } as unknown as Storage
  }

  it('bewaart en laadt de keuze per soort', () => {
    const storage = memory()
    expect(savePotionChoice(storage, { hp: 'White Potion', mp: null })).toBe(true)
    expect(loadPotionChoice(storage)).toEqual({ hp: 'White Potion', mp: null })
  })

  it('geeft "nog niet gekozen" bij lege, kapotte of vreemde opslag', () => {
    expect(loadPotionChoice(null)).toEqual(NO_POTION_CHOICE)
    for (const raw of ['', '{', 'null', '[]', JSON.stringify({ version: 2, hp: 'White Potion' })]) {
      expect(loadPotionChoice(memory({ [POTION_CHOICE_KEY]: raw })), raw).toEqual(NO_POTION_CHOICE)
    }
    const odd = JSON.stringify({ version: 1, hp: 42, mp: 'x'.repeat(61) })
    expect(loadPotionChoice(memory({ [POTION_CHOICE_KEY]: odd }))).toEqual(NO_POTION_CHOICE)
  })
})
