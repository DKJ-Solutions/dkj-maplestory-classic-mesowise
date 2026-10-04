import { describe, expect, it } from 'vitest'
import {
  applyEquipChange,
  choosePick,
  defaultEquipment,
  entryChanged,
  equipmentForJob,
  EQUIPMENT_KEY,
  EQUIP_SLOTS,
  loadEquipment,
  saveEquipment,
  shopItems,
  wornName,
  wornStat,
  wornWdef,
  type EquipEntry,
  type Equipment,
} from './equipment'
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
const none: EquipEntry = { pick: 'none', name: '', stat: '' }
const other = (stat: string, name = ''): EquipEntry => ({ pick: 'other', name, stat })
const shop = (name: string): EquipEntry => ({ pick: name, name: '', stat: '' })
const prof = (over: Partial<ProfileDraft>): ProfileDraft => ({ ...DEFAULT_PROFILE, ...over })
const stored = (slots: unknown, version: unknown = 1) => fakeStorage({ [EQUIPMENT_KEY]: JSON.stringify({ version, slots }) })

describe('defaultEquipment en shopItems', () => {
  it('begint met vijf slots die allemaal onbekend zijn', () => {
    const eq = defaultEquipment()
    expect(Object.keys(eq).sort()).toEqual(['bottom', 'claw', 'hat', 'shoes', 'top'])
    for (const { slot } of EQUIP_SLOTS) expect(eq[slot]).toEqual(unknown)
    expect(wornWdef(eq)).toEqual({})
  })

  it('geeft per slot de winkelitems met de juiste stat (WATK voor de claw, WDEF voor armor)', () => {
    expect(shopItems('claw', 'thief').find((i) => i.name === 'Meba')).toMatchObject({ level: 25, stat: 19 })
    expect(shopItems('shoes', 'thief').map((i) => i.name)).toEqual(['Blue Gidder Shoes', 'Red Ninja Sandals', 'Red Enamel Boots'])
    expect(shopItems('hat', 'thief').find((i) => i.name === 'Red Thief Hood')?.stat).toBe(18)
  })
})

describe('wornStat', () => {
  it('geeft undefined bij onbekend en 0 bij niets', () => {
    expect(wornStat('hat', unknown)).toBeUndefined()
    expect(wornStat('hat', none)).toBe(0)
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

  it('telt een Ander item met lege of ongeldige stat als onbekend', () => {
    for (const s of ['', '   ', 'abc', '12abc', 'NaN', 'Infinity', '-Infinity', '1e999']) expect(wornStat('top', other(s)), s).toBeUndefined()
  })

  it('begrenst een negatief getal bij Ander item op 0', () => {
    for (const s of ['-5', '-0']) expect(wornStat('top', other(s)), s).toBe(0)
  })

  it('kapt een Ander item af op een geheel getal en begrenst op 0..999', () => {
    expect(wornStat('top', other('12'))).toBe(12)
    expect(wornStat('top', other(' 12 '))).toBe(12)
    expect(wornStat('top', other('12.9'))).toBe(12)
    expect(wornStat('top', other('0.9'))).toBe(0)
    expect(wornStat('top', other('999'))).toBe(999)
    expect(wornStat('top', other('1000'))).toBe(999)
    expect(wornStat('top', other('99999999999'))).toBe(999)
  })
})

describe('wornWdef en wornName', () => {
  const eq: Equipment = {
    claw: shop('Meba'),
    hat: unknown,
    top: shop('Red Pao'),
    bottom: none,
    shoes: other('7', '  Mijn laarzen  '),
  }

  it('geeft alleen de armorslots waarvan de WDEF bekend is, en nooit de claw', () => {
    expect(wornWdef(eq)).toEqual({ top: 32, bottom: 0, shoes: 7 })
  })

  it('noemt wat je draagt, en niets bij onbekend of niets', () => {
    expect(wornName(unknown)).toBeNull()
    expect(wornName(none)).toBeNull()
    expect(wornName(shop('Red Pao'))).toBe('Red Pao')
    expect(wornName(other('7', '  Mijn laarzen  '))).toBe('Mijn laarzen')
    expect(wornName(other('7', '   '))).toBe('ander item')
  })
})

describe('entryChanged', () => {
  it('ziet een andere keuze als gewijzigd', () => {
    expect(entryChanged(unknown, none)).toBe(true)
    expect(entryChanged(shop('Meba'), shop('Garnier'))).toBe(true)
    expect(entryChanged(shop('Meba'), shop('Meba'))).toBe(false)
  })

  it('ziet bij Ander item een andere naam of stat, maar negeert spaties rond de tekst', () => {
    expect(entryChanged(other('5', 'x'), other('5', 'x'))).toBe(false)
    expect(entryChanged(other(' 5 ', ' x '), other('5', 'x'))).toBe(false)
    expect(entryChanged(other('5', 'x'), other('6', 'x'))).toBe(true)
    expect(entryChanged(other('5', 'x'), other('5', 'y'))).toBe(true)
  })

  it('negeert een achtergebleven naam of stat als de keuze geen Ander item is', () => {
    expect(entryChanged({ pick: 'none', name: 'a', stat: '1' }, none)).toBe(false)
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
    const b = applyEquipChange(prof({ clawWatk: '3' }), 'claw', none, shop('Steel Titans'))
    expect(a).toEqual(b)
    expect(a).toMatchObject({ clawWatk: '13', attackMs: '720' })
  })

  it('laat bij Ander item of Niets de aanvalssnelheid staan, en bij een ongeldige stat alles', () => {
    expect(applyEquipChange(prof({ attackMs: '800' }), 'claw', shop('Meba'), other('21'))).toMatchObject({ clawWatk: '21', attackMs: '800' })
    expect(applyEquipChange(prof({ attackMs: '800' }), 'claw', shop('Meba'), none)).toMatchObject({ clawWatk: '0', attackMs: '800' })
    const p = prof({ clawWatk: '7', attackMs: '800' })
    expect(applyEquipChange(p, 'claw', shop('Meba'), other('abc'))).toBe(p)
    expect(applyEquipChange(p, 'claw', shop('Meba'), other(''))).toBe(p)
  })

  it('raakt niets bij "weet ik niet"', () => {
    const p = prof({ clawWatk: '7' })
    expect(applyEquipChange(p, 'claw', shop('Meba'), unknown)).toBe(p)
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

  it('trekt het verschil af bij een slechter stuk, en bij niets gaat het hele stuk eraf', () => {
    expect(applyEquipChange(prof({ wdef: '72' }), 'top', shop('Red Pao'), shop('Red Cloth Vest')).wdef).toBe('64')
    expect(applyEquipChange(prof({ wdef: '72' }), 'top', shop('Red Pao'), none).wdef).toBe('40')
    expect(applyEquipChange(prof({ wdef: '72' }), 'top', none, shop('Red Pao')).wdef).toBe('104')
  })

  it('komt niet onder 0', () => {
    expect(applyEquipChange(prof({ wdef: '10' }), 'top', shop('Red Pao'), none).wdef).toBe('0')
    expect(applyEquipChange(prof({ wdef: '0' }), 'top', shop('Red Pao'), none).wdef).toBe('0')
  })

  it('doet niets als het oude of het nieuwe stuk onbekend is, ook niet bij onbekend naar bekend', () => {
    const p = prof({ wdef: '72' })
    expect(applyEquipChange(p, 'top', unknown, shop('Red Pao'))).toBe(p)
    expect(applyEquipChange(p, 'top', shop('Red Pao'), unknown)).toBe(p)
    expect(applyEquipChange(p, 'top', unknown, none)).toBe(p)
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
    const p = applyEquipChange(prof({ clawWatk: '9', attackMs: '800' }), 'top', none, shop('Red Pao'))
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
    let p = applyEquipChange(prof({ wdef: '5' }), 'top', other('12'), none)
    expect(p.wdef).toBe('0')
    p = applyEquipChange(p, 'top', none, other('12'))
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

  it('geeft OTHER de stat 0 als je niets droeg', () => {
    expect(choosePick('top', none, 'other')).toEqual(other('0'))
  })

  it('vult voor met de afgekapte waarde van een ander item', () => {
    expect(choosePick('top', other('12.9'), 'other')).toEqual(other('12'))
    expect(choosePick('top', other('5000'), 'other')).toEqual(other('999'))
  })

  it('geeft bij elke andere keuze een schone entry', () => {
    expect(choosePick('top', other('12', 'x'), 'Red Pao')).toEqual(shop('Red Pao'))
    expect(choosePick('top', shop('Red Pao'), 'none')).toEqual(none)
    expect(choosePick('top', shop('Red Pao'), 'unknown')).toEqual(unknown)
  })
})

describe('loadEquipment en saveEquipment', () => {
  it('geven heen en terug dezelfde equipment', () => {
    const storage = fakeStorage()
    const eq: Equipment = {
      claw: shop('Meba'),
      hat: other('5', 'Mijn muts'),
      top: none,
      bottom: unknown,
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
    const slots = { top: { pick: 'none' } }
    for (const v of [2, 0, '1', null]) expect(loadEquipment(stored(slots, v), 'thief'), String(v)).toEqual(defaultEquipment())
    expect(loadEquipment(fakeStorage({ [EQUIPMENT_KEY]: JSON.stringify({ slots }) }), 'thief')).toEqual(defaultEquipment())
  })

  it('houdt een goed slot en maakt een rommelig slot "weet ik niet"', () => {
    const eq = loadEquipment(stored({ claw: { pick: 'Meba' }, hat: 'tekst', top: null, bottom: 7, shoes: { pick: 5 }, geheim: { pick: 'none' } }), 'thief')
    expect(eq.claw).toEqual(shop('Meba'))
    for (const s of ['hat', 'top', 'bottom', 'shoes'] as const) expect(eq[s], s).toEqual(unknown)
    expect('geheim' in eq).toBe(false)
  })

  it('maakt een onbekende of verdwenen winkelkeuze "weet ik niet", ook als hij bij een ander slot hoort', () => {
    const eq = loadEquipment(stored({ claw: { pick: 'Verdwenen Claw' }, hat: { pick: 'Red Pao' }, top: { pick: 'Red Pao' }, shoes: { pick: '__proto__' }, bottom: { pick: 'constructor' } }), 'thief')
    expect(eq.claw).toEqual(unknown)
    expect(eq.hat).toEqual(unknown)
    expect(eq.top).toEqual(shop('Red Pao'))
    expect(eq.shoes).toEqual(unknown)
    expect(eq.bottom).toEqual(unknown)
  })

  it('wist naam en stat van een slot dat geen Ander item is', () => {
    const eq = loadEquipment(stored({ claw: { pick: 'Meba', name: 'x', stat: '9' }, hat: { pick: 'none', name: 'x', stat: '9' }, top: { pick: 'unknown', name: 'x', stat: '9' } }), 'thief')
    expect(eq.claw).toEqual(shop('Meba'))
    expect(eq.hat).toEqual(none)
    expect(eq.top).toEqual(unknown)
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
  const others: Job[] = ['warrior', 'magician', 'bowman']
  const slots = EQUIP_SLOTS.map((s) => s.slot)
  const stored = (data: Record<string, unknown>) => fakeStorage({ [EQUIPMENT_KEY]: JSON.stringify({ version: 1, slots: data }) })
  const thiefShop: Equipment = { claw: shop('Meba'), hat: shop('Red Thief Hood'), top: shop('Red Pao'), bottom: unknown, shoes: shop('Blue Gidder Shoes') }

  it('toont voor de Thief in elk slot winkelitems en voor een andere job niets', () => {
    for (const s of slots) {
      expect(shopItems(s, 'thief').length, s).toBeGreaterThan(0)
      for (const j of others) expect(shopItems(s, j), `${s} ${j}`).toEqual([])
    }
  })

  it('laadt een bewaarde Thief-winkelkeuze voor de Thief', () => {
    expect(loadEquipment(stored({ claw: { pick: 'Meba' }, hat: { pick: 'Red Thief Hood' } }), 'thief').claw).toEqual(shop('Meba'))
  })

  it('maakt een bewaarde Thief-winkelkeuze "weet ik niet" voor een andere job, en houdt geen/ander', () => {
    const data = { claw: { pick: 'Meba' }, hat: { pick: 'Red Thief Hood' }, top: { pick: 'none' }, bottom: { pick: 'other', name: 'Mijn broek', stat: '7' }, shoes: { pick: 'unknown' } }
    for (const j of others) {
      const eq = loadEquipment(stored(data), j)
      expect(eq.claw, j).toEqual(unknown)
      expect(eq.hat, j).toEqual(unknown)
      expect(eq.top, j).toEqual(none)
      expect(eq.bottom, j).toEqual(other('7', 'Mijn broek'))
      expect(eq.shoes, j).toEqual(unknown)
    }
  })

  it('laat een kapotte opslag voor elke job niets bekend geven', () => {
    for (const j of [...others, 'thief' as Job]) expect(loadEquipment(fakeStorage({ [EQUIPMENT_KEY]: '{kapot' }), j), j).toEqual(defaultEquipment())
  })

  it('zet bij een wissel naar een andere job elke winkelkeuze op "weet ik niet" en laat de rest staan', () => {
    const eq: Equipment = { ...thiefShop, top: none, bottom: other('7', 'Mijn broek') }
    for (const j of others) {
      const out = equipmentForJob(eq, j)
      expect(out.claw, j).toEqual(unknown)
      expect(out.hat, j).toEqual(unknown)
      expect(out.shoes, j).toEqual(unknown)
      expect(out.top, j).toEqual(none)
      expect(out.bottom, j).toEqual(other('7', 'Mijn broek'))
    }
  })

  it('laat de equipment bij de Thief gelijk en past de invoer niet aan', () => {
    const copy = structuredClone(thiefShop)
    expect(equipmentForJob(thiefShop, 'thief')).toEqual(thiefShop)
    expect(thiefShop).toEqual(copy)
    expect(equipmentForJob(defaultEquipment(), 'warrior')).toEqual(defaultEquipment())
  })

  it('zet een winkelkeuze die niet bij het slot hoort ook op "weet ik niet" voor de Thief', () => {
    expect(equipmentForJob({ ...defaultEquipment(), hat: shop('Red Pao') }, 'thief').hat).toEqual(unknown)
  })

  it('laat WDEF en WATK in het profiel staan als een jobwissel winkelitems op onbekend zet', () => {
    const profile = prof({ wdef: '60', clawWatk: '19' })
    const after = equipmentForJob(thiefShop, 'warrior')
    let p = profile
    for (const s of slots) p = applyEquipChange(p, s, thiefShop[s], after[s])
    expect(p.wdef).toBe('60')
    expect(p.clawWatk).toBe('19')
  })

  it('geeft na een jobwissel geen stat meer voor een winkelitem dat de job niet heeft', () => {
    const after = equipmentForJob(thiefShop, 'bowman')
    for (const s of slots) expect(wornStat(s, after[s]), s).toBeUndefined()
    expect(wornWdef(after)).toEqual({})
  })
})
