import { describe, expect, it } from 'vitest'
import { MAGICIAN_MP_POTIONS } from './data/magician'
import { POTIONS } from './data/spots'
import type { Job } from './job'
import { potionOptions } from './potions'
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
