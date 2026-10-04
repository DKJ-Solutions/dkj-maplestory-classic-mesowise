// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './app'
import { NPC_CLAWS } from './data/claws'
import { EQUIPMENT_KEY, searchCatalog } from './equipment'
import { JOB_KEY } from './job'
import { DEFAULT_PROFILE, parseProfile, PROFILE_KEY, type ProfileDraft } from './profile'
import { statWindowRange } from './suggest'
import { mobDraft } from './data/spots'
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
/** De Attack zoals Total stats hem moet tonen: het schadebereik van het bewaarde profiel (#108). */
const rangeOf = (job: 'thief' | 'warrior' | 'bowman'): string => {
  const r = parseProfile({ ...DEFAULT_PROFILE, ...(profileFields() as Partial<ProfileDraft> | undefined) }, job)
  if (!('profile' in r)) throw new Error(r.error)
  const range = statWindowRange(r.profile)!
  return `${range.min} – ${range.max}`
}
const slots = () => stored(EQUIPMENT_KEY)?.slots

/** De drie schermen van de flow: [0] thuis, [1] controle na de level-up, [2] advies. */
const panels = () => Array.from(document.querySelectorAll<HTMLElement>('.panel'))

/** De equipment-kaarten: [0] op het beginscherm, [1] op het controlescherm van de level-up. */
const cards = () => Array.from(document.querySelectorAll<HTMLElement>('section.equipment'))

// Een slot heet in het scherm Weapon, Hat, Top, Bottom, Overall of Shoes; de zoekbalk heet "Zoek je <Slot>".
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

/** De rij van een stat op de karakterkaart (beginscherm). */
const statLine = (label: string) => {
  const line = Array.from(panels()[0].querySelectorAll<HTMLElement>('.stat-line')).find((l) => l.querySelector('.stat-line-name')?.textContent === label)
  if (!line) throw new Error(`geen stat ${label}`)
  return line
}
/** De namen van de stat-regels in één kaart van het beginscherm. */
const cardNames = (selector: string) => Array.from(panels()[0].querySelectorAll(`${selector} .stat-line-name`)).map((n) => n.textContent)
const statShown = (label: string) => statLine(label).querySelector('.equip-value strong')?.textContent
/** Opent de popup achter het potlood van een stat op de karakterkaart. */
const openStat = (label: string) => {
  fireEvent.click(within(statLine(label)).getByRole('button', { name: `${label} wijzigen` }))
  const d = within(statLine(label).querySelector('dialog') as HTMLDialogElement)
  const input = () => d.getByLabelText(`${label} in game`) as HTMLInputElement
  return {
    input,
    type: (v: string) => fireEvent.input(input(), { target: { value: v } }),
    save: () => fireEvent.click(d.getByRole('button', { name: 'Opslaan' })),
    close: () => fireEvent.click(d.getByRole('button', { name: 'Sluiten zonder opslaan' })),
    d,
  }
}

/** Opent de Skillpoints-kaart van het beginscherm en geeft de kaart terug (de popup zit erin). */
const openHomeSkills = () => {
  const head = within(panels()[0]).getByRole('button', { name: /Skillpoints/ })
  fireEvent.click(head)
  return head.closest('section')!
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

  it('toont bovenaan het huidige level en zet de level up-knop onder de mob-kaart (#84)', () => {
    expect(document.querySelector('.current-level')?.textContent).toBe('Level 10')
    const mob = screen.getByRole('button', { name: /^Monster$/ })
    const up = screen.getByRole('button', { name: /Level up/ })
    expect(mob.compareDocumentPosition(up) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  // Dave, 4 oktober 2026: geen plekken, geen knop om ze toe te voegen en geen voorbeeldplek meer.
  it('heeft geen voorbeeldplek, geen lijst van plekken en geen knop Plek toevoegen', () => {
    expect(screen.queryByRole('button', { name: 'Plek toevoegen' })).toBeNull()
    expect(screen.queryByText(/Voorbeeldplek/)).toBeNull()
    expect(document.querySelector('ol.spots')).toBeNull()
    expect(screen.getByRole('button', { name: /^Monster$/ }).textContent).toBe('Monster')
  })

  // Dave, 4 oktober 2026: de kaart staat onder Skillpoints, en net als de andere kaarten toont de kop alleen de titel.
  it('zet de kaart Monster direct onder Skillpoints', () => {
    const skills = screen.getByRole('button', { name: /Skillpoints/ }).closest('section')!
    const mob = screen.getByRole('button', { name: /^Monster$/ }).closest('section')!
    expect(skills.nextElementSibling).toBe(mob)
  })

  it('toont het nieuwe level bovenaan na een level-up', () => {
    levelUp()
    expect(document.querySelector('.current-level')?.textContent).toBe('Level 11')
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

  it('toont de nieuwe aanvalstijd op de karakterkaart', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    fireEvent.click(screen.getByRole('button', { name: /Total stats/ }))
    expect(statShown('Tijd per aanval (ms)')).toBe(String(IGOR.speed.attackMs))
  })

  it('houdt in de kaartkop alleen de titel, ook als je iets draagt', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    expect(within(cards()[0]).getByRole('button', { name: /Je equipment/ }).textContent?.trim()).toBe('Je equipment')
  })

  it('toont de inhoud in een popup achter het oog, en klapt niet meer open (#106)', () => {
    const head = within(cards()[0]).getByRole('button', { name: /Je equipment/ })
    expect(head.getAttribute('aria-haspopup')).toBe('dialog')
    expect(head.querySelector('svg.card-eye')).not.toBeNull()
    // Dicht staat de inhoud nergens in de pagina, ook niet verborgen.
    expect(cards()[0].querySelector('dialog')).toBeNull()
    expect(within(cards()[0]).queryByLabelText('Zoek je Weapon')).toBeNull()
    openHomeEquipment()
    const dialog = cards()[0].querySelector('dialog.card-dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)
    expect(dialog.getAttribute('aria-label')).toBe('Je equipment')
    expect(within(dialog).getByLabelText('Zoek je Weapon')).toBeTruthy()
    expect(within(cards()[0]).queryByRole('button', { name: 'Inklappen' })).toBeNull()
  })

  it('sluit de popup met het kruisje, en zet de focus daarna op de kop (#106)', async () => {
    openHomeEquipment()
    const head = within(cards()[0]).getByRole('button', { name: /Je equipment/ })
    expect(head.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(within(cards()[0].querySelector('dialog')!).getByRole('button', { name: 'Sluiten' }))
    expect(head.getAttribute('aria-expanded')).toBe('false')
    expect(cards()[0].querySelector('dialog')).toBeNull()
    await new Promise((done) => requestAnimationFrame(() => done(undefined)))
    expect(document.activeElement).toBe(head)
  })

  it('houdt een keuze uit de popup vast nadat je hem sluit en weer opent (#106)', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    fireEvent.click(within(cards()[0].querySelector('dialog')!).getByRole('button', { name: 'Sluiten' }))
    openHomeEquipment()
    expect(worn(cards()[0], 'Weapon')).toBe(IGOR.name)
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

  it('laat je een overall invullen die top en bottom leegt, en andersom (issue #50)', () => {
    openHomeEquipment()
    const card = cards()[0]
    expect(rowOf(card, 'Overall').querySelector('.slot-name')?.textContent).toBe('Overall')
    pick(card, 'Top', TOP_A.name)
    expect(slots().top.pick).toBe(TOP_A.name)
    pick(card, 'Overall', 'Blue Sauna Robe')
    expect(slots().overall.pick).toBe('Blue Sauna Robe')
    expect(slots().top.pick).toBe('unknown')
    expect(slots().bottom.pick).toBe('unknown')
    // Een top kiezen terwijl je de overall draagt, haalt de overall eraf: 75 eraf, de top erbij.
    const wdef = Number(profileFields()?.wdef ?? DEFAULT_PROFILE.wdef)
    pick(card, 'Top', TOP_A.name)
    expect(slots().overall.pick).toBe('unknown')
    expect(profileFields().wdef).toBe(String(wdef - 75 + TOP_A.stat))
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

  it('bewaart een profielveld pas na Opslaan in de popup van het potlood', () => {
    fireEvent.click(screen.getByRole('button', { name: /Ability points/ }))
    const h = openStat('LUK')
    h.type('55')
    expect(profileFields()?.luk ?? DEFAULT_PROFILE.luk).toBe(DEFAULT_PROFILE.luk)
    h.save()
    expect(profileFields().luk).toBe('55')
    expect(statShown('LUK')).toBe('55')
  })

  it('heeft op de karakterkaart geen invoerveld buiten de popup', () => {
    fireEvent.click(screen.getByRole('button', { name: /Ability points/ }))
    expect(panels()[0].querySelector('section.profile')!.querySelectorAll('input')).toHaveLength(0)
  })

  it('toont geen level, Max HP, ATT en DEF: die liggen elders vast', () => {
    fireEvent.click(screen.getByRole('button', { name: /Total stats/ }))
    fireEvent.click(screen.getByRole('button', { name: /Ability points/ }))
    const names = [...cardNames('section.profile'), ...cardNames('section.total-stats')]
    expect(names).not.toContain('Level')
    expect(names).not.toContain('Max HP')
    expect(names).not.toContain('ATT van je wapen')
    expect(names).not.toContain('DEF')
    expect(names).toContain('Tijd per aanval (ms)')
  })

  it('zet de stats in twee kaarten zoals het statvenster: Ability points (STR, DEX, INT, LUK) en Total stats (#82)', () => {
    fireEvent.click(screen.getByRole('button', { name: /Ability points/ }))
    fireEvent.click(screen.getByRole('button', { name: /Total stats/ }))
    expect(cardNames('section.profile')).toEqual(['STR', 'DEX', 'INT', 'LUK'])
    expect(cardNames('section.total-stats')).toEqual(['Attack', 'W.ATT', 'M.ATT', 'Weapon Def', 'Magic', 'Magic Def', 'Accuracy', 'Evasion', 'Crit. Rate (%)', 'Crit. Damage (%)', 'Speed (%)', 'Jump (%)', 'Tijd per aanval (ms)'])
  })

  it('toont een ongeldige STR bij Ability points en niet bij Total stats (#82)', () => {
    fireEvent.click(screen.getByRole('button', { name: /Ability points/ }))
    const h = openStat('STR')
    h.type('5000')
    h.save()
    expect(panels()[0].querySelector('section.profile')!.classList.contains('invalid')).toBe(true)
    expect(panels()[0].querySelector('section.total-stats')!.classList.contains('invalid')).toBe(false)
  })

  it('slaat een decimale aanvalstijd op; dat vak heeft geen - en +', () => {
    fireEvent.click(screen.getByRole('button', { name: /Total stats/ }))
    const h = openStat('Tijd per aanval (ms)')
    expect(h.d.queryByRole('button', { name: /plus 1/ })).toBeNull()
    h.type('812.5')
    h.save()
    expect(profileFields().attackMs).toBe('812.5')
    expect(statShown('Tijd per aanval (ms)')).toBe('812.5')
  })

  it('toont de verwachte accuracy pas doorgestreept als het getal ervan afwijkt', () => {
    fireEvent.click(screen.getByRole('button', { name: /Total stats/ }))
    expect(statLine('Accuracy').querySelector('s')).toBeNull()
    const h = openStat('Accuracy')
    expect(h.d.getByText(/Verwacht volgens de formule/).textContent).toContain(DEFAULT_PROFILE.accuracy)
    h.type('40')
    h.save()
    expect(statShown('Accuracy')).toBe('40')
    expect(statLine('Accuracy').querySelector('s')?.textContent).toBe(DEFAULT_PROFILE.accuracy)
    expect(statLine('Accuracy').querySelector('.equip-value.changed')).not.toBeNull()
  })

  it('toont bij het voorbeeldprofiel de verwachte evasion doorgestreept: 23 in het spel, 22 volgens de formule', () => {
    fireEvent.click(screen.getByRole('button', { name: /Total stats/ }))
    expect(statShown('Evasion')).toBe(DEFAULT_PROFILE.avoid)
    expect(statLine('Evasion').querySelector('s')?.textContent).toBe('22')
  })

  it('zet een gecorrigeerde accuracy met Reset terug op de verwachting', () => {
    fireEvent.click(screen.getByRole('button', { name: /Total stats/ }))
    const first = openStat('Accuracy')
    first.type('40')
    first.save()
    const h = openStat('Accuracy')
    fireEvent.click(h.d.getByRole('button', { name: `Reset naar ${DEFAULT_PROFILE.accuracy}` }))
    h.save()
    expect(profileFields().accuracy).toBe(DEFAULT_PROFILE.accuracy)
    expect(statLine('Accuracy').querySelector('s')).toBeNull()
  })

  it('toont een ongeldige tijd per aanval op de karakterkaart, niet op de equipment-kaart', () => {
    fireEvent.click(screen.getByRole('button', { name: /Total stats/ }))
    const h = openStat('Tijd per aanval (ms)')
    h.type('50')
    h.save()
    const profile = panels()[0].querySelector('section.total-stats')!
    expect(profile.classList.contains('invalid')).toBe(true)
    expect(panels()[0].querySelector('section.profile')!.classList.contains('invalid')).toBe(false)
    expect(profile.querySelector('.error')?.textContent).not.toBe('')
    expect(cards()[0].classList.contains('invalid')).toBe(false)
  })

  it('gooit een gewijzigde stat weg bij sluiten zonder opslaan', () => {
    fireEvent.click(screen.getByRole('button', { name: /Ability points/ }))
    const h = openStat('LUK')
    h.type('77')
    h.close()
    expect(statShown('LUK')).toBe(DEFAULT_PROFILE.luk)
    expect(statLine('LUK').querySelector('dialog')).toBeNull()
  })

  it('verhoogt een stat met + en slaat op met Enter', () => {
    fireEvent.click(screen.getByRole('button', { name: /Ability points/ }))
    const h = openStat('LUK')
    fireEvent.click(h.d.getByRole('button', { name: 'LUK plus 1' }))
    expect(h.input().value).toBe(String(Number(DEFAULT_PROFILE.luk) + 1))
    fireEvent.keyDown(h.input(), { key: 'Enter' })
    expect(profileFields().luk).toBe(String(Number(DEFAULT_PROFILE.luk) + 1))
  })

  it('bewaart de gekozen mob als enige plek, en een andere mob vervangt hem', () => {
    expect(stored(STORAGE_KEY)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^Monster$/ }))
    const dialog = document.querySelector('section.hunted dialog.card-dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)
    const select = within(dialog).getByLabelText('De mob die je het meest killt') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'Pig' } })
    expect(stored(STORAGE_KEY).spots).toMatchObject([{ known: 'mob:Pig', monster: 'Pig' }])
    fireEvent.change(select, { target: { value: 'Slime' } })
    expect(stored(STORAGE_KEY).spots).toMatchObject([{ known: 'mob:Slime', monster: 'Slime' }])
    expect(select.value).toBe('Slime')
    expect(screen.getByRole('button', { name: /^Monster$/ }).textContent).toBe('Monster')
  })

  it('toont in de keuzelijst alleen naam en level, en de HP, EXP, schade en WDEF van de gekozen mob als regels', () => {
    fireEvent.click(screen.getByRole('button', { name: /^Monster$/ }))
    const select = screen.getByLabelText('De mob die je het meest killt') as HTMLSelectElement
    // Pig op MeowDB: 128 HP, 13 EXP, Touch DMG 16–22, P.DEF 0 (src/data/spots.ts).
    expect(Array.from(select.options).map((o) => o.textContent)).toContain('Pig (lv 7)')
    expect(Array.from(select.options).filter((o) => o.value !== '').every((o) => /^[A-Za-z ]+ \(lv \d+\)$/.test(o.textContent ?? ''))).toBe(true)
    fireEvent.change(select, { target: { value: 'Pig' } })
    const dialog = document.querySelector('section.hunted dialog.card-dialog') as HTMLElement
    const lines = Array.from(dialog.querySelectorAll('.stat-line .equip-value')).map((v) => v.getAttribute('aria-label'))
    expect(lines).toEqual(['HP 128', 'EXP 13', 'Dmg laag 16', 'Dmg hoog 22', 'WDEF 0'])
    // De EXP per meso hoort in de calculator zelf, niet op deze kaart (Dave, 4 oktober 2026).
    expect(dialog.textContent).not.toMatch(/EXP per meso|kills per uur|Bron/i)
    expect(screen.getByRole('button', { name: /^Monster$/ }).textContent).toBe('Monster')
  })

  // Dave, 4 oktober 2026: net als bij equipment pas je de monsterinfo aan als het spel iets anders zegt.
  it('past een eigenschap van de mob aan met het potlood, bewaart hem en rekent ermee', () => {
    fireEvent.click(screen.getByRole('button', { name: /^Monster$/ }))
    fireEvent.change(screen.getByLabelText('De mob die je het meest killt'), { target: { value: 'Pig' } })
    const before = document.querySelector('.summary')?.textContent
    const hp = openStat('HP')
    expect(hp.d.getByText('Verwacht volgens de database:')).toBeTruthy()
    hp.type('256')
    hp.save()
    expect(stored(STORAGE_KEY).spots).toMatchObject([{ known: 'mob:Pig', mobHp: '256' }])
    expect(statLine('HP').querySelector('.equip-value')!.getAttribute('aria-label')).toBe('HP 256, gecorrigeerd, verwacht 128')
    // Twee keer zoveel HP: minder kills per uur, dus een duurder level.
    expect(document.querySelector('.summary')?.textContent).not.toBe(before)
    const back = openStat('HP')
    fireEvent.click(back.d.getByRole('button', { name: 'Reset naar 128' }))
    back.save()
    expect(stored(STORAGE_KEY).spots[0].mobHp).toBeUndefined()
    expect(document.querySelector('.summary')?.textContent).toBe(before)
  })

  it('negeert een oud eigen aantal kills per uur uit de opslag: dat vul je niet meer in, de app rekent het zelf', () => {
    const summary = (spot: object) => {
      cleanup()
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, spots: [spot] }))
      render(<App />)
      return document.querySelector('.summary')?.textContent
    }
    const own = summary({ ...mobDraft('Pig'), kills: '1' })
    expect(own).toMatch(/^Op Pig/)
    expect(own).toBe(summary(mobDraft('Pig')!))
  })

  it('zet de aanpassingen terug als je een andere mob kiest', () => {
    fireEvent.click(screen.getByRole('button', { name: /^Monster$/ }))
    const select = screen.getByLabelText('De mob die je het meest killt') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'Pig' } })
    const wdef = openStat('WDEF')
    wdef.type('5')
    wdef.save()
    expect(stored(STORAGE_KEY).spots[0].mobWdef).toBe('5')
    fireEvent.change(select, { target: { value: 'Slime' } })
    expect(stored(STORAGE_KEY).spots[0].mobWdef).toBeUndefined()
    expect(statLine('WDEF').querySelector('.equip-value')!.getAttribute('aria-label')).toBe('WDEF 10')
  })

  it('rekent met de gekozen mob: de kosten van het level verschijnen', () => {
    expect(document.querySelector('.summary')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^Monster$/ }))
    fireEvent.change(screen.getByLabelText('De mob die je het meest killt'), { target: { value: 'Pig' } })
    expect(document.querySelector('.summary')?.textContent).toMatch(/^Op Pig · lv 10: kost ± [\d.]+ meso$/)
  })

  it('toont de equipment op het controlescherm direct op de kaart, zonder popup (#106)', () => {
    levelUp()
    expect(within(cards()[1]).queryByRole('button', { name: /Je equipment/ })).toBeNull()
    expect(cards()[1].querySelector('dialog')).toBeNull()
    expect(within(cards()[1]).getByLabelText('Zoek je Weapon')).toBeTruthy()
  })

  it('bewaart de gekozen job', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Warrior' }))
    expect(stored(JOB_KEY).job).toBe('warrior')
  })

  it('bewaart de gekozen stars en zet hun weapon attack en herlaadprijs in het profiel', () => {
    openHomeEquipment()
    pick(cards()[0], 'Ammo', 'Wolbi Throwing Stars')
    expect(slots().ammo.pick).toBe('Wolbi Throwing Stars')
    expect(profileFields().starWatk).toBe('17')
    expect(profileFields().starRecharge).toBe('0.4')
  })

  it('toont bij Total stats de Attack als schadebereik uit je ability points en je equipment: claw plus stars (#82, #108)', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    pick(cards()[0], 'Ammo', 'Wolbi Throwing Stars')
    fireEvent.click(screen.getByRole('button', { name: /Total stats/ }))
    expect(profileFields().clawWatk).toBe(String(IGOR.watk))
    expect(statShown('Attack')).toBe(rangeOf('thief'))
    expect(statShown('Attack')).not.toBe(String(IGOR.watk + 17))
    expect(within(statLine('Attack')).queryByRole('button')).toBeNull()
    expect(statShown('W.ATT')).toBe(String(IGOR.watk + 17))
    expect(statShown('M.ATT')).toBe('0')
  })

  it('toont bij Total stats de Magic Def uit je equipment, alleen om te lezen; zolang een slot open is vul je hem zelf in (#91)', () => {
    openHomeEquipment()
    fireEvent.click(screen.getByRole('button', { name: /Total stats/ }))
    const h = openStat('Magic Def')
    h.type('5')
    h.save()
    expect(statShown('Magic Def')).toBe('5')
    pick(cards()[0], 'Hat', 'Bronze Pride')
    pick(cards()[0], 'Top', 'Red Pao')
    pick(cards()[0], 'Bottom', 'Red Pao Bottoms')
    expect(statShown('Magic Def')).toBe('5')
    pick(cards()[0], 'Shoes', 'Red Enamel Boots')
    expect(statShown('Magic Def')).toBe('18')
    expect(within(statLine('Magic Def')).queryByRole('button')).toBeNull()
  })

  it('toont het ammo-slot zonder "optioneel", net als elk slot (#117): leeg blijft het advies gewoon rekenen', () => {
    openHomeEquipment()
    const row = rowOf(cards()[0], 'Ammo')
    expect(row.querySelector('.slot-name')?.textContent).toBe('Ammo')
    expect(searchBox(cards()[0], 'Ammo').placeholder).toBe('Zoek wat je draagt')
    expect(slots()?.ammo?.pick ?? 'unknown').toBe('unknown')
    expect(profileFields()?.starWatk ?? DEFAULT_PROFILE.starWatk).toBe(DEFAULT_PROFILE.starWatk)
  })

  it('biedt bij een Bowman pijlen aan in het ammo-slot', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Bowman' }))
    openHomeEquipment()
    const row = typeIn(cards()[0], 'Ammo', 'Arrows')
    expect(options(row).map((o) => o.querySelector('.equip-name')?.textContent)).toContain('Arrows for Bows')
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

  it('klapt bij een slot zonder items (Gloves, #117) toch open met wat je doet, en neemt dan je eigen item', () => {
    openHomeEquipment()
    const row = typeIn(cards()[0], 'Gloves', '')
    expect(row.querySelector('.equip-list li.more')?.textContent).toBe('Hier kent de app nog geen items: typ de naam van wat je draagt.')
    pickOwn(cards()[0], 'Gloves', 'Work Gloves')
    expect(worn(cards()[0], 'Gloves')).toBe('Work Gloves')
    expect(slots().gloves.pick).toBe('other')
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
    for (const slot of ['Weapon', 'Hat', 'Top', 'Bottom', 'Overall', 'Shoes']) expect(badge(cards()[1], slot)).toBeNull()
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
  // De app rekent met de mob waarop je jaagt.
  beforeEach(() => {
    cleanup()
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        spots: [mobDraft('Ribbon Pig')],
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
        spots: [mobDraft('Pig')],
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
      expect(home.textContent).toMatch(/Op .* · lv 20: kost /)
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

    it('toont geen uitleg boven de slots (net als de Thief) en laat bij Top en Bottom zoeken', () => {
      openHomeEquipment()
      expect(cards()[0].querySelector('.hint')).toBeNull()
      for (const slot of ['Top', 'Bottom']) expect(options(typeIn(cards()[0], slot, '')).length).toBeGreaterThan(0)
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

    it('toont bij je karakter de weapon multiplier en STR, zonder uitleg eronder', () => {
      fireEvent.click(screen.getByRole('button', { name: /Total stats/ }))
      const home = panels()[0]
      expect(statShown('Weapon multiplier van je wapen')).toBe('1.8')
      // Geen uitleg in de popup: die leest een speler toch niet (Dave, 4 oktober 2026).
      expect(home.querySelector('dialog .hint')).toBeNull()
      expect(home.textContent).not.toMatch(/Subi|stars|rekent met Power Strike|geen munitie|per soort wapen/)
      fireEvent.click(within(home.querySelector('dialog')!).getByRole('button', { name: 'Sluiten' }))
      fireEvent.click(screen.getByRole('button', { name: /Ability points/ }))
      expect(statShown('STR')).toBe('90')
    })

    it('toont bij Total stats de Attack als schadebereik van het wapen en je STR, zonder stars (#82, #108)', () => {
      fireEvent.click(screen.getByRole('button', { name: /Total stats/ }))
      expect(statShown('Attack')).toBe(rangeOf('warrior'))
      expect(statShown('W.ATT')).toBe('40')
      expect(statShown('M.ATT')).toBe('0')
    })

    it('zet de stats in twee kaarten, met de weapon multiplier als laatste onder Total stats (#82)', () => {
      fireEvent.click(screen.getByRole('button', { name: /Ability points/ }))
      fireEvent.click(screen.getByRole('button', { name: /Total stats/ }))
      expect(cardNames('section.profile')).toEqual(['STR', 'DEX', 'INT', 'LUK'])
      expect(cardNames('section.total-stats')).toEqual(['Attack', 'W.ATT', 'M.ATT', 'Weapon Def', 'Magic', 'Magic Def', 'Accuracy', 'Evasion', 'Crit. Rate (%)', 'Crit. Damage (%)', 'Speed (%)', 'Jump (%)', 'Tijd per aanval (ms)', 'Weapon multiplier van je wapen'])
    })

    it('past de weapon multiplier aan via het potlood, en toont geen Ammo-slot', () => {
      fireEvent.click(screen.getByRole('button', { name: /Total stats/ }))
      const editor = openStat('Weapon multiplier van je wapen')
      editor.type('2.4')
      editor.save()
      expect(profileFields().weaponMult).toBe('2.4')
      expect(statShown('Weapon multiplier van je wapen')).toBe('2.4')
      expect(statLine('Weapon multiplier van je wapen').querySelector('s')).toBeNull()
      openHomeEquipment()
      expect(cards()[0].textContent).not.toMatch(/Ammo/)
    })

    it('toont de verwachte Warrior-accuracy en -evasion doorgestreept als je getal afwijkt (#77)', () => {
      fireEvent.click(screen.getByRole('button', { name: /Total stats/ }))
      // floor((1,2 x 20 + 2 x 20 + 0,6 x 4) / 2,5 + 10) = floor(36,56) = 36; avoid floor(4 / 3) + floor(20 / 6) + 5 = 9
      expect(statLine('Accuracy').querySelector('s')?.textContent).toBe('36')
      expect(statLine('Evasion').querySelector('s')?.textContent).toBe('9')
    })

    it('toont bij Skillpoints de skills van de Warrior en niet die van de Thief', () => {
      const skills = openHomeSkills()
      for (const name of ['Power Strike', 'Slash Blast', 'Precise Strikes', 'Iron Body']) expect(skills.textContent, name).toContain(name)
      for (const name of ['Lucky Seven', 'Nimble Body', 'Dark Sight']) expect(skills.textContent, name).not.toContain(name)
    })

    it('toont bij elke skill de MP per keer op het gezette level, en bij een passieve skill dat hij niets kost (#83)', () => {
      const skills = openHomeSkills()
      const row = (name: string) => within(skills).getByLabelText(new RegExp(`^${name}, level van 0 tot`)).closest('.skill-row')!
      const input = (name: string) => within(skills).getByLabelText(new RegExp(`^${name}, level van 0 tot`)) as HTMLInputElement
      fireEvent.input(input('Slash Blast'), { target: { value: '20' } })
      // Slash Blast 20 kost 12 MP (de skillpagina, data/warrior.ts).
      expect(row('Slash Blast').querySelector('.skill-mp')?.textContent).toBe('12 MP per keer')
      fireEvent.input(input('Iron Body'), { target: { value: '0' } })
      expect(row('Iron Body').querySelector('.skill-mp')?.textContent).toBe('15 MP per keer op level 1')
      expect(row('Precise Strikes').querySelector('.skill-mp')?.textContent).toBe('Passief, kost geen MP')
      // Een veld dat geen geldig level is, krijgt geen MP: het veld meldt de fout zelf.
      fireEvent.input(input('Power Strike'), { target: { value: '' } })
      expect(row('Power Strike').querySelector('.skill-mp')?.textContent).toBe('')
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
    fireEvent.click(screen.getByRole('button', { name: /Total stats/ }))
    expect(panels()[0].querySelector('dialog .hint')).toBeNull()
    expect(panels()[0].textContent).not.toMatch(/Weapon multiplier|De app rekent met de stars/)
  })
})

describe('het geslacht (issue #55)', () => {
  const GENDER_KEY = 'mesowise.gender.v1'
  const JOB_HINT = /Kies je geslacht, dan houdt het advies daar rekening mee\./
  const ARMOR_HINT = 'Armor die alleen voor mannen of alleen voor vrouwen is, telt nog niet mee: kies bovenaan je geslacht.'
  // De zichtbare jobkaart: in het menu als dat open staat, anders op het beginscherm (#86).
  const card = () => (document.querySelector<HTMLElement>('dialog section.job') ?? document.querySelector<HTMLElement>('section.job'))!
  const group = () => within(card()).getByRole('group', { name: 'Gender:' })
  const button = (name: 'Male' | 'Female') => within(group()).getByRole('button', { name })
  const pressed = (name: 'Male' | 'Female') => button(name).getAttribute('aria-pressed')

  it('toont de groep Gender: met de knoppen Male en Female, allebei nog niet gekozen, en een hint', () => {
    expect(within(group()).getAllByRole('button').map((b) => b.textContent)).toEqual(['Male', 'Female'])
    expect(pressed('Male')).toBe('false')
    expect(pressed('Female')).toBe('false')
    expect(screen.getByText(JOB_HINT)).toBeTruthy()
  })

  it('schrijft niets weg zolang de speler niets kiest', () => {
    expect(localStorage.getItem(GENDER_KEY)).toBeNull()
  })

  const JOB_KEY = 'mesowise.job.v1'
  const jobTitle = () => card().querySelector('h2')!.textContent
  const withWarrior = (gender?: 'male' | 'female') => {
    cleanup()
    localStorage.setItem(JOB_KEY, JSON.stringify({ version: 1, job: 'warrior' }))
    if (gender) localStorage.setItem(GENDER_KEY, JSON.stringify({ version: 1, gender }))
    render(<App />)
    // Met job en geslacht gekozen staat de kaart alleen nog in het menu.
    if (gender) fireEvent.click(screen.getByRole('button', { name: 'Instellingen' }))
  }

  it('bewaart bij een klik op Female meteen de keuze (de eerste keuze); de rij Gender: en de hint verdwijnen (Dave: scheelt hoogte)', () => {
    fireEvent.click(button('Female'))
    expect(stored(GENDER_KEY)).toEqual({ version: 1, gender: 'female' })
    expect(screen.queryByRole('group', { name: 'Gender:' })).toBeNull()
    expect(screen.queryByText(JOB_HINT)).toBeNull()
  })

  it('toont de uitleg "Kies je job; daarna ligt hij vast" niet meer (Dave, 4 oktober 2026)', () => {
    expect(screen.queryByText(/daarna ligt hij vast/)).toBeNull()
  })

  it('heeft voor job en geslacht dezelfde soort kop: "Job:" zolang je kiest, en "Gender:"', () => {
    expect(jobTitle()).toBe('Job:')
    const [job, gender] = Array.from(card().querySelectorAll('h2'))
    expect(gender.tagName).toBe(job.tagName)
    expect(gender.textContent).toBe('Gender:')
  })

  it('zet het gekozen geslacht als (m) of (f) achter de job in de kop', () => {
    withWarrior()
    expect(jobTitle()).toBe('Warrior')
    fireEvent.click(button('Female'))
    // Job en geslacht gekozen: de kaart staat nu alleen nog in het menu.
    fireEvent.click(screen.getByRole('button', { name: 'Instellingen' }))
    expect(jobTitle()).toBe('Warrior (f)')
    withWarrior('male')
    expect(jobTitle()).toBe('Warrior (m)')
  })

  const pencil = () => within(card()).getByRole('button', { name: /^Job en geslacht (niet )?wijzigen$/ })
  const save = () => within(card()).queryByRole('button', { name: 'Opslaan' })
  const jobButton = (name: string) => within(within(card()).getByRole('group', { name: 'Job:' })).getByRole('button', { name })

  it('toont met het potlood de rij weer, met je keuze ingedrukt, en nog geen Opslaan', () => {
    withWarrior('female')
    expect(screen.queryByRole('group', { name: 'Gender:' })).toBeNull()
    fireEvent.click(pencil())
    expect(pressed('Female')).toBe('true')
    expect(pressed('Male')).toBe('false')
    expect(save()).toBeNull()
  })

  it('laat met het potlood open Opslaan verschijnen zodra je iets wijzigt, en weer verdwijnen als je terugkiest', () => {
    withWarrior('female')
    fireEvent.click(pencil())
    fireEvent.click(button('Male'))
    expect(pressed('Male')).toBe('true')
    expect(save()).toBeTruthy()
    // Nog niets vastgelegd: alleen een concept.
    expect(stored(GENDER_KEY)).toEqual({ version: 1, gender: 'female' })
    fireEvent.click(button('Female'))
    expect(save()).toBeNull()
  })

  it('legt bij Opslaan job en geslacht samen vast en sluit de rijen', () => {
    withWarrior('female')
    fireEvent.click(pencil())
    fireEvent.click(jobButton('Thief'))
    fireEvent.click(button('Male'))
    fireEvent.click(save()!)
    expect(stored(GENDER_KEY)).toEqual({ version: 1, gender: 'male' })
    expect(stored(JOB_KEY)).toEqual({ version: 1, job: 'thief' })
    expect(screen.queryByRole('group', { name: 'Gender:' })).toBeNull()
    expect(save()).toBeNull()
    expect(jobTitle()).toBe('Thief (m)')
  })

  it('toont een kruis in plaats van het potlood zolang de keuze open staat', () => {
    withWarrior('female')
    const icon = () => pencil().querySelector('path')!.getAttribute('d')
    const closed = icon()
    fireEvent.click(pencil())
    expect(icon()).toBe('M6 6l12 12M18 6L6 18')
    fireEvent.click(pencil())
    expect(icon()).toBe(closed)
  })

  it('gooit het concept weg als je het potlood weer dichtklikt', () => {
    withWarrior('female')
    fireEvent.click(pencil())
    fireEvent.click(jobButton('Thief'))
    fireEvent.click(button('Male'))
    fireEvent.click(pencil())
    expect(stored(GENDER_KEY)).toEqual({ version: 1, gender: 'female' })
    expect(jobTitle()).toBe('Warrior (f)')
    fireEvent.click(pencil())
    expect(pressed('Female')).toBe('true')
    expect(save()).toBeNull()
  })

  it('leest een bewaarde keuze bij het starten: geen rij Gender: en geen hint', () => {
    withWarrior('female')
    expect(screen.queryByRole('group', { name: 'Gender:' })).toBeNull()
    expect(screen.queryByText(JOB_HINT)).toBeNull()
    expect(jobTitle()).toBe('Warrior (f)')
  })

  it('behandelt een onbruikbare bewaarde keuze als nog niet gekozen', () => {
    cleanup()
    localStorage.setItem(GENDER_KEY, JSON.stringify({ version: 1, gender: 'other' }))
    render(<App />)
    expect(pressed('Male')).toBe('false')
    expect(pressed('Female')).toBe('false')
    expect(screen.getByText(JOB_HINT)).toBeTruthy()
  })

  describe('op het adviesscherm', () => {
    const toAdvice = () => {
      cleanup()
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          spots: [mobDraft('Ribbon Pig')],
        }),
      )
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, fields: { ...DEFAULT_PROFILE, luckySeven: '2', luk: '60' } }))
      render(<App />)
      levelUp()
      fireEvent.click(screen.getByRole('button', { name: 'Alles klopt, toon advies' }))
    }
    const armorSection = () => screen.getByText('Moet ik mijn defense nu upgraden?').closest('section')!

    it('toont bij de armorvraag de hint zolang het geslacht niet gekozen is', () => {
      toAdvice()
      expect(within(armorSection()).getByText(ARMOR_HINT)).toBeTruthy()
    })

    it('toont de hint niet meer als het geslacht al gekozen was (bewaard)', () => {
      localStorage.setItem(GENDER_KEY, JSON.stringify({ version: 1, gender: 'male' }))
      toAdvice()
      expect(within(armorSection()).queryByText(ARMOR_HINT)).toBeNull()
    })
  })
})

describe('een Bowman in de app', () => {
  // Level 20 Bowman: DEX 80 voor schade, STR 20, een War Bow (30 ATT, 810 ms) en Arrow Blow 1.
  const bowmanFields = { ...DEFAULT_PROFILE, level: '20', hp: '800', str: '20', dex: '80', luk: '4', clawWatk: '30', attackMs: '810', accuracy: '60', avoid: '10', wdef: '60', arrowBlow: '1' }
  const open = () => {
    cleanup()
    localStorage.setItem(JOB_KEY, JSON.stringify({ version: 1, job: 'bowman' }))
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, fields: bowmanFields }))
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        spots: [mobDraft('Ribbon Pig')],
      }),
    )
    render(<App />)
  }
  const toAdvice = () => {
    levelUp()
    fireEvent.click(screen.getByRole('button', { name: 'Alles klopt, toon advies' }))
  }
  const NOT_YET = /Nog niet doorgerekend/
  const found = (slot: string, text: string) => options(typeIn(cards()[0], slot, text)).map((o) => o.querySelector('.equip-name')?.textContent)
  const costText = () => within(panels()[0]).getByText('Wat kost dit level?').closest('section')!.querySelector('.level-cost-value')!.textContent

  describe('het beginscherm', () => {
    beforeEach(open)

    it('toont een getal voor wat het level kost en niet "Nog niet doorgerekend"', () => {
      const home = panels()[0]
      expect(home.textContent).toMatch(/Op .* · lv 20: kost /)
      expect(costText()).toMatch(/±\s*[\d.]+ meso|Gratis|Niet haalbaar/)
      expect(home.textContent).not.toMatch(NOT_YET)
      expect(home.querySelector('.debug')).toBeNull()
    })

    it('rekent met het Bowman-model: de kosten verschillen van die van een Thief met dezelfde velden', () => {
      const bowmanCost = costText()
      localStorage.setItem(JOB_KEY, JSON.stringify({ version: 1, job: 'thief' }))
      cleanup()
      render(<App />)
      expect(bowmanCost).toBeTruthy()
      expect(costText()).toBeTruthy()
      expect(costText()).not.toBe(bowmanCost)
    })

    it('biedt de bronze pijlen pas aan met "Ik heb Helpful Stranger" aan, rekent ermee, en valt bij uitzetten terug (#64)', () => {
      openHomeEquipment()
      const card = cards()[0]
      const sw = within(card).getByLabelText(/Ik heb Helpful Stranger/) as HTMLInputElement
      expect(sw.checked).toBe(false)
      expect(found('Ammo', 'Bronze').filter((n) => !n?.startsWith('Gebruik'))).toEqual([])
      fireEvent.click(sw)
      expect(profileFields().helpfulStranger).toBe('1')
      expect(found('Ammo', 'Bronze')).toEqual(['Bronze Arrows for Bows', 'Bronze Arrows for Crossbows', 'Gebruik "Bronze" als eigen item'])
      pick(card, 'Ammo', 'Bronze Arrows for Bows')
      expect(profileFields().bronzeArrows).toBe('1')
      expect(card.textContent).toContain('Bronze pijlen')
      fireEvent.click(within(card).getByLabelText(/Ik heb Helpful Stranger/))
      expect(profileFields()).toMatchObject({ helpfulStranger: '0', bronzeArrows: '0' })
      expect(slots().ammo.pick).toBe('Arrows for Bows')
      expect(found('Ammo', 'Bronze').filter((n) => !n?.startsWith('Gebruik'))).toEqual([])
    })

    it('zoekt bij Weapon in de bogen en kruisbogen, bij Ammo in de pijlen, en niet in claws of Warrior-wapens', () => {
      openHomeEquipment()
      expect(found('Weapon', 'Balanche')).toContain('Balanche')
      expect(found('Weapon', 'Meba')).not.toContain('Meba')
      expect(found('Weapon', 'Gladius')).not.toContain('Gladius')
      expect(found('Ammo', 'Arrows')).toEqual(expect.arrayContaining(['Arrows for Bows', 'Arrows for Crossbows']))
      expect(found('Hat', 'Hunter')).toContain('Hunter')
      expect(found('Hat', 'Red Thief Hood')).not.toContain('Red Thief Hood')
    })

    it('zet bij een gekozen boog weapon attack en aanvalssnelheid in het bewaarde profiel (Balanche: 39 en 840 ms) en laat de rest staan', () => {
      openHomeEquipment()
      pick(cards()[0], 'Weapon', 'Balanche')
      expect(profileFields().clawWatk).toBe('39')
      expect(profileFields().attackMs).toBe('840')
      expect(profileFields().weaponMult).toBe(DEFAULT_PROFILE.weaponMult)
      expect(profileFields().dex).toBe('80')
      expect(profileFields().wdef).toBe('60')
    })

    it('toont bij Ability points DEX en STR, en bij Total stats geen uitleg, weapon multiplier, Subi of stars', () => {
      fireEvent.click(screen.getByRole('button', { name: /Ability points/ }))
      fireEvent.click(screen.getByRole('button', { name: /Total stats/ }))
      const home = panels()[0]
      expect(statShown('DEX')).toBe('80')
      expect(statShown('STR')).toBe('20')
      expect(home.querySelector('dialog.card-dialog .hint')).toBeNull()
      expect(home.textContent).not.toMatch(/Arrow Blow als je hem hebt geleerd|1 meso per pijl|Weapon multiplier|Subi|stars/)
    })

    it('toont de verwachte Bowman-accuracy en -evasion doorgestreept als je getal afwijkt', () => {
      fireEvent.click(screen.getByRole('button', { name: /Total stats/ }))
      // floor((1,2 x 80 + 2 x 20 + 0,6 x 4) / 4,8 + 20) = floor(138,4 / 4,8 + 20) = floor(48,83) = 48; avoid floor(4 / 3) + floor(80 / 6) + 5 = 1 + 13 + 5 = 19
      expect(statLine('Accuracy').querySelector('s')?.textContent).toBe('48')
      expect(statLine('Evasion').querySelector('s')?.textContent).toBe('19')
    })

    it('toont bij Skillpoints de skills van de Bowman en niet die van de Warrior of de Thief', () => {
      const skills = openHomeSkills()
      for (const name of ['Arrow Blow', 'Double Shot', 'Critical Shot', 'The Eye of Amazon', 'Focus']) expect(skills.textContent, name).toContain(name)
      for (const name of ['Lucky Seven', 'Power Strike', 'Dark Sight']) expect(skills.textContent, name).not.toContain(name)
    })

    it('toont het ammo-slot', () => {
      openHomeEquipment()
      expect(cards()[0].textContent).toMatch(/Ammo/)
    })
  })

  describe('het adviesscherm na een level-up', () => {
    beforeEach(() => {
      open()
      toAdvice()
    })

    it('verhoogt het level, geeft +22 HP en laat STR, DEX en LUK staan', () => {
      expect(profileFields().level).toBe('21')
      expect(profileFields().hp).toBe('822')
      expect(profileFields().str).toBe('20')
      expect(profileFields().dex).toBe('80')
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

    it('noemt bij de skillvraag de Bowman-skills die niet zijn doorgerekend, en geen Thief- of Warrior-skills', () => {
      const text = panels()[2].textContent!
      expect(text).toMatch(/Niet doorgerekend: Double Shot, Critical Shot, The Eye of Amazon en Focus/)
      expect(text).not.toMatch(/Keen Eyes|Dark Sight|Lucky Seven|Slash Blast/)
    })

    it('rekent Arrow Blow als enige skill door en zegt eerlijk dat een extra punt niets bespaart', () => {
      // Dit profiel (DEX 80, 30 ATT) heeft elke Rain Forest-kill in 2 schoten; 4% meer schade van Arrow Blow 1 → 2 verandert dat niet.
      const section = within(panels()[2]).getByText('Moet ik mijn skillpunt nu verhogen?').closest('section')!
      expect(section.querySelector('.verdict')!.textContent).toBe('Geen van de skills die de app kan doorrekenen bespaart iets.')
      expect(screen.queryByRole('button', { name: 'Punt zetten' })).toBeNull()
    })

    it('noemt wapens, geen claws', () => {
      const weapon = within(panels()[2]).getByText('Moet ik mijn attack nu upgraden?').closest('section')!
      expect(weapon.textContent).not.toMatch(/claw/i)
      expect(weapon.textContent).toMatch(/wapen|boog/)
    })
  })
})

describe('een Magician in de app', () => {
  // Level 20, INT 60, LUK 10, een Sapphire Staff (M.ATT 31) en Energy Bolt 1.
  const magicianFields = { ...DEFAULT_PROFILE, level: '20', hp: '600', int: '60', dex: '20', luk: '10', clawWatk: '31', accuracy: '40', avoid: '10', wdef: '40', energyBolt: '1', magicClaw: '0' }
  const open = (over: Partial<typeof magicianFields> = {}) => {
    cleanup()
    localStorage.setItem(JOB_KEY, JSON.stringify({ version: 1, job: 'magician' }))
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, fields: { ...magicianFields, ...over } }))
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        spots: [mobDraft('Ribbon Pig')],
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
    beforeEach(() => open())

    it('zet de job achter het level en niet achter Ability points', () => {
      expect(document.querySelector('.current-level')?.textContent).toBe('Level 20 (Magician)')
      expect(screen.getByRole('button', { name: /Ability points/ }).textContent).not.toMatch(/Magician/)
    })

    it('toont een getal voor wat het level kost en niet "Nog niet doorgerekend"', () => {
      const home = panels()[0]
      expect(within(home).getByText('Wat kost dit level?').closest('section')!.textContent).toMatch(/±\s*[\d.]+ meso|Gratis|Niet haalbaar/)
      expect(home.textContent).not.toMatch(NOT_YET)
      expect(home.querySelector('.debug')).toBeNull()
    })

    it('zoekt bij Weapon in de wands en staffs en niet in Thief-claws of Warrior-wapens, en bij Hat en Shoes in Magician-armor', () => {
      openHomeEquipment()
      const found = (slot: string, text: string) => options(typeIn(cards()[0], slot, text)).map((o) => o.querySelector('.equip-name')?.textContent)
      expect(found('Weapon', 'Mithril Wand')).toContain('Mithril Wand')
      expect(found('Weapon', 'Meba')).not.toContain('Meba')
      expect(found('Weapon', 'Gladius')).not.toContain('Gladius')
      expect(found('Hat', 'Wizardry Hat')).toContain('Wizardry Hat')
      expect(found('Hat', 'Red Thief Hood')).not.toContain('Red Thief Hood')
      expect(found('Shoes', 'Wind Shoes')).toContain('Wind Shoes')
    })

    it('toont geen Ammo-slot', () => {
      openHomeEquipment()
      expect(cards()[0].textContent).not.toMatch(/Ammo/)
    })

    it('noemt de stat van het wapen M.ATT, zet hem bij een gekozen wand in het profiel, met 810 ms, en laat de rest staan', () => {
      openHomeEquipment()
      pick(cards()[0], 'Weapon', 'Mithril Wand')
      expect(profileFields().clawWatk).toBe('55')
      expect(profileFields().attackMs).toBe('810')
      expect(rowOf(cards()[0], 'Weapon').querySelector('.equip-value')!.getAttribute('aria-label')).toBe('M.ATT 55')
      expect(profileFields().int).toBe('60')
      expect(profileFields().wdef).toBe('40')
    })

    it('laat de M.ATT van het wapen via het potlood corrigeren', () => {
      openHomeEquipment()
      pick(cards()[0], 'Weapon', 'Mithril Wand')
      const row = rowOf(cards()[0], 'Weapon')
      fireEvent.click(within(row).getByRole('button', { name: 'M.ATT corrigeren' }))
      const dialog = row.querySelector('dialog') as HTMLDialogElement
      expect(dialog).not.toBeNull()
      expect(within(dialog).getByLabelText('M.ATT in game')).toBeTruthy()
    })

    it('toont bij Ability points INT (het veld van alle jobs) en bij Total stats geen tijd per aanval, multiplier of Subi-zin, en W.ATT 0 naast M.ATT (#100)', () => {
      fireEvent.click(screen.getByRole('button', { name: /Ability points/ }))
      fireEvent.click(screen.getByRole('button', { name: /Total stats/ }))
      const home = panels()[0]
      expect(statShown('INT')).toBe('60')
      expect(statShown('LUK')).toBe('10')
      const names = Array.from(home.querySelectorAll('.stat-line-name')).map((e) => e.textContent)
      expect(names).toEqual(expect.arrayContaining(['STR', 'DEX', 'INT', 'LUK', 'Accuracy', 'Evasion']))
      for (const n of ['Tijd per aanval (ms)', 'Weapon multiplier van je wapen']) expect(names, n).not.toContain(n)
      // Zijn wapen geeft M.ATT, geen weapon attack: de Attack uit het statvenster leidt de app niet af.
      expect(statShown('Attack')).toBe('?')
      // Geen uitleg in de popup: die leest een speler toch niet (Dave, 4 oktober 2026, #106).
      expect(home.querySelector('dialog .hint')).toBeNull()
      expect(home.textContent).not.toMatch(/Subi|stars|Weapon multiplier|Een cast duurt|Een Magician heeft geen munitie/)
      // W.ATT staat op 0 en M.ATT toont MagicTotal = floor(60 / 2) + 31 = 61 (#100).
      expect(statShown('W.ATT')).toBe('0')
      expect(statShown('M.ATT')).toBe('61')
      expect(within(statLine('M.ATT')).queryByRole('button')).toBeNull()
    })

    it('toont de verwachte Magician-accuracy en -avoid doorgestreept als je getal afwijkt (#77)', () => {
      fireEvent.click(screen.getByRole('button', { name: /Total stats/ }))
      // Accuracy: (12 x 60 + 20 x 20 + 6 x 10 + 1020) / 51 = 2200 / 51 = 43,1, dus 43. Avoid: floor(10 / 3) + floor(20 / 6) + 5 = 11.
      expect(statLine('Accuracy').querySelector('s')?.textContent).toBe('43')
      expect(statLine('Evasion').querySelector('s')?.textContent).toBe('11')
    })

    it('toont bij Skillpoints de skills van de Magician en niet die van de Thief of Warrior', () => {
      const skills = openHomeSkills()
      for (const name of ['Magic Guard', 'Magic Armor', 'Improved MP Recovery', 'Max MP Increase', 'Energy Bolt', 'Magic Claw']) expect(skills.textContent, name).toContain(name)
      for (const name of ['Lucky Seven', 'Nimble Body', 'Dark Sight', 'Power Strike', 'Slash Blast']) expect(skills.textContent, name).not.toContain(name)
    })

    it('noemt bij het wapenadvies wands en staffs, geen claws', () => {
      const home = panels()[0]
      expect(home.textContent).not.toContain('Loont een nieuwe claw?')
      expect(home.textContent).toContain('Loont een nieuwe wand of staff?')
    })
  })

  describe('het adviesscherm na een level-up', () => {
    beforeEach(() => {
      open()
      toAdvice()
    })

    it('verhoogt het level, geeft +16 HP en laat INT en LUK staan', () => {
      expect(profileFields().level).toBe('21')
      expect(profileFields().hp).toBe('616')
      expect(profileFields().int).toBe('60')
      expect(profileFields().luk).toBe('10')
    })

    it('toont alle vier de vragen met een antwoord en nergens "Nog niet doorgerekend"', () => {
      const advice = panels()[2]
      expect(advice.textContent).not.toMatch(NOT_YET)
      expect(advice.textContent).toContain('Moet ik mijn attack nu upgraden?')
      expect(advice.textContent).toContain('Moet ik mijn defense nu upgraden?')
      expect(advice.textContent).toContain('Moet ik mijn skillpunt')
      expect(advice.textContent).toContain('Moet ik mijn hunting ground nu upgraden?')
    })

    it('noemt bij de skillvraag de Magician-skills die niet zijn doorgerekend, en geen Thief- of Warrior-skills', () => {
      const text = panels()[2].textContent!
      expect(text).toMatch(/Niet doorgerekend: Magic Guard, Magic Armor, Improved MP Recovery en Max MP Increase/)
      expect(text).not.toMatch(/Keen Eyes|Dark Sight|Lucky Seven|Power Strike|Slash Blast/)
    })

    it('noemt Magic Claw niet als punt zolang Energy Bolt op 0 staat', () => {
      open({ energyBolt: '0' })
      toAdvice()
      const section = within(panels()[2]).getByText('Moet ik mijn skillpunt nu verhogen?').closest('section')!
      expect(section.textContent).not.toContain('Magic Claw → 1')
    })

    it('noemt wands en staffs, geen claws', () => {
      const claw = within(panels()[2]).getByText('Moet ik mijn attack nu upgraden?').closest('section')!
      expect(claw.textContent).not.toMatch(/claw/i)
      expect(claw.textContent).toMatch(/wand of staff|wapen/)
    })
  })

  it('geeft als skillpunt Energy Bolt (→ 4), met zijn MP, en zet het punt in het bewaarde profiel', () => {
    // Gemeten met skillPointAdvice voor dit profiel (INT 20, M.ATT 10, Energy Bolt 3): Energy Bolt wint; Magic Claw 1 geeft evenveel schade per cast en spaart niets.
    open({ int: '20', clawWatk: '10', energyBolt: '3' })
    toAdvice()
    const button = screen.getByRole('button', { name: 'Punt zetten' })
    const section = button.closest('section')!
    expect(section.querySelector('.verdict')!.textContent).toBe('Zet je skillpunt in Energy Bolt (→ 4).')
    // Energy Bolt 3 en 4 kosten allebei 8 MP per cast (de skillpagina).
    expect(section.textContent).toContain('Elke cast kost je dan 8 → 8 MP.')
    expect(profileFields().energyBolt).toBe('3')
    fireEvent.click(button)
    expect(profileFields().energyBolt).toBe('4')
    expect(profileFields().magicClaw).toBe('0')
    expect(profileFields().level).toBe('21')
    expect(screen.getByText('Energy Bolt → 4 gezet.')).toBeTruthy()
  })

  it('toont op het controlescherm INT bovenaan, met de zin over de AP', () => {
    open()
    levelUp()
    const check = panels()[1]
    expect(check.textContent).toContain('Verdeel je AP zelf: INT voor schade en accuracy, LUK voor wapen-eisen.')
    const labels = Array.from(check.querySelectorAll('.stats .stat-row-name, .stats label, .stats span')).map((e) => e.textContent)
    expect(labels).toContain('INT')
  })
})

describe('de menubalk bovenin (issue #86)', () => {
  const bar = () => document.querySelector<HTMLElement>('header.topbar')!
  const openMenu = () => {
    fireEvent.click(within(bar()).getByRole('button', { name: 'Instellingen' }))
    return within(bar().querySelector('dialog') as HTMLDialogElement)
  }
  const homeJobCard = () => panels()[0].querySelector('section.job')

  it('staat boven de schermen, buiten main, met de naam van de app en een menuknop', () => {
    expect(bar().closest('main')).toBeNull()
    expect(bar().querySelector('.topbar-name')?.textContent).toBe('Mesowise')
    expect(within(bar()).getByRole('button', { name: 'Instellingen' }).getAttribute('aria-expanded')).toBe('false')
  })

  it('toont de jobkaart op het beginscherm tot job en geslacht gekozen zijn (#55), en daarna alleen in het menu', () => {
    expect(homeJobCard()).not.toBeNull()
    fireEvent.click(within(homeJobCard() as HTMLElement).getByRole('button', { name: 'Warrior' }))
    expect(homeJobCard()).not.toBeNull()
    fireEvent.click(within(homeJobCard() as HTMLElement).getByRole('button', { name: 'Male' }))
    expect(homeJobCard()).toBeNull()
    const menu = openMenu()
    expect(menu.getByRole('heading', { name: 'Warrior (m)' })).toBeTruthy()
  })

  it('wisselt de job via het menu en sluit met "Sluiten"', () => {
    fireEvent.click(within(homeJobCard() as HTMLElement).getByRole('button', { name: 'Warrior' }))
    fireEvent.click(within(homeJobCard() as HTMLElement).getByRole('button', { name: 'Male' }))
    let menu = openMenu()
    fireEvent.click(menu.getByRole('button', { name: 'Job en geslacht wijzigen' }))
    fireEvent.click(menu.getByRole('button', { name: 'Thief' }))
    fireEvent.click(menu.getByRole('button', { name: 'Opslaan' }))
    expect(stored(JOB_KEY)?.job).toBe('thief')
    expect(menu.getByRole('heading', { name: 'Thief (m)' })).toBeTruthy()
    fireEvent.click(menu.getByRole('button', { name: 'Sluiten' }))
    expect(bar().querySelector('dialog')).toBeNull()
    expect(document.activeElement).toBe(within(bar()).getByRole('button', { name: 'Instellingen' }))
    menu = openMenu()
    expect(menu.getByRole('heading', { name: 'Thief (m)' })).toBeTruthy()
  })
})
