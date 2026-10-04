// De catalogus met items zonder prijs: hier met een nagemaakte lijst (los van de echte src/data/wornItems.ts), zodat
// de samenvoeging, de claw-snelheid en het ontbreken van die items in het upgrade-advies vaststaan.
import { describe, expect, it, vi } from 'vitest'

vi.mock('./data/wornItems', () => {
  const source = { url: 'https://meowdb.com/msclassic/item-db/0', retrieved: '2026-10-04' }
  return {
    WORN_ARMOR: [
      { name: 'Testhoed', slot: 'hat', level: 40, wdef: 30, source },
      { name: 'Red Pao', slot: 'top', level: 20, wdef: 1, source },
    ],
    WORN_CLAWS: [{ name: 'Testclaw', level: 40, watk: 30, speed: { label: 'Fast (5)', attackMs: 540 }, source }],
  }
})

import { armorUpgradeAdvice } from './armorUpgrade'
import { clawUpgradeAdvice } from './clawUpgrade'
import { applyEquipChange, catalogItems, searchCatalog, wornStat } from './equipment'
import { DEFAULT_PROFILE } from './profile'

const entry = (pick: string) => ({ pick, name: '', stat: '' })

describe('catalogus met items zonder prijs', () => {
  it('voegt ze achter de NPC-items van hun slot', () => {
    expect(catalogItems('hat', 'thief').map((i) => i.name)).toEqual(['Red Thief Hood', 'Red Loosecap', 'Red Tiberian', 'Red Guise', 'Testhoed'])
    expect(catalogItems('claw', 'thief').at(-1)).toMatchObject({ name: 'Testclaw', stat: 30, attackMs: 540 })
    expect(searchCatalog('shoes', 'thief', 'test')).toEqual([])
  })

  it('laat bij dezelfde naam de NPC-regel winnen', () => {
    expect(catalogItems('top', 'thief').filter((i) => i.name === 'Red Pao')).toEqual([expect.objectContaining({ stat: 32 })])
    expect(wornStat('top', entry('Red Pao'))).toBe(32)
  })

  it('zet bij een claw zonder prijs het WATK en de aanvalssnelheid, en telt de WDEF van zo een hoed', () => {
    const p = applyEquipChange({ ...DEFAULT_PROFILE, attackMs: '999' }, 'claw', entry('unknown'), entry('Testclaw'))
    expect(p).toMatchObject({ clawWatk: '30', attackMs: '540' })
    expect(wornStat('hat', entry('Testhoed'))).toBe(30)
  })

  it('komt niet in het upgrade-advies: dat kent alleen de winkelitems met een prijs', () => {
    const json = JSON.stringify([armorUpgradeAdvice([], null, {}), clawUpgradeAdvice([], null)])
    expect(json).not.toContain('Testhoed')
    expect(json).not.toContain('Testclaw')
  })
})
