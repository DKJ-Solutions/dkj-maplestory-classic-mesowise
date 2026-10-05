import { describe, expect, it } from 'vitest'
import { applyEquipChange, catalogItems, itemRequirements, searchCatalog, wornStat, type EquipEntry } from '../equipment'
import { DEFAULT_PROFILE } from '../profile'
import { BEGINNER_WEAPONS, BEGINNER_WORN_WARRIOR_WEAPONS, BEGINNER_WORN_WEAPONS, DAGGER, isBeginnerDagger } from './beginnerWeapons'

const pick = (name: string): EquipEntry => ({ pick: name, name: '', stat: '' })
const unknown: EquipEntry = { pick: 'unknown', name: '', stat: '' }

describe('de wapens onder level 10', () => {
  it('zijn de vijf van MeowDB, met level, W.ATK, snelheid en itempagina', () => {
    expect(BEGINNER_WEAPONS.map((w) => [w.name, w.level, w.watk, w.speed.label, w.source.url.split('/').pop()])).toEqual([
      ['Sword', 0, 17, 'Fast (4)', '541'],
      ['Hand Axe', 0, 17, 'Fast (4)', '576'],
      ['Wooden Club', 0, 19, 'Fast (5)', '585'],
      ['Razor', 5, 23, 'Fast (4)', '558'],
      ['Fruit Knife', 8, 23, 'Faster (3)', '559'],
    ])
    for (const w of BEGINNER_WEAPONS) {
      expect(w.level).toBeLessThan(10)
      expect(w.source.url).toMatch(/^https:\/\/meowdb\.com\/msclassic\/item-db\/\d+$/)
    }
  })

  it('geven elk de verwachte multiplier van hun soort (60% zwaai, 40% steek), ook een dagger (#171)', () => {
    // 1h-sword 1,8 en 1,8; 1h-axe en 1h-blunt 2,4 en 1,2: 0,6 x 2,4 + 0,4 x 1,2 = 1,92; dagger 1,0 en 2,0: 1,4.
    expect(BEGINNER_WORN_WEAPONS.map((w) => w.mult)).toEqual([1.8, 1.92, 1.92, 1.4, 1.4])
    expect(DAGGER.mult).toEqual({ swing: 1.0, stab: 2.0 })
    expect(DAGGER.source.url).toBe('https://meowdb.com/msclassic/guides/explaining-the-damage-formula')
    expect(BEGINNER_WEAPONS.filter((w) => isBeginnerDagger(w.name)).map((w) => w.name)).toEqual(['Razor', 'Fruit Knife'])
    expect(isBeginnerDagger('Garnier')).toBe(false)
    expect(BEGINNER_WORN_WARRIOR_WEAPONS.map((w) => w.name)).toEqual(['Sword', 'Hand Axe', 'Wooden Club'])
  })

  it('staan bovenaan de wapenlijst van Thief, Warrior en Bowman, en niet bij de Magician', () => {
    const names = (job: 'thief' | 'warrior' | 'bowman' | 'magician') => catalogItems('claw', job).map((i) => i.name)
    expect(names('thief').slice(0, 5)).toEqual(['Sword', 'Hand Axe', 'Wooden Club', 'Razor', 'Fruit Knife'])
    expect(names('bowman').slice(0, 5)).toEqual(['Sword', 'Hand Axe', 'Wooden Club', 'Razor', 'Fruit Knife'])
    expect(names('warrior').slice(0, 3)).toEqual(['Sword', 'Hand Axe', 'Wooden Club'])
    expect(names('warrior')).not.toContain('Razor')
    for (const w of BEGINNER_WEAPONS) expect(names('magician')).not.toContain(w.name)
  })

  it('zet de wapenlijst op level, laagste eerst, zodat de lege zoekbalk ze laat zien', () => {
    for (const job of ['thief', 'warrior', 'bowman', 'magician'] as const) {
      const levels = catalogItems('claw', job).map((i) => i.level ?? 0)
      expect(levels, job).toEqual([...levels].sort((a, b) => a - b))
    }
    expect(searchCatalog('claw', 'thief', '').slice(0, 5).map((i) => i.level)).toEqual([0, 0, 0, 5, 8])
  })

  it('zijn bij elke job hetzelfde item', () => {
    const thief = catalogItems('claw', 'thief')
    for (const job of ['warrior', 'bowman'] as const)
      for (const i of catalogItems('claw', job)) {
        const t = thief.find((x) => x.name === i.name)
        if (t) expect(i, `${job} ${i.name}`).toEqual(t)
      }
  })

  it('vragen geen stat en zetten weapon attack, tijd per aanval, de multiplier en of het een dagger is', () => {
    expect(itemRequirements('claw', pick('Fruit Knife'))).toEqual({})
    expect(wornStat('claw', pick('Wooden Club'))).toBe(19)
    const p = { ...DEFAULT_PROFILE, clawWatk: '5', attackMs: '999', weaponMult: '2.5' }
    expect(applyEquipChange(p, 'claw', unknown, pick('Sword'))).toEqual({ ...p, clawWatk: '17', attackMs: '720', weaponMult: '1.8', dagger: '0' })
    expect(applyEquipChange(p, 'claw', unknown, pick('Fruit Knife'))).toEqual({ ...p, clawWatk: '23', attackMs: '660', weaponMult: '1.4', dagger: '1' })
    // Een claw daarna zet de dagger weer uit; een claw heeft geen multiplier, dus die blijft staan (hij telt pas onder level 10).
    const knife = applyEquipChange(p, 'claw', unknown, pick('Fruit Knife'))
    expect(applyEquipChange(knife, 'claw', pick('Fruit Knife'), pick('Garnier'))).toMatchObject({ dagger: '0', weaponMult: '1.4' })
    // Een eigen item ook, met of zonder ingevulde W.ATT (Victor's review op #171).
    const other = (stat: string): EquipEntry => ({ pick: 'other', name: 'Mijn mes', stat })
    expect(applyEquipChange(knife, 'claw', pick('Fruit Knife'), other('30'))).toMatchObject({ dagger: '0', clawWatk: '30' })
    expect(applyEquipChange(knife, 'claw', pick('Fruit Knife'), other(''))).toMatchObject({ dagger: '0' })
  })
})
