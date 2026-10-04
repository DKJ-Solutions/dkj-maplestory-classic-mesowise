// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './app'
import { NPC_CLAWS } from './data/claws'
import { EQUIPMENT_KEY, searchCatalog } from './equipment'
import { JOB_KEY } from './job'
import { DEFAULT_PROFILE, PROFILE_KEY } from './profile'
import { knownSpotPatch } from './data/spots'
import { newDraft } from './spotDraft'
import { STORAGE_KEY } from './storage/spots'

const claw = (name: string) => {
  const c = NPC_CLAWS.find((x) => x.name === name)
  if (!c) throw new Error(`claw ${name} onbekend`)
  return c
}
const IGOR = claw('Steel Igor')
const MEBA = claw('Meba')

/** Twee items uit de catalogus van een slot met een verschillende stat en een naam die niet in de ander zit. */
const twoItems = (slot: 'hat' | 'top' | 'shoes') => {
  const items = searchCatalog(slot, 'thief', '')
  const a = items[0]
  const b = items.find((i) => i.stat !== a.stat && !i.name.includes(a.name) && !a.name.includes(i.name))
  if (!b) throw new Error(`geen tweede ${slot} met een andere WDEF`)
  return [a, b] as const
}
const [HAT_A, HAT_B] = twoItems('hat')
const [SHOE_A] = twoItems('shoes')
const [TOP_A] = twoItems('top')

const stored = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null')
const profileFields = () => stored(PROFILE_KEY)?.fields
const slots = () => stored(EQUIPMENT_KEY)?.slots

/** De drie schermen van de flow: [0] thuis, [1] controle na de level-up, [2] advies. */
const panels = () => Array.from(document.querySelectorAll<HTMLElement>('.panel'))

/** De equipment-kaarten: [0] op het beginscherm, [1] op het controlescherm van de level-up. */
const cards = () => Array.from(document.querySelectorAll<HTMLElement>('section.equipment'))

// Een slot heet in het scherm Weapon, Hat, Top, Bottom of Shoes; de zoekbalk heet "Zoek je <Slot>".
const searchBox = (card: HTMLElement, slot: string) => within(card).getByLabelText(`Zoek je ${slot}`) as HTMLInputElement
const rowOf = (card: HTMLElement, slot: string) => searchBox(card, slot).closest<HTMLElement>('.equip-row')!
const typeIn = (card: HTMLElement, slot: string, text: string) => {
  const box = searchBox(card, slot)
  fireEvent.focus(box)
  fireEvent.input(box, { target: { value: text } })
  return rowOf(card, slot)
}
const options = (row: HTMLElement) => Array.from(row.querySelectorAll<HTMLElement>('li[role="option"]'))
/** Kies een catalogusitem: typ de naam in de zoekbalk en tik de optie aan. */
const pick = (card: HTMLElement, slot: string, name: string) => {
  const option = options(typeIn(card, slot, name)).find((o) => o.querySelector('.equip-name')?.textContent === name)
  if (!option) throw new Error(`${name} staat niet in de lijst van ${slot}`)
  fireEvent.click(option)
}
/** Kies de rij 'Gebruik "<tekst>" als eigen item'. */
const pickOwn = (card: HTMLElement, slot: string, text: string) => {
  const option = options(typeIn(card, slot, text)).find((o) => o.textContent === `Gebruik "${text}" als eigen item`)
  if (!option) throw new Error(`geen eigen-item-rij voor ${text}`)
  fireEvent.click(option)
}
/** De naam op de knop van een ingevuld slot; null als het slot nog niet is ingevuld. */
const worn = (card: HTMLElement, slot: string) => rowOf(card, slot).querySelector('.equip-picked')?.textContent ?? null
const badge = (card: HTMLElement, slot: string) => rowOf(card, slot).querySelector('em.was')?.textContent ?? null

/** Opent de popup achter het potlood van een slot en geeft de handvatten ervan. */
const openDialog = (card: HTMLElement, slot: string, stat: 'ATT' | 'DEF') => {
  const row = rowOf(card, slot)
  fireEvent.click(within(row).getByRole('button', { name: `${stat} corrigeren` }))
  const dialog = row.querySelector('dialog') as HTMLDialogElement
  const d = within(dialog)
  const input = () => d.getByLabelText(`${stat} in game`) as HTMLInputElement
  return {
    dialog,
    input,
    type: (v: string) => fireEvent.input(input(), { target: { value: v } }),
    save: () => fireEvent.click(d.getByRole('button', { name: 'Opslaan' })),
    close: () => fireEvent.click(d.getByRole('button', { name: 'Sluiten zonder opslaan' })),
    d,
  }
}
/** Corrigeer de stat van een slot en sla op. */
const correct = (card: HTMLElement, slot: string, stat: 'ATT' | 'DEF', value: string) => {
  const h = openDialog(card, slot, stat)
  h.type(value)
  h.save()
}

const openHomeEquipment = () => fireEvent.click(within(cards()[0]).getByRole('button', { name: /Je equipment/ }))
const levelUp = () => fireEvent.click(screen.getByRole('button', { name: /Level up/ }))
const undoLevelUp = () => fireEvent.click(screen.getByRole('button', { name: 'Level-up ongedaan maken' }))

beforeEach(() => {
  localStorage.clear()
  render(<App />)
})
afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('begin zonder opslag', () => {
  it('schrijft niets weg zolang de speler niets verandert', () => {
    expect(localStorage.length).toBe(0)
  })

  it('toont op de level up-knop de stap van lv 10 naar lv 11', () => {
    expect(screen.getByRole('button', { name: /Level up/ }).textContent).toContain('lv 10 → 11')
  })

  it('toont een slot dat nog niet is ingevuld als zoekbalk, zonder opties "Weet ik niet" of "Niets"', () => {
    openHomeEquipment()
    const box = searchBox(cards()[0], 'Weapon')
    expect(box.getAttribute('role')).toBe('combobox')
    expect(box.placeholder).toBe('Zoek wat je draagt')
    expect(worn(cards()[0], 'Weapon')).toBeNull()
    expect(rowOf(cards()[0], 'Weapon').querySelector('.equip-edit')).toBeNull()
    expect(screen.queryByText('Weet ik niet')).toBeNull()
    expect(screen.queryByText('Niets')).toBeNull()
  })
})

describe('equipment: de claw past het profiel aan', () => {
  it('zet weapon attack en aanvalssnelheid van de gekozen claw in het bewaarde profiel', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    expect(profileFields().clawWatk).toBe(String(IGOR.watk))
    expect(profileFields().attackMs).toBe(String(IGOR.speed.attackMs))
    // de rest van het profiel is onaangeroerd
    expect(profileFields().level).toBe(DEFAULT_PROFILE.level)
    expect(profileFields().wdef).toBe(DEFAULT_PROFILE.wdef)
  })

  it('toont de nieuwe weapon attack en aanvalstijd in het karakterveld', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    fireEvent.click(screen.getByRole('button', { name: /Je karakter/ }))
    expect((within(panels()[0]).getByLabelText('Weapon attack van je wapen') as HTMLInputElement).value).toBe(String(IGOR.watk))
    expect((within(panels()[0]).getByLabelText('Tijd per aanval (ms)') as HTMLInputElement).value).toBe(String(IGOR.speed.attackMs))
  })

  it('houdt in de kaartkop alleen de titel, ook als je iets draagt', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    expect(within(cards()[0]).getByRole('button', { name: /Je equipment/ }).textContent?.trim()).toBe('Je equipment')
  })

  it('klapt onderaan in met Inklappen, en zet de focus daarna op de kop', async () => {
    openHomeEquipment()
    const head = within(cards()[0]).getByRole('button', { name: /Je equipment/ })
    expect(head.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(within(cards()[0]).getByRole('button', { name: 'Inklappen' }))
    expect(head.getAttribute('aria-expanded')).toBe('false')
    await new Promise((done) => requestAnimationFrame(() => done(undefined)))
    expect(document.activeElement).toBe(head)
  })

  it('toont na de keuze de naam als knop en de ATT in het waardevak', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    expect(within(cards()[0]).getByRole('button', { name: `Weapon: ${IGOR.name}. Tik om te zoeken.` })).toBeTruthy()
    expect(rowOf(cards()[0], 'Weapon').querySelector('.equip-value')!.getAttribute('aria-label')).toBe(`ATT ${IGOR.watk}`)
  })

  it('laat een eigen item (via de zoekbalk) het profiel ongemoeid tot de stat is opgeslagen', () => {
    // Vervangt "Niets": een slot zonder bekend getal zet de weapon attack niet op 0, het laat het profiel staan.
    openHomeEquipment()
    pickOwn(cards()[0], 'Weapon', 'Mijn claw')
    expect(slots().claw).toMatchObject({ pick: 'other', name: 'Mijn claw', stat: '' })
    expect(profileFields()?.clawWatk ?? DEFAULT_PROFILE.clawWatk).toBe(DEFAULT_PROFILE.clawWatk)
    correct(cards()[0], 'Weapon', 'ATT', '31')
    expect(profileFields().clawWatk).toBe('31')
    // een eigen item zet de aanvalssnelheid niet
    expect(profileFields().attackMs).toBe(DEFAULT_PROFILE.attackMs)
  })

  it('past bij een armorstuk alleen het verschil in WDEF toe', () => {
    openHomeEquipment()
    const before = profileFields()?.wdef ?? DEFAULT_PROFILE.wdef
    // van nog niet ingevuld naar een stuk verandert de WDEF niet: dat stuk zat er al in
    pick(cards()[0], 'Hat', HAT_A.name)
    expect(profileFields()?.wdef ?? DEFAULT_PROFILE.wdef).toBe(before)
    // van dit stuk naar een ander telt alleen het verschil
    pick(cards()[0], 'Hat', HAT_B.name)
    expect(profileFields().wdef).toBe(String(Number(DEFAULT_PROFILE.wdef) + HAT_B.stat - HAT_A.stat))
  })
})

describe('equipment: de popup achter het potlood', () => {
  const fillIgor = () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
  }

  it('toont de ATT voor het wapen en de DEF voor armor op de potloodknop', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    pick(cards()[0], 'Hat', HAT_A.name)
    expect(within(rowOf(cards()[0], 'Weapon')).getByRole('button', { name: 'ATT corrigeren' })).toBeTruthy()
    expect(within(rowOf(cards()[0], 'Hat')).getByRole('button', { name: 'DEF corrigeren' })).toBeTruthy()
  })

  it('past niets toe zolang je in de popup typt, ook niet met − en +', () => {
    fillIgor()
    const h = openDialog(cards()[0], 'Weapon', 'ATT')
    expect(h.dialog.open).toBe(true)
    h.type('31')
    fireEvent.click(h.d.getByRole('button', { name: 'ATT plus 1' }))
    expect(h.input().value).toBe('32')
    expect(profileFields().clawWatk).toBe(String(IGOR.watk))
    expect(slots().claw.stat).toBe('')
  })

  it('past met Opslaan de claw-WATK aan, maar niet de aanvalssnelheid', () => {
    fillIgor()
    correct(cards()[0], 'Weapon', 'ATT', '31')
    expect(profileFields().clawWatk).toBe('31')
    expect(profileFields().attackMs).toBe(String(IGOR.speed.attackMs))
    expect(slots().claw).toMatchObject({ pick: IGOR.name, stat: '31' })
    // een gecorrigeerde stat staat als correctie in het waardevak
    expect(rowOf(cards()[0], 'Weapon').querySelector('.equip-value')!.getAttribute('aria-label')).toBe(`ATT 31, gecorrigeerd, verwacht ${IGOR.watk}`)
  })

  it('legt het concept ook vast met Enter in het getal', () => {
    fillIgor()
    const h = openDialog(cards()[0], 'Weapon', 'ATT')
    h.type('33')
    fireEvent.keyDown(h.input(), { key: 'Enter' })
    expect(profileFields().clawWatk).toBe('33')
  })

  it('gooit het concept weg met ✕ (Sluiten zonder opslaan)', () => {
    fillIgor()
    const h = openDialog(cards()[0], 'Weapon', 'ATT')
    h.type('31')
    h.close()
    expect(profileFields().clawWatk).toBe(String(IGOR.watk))
    expect(slots().claw.stat).toBe('')
    // een nieuwe popup begint weer bij de toegepaste stand
    expect(openDialog(cards()[0], 'Weapon', 'ATT').input().value).toBe(String(IGOR.watk))
  })

  it('gooit het concept weg met Escape', () => {
    fillIgor()
    const h = openDialog(cards()[0], 'Weapon', 'ATT')
    h.type('31')
    fireEvent(h.dialog, new Event('cancel', { cancelable: true }))
    expect(profileFields().clawWatk).toBe(String(IGOR.watk))
    expect(rowOf(cards()[0], 'Weapon').querySelector('dialog')).toBeNull()
  })

  it('gooit het concept weg met een tik op de achtergrond van de popup', () => {
    fillIgor()
    const h = openDialog(cards()[0], 'Weapon', 'ATT')
    h.type('31')
    fireEvent.click(h.dialog)
    expect(profileFields().clawWatk).toBe(String(IGOR.watk))
    expect(rowOf(cards()[0], 'Weapon').querySelector('dialog')).toBeNull()
  })

  it('biedt Opslaan alleen aan als het concept afwijkt, en Reset alleen bij een correctie', () => {
    fillIgor()
    const h = openDialog(cards()[0], 'Weapon', 'ATT')
    expect(h.d.queryByRole('button', { name: 'Opslaan' })).toBeNull()
    expect(h.d.queryByRole('button', { name: /^Reset/ })).toBeNull()
    h.type('31')
    h.save()
    const again = openDialog(cards()[0], 'Weapon', 'ATT')
    expect(again.d.queryByRole('button', { name: 'Opslaan' })).toBeNull()
    fireEvent.click(again.d.getByRole('button', { name: `Reset naar ${IGOR.watk}` }))
    again.save()
    expect(profileFields().clawWatk).toBe(String(IGOR.watk))
    expect(slots().claw.stat).toBe('')
  })
})

describe('bewaren na elke wijziging', () => {
  it('bewaart de equipment per slot', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    pick(cards()[0], 'Shoes', SHOE_A.name)
    expect(slots().claw.pick).toBe(IGOR.name)
    expect(slots().shoes.pick).toBe(SHOE_A.name)
    expect(slots().hat.pick).toBe('unknown')
  })

  it('bewaart een tweede wissel in hetzelfde slot meteen daarna', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    pick(cards()[0], 'Weapon', MEBA.name)
    expect(slots().claw.pick).toBe(MEBA.name)
    expect(profileFields().clawWatk).toBe(String(MEBA.watk))
    expect(profileFields().attackMs).toBe(String(MEBA.speed.attackMs))
  })

  it('bewaart een getypt profielveld', () => {
    fireEvent.click(screen.getByRole('button', { name: /Je karakter/ }))
    fireEvent.input(within(panels()[0]).getByLabelText('LUK'), { target: { value: '55' } })
    expect(profileFields().luk).toBe('55')
  })

  it('bewaart een toegevoegde plek', () => {
    expect(stored(STORAGE_KEY)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Plek toevoegen' }))
    expect(stored(STORAGE_KEY).spots).toHaveLength(2)
  })

  it('bewaart de gekozen job', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Warrior' }))
    expect(stored(JOB_KEY).job).toBe('warrior')
  })

  it('bewaart een eigen item met naam en, na Opslaan, het getal', () => {
    openHomeEquipment()
    pickOwn(cards()[0], 'Weapon', 'Mijn claw')
    expect(worn(cards()[0], 'Weapon')).toBe('Mijn claw')
    correct(cards()[0], 'Weapon', 'ATT', '31')
    expect(slots().claw).toMatchObject({ pick: 'other', name: 'Mijn claw', stat: '31' })
  })

  it('kiest met Enter de gemarkeerde rij in de zoeklijst', () => {
    openHomeEquipment()
    typeIn(cards()[0], 'Weapon', MEBA.name)
    fireEvent.keyDown(searchBox(cards()[0], 'Weapon'), { key: 'Enter' })
    expect(slots().claw.pick).toBe(MEBA.name)
  })

  it('biedt geen eigen-item-rij als je precies een naam uit de lijst typt', () => {
    openHomeEquipment()
    const row = typeIn(cards()[0], 'Weapon', IGOR.name)
    expect(options(row).some((o) => o.textContent?.startsWith('Gebruik "'))).toBe(false)
    const own = typeIn(cards()[0], 'Weapon', 'Iets heel anders')
    expect(options(own).map((o) => o.textContent)).toEqual(['Gebruik "Iets heel anders" als eigen item'])
  })
})

describe('level-up en ongedaan maken', () => {
  it('verhoogt het level en toont "was" bij de gewijzigde stat', () => {
    levelUp()
    expect(profileFields().level).toBe('11')
    const row = within(panels()[1]).getByLabelText(/^Level/, { selector: 'input' }).closest('label')!
    expect(row.querySelector('em.was')?.textContent).toBe('was 10')
  })

  it('zet het profiel terug op dat van voor de level-up', () => {
    levelUp()
    expect(profileFields().level).toBe('11')
    undoLevelUp()
    expect(profileFields()).toEqual(DEFAULT_PROFILE)
  })

  it('zet equipment en profiel allebei terug, ook na een wissel op het controlescherm', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    pick(cards()[0], 'Hat', HAT_A.name)
    pick(cards()[0], 'Hat', HAT_B.name)
    const profileBefore = profileFields()
    const slotsBefore = slots()

    levelUp()
    pick(cards()[1], 'Weapon', MEBA.name)
    pick(cards()[1], 'Shoes', SHOE_A.name)
    expect(profileFields().clawWatk).toBe(String(MEBA.watk))
    expect(slots().shoes.pick).toBe(SHOE_A.name)

    undoLevelUp()
    expect(profileFields()).toEqual(profileBefore)
    expect(profileFields().level).toBe('10')
    expect(profileFields().clawWatk).toBe(String(IGOR.watk))
    expect(profileFields().attackMs).toBe(String(IGOR.speed.attackMs))
    expect(slots()).toEqual(slotsBefore)
    expect(worn(cards()[0], 'Weapon')).toBe(IGOR.name)
    expect(worn(cards()[0], 'Hat')).toBe(HAT_B.name)
    expect(worn(cards()[0], 'Shoes')).toBeNull()
  })

  it('gooit een eigen item met een opgeslagen getal van het controlescherm weg', () => {
    levelUp()
    pickOwn(cards()[1], 'Weapon', 'Mijn claw')
    correct(cards()[1], 'Weapon', 'ATT', '77')
    expect(profileFields().clawWatk).toBe('77')
    undoLevelUp()
    expect(profileFields().clawWatk).toBe(DEFAULT_PROFILE.clawWatk)
    expect(slots().claw.pick).toBe('unknown')
  })

  it('legt een nog open concept in de popup vast als vangnet bij de level-up', () => {
    // In de echte app zit de level-up-knop achter de modal; levelUp() in app.tsx legt een open concept toch vast
    // (commitAllEquipment), zodat een getal nooit stil verloren gaat. fireEvent omzeilt de modal.
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    const h = openDialog(cards()[0], 'Weapon', 'ATT')
    h.type('44')
    expect(profileFields().clawWatk).toBe(String(IGOR.watk))
    levelUp()
    expect(profileFields().clawWatk).toBe('44')
    expect(profileFields().level).toBe('11')
  })
})

describe('de "was"-badge per slot', () => {
  it('staat er niet zolang er niets gewijzigd is', () => {
    levelUp()
    for (const slot of ['Weapon', 'Hat', 'Top', 'Bottom', 'Shoes']) expect(badge(cards()[1], slot)).toBeNull()
  })

  it('toont alleen bij het gewijzigde slot wat het was', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    levelUp()
    pick(cards()[1], 'Weapon', MEBA.name)
    pick(cards()[1], 'Hat', HAT_A.name)
    expect(badge(cards()[1], 'Weapon')).not.toBeNull()
    expect(badge(cards()[1], 'Hat')).toBe('was nog niet ingevuld')
    expect(badge(cards()[1], 'Top')).toBeNull()
    expect(badge(cards()[1], 'Shoes')).toBeNull()
  })

  // Was bekende bug #52 (entryLabel las `name` in plaats van `pick`, dus "was Ander item"); in de nieuwe entryLabel
  // is dat verholpen, dus dit is nu een gewone test.
  it('noemt een winkelitem bij zijn naam (#52)', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    levelUp()
    pick(cards()[1], 'Weapon', MEBA.name)
    expect(badge(cards()[1], 'Weapon')).toBe(`was ${IGOR.name}`)
  })

  it('noemt "nog niet ingevuld", een eigen item en een aangepaste stat bij naam', () => {
    openHomeEquipment()
    pickOwn(cards()[0], 'Top', 'Mijn top')
    pick(cards()[0], 'Weapon', IGOR.name)
    correct(cards()[0], 'Weapon', 'ATT', '31')
    levelUp()
    pick(cards()[1], 'Top', TOP_A.name)
    expect(badge(cards()[1], 'Top')).toBe('was Mijn top')
    pick(cards()[1], 'Weapon', MEBA.name)
    expect(badge(cards()[1], 'Weapon')).toBe(`was ${IGOR.name} (aangepast: 31)`)
    pick(cards()[1], 'Shoes', SHOE_A.name)
    expect(badge(cards()[1], 'Shoes')).toBe('was nog niet ingevuld')
  })

  it('toont bij een gecorrigeerde stat op hetzelfde item ook de badge, en verdwijnt bij terugzetten', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    levelUp()
    correct(cards()[1], 'Weapon', 'ATT', '31')
    expect(badge(cards()[1], 'Weapon')).toBe(`was ${IGOR.name}`)
    correct(cards()[1], 'Weapon', 'ATT', String(IGOR.watk))
    expect(badge(cards()[1], 'Weapon')).toBeNull()
  })

  it('verdwijnt als je terugkiest wat het was', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    levelUp()
    pick(cards()[1], 'Weapon', MEBA.name)
    expect(badge(cards()[1], 'Weapon')).not.toBeNull()
    pick(cards()[1], 'Weapon', IGOR.name)
    expect(badge(cards()[1], 'Weapon')).toBeNull()
  })

  it('staat niet op de kaart van het beginscherm', () => {
    openHomeEquipment()
    levelUp()
    pick(cards()[1], 'Weapon', IGOR.name)
    expect(badge(cards()[0], 'Weapon')).toBeNull()
  })
})

describe('adviesscherm na de level-up', () => {
  // Een "Beste" vraagt minstens twee plekken: een bekende plek en een eigen plek met weinig EXP per uur.
  beforeEach(() => {
    cleanup()
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        spots: [
          { ...newDraft('a'), ...knownSpotPatch('henesys-rain-forest-east') },
          { ...newDraft('b'), name: 'b', expPerHour: '1000', potions: '10000' },
        ],
      }),
    )
    // Na de level-up wint Lucky Seven (van 2 naar 3) bij deze stats; gemeten met skillPointAdvice, niet afgeleid.
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, fields: { ...DEFAULT_PROFILE, luckySeven: '2', luk: '60' } }))
    render(<App />)
  })
  const toAdvice = () => {
    levelUp()
    fireEvent.click(screen.getByRole('button', { name: 'Alles klopt, toon advies' }))
  }

  it('zet een punt in de aanbevolen skill en bewaart het', () => {
    toAdvice()
    const button = screen.getByRole('button', { name: 'Punt zetten' })
    expect(button.closest('section')!.querySelector('.verdict')!.textContent).toBe('Zet je skillpunt in Lucky Seven (→ 3).')
    expect(profileFields().luckySeven).toBe('2')
    fireEvent.click(button)
    expect(profileFields().luckySeven).toBe('3')
    expect(profileFields().level).toBe('11')
    expect(screen.getByText('Lucky Seven → 3 gezet.')).toBeTruthy()
  })

  it('biedt op het adviesscherm geen "Level-up ongedaan maken" meer aan', () => {
    toAdvice()
    expect(screen.queryByRole('button', { name: 'Level-up ongedaan maken' })).toBeNull()
  })

  it('brengt "Klaar" terug naar het beginscherm en laat het profiel staan', () => {
    toAdvice()
    fireEvent.click(screen.getByRole('button', { name: 'Klaar' }))
    expect(profileFields().level).toBe('11')
    expect(screen.getByRole('button', { name: /Level up/ })).toBeTruthy()
  })
})

describe('een Warrior in de app', () => {
  const warriorFields = { ...DEFAULT_PROFILE, level: '20', hp: '800', str: '90', dex: '20', luk: '4', clawWatk: '40', weaponMult: '1.8', attackMs: '750', accuracy: '40', avoid: '10', wdef: '60', powerStrike: '1', preciseStrikes: '0' }
  const open = (job: string) => {
    cleanup()
    localStorage.setItem(JOB_KEY, JSON.stringify({ version: 1, job }))
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, fields: warriorFields }))
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        spots: [
          { ...newDraft('a'), ...knownSpotPatch('henesys-rain-forest-east') },
          { ...newDraft('b'), name: 'b', expPerHour: '1000', potions: '10000' },
        ],
      }),
    )
    render(<App />)
  }
  const toAdvice = () => {
    levelUp()
    fireEvent.click(screen.getByRole('button', { name: 'Alles klopt, toon advies' }))
  }
  const NOT_YET = /Nog niet doorgerekend/

  describe('het beginscherm', () => {
    beforeEach(() => open('warrior'))

    it('toont een getal voor wat het level kost en niet "Nog niet doorgerekend"', () => {
      const home = panels()[0]
      expect(home.textContent).toMatch(/Beste plek: .* · lv 20: kost /)
      expect(within(home).getByText('Wat kost dit level?').closest('section')!.textContent).toMatch(/±\s*[\d.]+ meso|Gratis|Niet haalbaar/)
      expect(home.textContent).not.toMatch(NOT_YET)
      expect(home.querySelector('.debug')).toBeNull()
    })

    it('noemt op het beginscherm geen claws, en toont de skillkaart en (zodra er een wapen beter is) de wapenkaart', () => {
      const home = panels()[0]
      expect(home.textContent).not.toMatch(/claw/i)
      expect(home.textContent).toContain('Wat kost dit level?')
      // Het wapenadvies heet bij een Warrior "nieuw wapen", nooit "nieuwe claw".
      expect(home.textContent).not.toContain('Loont een nieuwe claw?')
    })

    it('rekent het level met het Warrior-model: de kosten verschillen van die van een Thief met dezelfde velden', () => {
      const warriorCost = within(panels()[0]).getByText('Wat kost dit level?').closest('section')!.querySelector('.level-cost-value')!.textContent
      open('thief')
      const thiefCost = within(panels()[0]).getByText('Wat kost dit level?').closest('section')!.querySelector('.level-cost-value')!.textContent
      expect(warriorCost).toBeTruthy()
      expect(thiefCost).toBeTruthy()
      expect(warriorCost).not.toBe(thiefCost)
    })

    it('zoekt bij Weapon in de Warrior-wapens en niet in Thief-claws, en bij Hat en Shoes in Warrior-armor', () => {
      openHomeEquipment()
      const found = (slot: string, text: string) => options(typeIn(cards()[0], slot, text)).map((o) => o.querySelector('.equip-name')?.textContent)
      expect(found('Weapon', 'Gladius')).toContain('Gladius')
      expect(found('Weapon', 'Meba')).not.toContain('Meba')
      expect(found('Hat', 'Bronze Full Helm')).toContain('Bronze Full Helm')
      expect(found('Hat', 'Red Thief Hood')).not.toContain('Red Thief Hood')
      expect(found('Shoes', 'Bronze Grieves')).toContain('Bronze Grieves')
    })

    it('kent bij Top en Bottom nog geen Warrior-items (#55): alleen "als eigen item", met de uitleg in de kaart', () => {
      openHomeEquipment()
      expect(cards()[0].textContent).toMatch(/Voor Top en Bottom kent de app nog geen items/)
      for (const slot of ['Top', 'Bottom']) expect(options(typeIn(cards()[0], slot, 'Bronze')).map((o) => o.textContent)).toEqual(['Gebruik "Bronze" als eigen item'])
    })

    it('zet bij een gekozen wapen weapon attack, aanvalssnelheid en weapon multiplier in het bewaarde profiel', () => {
      openHomeEquipment()
      pick(cards()[0], 'Weapon', 'Gladius')
      expect(profileFields().clawWatk).toBe('47')
      expect(profileFields().attackMs).toBe('720')
      expect(profileFields().weaponMult).toBe('1.8')
      pick(cards()[0], 'Weapon', "Fireman's Axe")
      expect(profileFields().weaponMult).toBe('1.92')
      // De rest van het profiel is onaangeroerd.
      expect(profileFields().str).toBe('90')
      expect(profileFields().wdef).toBe('60')
    })

    it('toont bij je karakter de weapon multiplier en STR, en niet de Subi-zin van de Thief', () => {
      fireEvent.click(screen.getByRole('button', { name: /Je karakter/ }))
      const home = panels()[0]
      expect((within(home).getByLabelText('Weapon multiplier van je wapen') as HTMLInputElement).value).toBe('1.8')
      expect(within(home).getByLabelText('STR')).toBeTruthy()
      expect(home.textContent).not.toMatch(/Subi/)
      expect(home.textContent).toMatch(/Een Warrior heeft geen munitie/)
    })

    it('toont bij Skillpoints de skills van de Warrior en niet die van de Thief', () => {
      const skills = within(panels()[0]).getByRole('button', { name: /Skillpoints/ }).closest('section')!
      for (const name of ['Power Strike', 'Slash Blast', 'Precise Strikes', 'Iron Body']) expect(skills.textContent, name).toContain(name)
      for (const name of ['Lucky Seven', 'Nimble Body', 'Dark Sight']) expect(skills.textContent, name).not.toContain(name)
    })
  })

  describe('het adviesscherm na een level-up', () => {
    beforeEach(() => {
      open('warrior')
      toAdvice()
    })

    it('verhoogt het level, geeft +28 HP en laat LUK en STR staan', () => {
      expect(profileFields().level).toBe('21')
      expect(profileFields().hp).toBe('828')
      expect(profileFields().str).toBe('90')
      expect(profileFields().luk).toBe('4')
    })

    it('toont alle vier de vragen met een antwoord en nergens "Nog niet doorgerekend"', () => {
      const advice = panels()[2]
      expect(advice.textContent).not.toMatch(NOT_YET)
      expect(advice.textContent).toContain('Moet ik mijn attack nu upgraden?')
      expect(advice.textContent).toContain('Moet ik mijn defense nu upgraden?')
      expect(advice.textContent).toContain('Moet ik mijn skillpunt')
      expect(advice.textContent).toContain('Moet ik mijn hunting ground nu upgraden?')
    })

    it('noemt bij de skillvraag de Warrior-skills die niet zijn doorgerekend, en geen Thief-skills', () => {
      const text = panels()[2].textContent!
      expect(text).toMatch(/Niet doorgerekend: Improved HP Recovery, Max HP Increase, Iron Body en Slash Blast/)
      expect(text).not.toMatch(/Keen Eyes|Dark Sight|Lucky Seven/)
    })

    it('geeft als skillpunt Power Strike (→ 2), met zijn MP, en zet het punt in het bewaarde profiel', () => {
      // Gemeten met skillPointAdvice voor dit profiel (STR 90, WATK 40, Power Strike 1): Power Strike wint, Precise Strikes spaart niets.
      const button = screen.getByRole('button', { name: 'Punt zetten' })
      const section = button.closest('section')!
      expect(section.querySelector('.verdict')!.textContent).toBe('Zet je skillpunt in Power Strike (→ 2).')
      // Power Strike 1 en 2 kosten allebei 4 MP per aanval (de skillpagina).
      expect(section.textContent).toContain('Elke aanval kost je dan 4 → 4 MP.')
      expect(profileFields().powerStrike).toBe('1')
      fireEvent.click(button)
      expect(profileFields().powerStrike).toBe('2')
      expect(profileFields().preciseStrikes).toBe('0')
      expect(profileFields().level).toBe('21')
      expect(screen.getByText('Power Strike → 2 gezet.')).toBeTruthy()
    })

    it('noemt Warrior-wapens, geen claws, en een eis in STR', () => {
      const claw = within(panels()[2]).getByText('Moet ik mijn attack nu upgraden?').closest('section')!
      expect(claw.textContent).not.toMatch(/claw/i)
      expect(claw.textContent).toMatch(/wapen/)
    })
  })

  it('toont voor een Thief nog steeds de Thief-teksten (claw, Subi, Lucky Seven)', () => {
    open('thief')
    toAdvice()
    expect(panels()[2].textContent).toContain('Niet doorgerekend: Keen Eyes, Double Stab, Disorder en Dark Sight')
    expect(panels()[2].textContent).not.toMatch(NOT_YET)
    fireEvent.click(screen.getByRole('button', { name: 'Klaar' }))
    fireEvent.click(screen.getByRole('button', { name: /Je karakter/ }))
    expect(panels()[0].textContent).toMatch(/Subi Throwing Stars/)
    expect(within(panels()[0]).queryByLabelText('Weapon multiplier van je wapen')).toBeNull()
  })

  for (const [job, label] of [['magician', 'Magician'], ['bowman', 'Bowman']] as const) {
    describe(`een ${label}`, () => {
      beforeEach(() => open(job))

      it('krijgt op het beginscherm nog steeds "Nog niet doorgerekend" en geen getal', () => {
        const home = panels()[0]
        expect(home.textContent).toContain(`Nog niet doorgerekend voor ${label}.`)
        expect(home.querySelector('.summary')).toBeNull()
        expect(home.querySelector('.level-cost-value')).toBeNull()
      })

      it('krijgt op het adviesscherm vier vragen met het label "Nog niet doorgerekend"', () => {
        toAdvice()
        const advice = panels()[2]
        expect(advice.textContent).toContain(`Nog niet doorgerekend voor ${label}.`)
        const chips = (advice.textContent!.match(/Nog niet doorgerekend(?! voor)/g) ?? []).length
        expect(chips).toBe(4)
      })

      it('toont geen Warrior-wapens in de equipment', () => {
        openHomeEquipment()
        expect(options(typeIn(cards()[0], 'Weapon', 'Gladius')).map((o) => o.querySelector('.equip-name')?.textContent)).not.toContain('Gladius')
      })
    })
  }
})
