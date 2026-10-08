import { describe, expect, it } from 'vitest'
import { itemId } from './itemIds'
import { NPC_CLAWS } from './data/claws'
import { NPC_ARMOR } from './data/armor'

describe('itemId: het MeowDB-id uit de bron van een item (Dave, 8 oktober 2026)', () => {
  it('leest het id uit de item-db-pagina van het item', () => {
    expect(itemId('Garnier')).toBe('680')
    for (const c of NPC_CLAWS) expect(c.source.url).toBe(`https://meowdb.com/msclassic/item-db/${itemId(c.name)}`)
    for (const a of NPC_ARMOR) expect(a.source.url).toBe(`https://meowdb.com/msclassic/item-db/${itemId(a.name)}`)
  })

  it('kent een eigen item niet', () => {
    expect(itemId('Mijn eigen claw')).toBeNull()
  })
})
