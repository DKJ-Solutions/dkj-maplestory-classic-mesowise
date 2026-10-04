import { describe, expect, it } from 'vitest'
import {
  applyEquipChange,
  catalogItems,
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
  statOverride,
  wornName,
  wornStat,
  wornSummary,
  wornWdef,
  type EquipEntry,
  type Equipment,
} from './equipment'
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
  it('begint met vijf slots die allemaal nog niet zijn ingevuld', () => {
    const eq = defaultEquipment()
    expect(Object.keys(eq).sort()).toEqual(['bottom', 'claw', 'hat', 'shoes', 'top'])
    for (const { slot } of EQUIP_SLOTS) expect(eq[slot]).toEqual(unknown)
    expect(wornWdef(eq)).toEqual({})
    expect(wornSummary(eq)).toEqual([])
  })

  it('geeft per slot de catalogusitems met de juiste stat (WATK voor de claw, WDEF voor armor)', () => {
    expect(catalogItems('claw').find((i) => i.name === 'Meba')).toMatchObject({ level: 25, stat: 19, attackMs: 660 })
    const shoes = catalogItems('shoes').map((i) => i.name)
    expect(shoes.slice(0, 3)).toEqual(['Blue Gidder Shoes', 'Red Ninja Sandals', 'Red Enamel Boots'])
    expect(shoes).toContain('Leather Sandals')
    expect(catalogItems('shoes').find((i) => i.name === 'Bronze Aroa Boots')).toMatchObject({ level: 16, stat: 13 })
    expect(catalogItems('claw').find((i) => i.name === 'Mithril Guards')).toMatchObject({ level: 30, stat: 23, attackMs: 720 })
    expect(catalogItems('hat').find((i) => i.name === 'Red Thief Hood')?.stat).toBe(18)
  })
})

describe('searchCatalog', () => {
  const names = (slot: Parameters<typeof searchCatalog>[0], q: string) => searchCatalog(slot, q).map((i) => i.name)

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
    expect(searchCatalog('hat', 'pao')).toEqual([])
    expect(searchCatalog('shoes', '')).toEqual(catalogItems('shoes'))
    expect(catalogItems('shoes').length).toBeGreaterThan(3)
    expect(names('bottom', 'qi pao skirt')).toEqual(['Red Qi Pao Skirt', 'Blue Qi Pao Skirt'])
    expect(searchCatalog('top', 'bestaat niet')).toEqual([])
  })

  it('geeft elke naam in een slot één keer, en de NPC-stat wint bij dezelfde naam', () => {
    for (const { slot } of EQUIP_SLOTS) {
      const all = catalogItems(slot).map((i) => i.name)
      expect(new Set(all).size, slot).toBe(all.length)
    }
    expect(catalogItems('top').filter((i) => i.name === 'Red Pao')).toEqual([expect.objectContaining({ stat: 32 })])
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

describe('wornWdef, wornName en wornSummary', () => {
  const eq: Equipment = {
    claw: shop('Meba'),
    hat: unknown,
    top: shop('Red Pao'),
    bottom: unknown,
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

  it('maakt de samenvatting in schermvolgorde zonder de slots die nog niet zijn ingevuld', () => {
    expect(wornSummary(eq)).toEqual(['Meba', 'Red Pao', 'Mijn laarzen'])
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
      hat: other('5', 'Mijn muts'),
      top: other('0', 'Startshirt'),
      bottom: unknown,
      shoes: shop('Red Ninja Sandals'),
    }
    expect(saveEquipment(storage, eq)).toBe(true)
    expect(loadEquipment(storage)).toEqual(eq)
    expect(storage.data.has('mesowise.equipment.v1')).toBe(true)
  })

  it('geeft zonder of met kapotte opslag niets bekend', () => {
    expect(loadEquipment(null)).toEqual(defaultEquipment())
    expect(loadEquipment(undefined)).toEqual(defaultEquipment())
    expect(loadEquipment(fakeStorage())).toEqual(defaultEquipment())
    expect(loadEquipment(fakeStorage({ [EQUIPMENT_KEY]: '{kapot' }))).toEqual(defaultEquipment())
    expect(loadEquipment(fakeStorage({ [EQUIPMENT_KEY]: '' }))).toEqual(defaultEquipment())
  })

  it('geeft niets bekend bij JSON van een verkeerde vorm', () => {
    const raws = ['null', '5', '"tekst"', '[]', 'true', '{}', JSON.stringify({ version: 1 }), JSON.stringify({ version: 1, slots: null }), JSON.stringify({ version: 1, slots: 'x' })]
    for (const raw of raws) expect(loadEquipment(fakeStorage({ [EQUIPMENT_KEY]: raw })), raw).toEqual(defaultEquipment())
  })

  it('geeft niets bekend bij een verkeerde of ontbrekende versie, ook als de slots goed zijn', () => {
    const slots = { top: { pick: 'Red Pao' } }
    for (const v of [2, 0, '1', null]) expect(loadEquipment(stored(slots, v)), String(v)).toEqual(defaultEquipment())
    expect(loadEquipment(fakeStorage({ [EQUIPMENT_KEY]: JSON.stringify({ slots }) }))).toEqual(defaultEquipment())
  })

  it('houdt een goed slot en maakt een rommelig slot "nog niet ingevuld"', () => {
    const eq = loadEquipment(stored({ claw: { pick: 'Meba' }, hat: 'tekst', top: null, bottom: 7, shoes: { pick: 5 }, geheim: { pick: 'none' } }))
    expect(eq.claw).toEqual(shop('Meba'))
    for (const s of ['hat', 'top', 'bottom', 'shoes'] as const) expect(eq[s], s).toEqual(unknown)
    expect('geheim' in eq).toBe(false)
  })

  it('maakt een onbekende of verdwenen winkelkeuze "nog niet ingevuld", ook als hij bij een ander slot hoort', () => {
    const eq = loadEquipment(stored({ claw: { pick: 'Verdwenen Claw' }, hat: { pick: 'Red Pao' }, top: { pick: 'Red Pao' }, shoes: { pick: '__proto__' }, bottom: { pick: 'constructor' } }))
    expect(eq.claw).toEqual(unknown)
    expect(eq.hat).toEqual(unknown)
    expect(eq.top).toEqual(shop('Red Pao'))
    expect(eq.shoes).toEqual(unknown)
    expect(eq.bottom).toEqual(unknown)
  })

  it('wist de naam van een catalogusitem en een nog niet ingevuld slot, en houdt de eigen stat alleen bij het eerste', () => {
    const eq = loadEquipment(stored({ claw: { pick: 'Meba', name: 'x', stat: '9' }, top: { pick: 'unknown', name: 'x', stat: '9' } }))
    expect(eq.claw).toEqual(shop('Meba', '9'))
    expect(eq.top).toEqual(unknown)
  })

  it('geeft een catalogusitem met een eigen stat heen en terug dezelfde equipment', () => {
    const storage = fakeStorage()
    const eq: Equipment = { ...defaultEquipment(), claw: shop('Meba', '21'), top: shop('Red Pao', '35') }
    saveEquipment(storage, eq)
    const back = loadEquipment(storage)
    expect(back).toEqual(eq)
    expect(wornStat('top', back.top)).toBe(35)
    expect(JSON.parse(storage.data.get(EQUIPMENT_KEY)!).version).toBe(1)
  })

  it('maakt een rommelige eigen stat bij een catalogusitem leeg, zodat de database telt', () => {
    const eq = loadEquipment(stored({ top: { pick: 'Red Pao', stat: 'abc' }, hat: { pick: 'Red Guise', stat: 7 }, bottom: { pick: 'Red Pao Bottoms', stat: '23' }, shoes: { pick: 'Red Enamel Boots', stat: '  ' } }))
    expect(eq.top).toEqual(shop('Red Pao'))
    expect(eq.hat).toEqual(shop('Red Guise'))
    expect(eq.bottom).toEqual(shop('Red Pao Bottoms'))
    expect(eq.shoes).toEqual(shop('Red Enamel Boots'))
    expect(wornStat('top', eq.top)).toBe(32)
  })

  it('trimt en kapt een eigen stat bij een catalogusitem af op 12 tekens', () => {
    const eq = loadEquipment(stored({ top: { pick: 'Red Pao', stat: ' 35 ' }, hat: { pick: 'Red Guise', stat: '9'.repeat(50) } }))
    expect(eq.top.stat).toBe('35')
    expect(eq.hat.stat).toHaveLength(12)
    expect(wornStat('hat', eq.hat)).toBe(999)
  })

  it('maakt een bewaard "niets" van vroeger "nog niet ingevuld": je draagt altijd iets', () => {
    const eq = loadEquipment(stored({ hat: { pick: 'none', name: 'x', stat: '9' }, claw: { pick: 'none' } }))
    expect(eq.hat).toEqual(unknown)
    expect(eq.claw).toEqual(unknown)
  })

  it('kapt te lange naam (40) en stat (12) af bij het laden en bij het bewaren', () => {
    const eq = loadEquipment(stored({ top: { pick: 'other', name: 'n'.repeat(100), stat: '9'.repeat(50) }, bottom: { pick: 'other', name: 5, stat: {} } }))
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
    const eq = loadEquipment(stored({ top: { pick: 'other', name: '', stat: '9'.repeat(50) } }))
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
    expect(loadEquipment(broken)).toEqual(defaultEquipment())
  })

  it('schrijft onder de eigen sleutel en raakt de profielsleutel niet', () => {
    const storage = fakeStorage({ 'mesowise.profile.v1': 'x' })
    saveEquipment(storage, defaultEquipment())
    expect(storage.data.get('mesowise.profile.v1')).toBe('x')
    expect(EQUIPMENT_KEY).toBe('mesowise.equipment.v1')
  })
})
