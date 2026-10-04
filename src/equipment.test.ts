import { describe, expect, it } from 'vitest'
import {
  applyEquipChange,
  catalogItems,
  changeEquipment,
  displacedSlots,
  choosePick,
  commitStat,
  databaseStat,
  defaultEquipment,
  entryChanged,
  entryLabel,
  EQUIPMENT_KEY,
  EQUIP_SLOTS,
  loadEquipment,
  saveEquipment,
  searchCatalog,
  isOptionalSlot,
  slotLabel,
  slotsFor,
  statName,
  statOverride,
  wornName,
  wornStat,
  wornWdef,
  type EquipEntry,
  type Equipment,
  equipmentForJob,
} from './equipment'
import { NPC_ARMOR } from './data/armor'
import { NPC_ARROWS, NPC_BOWMAN_ARMOR, NPC_BOWMAN_WEAPONS } from './data/bowman'
import { NPC_CLAWS } from './data/claws'
import { THROWING_STARS } from './data/thief'
import { NPC_WARRIOR_ARMOR, NPC_WARRIOR_WEAPONS } from './data/warrior'
import { COMMON_WORN_ARMOR, WORN_ARMOR } from './data/wornItems'
import { WORN_WARRIOR_ARMOR, WORN_WARRIOR_WEAPONS } from './data/wornWarrior'
import type { Job } from './job'
import { DEFAULT_PROFILE, type ProfileDraft } from './profile'

function fakeStorage(initial: Record<string, string> = {}): Storage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial))
  return {
    data,
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (k: string) => data.get(k) ?? null,
    key: (i: number) => [...data.keys()][i] ?? null,
    removeItem: (k: string) => void data.delete(k),
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

const unknown: EquipEntry = { pick: 'unknown', name: '', stat: '' }
const other = (stat: string, name = ''): EquipEntry => ({ pick: 'other', name, stat })
/** Een stuk dat niets geeft: zo vul je een slot zonder WDEF of WATK in, want "niets" is geen keuze meer. */
const zero = other('0')
const shop = (name: string, stat = ''): EquipEntry => ({ pick: name, name: '', stat })
const prof = (over: Partial<ProfileDraft>): ProfileDraft => ({ ...DEFAULT_PROFILE, ...over })
const stored = (slots: unknown, version: unknown = 1) => fakeStorage({ [EQUIPMENT_KEY]: JSON.stringify({ version, slots }) })

describe('defaultEquipment en catalogItems', () => {
  it('begint met zeven slots die allemaal nog niet zijn ingevuld', () => {
    const eq = defaultEquipment()
    expect(Object.keys(eq).sort()).toEqual(['ammo', 'bottom', 'claw', 'hat', 'overall', 'shoes', 'top'])
    for (const { slot } of EQUIP_SLOTS) expect(eq[slot]).toEqual(unknown)
    expect(wornWdef(eq)).toEqual({})
  })

  it('geeft per slot de catalogusitems met de juiste stat (WATK voor de claw, WDEF voor armor)', () => {
    expect(catalogItems('claw', 'thief').find((i) => i.name === 'Meba')).toMatchObject({ level: 25, stat: 19, attackMs: 660 })
    const shoes = catalogItems('shoes', 'thief').map((i) => i.name)
    expect(shoes.slice(0, 3)).toEqual(['Blue Gidder Shoes', 'Red Ninja Sandals', 'Red Enamel Boots'])
    expect(shoes).toContain('Leather Sandals')
    expect(catalogItems('shoes', 'thief').find((i) => i.name === 'Bronze Aroa Boots')).toMatchObject({ level: 16, stat: 13 })
    expect(catalogItems('claw', 'thief').find((i) => i.name === 'Mithril Guards')).toMatchObject({ level: 30, stat: 23, attackMs: 720 })
    expect(catalogItems('hat', 'thief').find((i) => i.name === 'Red Thief Hood')?.stat).toBe(18)
  })
})

describe('statName', () => {
  it('noemt de stat zoals het spel: ATT voor het wapen, DEF voor armor', () => {
    expect(statName('claw')).toBe('ATT')
    for (const s of ['hat', 'top', 'bottom', 'overall', 'shoes'] as const) expect(statName(s), s).toBe('DEF')
  })
})

describe('searchCatalog', () => {
  const names = (slot: Parameters<typeof searchCatalog>[0], q: string) => searchCatalog(slot, 'thief', q).map((i) => i.name)

  it('zoekt op een deel van de naam, zonder hoofdletters en met spaties eromheen', () => {
    const pao = names('top', 'pao')
    expect(pao[0]).toBe('Red Pao') // de NPC-regel staat voor de items zonder prijs
    expect(pao).toEqual(expect.arrayContaining(['Blue Pao', 'Black Pao', 'Red Qi Pao', 'Pink Qi Pao', 'Blue Qi Pao']))
    for (const n of pao) expect(n.toLowerCase(), n).toContain('pao')
    expect(names('top', '  RED  ')).toEqual(names('top', 'red'))
    expect(names('top', 'red').slice(0, 2)).toEqual(['Red Cloth Vest', 'Red Pao'])
    expect(names('claw', 'gu')).toEqual(['Steel Guards', 'Adamantium Guards', 'Mithril Guards'])
  })

  it('zoekt alleen in het eigen slot, en een lege tekst geeft het hele slot', () => {
    expect(searchCatalog('hat', 'thief', 'pao')).toEqual([])
    expect(searchCatalog('shoes', 'thief', '')).toEqual(catalogItems('shoes', 'thief'))
    expect(catalogItems('shoes', 'thief').length).toBeGreaterThan(3)
    expect(names('bottom', 'qi pao skirt')).toEqual(['Red Qi Pao Skirt', 'Blue Qi Pao Skirt'])
    expect(searchCatalog('top', 'thief', 'bestaat niet')).toEqual([])
  })

  it('geeft elke naam in een slot één keer, en de NPC-stat wint bij dezelfde naam', () => {
    for (const { slot } of EQUIP_SLOTS) {
      const all = catalogItems(slot, 'thief').map((i) => i.name)
      expect(new Set(all).size, slot).toBe(all.length)
    }
    expect(catalogItems('top', 'thief').filter((i) => i.name === 'Red Pao')).toEqual([expect.objectContaining({ stat: 32 })])
  })
})

describe('wornStat', () => {
  it('geeft undefined bij nog niet ingevuld, en ook bij het vervallen "niets"', () => {
    expect(wornStat('hat', unknown)).toBeUndefined()
    expect(wornStat('hat', { pick: 'none', name: '', stat: '' })).toBeUndefined()
  })

  it('geeft de stat van een winkelitem in het eigen slot', () => {
    expect(wornStat('claw', shop('Garnier'))).toBe(10)
    expect(wornStat('top', shop('Red Pao'))).toBe(32)
  })

  it('geeft undefined voor een item uit een ander slot of een onbekende naam', () => {
    expect(wornStat('hat', shop('Red Pao'))).toBeUndefined()
    expect(wornStat('claw', shop('Red Pao'))).toBeUndefined()
    expect(wornStat('hat', shop('Bestaat Niet'))).toBeUndefined()
  })

  it('telt een eigen item met lege of ongeldige stat als onbekend', () => {
    for (const s of ['', '   ', 'abc', '12abc', 'NaN', 'Infinity', '-Infinity', '1e999']) expect(wornStat('top', other(s)), s).toBeUndefined()
  })

  it('begrenst een negatief getal bij een eigen item op 0', () => {
    for (const s of ['-5', '-0']) expect(wornStat('top', other(s)), s).toBe(0)
  })

  it('kapt een eigen item af op een geheel getal en begrenst op 0..999', () => {
    expect(wornStat('top', other('12'))).toBe(12)
    expect(wornStat('top', other(' 12 '))).toBe(12)
    expect(wornStat('top', other('12.9'))).toBe(12)
    expect(wornStat('top', other('0.9'))).toBe(0)
    expect(wornStat('top', other('999'))).toBe(999)
    expect(wornStat('top', other('1000'))).toBe(999)
    expect(wornStat('top', other('99999999999'))).toBe(999)
  })
})

describe('eigen stat bij een catalogusitem', () => {
  it('telt een geldige eigen waarde in plaats van de database (Red Pao: 32 wordt 35)', () => {
    expect(wornStat('top', shop('Red Pao', '35'))).toBe(35)
    expect(wornStat('claw', shop('Meba', ' 21 '))).toBe(21)
    expect(wornStat('top', shop('Red Pao', '0'))).toBe(0)
    expect(wornStat('top', shop('Red Pao', '12.9'))).toBe(12)
    expect(wornStat('top', shop('Red Pao', '5000'))).toBe(999)
    expect(wornWdef({ ...defaultEquipment(), top: shop('Red Pao', '35') })).toEqual({ top: 35 })
  })

  it('valt bij een lege of onleesbare eigen waarde terug op de database', () => {
    for (const s of ['', '  ', 'abc', '12abc', 'Infinity', '1e999']) expect(wornStat('top', shop('Red Pao', s)), s).toBe(32)
  })

  it('geeft de database- en de eigen waarde apart, en een eigen waarde gelijk aan de database is geen aanpassing', () => {
    expect(databaseStat('top', shop('Red Pao', '35'))).toBe(32)
    expect(databaseStat('top', other('5'))).toBeUndefined()
    expect(databaseStat('top', unknown)).toBeUndefined()
    expect(statOverride('top', shop('Red Pao', '35'))).toBe(35)
    expect(statOverride('top', shop('Red Pao', '32'))).toBeUndefined()
    expect(statOverride('top', shop('Red Pao', 'abc'))).toBeUndefined()
    expect(statOverride('top', other('5'))).toBeUndefined()
  })

  it('geeft bij het vastleggen van een eigen waarde het verschil in WDEF (Red Pao 32 naar 35: +3, en terug: -3)', () => {
    const p = prof({ wdef: '72' })
    const custom = commitStat('top', shop('Red Pao'), '35')!
    expect(custom).toEqual(shop('Red Pao', '35'))
    const p2 = applyEquipChange(p, 'top', shop('Red Pao'), custom)
    expect(p2.wdef).toBe('75')
    const reset = commitStat('top', custom, '')!
    expect(reset).toEqual(shop('Red Pao'))
    expect(applyEquipChange(p2, 'top', custom, reset).wdef).toBe('72')
  })

  it('zet bij een claw met eigen WATK de weapon attack en houdt de aanvalssnelheid van de claw', () => {
    const p = applyEquipChange(prof({ clawWatk: '3', attackMs: '999' }), 'claw', unknown, shop('Meba', '21'))
    expect(p).toMatchObject({ clawWatk: '21', attackMs: '660' })
  })
})

describe('commitStat', () => {
  it('bewaart bij een catalogusitem een afwijkend getal, en maakt een getal gelijk aan de database leeg', () => {
    expect(commitStat('top', shop('Red Pao'), '35')).toEqual(shop('Red Pao', '35'))
    expect(commitStat('top', shop('Red Pao', '35'), '32')).toEqual(shop('Red Pao'))
    expect(commitStat('top', shop('Red Pao', '35'), '32.7')).toEqual(shop('Red Pao'))
  })

  it('geeft bij een catalogusitem een leeg veld terug naar de database, maar negeert onleesbare tekst', () => {
    expect(commitStat('top', shop('Red Pao', '35'), '')).toEqual(shop('Red Pao'))
    expect(commitStat('top', shop('Red Pao', '35'), '   ')).toEqual(shop('Red Pao'))
    for (const t of ['abc', '12abc', 'Infinity']) expect(commitStat('top', shop('Red Pao', '35'), t), t).toBeNull()
  })

  it('legt bij een eigen item alleen een leesbaar getal vast, zoals vroeger', () => {
    expect(commitStat('top', other('5', 'x'), '9')).toEqual(other('9', 'x'))
    expect(commitStat('top', other('5', 'x'), '')).toBeNull()
    expect(commitStat('top', other('5', 'x'), 'abc')).toBeNull()
  })

  it('doet niets bij een slot dat nog niet is ingevuld of een naam die niet bestaat', () => {
    expect(commitStat('top', unknown, '9')).toBeNull()
    expect(commitStat('top', shop('Bestaat Niet'), '9')).toBeNull()
  })

  it('bewaart het getal zoals het meetelt, zodat veld, opslag en notitie hetzelfde tonen', () => {
    expect(commitStat('top', shop('Red Pao'), '5000')).toEqual(shop('Red Pao', '999'))
    expect(commitStat('top', shop('Red Pao'), ' 35.9 ')).toEqual(shop('Red Pao', '35'))
    expect(commitStat('top', shop('Red Pao'), '-5')).toEqual(shop('Red Pao', '0'))
    expect(commitStat('top', other('5', 'x'), '1e2')).toEqual(other('100', 'x'))
  })
})

describe('entryLabel', () => {
  it('noemt het item, met de eigen stat erbij als die afwijkt', () => {
    expect(entryLabel('top', unknown)).toBe('nog niet ingevuld')
    expect(entryLabel('top', shop('Red Pao'))).toBe('Red Pao')
    expect(entryLabel('top', shop('Red Pao', '32'))).toBe('Red Pao')
    expect(entryLabel('top', shop('Red Pao', '35'))).toBe('Red Pao (aangepast: 35)')
    expect(entryLabel('top', other('5', ' Muts '))).toBe('Muts')
    expect(entryLabel('top', other('5'))).toBe('Eigen item')
  })
})

describe('wornWdef en wornName', () => {
  const eq: Equipment = {
    claw: shop('Meba'),
    ammo: unknown,
    hat: unknown,
    top: shop('Red Pao'),
    bottom: unknown,
    overall: unknown,
    shoes: other('7', '  Mijn laarzen  '),
  }

  it('geeft alleen de armorslots waarvan de WDEF bekend is, en nooit de claw', () => {
    expect(wornWdef(eq)).toEqual({ top: 32, shoes: 7 })
  })

  it('noemt wat je draagt, en niets bij een slot dat nog niet is ingevuld', () => {
    expect(wornName(unknown)).toBeNull()
    expect(wornName(shop('Red Pao'))).toBe('Red Pao')
    expect(wornName(other('7', '  Mijn laarzen  '))).toBe('Mijn laarzen')
    expect(wornName(other('7', '   '))).toBe('eigen item')
  })

})

describe('entryChanged', () => {
  it('ziet een andere keuze als gewijzigd', () => {
    expect(entryChanged(unknown, shop('Meba'))).toBe(true)
    expect(entryChanged(shop('Meba'), shop('Garnier'))).toBe(true)
    expect(entryChanged(shop('Meba'), shop('Meba'))).toBe(false)
  })

  it('ziet bij een eigen item een andere naam of stat, maar negeert spaties rond de tekst', () => {
    expect(entryChanged(other('5', 'x'), other('5', 'x'))).toBe(false)
    expect(entryChanged(other(' 5 ', ' x '), other('5', 'x'))).toBe(false)
    expect(entryChanged(other('5', 'x'), other('6', 'x'))).toBe(true)
    expect(entryChanged(other('5', 'x'), other('5', 'y'))).toBe(true)
  })

  it('negeert een achtergebleven naam als de keuze geen eigen item is, maar ziet een eigen stat', () => {
    expect(entryChanged({ pick: 'Meba', name: 'a', stat: '' }, shop('Meba'))).toBe(false)
    expect(entryChanged(shop('Meba'), shop('Meba', '21'))).toBe(true)
    expect(entryChanged(shop('Meba', ' 21 '), shop('Meba', '21'))).toBe(false)
  })
})

describe('applyEquipChange: claw', () => {
  it('zet de weapon attack absoluut en bij een winkelclaw ook de aanvalssnelheid (Meba: 19 en 660 ms)', () => {
    const p = applyEquipChange(prof({ clawWatk: '3', attackMs: '999' }), 'claw', unknown, shop('Meba'))
    expect(p.clawWatk).toBe('19')
    expect(p.attackMs).toBe('660')
  })

  it('doet dat los van wat er eerst stond', () => {
    const a = applyEquipChange(prof({ clawWatk: '3' }), 'claw', shop('Garnier'), shop('Steel Titans'))
    const b = applyEquipChange(prof({ clawWatk: '3' }), 'claw', unknown, shop('Steel Titans'))
    expect(a).toEqual(b)
    expect(a).toMatchObject({ clawWatk: '13', attackMs: '720' })
  })

  it('laat bij een eigen item de aanvalssnelheid staan, en bij een ongeldige stat alles', () => {
    expect(applyEquipChange(prof({ attackMs: '800' }), 'claw', shop('Meba'), other('21'))).toMatchObject({ clawWatk: '21', attackMs: '800' })
    expect(applyEquipChange(prof({ attackMs: '800' }), 'claw', shop('Meba'), zero)).toMatchObject({ clawWatk: '0', attackMs: '800' })
    const p = prof({ clawWatk: '7', attackMs: '800' })
    expect(applyEquipChange(p, 'claw', shop('Meba'), other('abc'))).toBe(p)
    expect(applyEquipChange(p, 'claw', shop('Meba'), other(''))).toBe(p)
  })

  it('raakt niets als het slot op "nog niet ingevuld" komt', () => {
    const p = prof({ clawWatk: '7' })
    expect(applyEquipChange(p, 'claw', shop('Meba'), unknown)).toBe(p)
  })

  it('laat een zelf ingevulde aanvalssnelheid staan als je alleen de WATK van dezelfde claw aanpast', () => {
    const p = applyEquipChange(prof({ clawWatk: '19', attackMs: '600' }), 'claw', shop('Meba'), shop('Meba', '21'))
    expect(p).toMatchObject({ clawWatk: '21', attackMs: '600' })
    expect(applyEquipChange(prof({ attackMs: '600' }), 'claw', shop('Garnier'), shop('Meba')).attackMs).toBe('660')
  })

  it('raakt de armor-velden niet aan', () => {
    const p = applyEquipChange(prof({ wdef: '50' }), 'claw', unknown, shop('Meba'))
    expect(p.wdef).toBe('50')
  })
})

describe('applyEquipChange: armor', () => {
  it('telt het verschil tussen nieuw en oud stuk bij de WDEF (Red Cloth Vest 24 naar Red Pao 32: +8)', () => {
    expect(applyEquipChange(prof({ wdef: '72' }), 'top', shop('Red Cloth Vest'), shop('Red Pao')).wdef).toBe('80')
  })

  it('trekt het verschil af bij een slechter stuk, en bij een stuk zonder WDEF gaat het hele stuk eraf', () => {
    expect(applyEquipChange(prof({ wdef: '72' }), 'top', shop('Red Pao'), shop('Red Cloth Vest')).wdef).toBe('64')
    expect(applyEquipChange(prof({ wdef: '72' }), 'top', shop('Red Pao'), zero).wdef).toBe('40')
    expect(applyEquipChange(prof({ wdef: '72' }), 'top', zero, shop('Red Pao')).wdef).toBe('104')
  })

  it('komt niet onder 0', () => {
    expect(applyEquipChange(prof({ wdef: '10' }), 'top', shop('Red Pao'), zero).wdef).toBe('0')
    expect(applyEquipChange(prof({ wdef: '0' }), 'top', shop('Red Pao'), zero).wdef).toBe('0')
  })

  it('doet niets als het oude of het nieuwe stuk onbekend is, ook niet bij onbekend naar bekend', () => {
    const p = prof({ wdef: '72' })
    expect(applyEquipChange(p, 'top', unknown, shop('Red Pao'))).toBe(p)
    expect(applyEquipChange(p, 'top', shop('Red Pao'), unknown)).toBe(p)
    expect(applyEquipChange(p, 'top', unknown, zero)).toBe(p)
    expect(applyEquipChange(p, 'top', unknown, unknown)).toBe(p)
  })

  it('doet niets als het item niet bij het slot hoort (onbekend in dat slot)', () => {
    const p = prof({ wdef: '72' })
    expect(applyEquipChange(p, 'hat', shop('Red Pao'), shop('Red Thief Hood'))).toBe(p)
  })

  it('laat een niet-gehele of lege WDEF ongemoeid', () => {
    for (const w of ['', '  ', 'abc', '72.5', '-3', '1e2', '+5']) {
      const p = prof({ wdef: w })
      expect(applyEquipChange(p, 'top', shop('Red Cloth Vest'), shop('Red Pao')), `"${w}"`).toBe(p)
    }
  })

  it('leest een WDEF met spaties eromheen wel en schrijft hem schoon terug', () => {
    expect(applyEquipChange(prof({ wdef: ' 72 ' }), 'top', shop('Red Cloth Vest'), shop('Red Pao')).wdef).toBe('80')
  })

  it('raakt de claw-velden niet aan', () => {
    const p = applyEquipChange(prof({ clawWatk: '9', attackMs: '800' }), 'top', zero, shop('Red Pao'))
    expect(p).toMatchObject({ clawWatk: '9', attackMs: '800' })
  })

  it('geeft bij vastleggen tegen de laatst toegepaste stand de juiste eind-WDEF (12 naar 15 binnen een bewerking: +3)', () => {
    // De tussenstanden ('', '1') worden niet vastgelegd: het scherm rekent tegen de entry van de laatste toegepaste wijziging.
    expect(applyEquipChange(prof({ wdef: '72' }), 'top', other('12'), other('15')).wdef).toBe('75')
  })

  it('doet niets als een lege tussenstand wordt vastgelegd, en de volgende waarde is een vastlegging zonder delta', () => {
    const p0 = prof({ wdef: '72' })
    const p1 = applyEquipChange(p0, 'top', other('12'), other(''))
    expect(p1).toBe(p0)
    const p2 = applyEquipChange(p1, 'top', other(''), other('1'))
    expect(p2).toBe(p0)
    expect(applyEquipChange(p2, 'top', other('1'), other('15'))).toMatchObject({ wdef: '86' })
  })

  it('geeft van onbekend naar 12 geen delta en laat de WDEF staan (Victors scenario: 50 blijft 50)', () => {
    const p = prof({ wdef: '50' })
    const picked = choosePick('top', unknown, 'other')
    expect(picked).toEqual(other(''))
    expect(applyEquipChange(p, 'top', unknown, picked)).toBe(p)
    expect(applyEquipChange(p, 'top', picked, other('12'))).toBe(p)
    expect(applyEquipChange(p, 'top', unknown, other('12'))).toBe(p)
  })

  it('geeft bij een reeks vastleggingen hetzelfde als een directe wissel, zolang elke stand geldig is en de WDEF niet onder 0 komt', () => {
    const orders = [['9', '99', '999', '5'], ['3', '03', '3.9'], ['1000', '12']]
    for (const order of orders) {
      let entry = other('20')
      let p = prof({ wdef: '100' })
      for (const s of order) {
        const next = other(s)
        p = applyEquipChange(p, 'bottom', entry, next)
        entry = next
      }
      expect(p.wdef, order.join(',')).toBe(applyEquipChange(prof({ wdef: '100' }), 'bottom', other('20'), entry).wdef)
    }
  })

  it('verliest het verschil bij de ondergrens 0 (bekende beperking: wisselen en terugwisselen geeft niet dezelfde WDEF)', () => {
    let p = applyEquipChange(prof({ wdef: '5' }), 'top', other('12'), zero)
    expect(p.wdef).toBe('0')
    p = applyEquipChange(p, 'top', zero, other('12'))
    expect(p.wdef).toBe('12')
  })
})

describe('choosePick', () => {
  it('vult bij OTHER de stat voor met de bekende waarde, en de wissel geeft delta 0', () => {
    const cur = shop('Red Pao')
    const picked = choosePick('top', cur, 'other')
    expect(picked).toEqual(other('32'))
    const p = prof({ wdef: '72' })
    expect(applyEquipChange(p, 'top', cur, picked).wdef).toBe('72')
    const claw = choosePick('claw', shop('Meba'), 'other')
    expect(claw).toEqual(other('19'))
    expect(applyEquipChange(prof({ clawWatk: '19' }), 'claw', shop('Meba'), claw).clawWatk).toBe('19')
  })

  it('laat OTHER leeg als de huidige stand onbekend is', () => {
    expect(choosePick('top', unknown, 'other')).toEqual(other(''))
    expect(choosePick('top', other('abc'), 'other')).toEqual(other(''))
  })

  it('geeft OTHER de stat 0 als je stuk niets gaf', () => {
    expect(choosePick('top', zero, 'other')).toEqual(other('0'))
  })

  it('vult voor met de afgekapte waarde van een eigen item', () => {
    expect(choosePick('top', other('12.9'), 'other')).toEqual(other('12'))
    expect(choosePick('top', other('5000'), 'other')).toEqual(other('999'))
  })

  it('geeft bij elke andere keuze een schone entry, ook als de oude een eigen stat had', () => {
    expect(choosePick('top', other('12', 'x'), 'Red Pao')).toEqual(shop('Red Pao'))
    expect(choosePick('top', shop('Red Pao', '35'), 'Red Cloth Vest')).toEqual(shop('Red Cloth Vest'))
    expect(choosePick('top', shop('Red Pao'), 'unknown')).toEqual(unknown)
  })

  it('maakt van de getypte tekst een eigen item met die naam (bijgesneden op 40), met de bekende stat als voorinvulling', () => {
    expect(choosePick('top', unknown, 'other', '  Mijn trui ')).toEqual(other('', 'Mijn trui'))
    expect(choosePick('top', shop('Red Pao', '35'), 'other', 'Mijn trui')).toEqual(other('35', 'Mijn trui'))
    expect(choosePick('top', unknown, 'other', 'n'.repeat(100)).name).toHaveLength(40)
  })
})

describe('loadEquipment en saveEquipment', () => {
  it('geven heen en terug dezelfde equipment', () => {
    const storage = fakeStorage()
    const eq: Equipment = {
      claw: shop('Meba'),
      ammo: shop('Wolbi Throwing Stars'),
      hat: other('5', 'Mijn muts'),
      top: other('0', 'Startshirt'),
      bottom: unknown,
      overall: unknown,
      shoes: shop('Red Ninja Sandals'),
    }
    expect(saveEquipment(storage, eq)).toBe(true)
    expect(loadEquipment(storage, 'thief')).toEqual(eq)
    expect(storage.data.has('mesowise.equipment.v1')).toBe(true)
  })

  it('geeft zonder of met kapotte opslag niets bekend', () => {
    expect(loadEquipment(null, 'thief')).toEqual(defaultEquipment())
    expect(loadEquipment(undefined, 'thief')).toEqual(defaultEquipment())
    expect(loadEquipment(fakeStorage(), 'thief')).toEqual(defaultEquipment())
    expect(loadEquipment(fakeStorage({ [EQUIPMENT_KEY]: '{kapot' }), 'thief')).toEqual(defaultEquipment())
    expect(loadEquipment(fakeStorage({ [EQUIPMENT_KEY]: '' }), 'thief')).toEqual(defaultEquipment())
  })

  it('geeft niets bekend bij JSON van een verkeerde vorm', () => {
    const raws = ['null', '5', '"tekst"', '[]', 'true', '{}', JSON.stringify({ version: 1 }), JSON.stringify({ version: 1, slots: null }), JSON.stringify({ version: 1, slots: 'x' })]
    for (const raw of raws) expect(loadEquipment(fakeStorage({ [EQUIPMENT_KEY]: raw }), 'thief'), raw).toEqual(defaultEquipment())
  })

  it('geeft niets bekend bij een verkeerde of ontbrekende versie, ook als de slots goed zijn', () => {
    const slots = { top: { pick: 'Red Pao' } }
    for (const v of [2, 0, '1', null]) expect(loadEquipment(stored(slots, v), 'thief'), String(v)).toEqual(defaultEquipment())
    expect(loadEquipment(fakeStorage({ [EQUIPMENT_KEY]: JSON.stringify({ slots }) }), 'thief')).toEqual(defaultEquipment())
  })

  it('houdt een goed slot en maakt een rommelig slot "nog niet ingevuld"', () => {
    const eq = loadEquipment(stored({ claw: { pick: 'Meba' }, hat: 'tekst', top: null, bottom: 7, shoes: { pick: 5 }, geheim: { pick: 'none' } }), 'thief')
    expect(eq.claw).toEqual(shop('Meba'))
    for (const s of ['hat', 'top', 'bottom', 'shoes'] as const) expect(eq[s], s).toEqual(unknown)
    expect('geheim' in eq).toBe(false)
  })

  it('maakt een onbekende of verdwenen winkelkeuze "nog niet ingevuld", ook als hij bij een ander slot hoort', () => {
    const eq = loadEquipment(stored({ claw: { pick: 'Verdwenen Claw' }, hat: { pick: 'Red Pao' }, top: { pick: 'Red Pao' }, shoes: { pick: '__proto__' }, bottom: { pick: 'constructor' } }), 'thief')
    expect(eq.claw).toEqual(unknown)
    expect(eq.hat).toEqual(unknown)
    expect(eq.top).toEqual(shop('Red Pao'))
    expect(eq.shoes).toEqual(unknown)
    expect(eq.bottom).toEqual(unknown)
  })

  it('wist de naam van een catalogusitem en een nog niet ingevuld slot, en houdt de eigen stat alleen bij het eerste', () => {
    const eq = loadEquipment(stored({ claw: { pick: 'Meba', name: 'x', stat: '9' }, top: { pick: 'unknown', name: 'x', stat: '9' } }), 'thief')
    expect(eq.claw).toEqual(shop('Meba', '9'))
    expect(eq.top).toEqual(unknown)
  })

  it('geeft een catalogusitem met een eigen stat heen en terug dezelfde equipment', () => {
    const storage = fakeStorage()
    const eq: Equipment = { ...defaultEquipment(), claw: shop('Meba', '21'), top: shop('Red Pao', '35') }
    saveEquipment(storage, eq)
    const back = loadEquipment(storage, 'thief')
    expect(back).toEqual(eq)
    expect(wornStat('top', back.top)).toBe(35)
    expect(JSON.parse(storage.data.get(EQUIPMENT_KEY)!).version).toBe(1)
  })

  it('maakt een rommelige eigen stat bij een catalogusitem leeg, zodat de database telt', () => {
    const eq = loadEquipment(stored({ top: { pick: 'Red Pao', stat: 'abc' }, hat: { pick: 'Red Guise', stat: 7 }, bottom: { pick: 'Red Pao Bottoms', stat: '23' }, shoes: { pick: 'Red Enamel Boots', stat: '  ' } }), 'thief')
    expect(eq.top).toEqual(shop('Red Pao'))
    expect(eq.hat).toEqual(shop('Red Guise'))
    expect(eq.bottom).toEqual(shop('Red Pao Bottoms'))
    expect(eq.shoes).toEqual(shop('Red Enamel Boots'))
    expect(wornStat('top', eq.top)).toBe(32)
  })

  it('trimt en kapt een eigen stat bij een catalogusitem af op 12 tekens', () => {
    const eq = loadEquipment(stored({ top: { pick: 'Red Pao', stat: ' 35 ' }, hat: { pick: 'Red Guise', stat: '9'.repeat(50) } }), 'thief')
    expect(eq.top.stat).toBe('35')
    expect(eq.hat.stat).toHaveLength(12)
    expect(wornStat('hat', eq.hat)).toBe(999)
  })

  it('maakt een bewaard "niets" van vroeger "nog niet ingevuld": je draagt altijd iets', () => {
    const eq = loadEquipment(stored({ hat: { pick: 'none', name: 'x', stat: '9' }, claw: { pick: 'none' } }), 'thief')
    expect(eq.hat).toEqual(unknown)
    expect(eq.claw).toEqual(unknown)
  })

  it('kapt te lange naam (40) en stat (12) af bij het laden en bij het bewaren', () => {
    const eq = loadEquipment(stored({ top: { pick: 'other', name: 'n'.repeat(100), stat: '9'.repeat(50) }, bottom: { pick: 'other', name: 5, stat: {} } }), 'thief')
    expect(eq.top.name).toHaveLength(40)
    expect(eq.top.stat).toHaveLength(12)
    expect(eq.bottom).toEqual(other(''))
    const storage = fakeStorage()
    saveEquipment(storage, { ...defaultEquipment(), hat: other('8'.repeat(30), 'm'.repeat(90)) })
    const saved = JSON.parse(storage.data.get(EQUIPMENT_KEY)!)
    expect(saved.version).toBe(1)
    expect(saved.slots.hat.name).toHaveLength(40)
    expect(saved.slots.hat.stat).toHaveLength(12)
  })

  it('geeft na een te lange stat uit de opslag nog steeds een stat binnen 0..999', () => {
    const eq = loadEquipment(stored({ top: { pick: 'other', name: '', stat: '9'.repeat(50) } }), 'thief')
    expect(wornStat('top', eq.top)).toBe(999)
  })

  it('breekt niet als de opslag faalt bij schrijven of bij lezen', () => {
    const full = fakeStorage()
    full.setItem = () => {
      throw new Error('vol')
    }
    expect(saveEquipment(full, defaultEquipment())).toBe(false)
    expect(saveEquipment(null, defaultEquipment())).toBe(false)
    expect(saveEquipment(undefined, defaultEquipment())).toBe(false)
    const broken = fakeStorage()
    broken.getItem = () => {
      throw new Error('geen toegang')
    }
    expect(loadEquipment(broken, 'thief')).toEqual(defaultEquipment())
  })

  it('schrijft onder de eigen sleutel en raakt de profielsleutel niet', () => {
    const storage = fakeStorage({ 'mesowise.profile.v1': 'x' })
    saveEquipment(storage, defaultEquipment())
    expect(storage.data.get('mesowise.profile.v1')).toBe('x')
    expect(EQUIPMENT_KEY).toBe('mesowise.equipment.v1')
  })
})

describe('equipment per job', () => {
  // De Warrior (issue #42) en de Bowman (issue #44) hebben winkelitems; de Magician nog niets.
  const others: Job[] = ['magician']
  const slots = EQUIP_SLOTS.map((s) => s.slot)
  const storedFor = (data: Record<string, unknown>) => fakeStorage({ [EQUIPMENT_KEY]: JSON.stringify({ version: 1, slots: data }) })
  const thiefGear: Equipment = { claw: shop('Meba'), ammo: shop('Subi Throwing Stars'), hat: shop('Red Ghetto Beanie'), top: shop('Red Pao'), bottom: unknown, overall: unknown, shoes: shop('Blue Gidder Shoes') }

  it('heeft voor de Thief in elk slot een catalogus en voor een andere job niets, ook niet in de zoekbalk', () => {
    for (const s of slots) {
      expect(catalogItems(s, 'thief').length, s).toBeGreaterThan(0)
      for (const j of others) {
        expect(catalogItems(s, j), `${s} ${j}`).toEqual([])
        expect(searchCatalog(s, j, ''), `${s} ${j}`).toEqual([])
      }
    }
  })

  it('laadt een bewaarde Thief-keuze (ook een item zonder prijs, met eigen stat) voor de Thief', () => {
    const eq = loadEquipment(storedFor({ claw: { pick: 'Meba' }, hat: { pick: 'Red Ghetto Beanie', stat: '17' } }), 'thief')
    expect(eq.claw).toEqual(shop('Meba'))
    expect(eq.hat).toEqual(shop('Red Ghetto Beanie', '17'))
  })

  it('maakt een bewaarde Thief-keuze "nog niet ingevuld" voor een andere job, en houdt een eigen item', () => {
    const data = { claw: { pick: 'Meba' }, hat: { pick: 'Red Ghetto Beanie' }, top: { pick: 'none' }, bottom: { pick: 'other', name: 'Mijn broek', stat: '7' }, shoes: { pick: 'unknown' } }
    for (const j of others) {
      const eq = loadEquipment(storedFor(data), j)
      expect(eq.claw, j).toEqual(unknown)
      expect(eq.hat, j).toEqual(unknown)
      expect(eq.top, j).toEqual(unknown)
      expect(eq.bottom, j).toEqual(other('7', 'Mijn broek'))
      expect(eq.shoes, j).toEqual(unknown)
    }
  })

  it('laat een kapotte opslag voor elke job niets bekend geven', () => {
    for (const j of [...others, 'thief' as Job]) expect(loadEquipment(fakeStorage({ [EQUIPMENT_KEY]: '{kapot' }), j), j).toEqual(defaultEquipment())
  })

  it('zet bij een wissel naar een andere job elk catalogusitem op "nog niet ingevuld" en laat een eigen item staan', () => {
    const eq: Equipment = { ...thiefGear, bottom: other('7', 'Mijn broek') }
    for (const j of others) {
      const out = equipmentForJob(eq, j)
      for (const s of ['claw', 'ammo', 'hat', 'top', 'shoes'] as const) expect(out[s], `${s} ${j}`).toEqual(unknown)
      expect(out.bottom, j).toEqual(other('7', 'Mijn broek'))
    }
  })

  it('laat de equipment bij de Thief gelijk en past de invoer niet aan', () => {
    const copy = structuredClone(thiefGear)
    expect(equipmentForJob(thiefGear, 'thief')).toEqual(thiefGear)
    expect(thiefGear).toEqual(copy)
    expect(equipmentForJob(defaultEquipment(), 'warrior')).toEqual(defaultEquipment())
  })

  it('zet een keuze die niet bij het slot hoort ook op "nog niet ingevuld" voor de Thief', () => {
    expect(equipmentForJob({ ...defaultEquipment(), hat: shop('Red Pao') }, 'thief').hat).toEqual(unknown)
  })

  it('laat WDEF en WATK in het profiel staan als een jobwissel items op onbekend zet', () => {
    const after = equipmentForJob(thiefGear, 'warrior')
    let p = prof({ wdef: '60', clawWatk: '19' })
    for (const s of slots) p = applyEquipChange(p, s, thiefGear[s], after[s])
    expect(p.wdef).toBe('60')
    expect(p.clawWatk).toBe('19')
  })

  it('geeft na een jobwissel geen stat meer voor een item dat de job niet heeft', () => {
    const after = equipmentForJob(thiefGear, 'bowman')
    for (const s of slots) expect(wornStat(s, after[s]), s).toBeUndefined()
    expect(wornWdef(after)).toEqual({})
  })
})

describe('equipment voor een Warrior', () => {
  const slots = EQUIP_SLOTS.map((s) => s.slot)
  const stored = (data: Record<string, unknown>) => fakeStorage({ [EQUIPMENT_KEY]: JSON.stringify({ version: 1, slots: data }) })
  const thiefShop: Equipment = { claw: shop('Meba'), ammo: unknown, hat: shop('Red Thief Hood'), top: shop('Red Pao'), bottom: unknown, overall: unknown, shoes: shop('Blue Gidder Shoes') }
  const warriorShop: Equipment = { claw: shop('Gladius'), ammo: unknown, hat: shop('Bronze Full Helm'), top: unknown, bottom: unknown, overall: unknown, shoes: shop('Bronze Grieves') }

  describe('catalogItems voor een Warrior', () => {
    it('geeft bij Weapon de NPC-wapens van de Warrior, met naam, level en weapon attack (wapens zonder prijs zijn er sinds #55 niet)', () => {
      const items = catalogItems('claw', 'warrior')
      // De acht wapens zonder jobregel zijn sinds #55 NPC-wapens; de lijst zonder prijs is leeg.
      expect(WORN_WARRIOR_WEAPONS).toEqual([])
      expect(items.map((i) => i.name)).toEqual(NPC_WARRIOR_WEAPONS.map((w) => w.name))
      expect(items.find((i) => i.name === 'Long Sword')).toMatchObject({ level: 10, stat: 27, mult: expect.any(Number), attackMs: expect.any(Number) })
      expect(items.find((i) => i.name === 'Gladius')).toEqual({ name: 'Gladius', level: 30, stat: 47, attackMs: 720, mult: 1.8 })
      expect(items.find((i) => i.name === 'Wooden Sword')).toEqual({ name: 'Wooden Sword', level: 10, stat: 30, attackMs: 750, mult: 2.5 })
    })

    it('geeft bij Hat en Shoes de Warrior-armor, met WDEF als stat', () => {
      const hats = catalogItems('hat', 'warrior')
      const shoes = catalogItems('shoes', 'warrior')
      const names = (slot: 'hat' | 'shoes') => [...NPC_WARRIOR_ARMOR, ...WORN_WARRIOR_ARMOR].filter((a) => a.slot === slot).map((a) => a.name)
      expect(hats.map((i) => i.name)).toEqual(names('hat'))
      expect(shoes.map((i) => i.name)).toEqual(names('shoes'))
      expect(hats.find((i) => i.name === 'Bronze Full Helm')).toEqual({ name: 'Bronze Full Helm', level: 15, stat: 26 })
      expect(shoes.find((i) => i.name === 'Brown High Boots')).toEqual({ name: 'Brown High Boots', level: 20, stat: 21 })
    })

    it('geeft een Warrior tops en broeken: de items zonder prijs, zonder eisen', () => {
      for (const slot of ['top', 'bottom'] as const) {
        expect(catalogItems(slot, 'warrior').map((i) => i.name), slot).toEqual(WORN_WARRIOR_ARMOR.filter((a) => a.slot === slot).map((a) => a.name))
        expect(catalogItems(slot, 'warrior').length, slot).toBeGreaterThan(0)
      }
    })

    it('deelt de items zonder jobregel met de Thief: dezelfde rijen, niet gekopieerd', () => {
      const skullcap = WORN_ARMOR.find((a) => a.name === 'Brown Skullcap')
      expect(skullcap).toBeDefined()
      expect(WORN_WARRIOR_ARMOR.find((a) => a.name === 'Brown Skullcap')).toBe(skullcap)
      // Elk gedeeld id vindt zijn rij: een gewijzigde bron-URL laat een item anders stil uit de Warrior-lijst vallen.
      // 46: de White Bandana (719) is sinds #55 een NPC-item, ook in NPC_WARRIOR_ARMOR.
      expect(COMMON_WORN_ARMOR).toHaveLength(46)
      for (const a of COMMON_WORN_ARMOR) expect(WORN_ARMOR).toContain(a)
    })

    it('laat de Thief-lijsten zoals main ze heeft (de NPC-items blijven erin)', () => {
      expect(catalogItems('claw', 'thief').map((i) => i.name)).toEqual(expect.arrayContaining(NPC_CLAWS.map((c) => c.name)))
      expect(catalogItems('top', 'thief').length).toBeGreaterThan(0)
      expect(catalogItems('hat', 'thief').map((i) => i.name)).toContain('Red Thief Hood')
    })

    it('geeft de Magician nog niets', () => {
      for (const s of slots) expect(catalogItems(s, 'magician'), s).toEqual([])
    })

    it('heeft geen dubbele namen in een lijst en geen naam die bij de Thief en de Warrior een ander item is', () => {
      // De keuze in het scherm wordt bewaard op naam, dus een dubbele naam zou het verkeerde item geven.
      for (const s of slots) {
        const warrior = catalogItems(s, 'warrior').map((i) => i.name)
        const thief = catalogItems(s, 'thief').map((i) => i.name)
        expect(new Set(warrior).size, `warrior ${s}`).toBe(warrior.length)
        expect(new Set(thief).size, `thief ${s}`).toBe(thief.length)
        // Een gedeelde naam mag alleen als het hetzelfde item is: dezelfde stat, level en snelheid.
        const thiefItems = catalogItems(s, 'thief')
        for (const w of catalogItems(s, 'warrior')) {
          const t = thiefItems.find((i) => i.name === w.name)
          if (t) expect(t, `${s} ${w.name}`).toEqual(w)
        }
      }
      // Ook over de slots heen: wornStat zoekt per slot, maar een naam in twee slots zou verwarren.
      const allWarrior = slots.flatMap((s) => catalogItems(s, 'warrior').map((i) => i.name))
      expect(new Set(allWarrior).size).toBe(allWarrior.length)
    })
  })

  describe('wornStat en wornWdef', () => {
    it('geven de WATK en WDEF van een Warrior-winkelitem', () => {
      expect(wornStat('claw', shop('Gladius'))).toBe(47)
      expect(wornStat('hat', shop('Bronze Full Helm'))).toBe(26)
      expect(wornStat('shoes', shop('Bronze Grieves'))).toBe(18)
      expect(wornWdef(warriorShop)).toEqual({ hat: 26, shoes: 18 })
    })

    it('geven nog steeds die van een Thief-winkelitem', () => {
      expect(wornStat('claw', shop('Meba'))).toBe(19)
      expect(wornStat('hat', shop('Red Thief Hood'))).toBe(NPC_ARMOR.find((a) => a.name === 'Red Thief Hood')!.wdef)
    })

    it('geven undefined voor een naam die in dat slot niet bestaat', () => {
      expect(wornStat('hat', shop('Gladius'))).toBeUndefined()
      expect(wornStat('claw', shop('Bronze Full Helm'))).toBeUndefined()
    })
  })

  describe('applyEquipChange', () => {
    const w = prof({ clawWatk: '30', attackMs: '750', weaponMult: '1.8', wdef: '60' })

    it('zet bij een zwaard weapon attack, tijd per aanval en multiplier (Gladius: 47, 720 ms, 1,8)', () => {
      expect(applyEquipChange(w, 'claw', unknown, shop('Gladius'))).toEqual({ ...w, clawWatk: '47', attackMs: '720', weaponMult: '1.8' })
    })

    it('zet bij een bijl de gemiddelde multiplier van zwaai en steek (Fireman Axe: 0,6 × 2,4 + 0,4 × 1,2 = 1,92)', () => {
      const out = applyEquipChange(w, 'claw', shop('Gladius'), shop("Fireman's Axe"))
      expect(out).toMatchObject({ clawWatk: '47', attackMs: '720', weaponMult: '1.92' })
    })

    it('zet bij een spear en een polearm ook het gemiddelde van de tijd van zwaai en steek', () => {
      // Spear (lv 10): 0,6 × 870 + 0,4 × 810 = 846 ms; multiplier 0,6 × 1,5 + 0,4 × 3,5 = 2,3.
      expect(applyEquipChange(w, 'claw', unknown, shop('Spear'))).toMatchObject({ clawWatk: '32', attackMs: '846', weaponMult: '2.3' })
      // Pole Arm (lv 10, Slow 8): 0,6 × 900 + 0,4 × 870 = 888 ms; multiplier 0,6 × 3,5 + 0,4 × 1,5 = 2,7.
      expect(applyEquipChange(w, 'claw', unknown, shop('Pole Arm'))).toMatchObject({ clawWatk: '35', attackMs: '888', weaponMult: '2.7' })
    })

    it('laat WDEF en de rest van het profiel staan bij een wapenwissel', () => {
      const out = applyEquipChange(w, 'claw', unknown, shop('Gladius'))
      expect(out.wdef).toBe('60')
      expect(out.level).toBe(w.level)
      expect(out.str).toBe(w.str)
    })

    it('laat bij een Thief-claw de weapon multiplier staan (de Thief heeft er geen)', () => {
      const out = applyEquipChange({ ...w, weaponMult: '2.6' }, 'claw', unknown, shop('Meba'))
      expect(out.weaponMult).toBe('2.6')
      expect(out.clawWatk).toBe('19')
    })

    it('laat bij een eigen item de aanvalssnelheid en de multiplier staan', () => {
      const a = applyEquipChange({ ...w, weaponMult: '2.4' }, 'claw', shop('Gladius'), other('50'))
      expect(a).toMatchObject({ clawWatk: '50', attackMs: '750', weaponMult: '2.4' })
      const b = applyEquipChange({ ...w, weaponMult: '2.4' }, 'claw', shop('Gladius'), zero)
      expect(b).toMatchObject({ clawWatk: '0', attackMs: '750', weaponMult: '2.4' })
    })

    it('laat bij alleen een correctie van de WATK van hetzelfde wapen de aanvalssnelheid en de multiplier staan', () => {
      const own = { ...w, attackMs: '700', weaponMult: '2.1' }
      const out = applyEquipChange(own, 'claw', shop('Gladius'), shop('Gladius', '50'))
      expect(out).toMatchObject({ clawWatk: '50', attackMs: '700', weaponMult: '2.1' })
    })

    it('telt bij Warrior-armor alleen het verschil in WDEF (Bronze Full Helm 26 naar Bronze Football Helmet 30: +4)', () => {
      expect(applyEquipChange(w, 'hat', shop('Bronze Full Helm'), shop('Bronze Football Helmet')).wdef).toBe('64')
      expect(applyEquipChange(w, 'shoes', zero, shop('Brown High Boots')).wdef).toBe('81')
    })
  })

  describe('equipmentForJob en loadEquipment', () => {
    it('zet bij een wissel van Thief naar Warrior elke Thief-catalogusitem op "nog niet ingevuld" en laat de rest staan', () => {
      const eq: Equipment = { ...thiefShop, top: zero, bottom: other('7', 'Mijn broek') }
      const out = equipmentForJob(eq, 'warrior')
      expect(out.claw).toEqual(unknown)
      expect(out.hat).toEqual(unknown)
      expect(out.shoes).toEqual(unknown)
      expect(out.top).toEqual(zero)
      expect(out.bottom).toEqual(other('7', 'Mijn broek'))
    })

    it('houdt een Warrior-winkelkeuze bij een Warrior, en zet hem bij een wissel naar de Thief op "nog niet ingevuld"', () => {
      expect(equipmentForJob(warriorShop, 'warrior')).toEqual(warriorShop)
      const out = equipmentForJob(warriorShop, 'thief')
      expect(out.claw).toEqual(unknown)
      expect(out.hat).toEqual(unknown)
      expect(out.shoes).toEqual(unknown)
    })

    it('laat een Warrior-winkelkeuze voor Magician en Bowman ook "nog niet ingevuld" zijn', () => {
      for (const j of ['magician', 'bowman'] as const) {
        const out = equipmentForJob(warriorShop, j)
        for (const s of slots) expect(out[s], `${j} ${s}`).toEqual(unknown)
      }
    })

    it('laadt een bewaarde Warrior-winkelkeuze voor een Warrior en niet voor een Thief', () => {
      const data = { claw: { pick: 'Gladius' }, hat: { pick: 'Bronze Full Helm' }, shoes: { pick: 'Bronze Grieves' } }
      const eq = loadEquipment(stored(data), 'warrior')
      expect(eq.claw).toEqual(shop('Gladius'))
      expect(eq.hat).toEqual(shop('Bronze Full Helm'))
      expect(eq.shoes).toEqual(shop('Bronze Grieves'))
      const t = loadEquipment(stored(data), 'thief')
      expect(t.claw).toEqual(unknown)
      expect(t.hat).toEqual(unknown)
    })

    it('laadt een bewaarde Thief-winkelkeuze niet voor een Warrior', () => {
      const eq = loadEquipment(stored({ claw: { pick: 'Meba' }, top: { pick: 'Red Pao' } }), 'warrior')
      expect(eq.claw).toEqual(unknown)
      expect(eq.top).toEqual(unknown)
    })

    it('bewaart en laadt de Warrior-equipment heen en terug', () => {
      const storage = fakeStorage()
      expect(saveEquipment(storage, warriorShop)).toBe(true)
      expect(loadEquipment(storage, 'warrior')).toEqual(warriorShop)
    })
  })
})

describe('het ammo-slot (issue #65)', () => {
  const prof = (patch: Partial<ProfileDraft> = {}): ProfileDraft => ({ ...DEFAULT_PROFILE, ...patch })

  it('heeft voor de Thief alle stars uit de lijst, met hun weapon attack en level', () => {
    expect(catalogItems('ammo', 'thief').map((i) => i.name)).toEqual(THROWING_STARS.map((t) => t.name))
    expect(catalogItems('ammo', 'thief').find((i) => i.name === 'Wolbi Throwing Stars')).toEqual({ name: 'Wolbi Throwing Stars', level: 10, stat: 17 })
  })

  it('heeft voor de Bowman de pijlen, zonder level', () => {
    expect(catalogItems('ammo', 'bowman').map((i) => i.name)).toEqual(NPC_ARROWS.map((a) => a.name))
    expect(catalogItems('ammo', 'bowman')[0].level).toBeUndefined()
  })

  it('is er alleen voor de Thief en de Bowman: een Warrior of Magician gooit niets', () => {
    expect(slotsFor('thief').map((s) => s.slot)).toContain('ammo')
    expect(slotsFor('bowman').map((s) => s.slot)).toContain('ammo')
    expect(slotsFor('warrior').map((s) => s.slot)).not.toContain('ammo')
    expect(slotsFor('magician').map((s) => s.slot)).toEqual(['claw', 'hat', 'top', 'bottom', 'overall', 'shoes'])
  })

  it('heet voor elke job Ammo, en is als enige slot optioneel', () => {
    expect(slotLabel('ammo')).toBe('Ammo')
    expect(slotLabel('claw')).toBe('Weapon')
    expect(EQUIP_SLOTS.filter((s) => isOptionalSlot(s.slot)).map((s) => s.slot)).toEqual(['ammo'])
  })

  it('zet bij een andere star zijn weapon attack en herlaadprijs in het profiel', () => {
    const p = applyEquipChange(prof(), 'ammo', unknown, shop('Tobi Throwing Stars'))
    expect(p.starWatk).toBe('23')
    expect(p.starRecharge).toBe('0.7')
    expect(p.clawWatk).toBe(DEFAULT_PROFILE.clawWatk)
  })

  it('zet bij een gecorrigeerde weapon attack van dezelfde star alleen de weapon attack', () => {
    const p = applyEquipChange(prof({ starRecharge: '0.4' }), 'ammo', shop('Wolbi Throwing Stars'), shop('Wolbi Throwing Stars', '18'))
    expect(p.starWatk).toBe('18')
    expect(p.starRecharge).toBe('0.4')
  })

  it('laat bij een eigen star de herlaadprijs staan: die weet de app niet', () => {
    const p = applyEquipChange(prof(), 'ammo', unknown, other('20', 'Mijn stars'))
    expect(p.starWatk).toBe('20')
    expect(p.starRecharge).toBe(DEFAULT_PROFILE.starRecharge)
  })

  it('verandert niets aan het profiel bij pijlen: de Bowman rekent altijd met de gewone pijl (zie parseProfile)', () => {
    expect(applyEquipChange(prof(), 'ammo', unknown, shop('Arrows for Bows'))).toEqual(prof())
  })

  it('geeft stars WATK (ATT) en geen WDEF', () => {
    expect(statName('ammo')).toBe('ATT')
    expect(wornWdef({ ...defaultEquipment(), ammo: shop('Ilbi Throwing Stars') })).toEqual({})
    expect(wornStat('ammo', shop('Ilbi Throwing Stars'))).toBe(27)
  })

  it('laat een bewaarde star staan voor de Thief en maakt hem "nog niet ingevuld" voor een Bowman', () => {
    const storage = fakeStorage({ [EQUIPMENT_KEY]: JSON.stringify({ version: 1, slots: { ammo: { pick: 'Kumbi Throwing Stars' } } }) })
    expect(loadEquipment(storage, 'thief').ammo).toEqual(shop('Kumbi Throwing Stars'))
    expect(loadEquipment(storage, 'bowman').ammo).toEqual(unknown)
  })

  it('geeft een oude opslag zonder ammo-slot een leeg ammo-slot', () => {
    const storage = fakeStorage({ [EQUIPMENT_KEY]: JSON.stringify({ version: 1, slots: { claw: { pick: 'Meba' } } }) })
    expect(loadEquipment(storage, 'thief').ammo).toEqual(unknown)
  })
})

describe('overall (issue #50)', () => {
  const robe = shop('Blue Sauna Robe') // overall, WDEF 75
  const worn = (over: Partial<Equipment>): Equipment => ({ ...defaultEquipment(), ...over })

  it('zoekt de Sauna Robe in het overall-slot, en nergens anders', () => {
    expect(searchCatalog('overall', 'thief', 'sauna').map((i) => [i.name, i.level, i.stat])).toEqual([['Blue Sauna Robe', 30, 75]])
    expect(catalogItems('top', 'thief').map((i) => i.name)).not.toContain('Blue Sauna Robe')
    expect(catalogItems('overall', 'warrior').map((i) => i.name)).toEqual(['Blue Sauna Robe'])
    expect(catalogItems('overall', 'magician')).toEqual([])
    expect(slotLabel('overall')).toBe('Overall')
    expect(slotsFor('thief').map((s) => s.slot)).toContain('overall')
  })

  it('weet welke slots een nieuw stuk vervangt', () => {
    expect(displacedSlots(worn({}), 'overall')).toEqual(['top', 'bottom'])
    expect(displacedSlots(worn({ overall: robe }), 'overall')).toEqual(['overall'])
    expect(displacedSlots(worn({}), 'top')).toEqual(['top'])
    expect(displacedSlots(worn({ overall: robe }), 'bottom')).toEqual(['overall'])
    expect(displacedSlots(worn({}), 'hat')).toEqual(['hat'])
  })

  it('een overall kiezen leegt top en bottom, en de WDEF telt een keer: 60 - 32 - 23 + 75', () => {
    const eq = worn({ top: shop('Red Pao'), bottom: shop('Red Pao Bottoms'), hat: shop('Red Ghetto Beanie') })
    const r = changeEquipment(prof({ wdef: '60' }), eq, 'overall', robe)
    expect(r.equipment.overall).toEqual(robe)
    expect(r.equipment.top).toEqual(unknown)
    expect(r.equipment.bottom).toEqual(unknown)
    expect(r.equipment.hat).toEqual(eq.hat)
    expect(r.profile.wdef).toBe('80')
    expect(wornWdef(r.equipment)).toEqual({ hat: 15, overall: 75 })
  })

  it('een top of bottom kiezen terwijl je een overall draagt, leegt de overall: 100 - 75 + 32', () => {
    const eq = worn({ overall: robe })
    for (const slot of ['top', 'bottom'] as const) {
      const after = shop(slot === 'top' ? 'Red Pao' : 'Red Pao Bottoms')
      const r = changeEquipment(prof({ wdef: '100' }), eq, slot, after)
      expect(r.equipment.overall, slot).toEqual(unknown)
      expect(r.equipment[slot], slot).toEqual(after)
      expect(r.profile.wdef, slot).toBe(String(100 - 75 + (slot === 'top' ? 32 : 23)))
    }
  })

  it('laat de WDEF staan als een vervangen slot nog niet is ingevuld (de app weet dan niet wat eraf moet)', () => {
    const half = worn({ top: shop('Red Pao') }) // bottom nog leeg
    const r = changeEquipment(prof({ wdef: '60' }), half, 'overall', robe)
    expect(r.profile.wdef).toBe('60')
    expect(r.equipment.top).toEqual(unknown)
    expect(changeEquipment(prof({ wdef: '60' }), worn({}), 'overall', robe).profile.wdef).toBe('60')
    expect(changeEquipment(prof({ wdef: '60' }), worn({ top: other('', 'Ding'), bottom: shop('Red Pao Bottoms') }), 'overall', robe).profile.wdef).toBe('60')
  })

  it('past bij een overall wisselen alleen het verschil toe, en corrigeert een eigen stat zonder top en bottom te raken', () => {
    const eq = worn({ overall: robe })
    expect(changeEquipment(prof({ wdef: '100' }), eq, 'overall', other('80', 'Ander')).profile.wdef).toBe('105')
    const fixed = changeEquipment(prof({ wdef: '100' }), eq, 'overall', { ...robe, stat: '70' })
    expect(fixed.profile.wdef).toBe('95')
    expect(fixed.equipment.top).toEqual(unknown)
  })

  it('gedraagt zich voor shoes en de claw als applyEquipChange', () => {
    const eq = worn({ shoes: shop('Blue Gidder Shoes'), claw: shop('Meba') })
    const p = prof({ wdef: '50', clawWatk: '10' })
    const shoes = shop('Red Enamel Boots')
    expect(changeEquipment(p, eq, 'shoes', shoes)).toEqual({ equipment: { ...eq, shoes }, profile: applyEquipChange(p, 'shoes', eq.shoes, shoes) })
    const claw = shop('Mithril Titans')
    expect(changeEquipment(p, eq, 'claw', claw).profile).toEqual(applyEquipChange(p, 'claw', eq.claw, claw))
  })

  it('laadt opslag van voor de overall zonder overall-slot als leeg, en bewaart en laadt een overall heen en terug', () => {
    const old = fakeStorage({ [EQUIPMENT_KEY]: JSON.stringify({ version: 1, slots: { top: { pick: 'Red Pao' }, bottom: { pick: 'Red Pao Bottoms' } } }) })
    const loaded = loadEquipment(old, 'thief')
    expect(loaded.overall).toEqual(unknown)
    expect(loaded.top).toEqual(shop('Red Pao'))
    const storage = fakeStorage()
    const eq = worn({ overall: robe, hat: shop('Red Ghetto Beanie') })
    expect(saveEquipment(storage, eq)).toBe(true)
    expect(loadEquipment(storage, 'thief')).toEqual(eq)
  })

  it('laat bij opslag met een overall naast een top de overall winnen', () => {
    const storage = fakeStorage({ [EQUIPMENT_KEY]: JSON.stringify({ version: 1, slots: { overall: { pick: 'Blue Sauna Robe' }, top: { pick: 'Red Pao' } } }) })
    const eq = loadEquipment(storage, 'thief')
    expect(eq.overall).toEqual(robe)
    expect(eq.top).toEqual(unknown)
  })

  it('zet een overall op "nog niet ingevuld" bij een jobwissel naar een job zonder itemdata', () => {
    expect(equipmentForJob(worn({ overall: robe }), 'magician').overall).toEqual(unknown)
  })
})

describe('overall (issue #50): randgevallen van de WDEF-rekensom en het laden', () => {
  const robe = shop('Blue Sauna Robe') // WDEF 75
  const worn = (over: Partial<Equipment>): Equipment => ({ ...defaultEquipment(), ...over })
  const pao = shop('Red Pao') // top, 32
  const paoBottoms = shop('Red Pao Bottoms') // bottom, 23

  it('de overall terugzetten naar nog niet ingevuld laat de WDEF staan (zoals bij elk slot: onbekend is geen uitdoen), en raakt top en bottom niet', () => {
    const r = changeEquipment(prof({ wdef: '100' }), worn({ overall: robe }), 'overall', unknown)
    expect(r.profile.wdef).toBe('100')
    expect(r.equipment).toEqual(worn({}))
  })

  it('een top of bottom uitdoen terwijl je een overall draagt, laat overall en WDEF staan', () => {
    const eq = worn({ overall: robe })
    for (const slot of ['top', 'bottom'] as const) {
      const r = changeEquipment(prof({ wdef: '100' }), eq, slot, unknown)
      expect(r.equipment, slot).toEqual(eq)
      expect(r.profile.wdef, slot).toBe('100')
    }
  })

  it('terugwisselen overall -> top -> overall: de vrijgekomen bottom is bekend leeg (0), dus de WDEF klopt weer: 60 -> 80 -> 37 -> 80', () => {
    const a = changeEquipment(prof({ wdef: '60' }), worn({ top: pao, bottom: paoBottoms }), 'overall', robe)
    expect(a.profile.wdef).toBe('80') // 60 - 32 - 23 + 75
    const b = changeEquipment(a.profile, a.equipment, 'top', pao)
    expect(b.profile.wdef).toBe('37') // 80 - 75 + 32
    expect(b.equipment).toEqual(worn({ top: pao, bottom: { pick: 'empty', name: '', stat: '' } }))
    const c = changeEquipment(b.profile, b.equipment, 'overall', robe)
    expect(c.profile.wdef).toBe('80') // 37 - 32 - 0 + 75
  })

  it('een eigen overall met stat telt mee, en een eigen overall zonder getal laat de WDEF staan, in beide richtingen', () => {
    const own = other('50', 'Mijn Robe')
    expect(changeEquipment(prof({ wdef: '100' }), worn({ top: pao, bottom: paoBottoms }), 'overall', own).profile.wdef).toBe('95')
    const blank = other('', 'Mijn Robe')
    expect(changeEquipment(prof({ wdef: '100' }), worn({ top: pao, bottom: paoBottoms }), 'overall', blank).profile.wdef).toBe('100')
    const back = changeEquipment(prof({ wdef: '100' }), worn({ overall: blank }), 'top', pao)
    expect(back.profile.wdef).toBe('100')
    expect(back.equipment.overall).toEqual(unknown)
  })

  it('laat de WDEF staan bij een niet-numerieke WDEF in het profiel, maar vult de slots wel', () => {
    for (const wdef of ['', 'abc', '-5', '12.5']) {
      const r = changeEquipment(prof({ wdef }), worn({ top: pao, bottom: paoBottoms }), 'overall', robe)
      expect(r.profile.wdef, wdef).toBe(wdef)
      expect(r.equipment.overall, wdef).toEqual(robe)
      expect(r.equipment.top, wdef).toEqual(unknown)
    }
  })

  it('wijzigt het profiel of de equipment die je meegeeft niet', () => {
    expect(changeEquipment(prof({ wdef: '10' }), worn({ overall: robe }), 'overall', other('0', 'x')).profile.wdef).toBe('0') // niet onder 0
    const eq = worn({ top: pao, bottom: paoBottoms })
    const p = prof({ wdef: '60' })
    const eqCopy = JSON.parse(JSON.stringify(eq))
    changeEquipment(p, eq, 'overall', robe)
    expect(eq).toEqual(eqCopy)
    expect(p.wdef).toBe('60')
  })

  it('een hat erin terwijl je een overall draagt raakt de overall niet', () => {
    const r = changeEquipment(prof({ wdef: '100' }), worn({ overall: robe }), 'hat', shop('Red Ghetto Beanie'))
    expect(r.equipment.overall).toEqual(robe)
  })

  it('laadt oude opslag (zonder overall-slot, of met rommel erin) zonder fout en zonder overall', () => {
    for (const overall of [undefined, null, 5, 'Blue Sauna Robe', { pick: 'Bestaat Niet' }, { pick: 42 }, []]) {
      const slots: Record<string, unknown> = { hat: { pick: 'Red Ghetto Beanie' }, top: { pick: 'Red Pao' } }
      if (overall !== undefined) slots.overall = overall
      const eq = loadEquipment(stored(slots), 'thief')
      expect(eq.overall, JSON.stringify(overall)).toEqual(unknown)
      expect(eq.top, JSON.stringify(overall)).toEqual(pao)
      expect(eq.hat.pick).toBe('Red Ghetto Beanie')
    }
  })

  it('laat een eigen overall naast een bottom de overall laten winnen, en laadt een Sauna Robe voor een magician als leeg', () => {
    const eq = loadEquipment(stored({ overall: { pick: 'other', name: 'Mijn Robe', stat: '50' }, bottom: { pick: 'Red Pao Bottoms' } }), 'thief')
    expect(eq.overall).toEqual(other('50', 'Mijn Robe'))
    expect(eq.bottom).toEqual(unknown)
    expect(loadEquipment(stored({ overall: { pick: 'Blue Sauna Robe' } }), 'magician').overall).toEqual(unknown)
  })

  it('wornWdef telt een overall mee als eigen slot', () => {
    expect(wornWdef(worn({ overall: robe, shoes: zero }))).toEqual({ overall: 75, shoes: 0 })
    expect(wornWdef(worn({ overall: other('', 'Robe') }))).toEqual({})
  })
})

describe('equipment voor een Bowman', () => {
  const slots = EQUIP_SLOTS.map((s) => s.slot)
  const bowmanGear: Equipment = { claw: shop('Balanche'), ammo: shop('Arrows for Crossbows'), hat: shop('Hunter'), top: unknown, bottom: unknown, overall: unknown, shoes: shop('Hard Leather Boots') }

  it('geeft bij Weapon alle 10 bogen en kruisbogen, op level, met weapon attack en tijd per aanval maar zonder multiplier', () => {
    const items = catalogItems('claw', 'bowman')
    expect(items).toHaveLength(NPC_BOWMAN_WEAPONS.length)
    expect(items.map((i) => i.level)).toEqual([...items.map((i) => i.level!)].sort((a, b) => a - b))
    expect(items.find((i) => i.name === 'War Bow')).toEqual({ name: 'War Bow', level: 10, stat: 30, attackMs: 810 })
    expect(items.find((i) => i.name === 'Battle Bow')).toEqual({ name: 'Battle Bow', level: 25, stat: 44, attackMs: 750 })
    expect(items.find((i) => i.name === 'Eagle Crow')).toEqual({ name: 'Eagle Crow', level: 30, stat: 52, attackMs: 870 })
    // De Balanche heeft 840 ms, niet de 810 van de gedeelde tabel voor Normal (6) (issue #44).
    expect(items.find((i) => i.name === 'Balanche')).toEqual({ name: 'Balanche', level: 20, stat: 39, attackMs: 840 })
  })

  it('geeft bij Hat, Top, Bottom en Shoes de Bowman-armor en de items zonder jobregel, met WDEF als stat', () => {
    for (const slot of ['hat', 'top', 'bottom', 'shoes'] as const) {
      const names = catalogItems(slot, 'bowman').map((i) => i.name)
      for (const a of NPC_BOWMAN_ARMOR.filter((x) => x.slot === slot)) expect(names, a.name).toContain(a.name)
    }
    expect(catalogItems('hat', 'bowman').find((i) => i.name === 'Hunter')).toEqual({ name: 'Hunter', level: 25, stat: 24 })
    expect(catalogItems('top', 'bowman').find((i) => i.name === "Hunter's Armor / Huntress Armor")).toEqual({ name: "Hunter's Armor / Huntress Armor", level: 30, stat: 40 })
  })

  it('heeft geen mannen-only items van de Warrior (#55)', () => {
    const all = slots.flatMap((s) => catalogItems(s, 'bowman').map((i) => i.name))
    for (const n of ['Brown Lolico Armor', 'Blue Sergeant', 'Red Hwarang Shirt']) expect(all).not.toContain(n)
  })

  it('heeft geen dubbele namen, en een naam die ook bij een andere job staat is hetzelfde item', () => {
    for (const s of slots) {
      const bowman = catalogItems(s, 'bowman')
      expect(new Set(bowman.map((i) => i.name)).size, s).toBe(bowman.length)
      for (const other of ['thief', 'warrior'] as const) {
        for (const i of catalogItems(s, other)) {
          const b = bowman.find((x) => x.name === i.name)
          if (b) expect(b, `${s} ${i.name} (${other})`).toEqual(i)
        }
      }
    }
    const everything = slots.flatMap((s) => catalogItems(s, 'bowman').map((i) => i.name))
    expect(new Set(everything).size).toBe(everything.length)
  })

  it('geeft de WATK en WDEF van een Bowman-winkelitem', () => {
    expect(wornStat('claw', shop('Balanche'))).toBe(39)
    expect(wornStat('hat', shop('Hunter'))).toBe(24)
    expect(wornStat('shoes', shop('Hard Leather Boots'))).toBe(10)
    expect(wornWdef(bowmanGear)).toEqual({ hat: 24, shoes: 10 })
    expect(wornStat('ammo', shop('Arrows for Crossbows'))).toBe(0)
  })

  it('zet bij een boog weapon attack en tijd per aanval, en laat de weapon multiplier staan (die heeft een Bowman niet)', () => {
    const p = prof({ clawWatk: '5', attackMs: '999', weaponMult: '1.8' })
    expect(applyEquipChange(p, 'claw', unknown, shop('Balanche'))).toEqual({ ...p, clawWatk: '39', attackMs: '840' })
    expect(applyEquipChange(p, 'claw', unknown, shop('War Bow'))).toEqual({ ...p, clawWatk: '30', attackMs: '810' })
  })

  it('verschuift de WDEF met het verschil tussen het oude en het nieuwe stuk (Hunter 24 voor Feather Hat 18)', () => {
    const p = prof({ wdef: '100' })
    expect(applyEquipChange(p, 'hat', shop('Feather Hat'), shop('Hunter')).wdef).toBe('106')
  })

  it('laat een Thief- of Warrior-keuze voor een Bowman "nog niet ingevuld" zijn, en een Bowman-keuze voor die jobs ook', () => {
    const thief: Equipment = { ...defaultEquipment(), claw: shop('Meba'), ammo: shop('Subi Throwing Stars') }
    const afterThief = equipmentForJob(thief, 'bowman')
    expect(afterThief.claw).toEqual(unknown)
    expect(afterThief.ammo).toEqual(unknown)
    const afterBowman = equipmentForJob(bowmanGear, 'thief')
    expect(afterBowman.claw).toEqual(unknown)
    expect(afterBowman.ammo).toEqual(unknown)
    expect(afterBowman.hat).toEqual(unknown)
    expect(equipmentForJob(bowmanGear, 'bowman')).toEqual(bowmanGear)
  })

  it('laadt een bewaarde Bowman-keuze voor een Bowman en niet voor een Thief', () => {
    const storage = fakeStorage({ [EQUIPMENT_KEY]: JSON.stringify({ version: 1, slots: { claw: { pick: 'Balanche' }, ammo: { pick: 'Arrows for Bows' } } }) })
    const eq = loadEquipment(storage, 'bowman')
    expect(eq.claw).toEqual(shop('Balanche'))
    expect(eq.ammo).toEqual(shop('Arrows for Bows'))
    expect(loadEquipment(storage, 'thief').claw).toEqual(unknown)
  })
})
