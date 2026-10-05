// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/preact'
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

/** Wat het level kost, zoals de Report-kaart het toont: het bedrag en de regel eronder (met de mob). */
const levelCostText = () => {
  const value = document.querySelector('.level-cost-value')
  return value ? `${value.textContent} ${value.nextElementSibling?.textContent}` : undefined
}
/** De titel in de kop van een kaart; de kop zelf is geen knop meer, alleen het oog en het rapport (Dave, 5 oktober 2026). */
const headTitle = (card: string) => screen.getByRole('button', { name: `${card} bekijken` }).closest('.spot-head')!.querySelector('.spot-name')!.textContent
/** Zet een skill via zijn potlood en de popup (Dave, 5 oktober 2026): typ het level en sla op met Enter. */
const setSkill = (within_: HTMLElement, name: string, value: string) => {
  fireEvent.click(within(within_).getByRole('button', { name: `${name} wijzigen` }))
  const d = document.querySelector(`dialog[aria-label="${name}"]`) as HTMLElement
  const input = within(d).getByLabelText(/^Level/) as HTMLInputElement
  fireEvent.input(input, { target: { value } })
  fireEvent.keyDown(input, { key: 'Enter' })
}
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

/** Het beginscherm: alles staat op één scherm (#154). */
const homeScreen = () => document.querySelector<HTMLElement>('main')!
/** De Report-kaart onderaan het beginscherm: de kosten van het level en de vier adviezen. */
const reportCard = () => document.querySelector<HTMLElement>('section.level-cost')!

/** De equipment-kaarten (er is er één, op het beginscherm). */
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
  const line = Array.from(homeScreen().querySelectorAll<HTMLElement>('.stat-line')).find((l) => l.querySelector('.stat-line-name')?.textContent === label)
  if (!line) throw new Error(`geen stat ${label}`)
  return line
}
/** De namen van de stat-regels in één kaart van het beginscherm. */
const cardNames = (selector: string) => Array.from(homeScreen().querySelectorAll(`${selector} .stat-line-name`)).map((n) => n.textContent)
/** Het getal van een stat op de kaart; bij een ability point (STR, DEX, INT, LUK) de base AP. */
const statShown = (label: string) => (statLine(label).querySelector('.ap-base strong') ?? statLine(label).querySelector('.equip-value strong'))?.textContent
/** De extra AP van items van een ability point op de kaart. */
const extraShown = (label: string) => statLine(label).querySelector('.ap-extra strong')?.textContent
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

/** Opent de popup van een ability point (STR, DEX, INT, LUK): een vak voor de base AP, een voor de extra AP van items, en het totaal. */
const openAbility = (label: string) => {
  fireEvent.click(within(statLine(label)).getByRole('button', { name: `${label} wijzigen` }))
  const d = within(statLine(label).querySelector('dialog') as HTMLDialogElement)
  const base = () => d.getByLabelText('Base AP') as HTMLInputElement
  const extra = () => d.getByLabelText('Extra AP') as HTMLInputElement
  return {
    base,
    extra,
    typeBase: (v: string) => fireEvent.input(base(), { target: { value: v } }),
    typeExtra: (v: string) => fireEvent.input(extra(), { target: { value: v } }),
    save: () => fireEvent.click(d.getByRole('button', { name: 'Opslaan' })),
    close: () => fireEvent.click(d.getByRole('button', { name: 'Sluiten zonder opslaan' })),
    d,
  }
}

/** Opent de Skillpoints-kaart van het beginscherm en geeft de kaart terug (de popup zit erin). */
const openHomeSkills = () => {
  const head = within(homeScreen()).getByRole('button', { name: 'Skillpoints bekijken' })
  fireEvent.click(head)
  return head.closest('section')!
}
const openHomeEquipment = () => fireEvent.click(within(cards()[0]).getByRole('button', { name: 'Equip bekijken' }))
const levelUp = () => fireEvent.click(screen.getByRole('button', { name: /Level up/ }))
/** Een mob kiezen in de open Monster-popup en hem met Opslaan vastleggen. */
const chooseMob = (name: string) => {
  const dialog = document.querySelector<HTMLElement>('section.hunted dialog.card-dialog')!
  fireEvent.change(within(dialog).getByLabelText('De mob die je het meest killt'), { target: { value: name } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Opslaan' }))
}

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

  it('zet helemaal bovenaan vorig level, het huidige level als h1 en Level up naast elkaar (#130)', () => {
    const row = homeScreen().firstElementChild!
    expect(row.classList.contains('level-row')).toBe(true)
    const [down, heading, up] = Array.from(row.children)
    expect(down).toBe(screen.getByRole('button', { name: 'Back (naar LV. 9)' }))
    expect(down.textContent).toBe('Back')
    expect(heading).toBe(screen.getByRole('heading', { level: 1 }))
    expect(heading.textContent).toBe('LV. 10')
    expect(up).toBe(screen.getByRole('button', { name: /Level up/ }))
    expect(screen.getAllByRole('button', { name: /Level up/ })).toHaveLength(1)
  })

  it('zet met de kleine knop zonder level-up alleen het level een terug', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Back (naar LV. 9)' }))
    expect(document.querySelector('.current-level')?.textContent).toBe('LV. 9')
  })

  it('zet BACK op lv 1 uit, met een naam die zegt dat er geen vorig level is', () => {
    for (let lv = 10; lv > 1; lv--) fireEvent.click(screen.getByRole('button', { name: `Back (naar LV. ${lv - 1})` }))
    expect(document.querySelector('.current-level')?.textContent).toBe('LV. 1')
    const back = screen.getByRole('button', { name: 'Back (er is geen vorig level)' }) as HTMLButtonElement
    expect(back.disabled).toBe(true)
  })

  // Dave, 4 oktober 2026: geen plekken, geen knop om ze toe te voegen en geen voorbeeldplek meer.
  it('heeft geen voorbeeldplek, geen lijst van plekken en geen knop Plek toevoegen', () => {
    expect(screen.queryByRole('button', { name: 'Plek toevoegen' })).toBeNull()
    expect(screen.queryByText(/Voorbeeldplek/)).toBeNull()
    expect(document.querySelector('ol.spots')).toBeNull()
    expect(headTitle('Monster')).toBe('Monster')
  })

  // Dave, 4 oktober 2026: de kaart staat onder Skillpoints, en net als de andere kaarten toont de kop alleen de titel.
  it('zet de kaart Monster direct onder Skillpoints', () => {
    const skills = screen.getByRole('button', { name: 'Skillpoints bekijken' }).closest('section')!
    const mob = screen.getByRole('button', { name: 'Monster bekijken' }).closest('section')!
    expect(skills.nextElementSibling).toBe(mob)
  })

  // Dave, 5 oktober 2026: naast het oog een rapport met het uitgebreide advies, alleen bij een kaart waar je iets kiest.
  describe('het rapport naast het oog', () => {
    const report = (title: string) => screen.queryByRole('button', { name: `Report: ${title}` })
    const openReport = (title: string) => {
      fireEvent.click(report(title)!)
      return document.querySelector('dialog.report-dialog') as HTMLDialogElement
    }

    it('staat bij Equip, Skillpoints en Monster naast het oog, en niet bij Ability points en Total stats', () => {
      for (const title of ['Equip', 'Skillpoints', 'Monster']) {
        const button = report(title)!
        expect(button, title).not.toBeNull()
        expect(button.getAttribute('aria-haspopup')).toBe('dialog')
        // Een knop na het oog, allebei in de kop van de kaart.
        const eye = button.previousElementSibling as HTMLElement
        expect(eye.getAttribute('aria-label')).toBe(`${title} bekijken`)
        expect(eye.closest('.spot-head')).toBe(button.closest('.spot-head'))
      }
      expect(report('Ability points')).toBeNull()
      expect(report('Total stats')).toBeNull()
      expect(document.querySelectorAll('.card-report')).toHaveLength(3)
    })

    it('zet de kaarten met een rapport bij elkaar, met de Stats-groep onder Monster en boven de Report-kaart', () => {
      const stats = homeScreen().querySelector('section.stats-group')!
      const equip = report('Equip')!.closest('section')!
      const skills = report('Skillpoints')!.closest('section')!
      const mob = report('Monster')!.closest('section')!
      expect(equip.nextElementSibling).toBe(skills)
      expect(skills.nextElementSibling).toBe(mob)
      expect(mob.nextElementSibling).toBe(stats)
      expect(stats.nextElementSibling).toBe(homeScreen().querySelector('section.level-cost'))
    })

    it('toont bij Equip het advies over je wapen en je armor (ATT en DEF)', () => {
      const dialog = openReport('Equip')
      expect(dialog.open).toBe(true)
      expect(dialog.getAttribute('aria-label')).toBe('Report: Equip')
      expect(Array.from(dialog.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['ATT', 'DEF'])
      // De inhoud van de kaart zelf staat er niet in: die zit achter het oog.
      expect(within(dialog).queryByLabelText('Zoek je Weapon')).toBeNull()
    })

    it('toont bij Skillpoints het skill-advies en bij Monster het mob-advies', () => {
      expect(Array.from(openReport('Skillpoints').querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Skill'])
      fireEvent.click(within(document.querySelector('dialog.report-dialog') as HTMLElement).getByRole('button', { name: 'Sluiten' }))
      expect(document.querySelector('dialog.report-dialog')).toBeNull()
      expect(Array.from(openReport('Monster').querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Mob'])
    })

    it('zet in de Report-kaart elke vraag onder dezelfde kop als in het rapport achter het oog: ATT en DEF bij Equip, Skill bij Skillpoints, Mob bij Monster', () => {
      const inReportCard = (title: string) => within(reportCard()).getByRole('heading', { level: 3, name: title }).closest<HTMLElement>('.question')!.textContent
      const cardOf: Record<string, string[]> = { Equip: ['ATT', 'DEF'], Skillpoints: ['Skill'], Monster: ['Mob'] }
      for (const [card, titles] of Object.entries(cardOf)) {
        const dialog = openReport(card)
        for (const title of titles) {
          const own = within(dialog).getByRole('heading', { level: 3, name: title }).closest<HTMLElement>('.question')!.textContent
          expect(own, card + ': ' + title).toBe(inReportCard(title))
        }
        // De andere vragen staan niet in dit rapport.
        for (const t of ['ATT', 'DEF', 'Skill', 'Mob'].filter((x) => !titles.includes(x))) {
          expect(within(dialog).queryByRole('heading', { level: 3, name: t }), card + ' toont ' + t + ' niet').toBeNull()
        }
        fireEvent.click(within(dialog).getByRole('button', { name: 'Sluiten' }))
      }
    })

    it('opent het rapport zonder de popup achter het oog, en andersom', () => {
      openReport('Equip')
      expect(document.querySelector('dialog.card-dialog')).toBeNull()
      expect(report('Equip')!.getAttribute('aria-expanded')).toBe('true')
      fireEvent.click(within(document.querySelector('dialog.report-dialog') as HTMLElement).getByRole('button', { name: 'Sluiten' }))
      openHomeEquipment()
      expect(document.querySelector('dialog.card-dialog')).not.toBeNull()
      expect(document.querySelector('dialog.report-dialog')).toBeNull()
      expect(report('Equip')!.getAttribute('aria-expanded')).toBe('false')
    })
  })

  it('toont het nieuwe level bovenaan na een level-up', () => {
    levelUp()
    expect(document.querySelector('.current-level')?.textContent).toBe('LV. 11')
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
    fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
    expect(statShown('Tijd per aanval (ms)')).toBe(String(IGOR.speed.attackMs))
  })

  it('houdt in de kaartkop alleen de titel, ook als je iets draagt', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    expect(headTitle('Equip')?.trim()).toBe('Equip')
  })

  it('toont de inhoud in een popup achter het oog, en klapt niet meer open (#106)', () => {
    const head = within(cards()[0]).getByRole('button', { name: 'Equip bekijken' })
    expect(head.getAttribute('aria-haspopup')).toBe('dialog')
    expect(head.querySelector('svg')).not.toBeNull()
    // Dicht staat de inhoud nergens in de pagina, ook niet verborgen.
    expect(cards()[0].querySelector('dialog')).toBeNull()
    expect(within(cards()[0]).queryByLabelText('Zoek je Weapon')).toBeNull()
    openHomeEquipment()
    const dialog = cards()[0].querySelector('dialog.card-dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)
    expect(dialog.getAttribute('aria-label')).toBe('Equip')
    expect(within(dialog).getByLabelText('Zoek je Weapon')).toBeTruthy()
    expect(within(cards()[0]).queryByRole('button', { name: 'Inklappen' })).toBeNull()
  })

  // Dave, 5 oktober 2026: alleen het oog en het rapport zijn te tikken, niet de hele kop.
  it('opent de popup niet met een tik op de titel, alleen met het oog', () => {
    const head = cards()[0].querySelector('.spot-head') as HTMLElement
    expect(head.tagName).toBe('DIV')
    fireEvent.click(head.querySelector('.spot-name')!)
    expect(cards()[0].querySelector('dialog')).toBeNull()
    expect(Array.from(head.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'))).toEqual(['Equip bekijken', 'Report: Equip'])
  })

  it('sluit de popup met het kruisje, en zet de focus daarna op de kop (#106)', async () => {
    openHomeEquipment()
    const head = within(cards()[0]).getByRole('button', { name: 'Equip bekijken' })
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
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    const h = openAbility('LUK')
    h.typeExtra('15')
    expect(profileFields()?.lukExtra ?? DEFAULT_PROFILE.lukExtra).toBe(DEFAULT_PROFILE.lukExtra)
    h.save()
    expect(profileFields().lukExtra).toBe('15')
    expect(extraShown('LUK')).toBe('15')
    expect(statShown('LUK')).toBe('37')
  })

  it('heeft op de karakterkaart geen invoerveld buiten de popup', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    expect(homeScreen().querySelector('section.profile')!.querySelectorAll('input')).toHaveLength(0)
  })

  it('toont geen level, Max HP, ATT en DEF: die liggen elders vast', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    const names = [...cardNames('section.profile'), ...cardNames('section.total-stats')]
    expect(names).not.toContain('Level')
    expect(names).not.toContain('Max HP')
    expect(names).not.toContain('ATT van je wapen')
    expect(names).not.toContain('DEF')
    expect(names).toContain('Tijd per aanval (ms)')
  })

  it('zet de stats in twee kaarten zoals het statvenster: Ability points (STR, DEX, INT, LUK) en Total stats (#82)', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
    expect(cardNames('section.profile')).toEqual(['STR', 'DEX', 'INT', 'LUK'])
    expect(cardNames('section.total-stats')).toEqual(['Attack', 'W.ATT', 'M.ATT', 'Weapon Def', 'Magic', 'Magic Def', 'Accuracy', 'Evasion', 'Crit. Rate (%)', 'Crit. Damage (%)', 'Speed (%)', 'Jump (%)', 'Tijd per aanval (ms)'])
  })

  it('toont in de popup van Ability points je gezette base AP van wat je level geeft, en in die van een stat wat er over is (#157)', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    expect(homeScreen().querySelector('section.profile dialog .ap-group .skill-sp')?.textContent).toBe('70 / 70 BASE AP')
    // Het beginprofiel verdeelt precies de 70 base AP van level 10.
    expect(openAbility('STR').d.getByText(/Base AP over:/).textContent).toBe('Base AP over: 0 van 70')
  })

  it('zet per stat op de kaart de base AP, plus de extra AP van items, is het totaal', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    const head = homeScreen().querySelector('section.profile .ability-head')!
    expect(Array.from(head.children).map((c) => c.textContent)).toEqual(['', 'Base', '', 'Extra', '', 'Totaal', ''])
    expect(Array.from(statLine('LUK').children).slice(1, 6).map((c) => c.textContent)).toEqual(['37', '+', '3', '=', '40'])
  })

  it('toont ook bij een stat zonder extra AP van items de plus en een extra-vak met 0', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    expect(Array.from(statLine('DEX').children).slice(1, 6).map((c) => c.textContent)).toEqual(['25', '+', '0', '=', '25'])
  })

  it('bewaart een leeg extra-veld als 0, zonder foutmelding', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    const h = openAbility('LUK')
    h.typeExtra('')
    h.save()
    expect(profileFields().lukExtra).toBe('0')
    expect(extraShown('LUK')).toBe('0')
    expect(homeScreen().querySelector('section.profile')!.classList.contains('invalid')).toBe(false)
  })

  it('toont in de popup het totaal van base en extra, en rekent mee terwijl je typt', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    const h = openAbility('LUK')
    const total = () => h.d.getByLabelText('Totaal').textContent
    expect(total()).toBe('40')
    h.typeExtra('10')
    expect(total()).toBe('47')
    h.typeExtra('')
    expect(total()).toBe('37')
    h.typeBase('')
    expect(total()).toBe('?')
  })

  it('toont Opslaan in de popup altijd, maar uitgeschakeld zolang er niets gewijzigd is', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    const h = openAbility('LUK')
    const save = () => h.d.getByRole('button', { name: 'Opslaan' }) as HTMLButtonElement
    expect(save().disabled).toBe(true)
    h.typeExtra('4')
    expect(save().disabled).toBe(false)
    h.typeExtra('3')
    expect(save().disabled).toBe(true)
  })

  it('heeft in de popup twee manieren om AP toe te voegen: base AP en de extra AP van items', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    const h = openAbility('LUK')
    expect(h.base().value).toBe('37')
    expect(h.extra().value).toBe('3')
    expect(h.d.getByText(/Base AP over:/).textContent).toBe('Base AP over: 0 van 70')
    // Base, Extra en Totaal onder elkaar in één kolom, met één Opslaan eronder; het totaal staat in de middelste kolom, net als de getallen erboven.
    const dialog = statLine('LUK').querySelector('dialog')!
    expect(dialog.querySelector('.ap-edit-total')!.parentElement!.children[1].classList.contains('ap-edit-total')).toBe(true)
    expect(Array.from(dialog.querySelectorAll('.ap-edit > .ap-edit-col > .stat-dialog-label')).map((l) => l.textContent)).toEqual(['Base AP', 'Extra AP', 'Totaal'])
    expect(Array.from(dialog.querySelectorAll('.stat-dialog-actions')).map((a) => a.textContent)).toEqual(['Opslaan'])
  })

  it('laat de base AP niet hoger gaan dan je nog over hebt; de extra AP is vrij', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    const h = openAbility('LUK')
    fireEvent.click(h.d.getByRole('button', { name: 'Base LUK plus 1' }))
    expect(h.base().value).toBe('37')
    h.typeBase('50')
    h.typeExtra('100')
    h.save()
    expect(profileFields().luk).toBe('37')
    expect(profileFields().lukExtra).toBe('100')
    expect(extraShown('LUK')).toBe('100')
    expect(statShown('LUK')).toBe('37')
  })

  it('laat de base AP in de popup niet onder 4 gaan, het minimum van elke stat', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    const h = openAbility('STR')
    expect(h.base().value).toBe('4')
    fireEvent.click(h.d.getByRole('button', { name: 'Base STR min 1' }))
    expect(h.base().value).toBe('4')
    expect(h.base().min).toBe('4')
    h.typeBase('1')
    h.typeExtra('2')
    h.save()
    expect(profileFields().str).toBe('4')
    expect(homeScreen().querySelector('section.profile')!.classList.contains('invalid')).toBe(false)
  })

  it('geeft base AP vrij die je uit een andere stat haalt', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    const dex = openAbility('DEX')
    dex.typeBase('20')
    dex.save()
    const luk = openAbility('LUK')
    expect(luk.d.getByText(/Base AP over:/).textContent).toBe('Base AP over: 5 van 70')
    luk.typeBase('42')
    luk.save()
    expect(profileFields().luk).toBe('42')
    expect(openAbility('INT').d.getByText(/Base AP over:/).textContent).toBe('Base AP over: 0 van 70')
  })

  it('toont in de popup hoeveel base AP te veel staat als je level omlaag gaat', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Back (naar LV. 9)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    const h = openAbility('LUK')
    expect(h.d.getByText(/Base AP te veel:/).textContent).toBe('Base AP te veel: 5 van 65')
    // Wat je in de popup lager zet, telt meteen mee.
    h.typeBase('32')
    expect(h.d.getByText(/Base AP over:/).textContent).toBe('Base AP over: 0 van 65')
    h.save()
    expect(openAbility('DEX').d.getByText(/Base AP over:/).textContent).toBe('Base AP over: 0 van 65')
  })

  it('toont een ongeldige STR bij Ability points en niet bij Total stats (#82)', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    const h = openAbility('STR')
    h.typeExtra('5000')
    h.save()
    expect(homeScreen().querySelector('section.profile')!.classList.contains('invalid')).toBe(true)
    expect(homeScreen().querySelector('section.total-stats')!.classList.contains('invalid')).toBe(false)
  })

  it('slaat een decimale aanvalstijd op; dat vak heeft geen - en +', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
    const h = openStat('Tijd per aanval (ms)')
    expect(h.d.queryByRole('button', { name: /plus 1/ })).toBeNull()
    h.type('812.5')
    h.save()
    expect(profileFields().attackMs).toBe('812.5')
    expect(statShown('Tijd per aanval (ms)')).toBe('812.5')
  })

  it('toont de verwachte accuracy pas doorgestreept als het getal ervan afwijkt', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
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
    fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
    expect(statShown('Evasion')).toBe(DEFAULT_PROFILE.avoid)
    expect(statLine('Evasion').querySelector('s')?.textContent).toBe('22')
  })

  it('zet een gecorrigeerde accuracy met Reset terug op de verwachting', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
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
    fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
    const h = openStat('Tijd per aanval (ms)')
    h.type('50')
    h.save()
    const profile = homeScreen().querySelector('section.total-stats')!
    expect(profile.classList.contains('invalid')).toBe(true)
    expect(homeScreen().querySelector('section.profile')!.classList.contains('invalid')).toBe(false)
    expect(profile.querySelector('.error')?.textContent).not.toBe('')
    expect(cards()[0].classList.contains('invalid')).toBe(false)
  })

  it('gooit een gewijzigde stat weg bij sluiten zonder opslaan', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    const h = openAbility('LUK')
    h.typeExtra('77')
    h.close()
    expect(extraShown('LUK')).toBe('3')
    expect(statLine('LUK').querySelector('dialog')).toBeNull()
  })

  it('verhoogt een stat met + en slaat op met Enter', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    const h = openAbility('LUK')
    fireEvent.click(h.d.getByRole('button', { name: 'Extra LUK plus 1' }))
    expect(h.extra().value).toBe('4')
    fireEvent.keyDown(h.extra(), { key: 'Enter' })
    expect(profileFields().lukExtra).toBe('4')
  })

  it('bewaart de gekozen mob als enige plek, en een andere mob vervangt hem', () => {
    expect(stored(STORAGE_KEY)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Monster bekijken' }))
    const dialog = document.querySelector('section.hunted dialog.card-dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)
    const select = within(dialog).getByLabelText('De mob die je het meest killt') as HTMLSelectElement
    chooseMob('Pig')
    expect(stored(STORAGE_KEY).spots).toMatchObject([{ known: 'mob:Pig', monster: 'Pig' }])
    chooseMob('Slime')
    expect(stored(STORAGE_KEY).spots).toMatchObject([{ known: 'mob:Slime', monster: 'Slime' }])
    expect(select.value).toBe('Slime')
    expect(headTitle('Monster')).toBe('Monster')
  })

  it('toont in de keuzelijst alleen naam en level, en de HP, EXP, schade en WDEF van de gekozen mob als regels', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Monster bekijken' }))
    const select = screen.getByLabelText('De mob die je het meest killt') as HTMLSelectElement
    // Pig op MeowDB: 128 HP, 13 EXP, Touch DMG 16–22, P.DEF 0 (src/data/spots.ts).
    expect(Array.from(select.options).map((o) => o.textContent)).toContain('Pig (lv 7)')
    expect(Array.from(select.options).filter((o) => o.value !== '').every((o) => /^[A-Za-z ]+ \(lv \d+\)$/.test(o.textContent ?? ''))).toBe(true)
    chooseMob('Pig')
    const dialog = document.querySelector('section.hunted dialog.card-dialog') as HTMLElement
    const lines = Array.from(dialog.querySelectorAll('.stat-line .equip-value')).map((v) => v.getAttribute('aria-label'))
    expect(lines).toEqual(['HP 128', 'EXP 13', 'Dmg laag 16', 'Dmg hoog 22', 'WDEF 0'])
    // De EXP per meso hoort in de calculator zelf, niet op deze kaart (Dave, 4 oktober 2026).
    expect(dialog.textContent).not.toMatch(/EXP per meso|kills per uur|Bron/i)
    expect(headTitle('Monster')).toBe('Monster')
  })

  // Dave, 4 oktober 2026: net als bij equipment pas je de monsterinfo aan als het spel iets anders zegt.
  it('past een eigenschap van de mob aan met het potlood, bewaart hem en rekent ermee', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Monster bekijken' }))
    chooseMob('Pig')
    const before = levelCostText()
    const hp = openStat('HP')
    expect(hp.d.getByText('Verwacht volgens de database:')).toBeTruthy()
    hp.type('256')
    hp.save()
    expect(stored(STORAGE_KEY).spots).toMatchObject([{ known: 'mob:Pig', mobHp: '256' }])
    expect(statLine('HP').querySelector('.equip-value')!.getAttribute('aria-label')).toBe('HP 256, gecorrigeerd, verwacht 128')
    // Twee keer zoveel HP: minder kills per uur, dus een duurder level.
    expect(levelCostText()).not.toBe(before)
    const back = openStat('HP')
    fireEvent.click(back.d.getByRole('button', { name: 'Reset naar 128' }))
    back.save()
    expect(stored(STORAGE_KEY).spots[0].mobHp).toBeUndefined()
    expect(levelCostText()).toBe(before)
  })

  it('negeert een oud eigen aantal kills per uur uit de opslag: dat vul je niet meer in, de app rekent het zelf', () => {
    const summary = (spot: object) => {
      cleanup()
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, spots: [spot] }))
      render(<App />)
      return levelCostText()
    }
    const own = summary({ ...mobDraft('Pig'), kills: '1' })
    expect(own).toMatch(/Op Pig\./)
    expect(own).toBe(summary(mobDraft('Pig')!))
  })

  it('zet de aanpassingen terug als je een andere mob kiest', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Monster bekijken' }))
    chooseMob('Pig')
    const wdef = openStat('WDEF')
    wdef.type('5')
    wdef.save()
    expect(stored(STORAGE_KEY).spots[0].mobWdef).toBe('5')
    chooseMob('Slime')
    expect(stored(STORAGE_KEY).spots[0].mobWdef).toBeUndefined()
    expect(statLine('WDEF').querySelector('.equip-value')!.getAttribute('aria-label')).toBe('WDEF 10')
  })

  // Dave, 5 oktober 2026: de mobkeuze telt pas na Opslaan; sluiten zonder opslaan houdt de vorige mob.
  it('legt een gekozen mob pas vast met Opslaan, en sluiten gooit de keuze weg', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Monster bekijken' }))
    chooseMob('Pig')
    const dialog = document.querySelector<HTMLElement>('section.hunted dialog.card-dialog')!
    const save = within(dialog).getByRole('button', { name: 'Opslaan' }) as HTMLButtonElement
    // Niets gewijzigd: Opslaan staat er, maar je kunt er niet op tikken.
    expect(save.disabled).toBe(true)
    const select = within(dialog).getByLabelText('De mob die je het meest killt') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'Slime' } })
    expect(save.disabled).toBe(false)
    expect(select.value).toBe('Slime')
    // Het concept: de getallen van Slime, nog zonder potlood, en de opslag houdt Pig.
    expect(stored(STORAGE_KEY).spots).toMatchObject([{ known: 'mob:Pig' }])
    expect(statLine('WDEF').querySelector('.equip-value')!.getAttribute('aria-label')).toBe('WDEF 10')
    expect(within(statLine('WDEF')).queryByRole('button', { name: 'WDEF wijzigen' })).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sluiten' }))
    fireEvent.click(screen.getByRole('button', { name: 'Monster bekijken' }))
    const again = document.querySelector<HTMLElement>('section.hunted dialog.card-dialog')!
    expect((within(again).getByLabelText('De mob die je het meest killt') as HTMLSelectElement).value).toBe('Pig')
    expect(stored(STORAGE_KEY).spots).toMatchObject([{ known: 'mob:Pig' }])
  })

  it('rekent met de gekozen mob: de kosten van het level verschijnen', () => {
    expect(document.querySelector('.level-cost-value')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Monster bekijken' }))
    chooseMob('Pig')
    expect(levelCostText()).toMatch(/^± [\d.]+ meso.*Op Pig\.$/)
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
    fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
    expect(profileFields().clawWatk).toBe(String(IGOR.watk))
    expect(statShown('Attack')).toBe(rangeOf('thief'))
    expect(statShown('Attack')).not.toBe(String(IGOR.watk + 17))
    expect(within(statLine('Attack')).queryByRole('button')).toBeNull()
    expect(statShown('W.ATT')).toBe(String(IGOR.watk + 17))
    expect(statShown('M.ATT')).toBe('0')
  })

  it('toont bij Total stats de Magic Def uit je equipment, alleen om te lezen; zolang een slot open is vul je hem zelf in (#91)', () => {
    openHomeEquipment()
    fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
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

  it('biedt in de slots van #117 de items met een bron aan (#125): Gloves voor een Thief, zonder die van een andere job', () => {
    openHomeEquipment()
    const row = typeIn(cards()[0], 'Gloves', 'Duo')
    expect(options(row).map((o) => o.querySelector('.equip-name')?.textContent)).toEqual(['Brown Duo', 'Blue Duo', 'Black Duo', 'Gebruik "Duo" als eigen item'])
    expect(options(typeIn(cards()[0], 'Gloves', 'Juno')).map((o) => o.textContent)).toEqual(['Gebruik "Juno" als eigen item'])
    pick(cards()[0], 'Gloves', 'Work Gloves')
    expect(worn(cards()[0], 'Gloves')).toBe('Work Gloves')
    expect(slots().gloves.pick).toBe('Work Gloves')
  })

  it('biedt geen eigen-item-rij als je precies een naam uit de lijst typt', () => {
    openHomeEquipment()
    const row = typeIn(cards()[0], 'Weapon', IGOR.name)
    expect(options(row).some((o) => o.textContent?.startsWith('Gebruik "'))).toBe(false)
    const own = typeIn(cards()[0], 'Weapon', 'Iets heel anders')
    expect(options(own).map((o) => o.textContent)).toEqual(['Gebruik "Iets heel anders" als eigen item'])
  })
})

describe('level-up en Back (#154)', () => {
  const backButton = () => screen.getByRole('button', { name: /^Back/ })
  const level = () => document.querySelector('.current-level')?.textContent

  it('gaat naar het volgende level en blijft op het beginscherm: geen controle- of adviesscherm', () => {
    levelUp()
    expect(level()).toBe('LV. 11')
    expect(profileFields().level).toBe('11')
    expect(screen.queryByRole('heading', { name: 'Klopt dit met je spel?' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Wat nu?' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Alles klopt, toon advies' })).toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: 'Report' })).toBeTruthy()
  })

  it('past alleen aan wat uit een bronregel volgt: level, Max HP en accuracy; de AP blijven staan', () => {
    levelUp()
    const f = profileFields()
    expect(f.hp).toBe('466')
    expect([f.str, f.dex, f.int, f.luk]).toEqual([DEFAULT_PROFILE.str, DEFAULT_PROFILE.dex, DEFAULT_PROFILE.int, DEFAULT_PROFILE.luk])
  })

  it('laat equipment en wat je draagt staan', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    levelUp()
    expect(worn(cards()[0], 'Weapon')).toBe(IGOR.name)
    expect(profileFields().clawWatk).toBe(String(IGOR.watk))
  })

  it('zet met Back na een level-up het profiel terug op dat van voor de level-up', () => {
    levelUp()
    expect(backButton().getAttribute('aria-label')).toBe('Back (naar LV. 10)')
    fireEvent.click(backButton())
    expect(profileFields()).toEqual(DEFAULT_PROFILE)
    expect(level()).toBe('LV. 10')
  })

  it('zet equipment en profiel allebei terug, ook na wissels op het beginscherm', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    pick(cards()[0], 'Hat', HAT_A.name)
    pick(cards()[0], 'Hat', HAT_B.name)
    const profileBefore = profileFields()
    const slotsBefore = slots()

    levelUp()
    pick(cards()[0], 'Weapon', MEBA.name)
    pick(cards()[0], 'Shoes', SHOE_A.name)
    expect(profileFields().clawWatk).toBe(String(MEBA.watk))
    expect(slots().shoes.pick).toBe(SHOE_A.name)

    fireEvent.click(backButton())
    expect(profileFields()).toEqual(profileBefore)
    expect(profileFields().level).toBe('10')
    expect(profileFields().clawWatk).toBe(String(IGOR.watk))
    expect(profileFields().attackMs).toBe(String(IGOR.speed.attackMs))
    expect(slots()).toEqual(slotsBefore)
    expect(worn(cards()[0], 'Weapon')).toBe(IGOR.name)
    expect(worn(cards()[0], 'Hat')).toBe(HAT_B.name)
    expect(worn(cards()[0], 'Shoes')).toBeNull()
  })

  it('gooit een eigen item met een opgeslagen getal na de level-up weg bij Back', () => {
    levelUp()
    openHomeEquipment()
    pickOwn(cards()[0], 'Weapon', 'Mijn claw')
    correct(cards()[0], 'Weapon', 'ATT', '77')
    expect(profileFields().clawWatk).toBe('77')
    fireEvent.click(backButton())
    expect(profileFields().clawWatk).toBe(DEFAULT_PROFILE.clawWatk)
    expect(slots().claw.pick).toBe('unknown')
  })

  it('gebruikt de snapshot één keer: een tweede Back zet alleen het level een terug', () => {
    levelUp()
    fireEvent.click(backButton())
    fireEvent.click(backButton())
    expect(level()).toBe('LV. 9')
    expect(profileFields().hp).toBe(DEFAULT_PROFILE.hp)
  })

  it('zet na een nieuwe level-up weer de snapshot van het level eronder terug', () => {
    levelUp()
    levelUp()
    expect(level()).toBe('LV. 12')
    fireEvent.click(backButton())
    expect(level()).toBe('LV. 11')
    expect(profileFields().hp).toBe('466')
  })

  it('gooit een stat die je na de level-up zette weg bij Back, en zet de equipment van het level eronder terug', () => {
    levelUp()
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    const luk = openAbility('LUK')
    luk.typeBase('40')
    luk.save()
    expect(profileFields().luk).toBe('40')
    openHomeEquipment()
    pick(cards()[0], 'Weapon', MEBA.name)
    fireEvent.click(backButton())
    expect(profileFields()).toEqual(DEFAULT_PROFILE)
    expect(worn(cards()[0], 'Weapon')).toBeNull()
  })

  it('zet bij twee level-ups achter elkaar alleen de equipment van het tweede level terug, niet die van het eerste', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    levelUp()
    pick(cards()[0], 'Weapon', MEBA.name)
    levelUp()
    pick(cards()[0], 'Hat', HAT_A.name)
    expect(level()).toBe('LV. 12')
    fireEvent.click(backButton())
    expect(level()).toBe('LV. 11')
    expect(worn(cards()[0], 'Weapon')).toBe(MEBA.name)
    expect(worn(cards()[0], 'Hat')).toBeNull()
    expect(profileFields().clawWatk).toBe(String(MEBA.watk))
  })

  it('zet na de herstelde snapshot een tweede Back alleen het level een terug: stats en equipment blijven', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    levelUp()
    fireEvent.click(backButton())
    const before = profileFields()
    fireEvent.click(backButton())
    expect(profileFields()).toEqual({ ...before, level: '9' })
    expect(worn(cards()[0], 'Weapon')).toBe(IGOR.name)
  })

  it('leest de snapshot synchroon: Level up en meteen Back in één stap zet het profiel terug', () => {
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Level up/ }))
      fireEvent.click(backButton())
    })
    expect(level()).toBe('LV. 10')
    // Alleen het aantal AP in de kop van Ability points staat er: (0), want op LV. 10 is alles verdeeld.
    expect(screen.getAllByRole('status').map((el) => el.textContent)).toEqual(['(0)0 AP te verdelen'])
  })

  it('toont bij Total stats een hint dat de app het effect van je AP niet meetelt', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
    expect(homeScreen().querySelector('.total-stats-hint')?.textContent).toMatch(/Accuracy en Avoid/)
  })

  it('wist de snapshot bij een andere job: Back zet daarna alleen het level een terug', () => {
    levelUp()
    fireEvent.click(screen.getByRole('button', { name: 'Warrior' }))
    expect(level()).toBe('LV. 11')
    fireEvent.click(backButton())
    expect(level()).toBe('LV. 10')
    expect(profileFields().hp).toBe('466')
  })

  it('bewaart de snapshot niet: na herladen zet Back alleen het level een terug (#130)', () => {
    levelUp()
    cleanup()
    render(<App />)
    expect(level()).toBe('LV. 11')
    fireEvent.click(backButton())
    expect(level()).toBe('LV. 10')
    expect(profileFields().hp).toBe('466')
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

describe('de AP en SP die je nog moet verdelen (#154)', () => {
  // De zin die een schermlezer hoort; zichtbaar staat alleen het getal tussen haakjes achter de kop.
  const apNote = () => homeScreen().querySelector('section.profile .spot-head .to-distribute .sr-only')?.textContent ?? null
  const spNote = () => homeScreen().querySelector('section.skills .spot-head .to-distribute .sr-only')?.textContent ?? null

  it('zet het aantal tussen haakjes achter de kop: Skillpoints (3), Ability points (5)', () => {
    levelUp()
    expect(homeScreen().querySelector('section.skills .spot-head .spot-name')?.textContent).toBe('Skillpoints(3)3 SP te verdelen')
    expect(homeScreen().querySelector('section.skills .to-distribute [aria-hidden="true"]')?.textContent).toBe('(3)')
    expect(homeScreen().querySelector('section.profile .spot-head .spot-name')?.textContent).toBe('Ability points(5)5 AP te verdelen')
  })

  it('toont in de popup van Ability points een kop zoals een groep in Skillpoints: 70 / 75 BASE AP', () => {
    levelUp()
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    // Achter de titel de AP die nog vrij zijn, zoals op de kaart.
    expect(homeScreen().querySelector('dialog .stat-dialog-head > h2 .to-distribute [aria-hidden="true"]')?.textContent).toBe('(5)')
    expect(homeScreen().querySelector('dialog .stat-dialog-head > h2')?.textContent).toBe('Ability points (5)5 AP te verdelen')
    const head = homeScreen().querySelector('dialog .ap-group h3')!
    expect(head.textContent).toBe('70 / 75 BASE AP')
    expect(head.querySelector('.skill-sp')?.classList.contains('over')).toBe(false)
  })

  it('zet ook achter de titel van de popup van Skillpoints de SP die nog vrij zijn: Skillpoints (3)', () => {
    levelUp()
    fireEvent.click(screen.getByRole('button', { name: 'Skillpoints bekijken' }))
    expect(homeScreen().querySelector('section.skills dialog .stat-dialog-head > h2')?.textContent).toBe('Skillpoints (3)3 SP te verdelen')
  })

  it('kleurt het aantal als fout als er meer base AP staan dan je level geeft', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Back (naar LV. 9)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    const count = homeScreen().querySelector('dialog .ap-group .skill-sp')!
    expect(count.textContent).toBe('70 / 65 BASE AP')
    expect(count.classList.contains('over')).toBe(true)
  })

  it('toont (0) bij Ability points en niets bij Skillpoints zolang alle AP en SP gezet zijn', () => {
    expect(apNote()).toBe('0 AP te verdelen')
    expect(homeScreen().querySelector('section.profile .to-distribute [aria-hidden="true"]')?.textContent).toBe('(0)')
    expect(spNote()).toBeNull()
  })

  it('toont na een level-up 5 AP en 3 SP te verdelen, en telt mee terwijl je ze zet', () => {
    levelUp()
    expect(apNote()).toBe('5 AP te verdelen')
    expect(spNote()).toBe('3 SP te verdelen')
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    const luk = openAbility('LUK')
    luk.typeBase('40')
    luk.save()
    expect(apNote()).toBe('2 AP te verdelen')
  })

  it('toont weer (0) na Back naar het level waar alles verdeeld was', () => {
    levelUp()
    fireEvent.click(screen.getByRole('button', { name: /^Back/ }))
    expect(apNote()).toBe('0 AP te verdelen')
    expect(spNote()).toBeNull()
  })

  it('toont na een level-up de AP en SP van een Warrior: 5 AP en 3 SP erbij per level', () => {
    cleanup()
    localStorage.setItem(JOB_KEY, JSON.stringify({ version: 1, job: 'warrior' }))
    // Level 20: 120 AP, 118 gezet = 2 over; 31 SP, 1 gezet = 30 over.
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({ version: 1, fields: { ...DEFAULT_PROFILE, lukExtra: '0', level: '20', hp: '800', str: '90', dex: '20', int: '4', luk: '4', powerStrike: '1', preciseStrikes: '0' } }),
    )
    render(<App />)
    expect(apNote()).toBe('2 AP te verdelen')
    expect(spNote()).toBe('30 SP te verdelen')
    levelUp()
    expect(apNote()).toBe('7 AP te verdelen')
    expect(spNote()).toBe('33 SP te verdelen')
    fireEvent.click(screen.getByRole('button', { name: /^Back/ }))
    expect(apNote()).toBe('2 AP te verdelen')
    expect(spNote()).toBe('30 SP te verdelen')
  })

  it('telt de extra AP van items niet mee: een item met +50 LUK verlaagt het aantal AP te verdelen niet', () => {
    levelUp()
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    const luk = openAbility('LUK')
    luk.typeExtra('50')
    luk.save()
    expect(apNote()).toBe('5 AP te verdelen')
  })

  it('toont bij te veel AP voor het level het verschil onder 0, in de foutkleur', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Back (naar LV. 9)' }))
    expect(apNote()).toBe('5 AP te veel gezet')
    const el = homeScreen().querySelector('section.profile .to-distribute')
    expect(el?.classList.contains('over')).toBe(true)
    expect(el?.querySelector('[aria-hidden="true"]')?.textContent).toBe('(−5)')
  })
})

describe('Auto assign (#157)', () => {
  const apNote = () => homeScreen().querySelector('section.profile .spot-head .to-distribute .sr-only')?.textContent ?? null
  const headingText = () => homeScreen().querySelector('section.profile .spot-head .spot-name')?.textContent
  const fillButton = () => screen.getByRole('button', { name: 'Auto assign' })
  const wearIgor = () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
  }

  it('schrijft de base AP van het level zonder melding, laat de veranderde vakken oplichten en zet (0) in de kop; extra AP en accuracy blijven staan', () => {
    levelUp()
    expect(headingText()).toBe('Ability points(5)5 AP te verdelen')
    wearIgor()
    const before = { ...profileFields() }
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    fireEvent.click(fillButton())
    // Level 11 = 75 AP: DEX op de eis van Steel Igor (20), LUK de rest (75 - 4 - 4 - 20 = 47), STR en INT 4.
    expect(homeScreen().querySelector('.ap-autofill .hint')).toBeNull()
    // DEX en LUK veranderden en lichten op; STR en INT bleven 4.
    const flashing = (label: string) => statLine(label).querySelector('.ap-base')!.classList.contains('flash')
    expect(['STR', 'DEX', 'INT', 'LUK'].map(flashing)).toEqual([false, true, false, true])
    expect(profileFields()).toMatchObject({ str: '4', dex: '20', int: '4', luk: '47', level: '11' })
    expect(profileFields().lukExtra).toBe(before.lukExtra)
    expect(profileFields().accuracy).toBe(before.accuracy)
    expect(statShown('DEX')).toBe('20')
    expect(statShown('LUK')).toBe('47')
    expect(apNote()).toBe('0 AP te verdelen')
    expect(headingText()).toBe('Ability points(0)0 AP te verdelen')
  })

  it('te weinig AP voor het equipment: er wordt niets geschreven en de melding zegt waarom, het (n) blijft staan', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Back (naar LV. 9)' }))
    wearIgor()
    const before = { ...profileFields() }
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    fireEvent.click(fillButton())
    expect(screen.getByText('Je level geeft te weinig AP voor je equipment: je hebt er 65 en je equipment vraagt er 73. Er is niets ingevuld.')).toBeTruthy()
    const after = profileFields()
    for (const k of ['str', 'dex', 'int', 'luk'] as const) expect(after[k]).toBe(before[k])
  })

  it('past de speler daarna een stat aan, dan verdwijnt de melding van een mislukte poging', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Back (naar LV. 9)' }))
    wearIgor()
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    fireEvent.click(fillButton())
    expect(screen.queryByText(/Er is niets ingevuld/)).not.toBeNull()
    const luk = openAbility('LUK')
    luk.typeBase('30')
    luk.save()
    expect(screen.queryByText(/Er is niets ingevuld/)).toBeNull()
  })

  it('zonder getal in het levelveld schrijft de knop niets en vraagt om een level', () => {
    cleanup()
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, fields: { ...DEFAULT_PROFILE, level: '' } }))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    fireEvent.click(fillButton())
    expect(screen.getByText('Vul eerst een geldig level in. Er is niets ingevuld.')).toBeTruthy()
  })
})

describe('advies na de level-up', () => {
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
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, fields: { ...DEFAULT_PROFILE, lukExtra: '0', luckySeven: '2', luk: '60' } }))
    render(<App />)
  })
  const afterLevelUp = () => {
    levelUp()
  }

  it('zet een punt in de aanbevolen skill en bewaart het', () => {
    afterLevelUp()
    const button = within(reportCard()).getByRole('button', { name: 'Punt zetten' })
    expect(button.closest<HTMLElement>('.question')!.querySelector('.verdict')!.textContent).toBe('Zet je skillpunt in Lucky Seven (→ 3).')
    expect(profileFields().luckySeven).toBe('2')
    fireEvent.click(button)
    expect(profileFields().luckySeven).toBe('3')
    expect(profileFields().level).toBe('11')
    expect(within(reportCard()).getByText(/^Lucky Seven → 3 gezet./)).toBeTruthy()
  })
})

describe('een Warrior in de app', () => {
  const warriorFields = { ...DEFAULT_PROFILE, lukExtra: '0', level: '20', hp: '800', str: '90', dex: '20', luk: '4', clawWatk: '40', weaponMult: '1.8', attackMs: '750', accuracy: '40', avoid: '10', wdef: '60', powerStrike: '1', preciseStrikes: '0' }
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
  const afterLevelUp = () => {
    levelUp()
  }
  const NOT_YET = /Nog niet doorgerekend/

  describe('het beginscherm', () => {
    beforeEach(() => open('warrior'))

    it('toont een getal voor wat het level kost en niet "Nog niet doorgerekend"', () => {
      const home = homeScreen()
      expect(levelCostText()).toMatch(/Van lv 20 naar 21: .* Op .+\./)
      expect(within(home).getByRole('heading', { level: 2, name: 'Report' }).closest('section')!.textContent).toMatch(/±\s*[\d.]+ meso|Gratis|Niet haalbaar/)
      expect(home.textContent).not.toMatch(NOT_YET)
      expect(home.querySelector('.debug')).toBeNull()
    })

    it('noemt op het beginscherm geen claws, en toont de skillkaart en (zodra er een wapen beter is) de wapenkaart', () => {
      const home = homeScreen()
      expect(home.textContent).not.toMatch(/claw/i)
      expect(within(home).getByRole('heading', { level: 2, name: 'Report' })).toBeTruthy()
      // Het wapenadvies heet bij een Warrior "nieuw wapen", nooit "nieuwe claw".
      expect(home.textContent).not.toContain('Loont een nieuwe claw?')
    })

    it('rekent het level met het Warrior-model: de kosten verschillen van die van een Thief met dezelfde velden', () => {
      const warriorCost = within(homeScreen()).getByRole('heading', { level: 2, name: 'Report' }).closest('section')!.querySelector('.level-cost-value')!.textContent
      open('thief')
      const thiefCost = within(homeScreen()).getByRole('heading', { level: 2, name: 'Report' }).closest('section')!.querySelector('.level-cost-value')!.textContent
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
      fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
      const home = homeScreen()
      expect(statShown('Weapon multiplier van je wapen')).toBe('1.8')
      // Geen uitleg in de popup: die leest een speler toch niet (Dave, 4 oktober 2026).
      expect(home.querySelector('dialog .hint:not(.total-stats-hint)')).toBeNull()
      expect(home.textContent).not.toMatch(/Subi|stars|rekent met Power Strike|geen munitie|per soort wapen/)
      fireEvent.click(within(home.querySelector('dialog')!).getByRole('button', { name: 'Sluiten' }))
      fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
      expect(statShown('STR')).toBe('90')
    })

    it('toont bij Total stats de Attack als schadebereik van het wapen en je STR, zonder stars (#82, #108)', () => {
      fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
      expect(statShown('Attack')).toBe(rangeOf('warrior'))
      expect(statShown('W.ATT')).toBe('40')
      expect(statShown('M.ATT')).toBe('0')
    })

    it('zet de stats in twee kaarten, met de weapon multiplier als laatste onder Total stats (#82)', () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
      fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
      expect(cardNames('section.profile')).toEqual(['STR', 'DEX', 'INT', 'LUK'])
      expect(cardNames('section.total-stats')).toEqual(['Attack', 'W.ATT', 'M.ATT', 'Weapon Def', 'Magic', 'Magic Def', 'Accuracy', 'Evasion', 'Crit. Rate (%)', 'Crit. Damage (%)', 'Speed (%)', 'Jump (%)', 'Tijd per aanval (ms)', 'Weapon multiplier van je wapen'])
    })

    it('past de weapon multiplier aan via het potlood, en toont geen Ammo-slot', () => {
      fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
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
      fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
      // floor((1,2 x 20 + 2 x 20 + 0,6 x 4) / 2,5 + 10) = floor(36,56) = 36; avoid floor(4 / 3) + floor(20 / 6) + 5 = 9
      expect(statLine('Accuracy').querySelector('s')?.textContent).toBe('36')
      expect(statLine('Evasion').querySelector('s')?.textContent).toBe('9')
    })

    it('toont bij Skillpoints de skills van de Warrior en niet die van de Thief', () => {
      const skills = openHomeSkills()
      for (const name of ['Power Strike', 'Slash Blast', 'Precise Strikes', 'Iron Body']) expect(skills.textContent, name).toContain(name)
      for (const name of ['Lucky Seven', 'Nimble Body', 'Dark Sight']) expect(skills.textContent, name).not.toContain(name)
    })

    it('toont bij elke skill de MP op het gezette level en op het volgende, en bij een passieve skill alleen wat hij geeft (#83, #138)', () => {
      const skills = openHomeSkills()
      const row = (name: string) => within(skills).getByRole('button', { name: `${name} wijzigen` }).closest('.skill-row')!
      const lines = (name: string) => [...row(name).querySelectorAll('.skill-mp > span')].map((l) => l.textContent)
      // Slash Blast kost 4 MP op level 4 en 5 MP op level 5 (de skillpagina, data/warrior.ts).
      setSkill(skills, 'Slash Blast', '4')
      // Slash Blast kost ook HP (3 op level 4, 4 op level 5) en raakt tot 4 monsters met 79% en 82% schade (#139).
      expect(lines('Slash Blast')).toEqual(['Now: −4 MP per keer, −3 HP, +79% schade, tot 4 monsters', 'Next: −5 MP, −4 HP, +82% schade, tot 4 monsters'])
      // Op het maximum (20, 12 MP) is er geen volgend level.
      setSkill(skills, 'Slash Blast', '20')
      expect(lines('Slash Blast')).toEqual(['Now: −12 MP per keer, −8 HP, +130% schade, tot 4 monsters'])
      // Op level 0 is hij nog niet geleerd; level 1 kost 15 MP en geeft 5% van de DEF uit het profiel (60): +3 (#139).
      setSkill(skills, 'Iron Body', '0')
      expect(lines('Iron Body')).toEqual(['Now: niet geleerd', 'Next: −15 MP, +3 DEF (5%)'])
      // Level 5 geeft 9% (floor(5,4) = +5), level 6 geeft 10% (+6).
      setSkill(skills, 'Iron Body', '5')
      expect(lines('Iron Body')).toEqual(['Now: −15 MP per keer, +5 DEF (9%)', 'Next: −15 MP, +6 DEF (10%)'])
      // Wat het kost is rood (.cost), wat het geeft groen (.gain); "Now: " en de komma niet.
      const toned = (tone: string) => [...row('Iron Body').querySelectorAll(`.skill-mp .${tone}`)].map((p) => p.textContent)
      expect(toned('cost')).toEqual(['−15 MP per keer', '−15 MP'])
      expect(toned('gain')).toEqual(['+5 DEF (9%)', '+6 DEF (10%)'])
      // Een passief met een effect: alleen wat hij geeft, zonder regel "Passief, kost geen MP" (Precise Strikes 2 geeft +6 Accuracy en +1% crit, level 3 +7).
      setSkill(skills, 'Precise Strikes', '2')
      expect(lines('Precise Strikes')).toEqual(['Now: +6 Accuracy, +1% Crit. Rate', 'Next: +7 Accuracy, +1% Crit. Rate'])
      // Op level 0 van een passief met effect: nog niet geleerd, en wat level 1 geeft.
      setSkill(skills, 'Precise Strikes', '0')
      expect(lines('Precise Strikes')).toEqual(['Now: niet geleerd', 'Next: +5 Accuracy, +1% Crit. Rate'])
      // Een veld dat geen geldig level is, krijgt geen MP: het veld meldt de fout zelf.
      setSkill(skills, 'Power Strike', '')
      expect(lines('Power Strike')).toEqual([])
    })

    it('toont geen bron van de skillpunten per level meer: die voegt voor de speler niets toe (#138)', () => {
      expect(openHomeSkills().textContent).not.toContain('Skillpunten per level')
    })
  })

  describe('de Report-kaart na een level-up', () => {
    beforeEach(() => {
      open('warrior')
      afterLevelUp()
    })

    it('verhoogt het level, geeft +28 HP en laat LUK en STR staan', () => {
      expect(profileFields().level).toBe('21')
      expect(profileFields().hp).toBe('828')
      expect(profileFields().str).toBe('90')
      expect(profileFields().luk).toBe('4')
    })

    it('toont alle vier de vragen met een antwoord en nergens "Nog niet doorgerekend"', () => {
      const advice = reportCard()
      expect(advice.textContent).not.toMatch(NOT_YET)
      expect(Array.from(advice.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['ATT', 'DEF', 'Skill', 'Mob'])
    })

    it('noemt bij de skillvraag de Warrior-skills die niet zijn doorgerekend, en geen Thief-skills', () => {
      const text = reportCard().textContent!
      expect(text).toMatch(/Niet doorgerekend: Slash Blast/)
      expect(text).not.toMatch(/Keen Eyes|Dark Sight|Lucky Seven/)
    })

    it('geeft als skillpunt Power Strike (→ 2), met zijn MP, en zet het punt in het bewaarde profiel', () => {
      // Gemeten met skillPointAdvice voor dit profiel (STR 90, WATK 40, Power Strike 1): Power Strike wint, Precise Strikes spaart niets.
      const button = within(reportCard()).getByRole('button', { name: 'Punt zetten' })
      const section = button.closest<HTMLElement>('.question')!
      expect(section.querySelector('.verdict')!.textContent).toBe('Zet je skillpunt in Power Strike (→ 2).')
      // Power Strike 1 en 2 kosten allebei 4 MP per aanval (de skillpagina).
      expect(section.textContent).toContain('Elke aanval kost je dan 4 → 4 MP.')
      expect(profileFields().powerStrike).toBe('1')
      fireEvent.click(button)
      expect(profileFields().powerStrike).toBe('2')
      expect(profileFields().preciseStrikes).toBe('0')
      expect(profileFields().level).toBe('21')
      expect(within(reportCard()).getByText(/^Power Strike → 2 gezet./)).toBeTruthy()
    })

    it('noemt Warrior-wapens, geen claws, en een eis in STR', () => {
      const claw = within(reportCard()).getByRole('heading', { level: 3, name: 'ATT' }).closest<HTMLElement>('.question')!
      expect(claw.textContent).not.toMatch(/claw/i)
      expect(claw.textContent).toMatch(/wapen/)
    })
  })

  it('toont voor een Thief nog steeds de Thief-teksten (claw, Subi, Lucky Seven)', () => {
    open('thief')
    afterLevelUp()
    expect(reportCard().textContent).toContain('Niet doorgerekend: Keen Eyes, Double Stab, Disorder en Dark Sight')
    expect(reportCard().textContent).not.toMatch(NOT_YET)
    fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
    expect(homeScreen().querySelector('dialog .hint:not(.total-stats-hint)')).toBeNull()
    expect(homeScreen().textContent).not.toMatch(/Weapon multiplier|De app rekent met de stars/)
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

  describe('op de Report-kaart', () => {
    const afterLevelUp = () => {
      cleanup()
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          spots: [mobDraft('Ribbon Pig')],
        }),
      )
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, fields: { ...DEFAULT_PROFILE, lukExtra: '0', luckySeven: '2', luk: '60' } }))
      render(<App />)
      levelUp()
      }
    const armorSection = () => screen.getByRole('heading', { level: 3, name: 'DEF' }).closest<HTMLElement>('.question')!

    it('toont bij de armorvraag de hint zolang het geslacht niet gekozen is', () => {
      afterLevelUp()
      expect(within(armorSection()).getByText(ARMOR_HINT)).toBeTruthy()
    })

    it('toont de hint niet meer als het geslacht al gekozen was (bewaard)', () => {
      localStorage.setItem(GENDER_KEY, JSON.stringify({ version: 1, gender: 'male' }))
      afterLevelUp()
      expect(within(armorSection()).queryByText(ARMOR_HINT)).toBeNull()
    })
  })
})

describe('een Bowman in de app', () => {
  // Level 20 Bowman: DEX 80 voor schade, STR 20, een War Bow (30 ATT, 810 ms) en Arrow Blow 1.
  const bowmanFields = { ...DEFAULT_PROFILE, lukExtra: '0', level: '20', hp: '800', str: '20', dex: '80', luk: '4', clawWatk: '30', attackMs: '810', accuracy: '60', avoid: '10', wdef: '60', arrowBlow: '1' }
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
  const afterLevelUp = () => {
    levelUp()
  }
  const NOT_YET = /Nog niet doorgerekend/
  const found = (slot: string, text: string) => options(typeIn(cards()[0], slot, text)).map((o) => o.querySelector('.equip-name')?.textContent)
  const costText = () => within(homeScreen()).getByRole('heading', { level: 2, name: 'Report' }).closest('section')!.querySelector('.level-cost-value')!.textContent

  describe('het beginscherm', () => {
    beforeEach(open)

    it('toont een getal voor wat het level kost en niet "Nog niet doorgerekend"', () => {
      const home = homeScreen()
      expect(levelCostText()).toMatch(/Van lv 20 naar 21: .* Op .+\./)
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
      fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
      fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
      const home = homeScreen()
      expect(statShown('DEX')).toBe('80')
      expect(statShown('STR')).toBe('20')
      expect(home.querySelector('dialog.card-dialog .hint:not(.total-stats-hint)')).toBeNull()
      expect(home.textContent).not.toMatch(/Arrow Blow als je hem hebt geleerd|1 meso per pijl|Weapon multiplier|Subi|stars/)
    })

    it('toont de verwachte Bowman-accuracy en -evasion doorgestreept als je getal afwijkt', () => {
      fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
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

  describe('de Report-kaart na een level-up', () => {
    beforeEach(() => {
      open()
      afterLevelUp()
    })

    it('verhoogt het level, geeft +22 HP en laat STR, DEX en LUK staan', () => {
      expect(profileFields().level).toBe('21')
      expect(profileFields().hp).toBe('822')
      expect(profileFields().str).toBe('20')
      expect(profileFields().dex).toBe('80')
      expect(profileFields().luk).toBe('4')
    })

    it('toont alle vier de vragen met een antwoord en nergens "Nog niet doorgerekend"', () => {
      const advice = reportCard()
      expect(advice.textContent).not.toMatch(NOT_YET)
      expect(Array.from(advice.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['ATT', 'DEF', 'Skill', 'Mob'])
    })

    it('noemt bij de skillvraag de Bowman-skills die niet zijn doorgerekend, en geen Thief- of Warrior-skills', () => {
      const text = reportCard().textContent!
      expect(text).toMatch(/Niet doorgerekend: Double Shot, Critical Shot en The Eye of Amazon/)
      expect(text).not.toMatch(/Keen Eyes|Dark Sight|Lucky Seven|Slash Blast/)
    })

    it('rekent Arrow Blow als enige skill door en zet het punt toch, met de eerlijke hint dat het niets scheelt', () => {
      // Dit profiel (DEX 80, 30 ATT) heeft elke Rain Forest-kill in 2 schoten; 4% meer schade van Arrow Blow 1 → 2 verandert dat niet.
      // Een vrij punt moet ergens heen (Dave, 4 oktober 2026): Arrow Blow wint dus met besparing 0.
      const section = within(reportCard()).getByRole('heading', { level: 3, name: 'Skill' }).closest<HTMLElement>('.question')!
      expect(section.querySelector('.chip')!.textContent).toBe('Arrow Blow → 2')
      expect(section.querySelector('.verdict')!.textContent).toBe('Zet je skillpunt in Arrow Blow (→ 2).')
      expect(section.textContent).toContain('Van lv 21 tot en met lv 25 bespaart geen enkele skill meso, maar je punt moet toch ergens heen.')
      // Eén keuze: geen lijst met opties.
      expect(section.querySelector('.skill-options')).toBeNull()
      expect(within(section).getByRole('button', { name: 'Punt zetten' })).toBeTruthy()
    })

    it('noemt wapens, geen claws', () => {
      const weapon = within(reportCard()).getByRole('heading', { level: 3, name: 'ATT' }).closest<HTMLElement>('.question')!
      expect(weapon.textContent).not.toMatch(/claw/i)
      expect(weapon.textContent).toMatch(/wapen|boog/)
    })
  })
})

describe('een Magician in de app', () => {
  // Level 20, INT 60, LUK 10, een Sapphire Staff (M.ATT 31) en Energy Bolt 1.
  const magicianFields = { ...DEFAULT_PROFILE, lukExtra: '0', level: '20', hp: '600', int: '60', dex: '20', luk: '10', clawWatk: '31', accuracy: '40', avoid: '10', wdef: '40', energyBolt: '1', magicClaw: '0' }
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
  const afterLevelUp = () => {
    levelUp()
  }
  const NOT_YET = /Nog niet doorgerekend/

  describe('het beginscherm', () => {
    beforeEach(() => open())

    it('zet de job niet bij het level (Dave, 4 oktober 2026, #130) en niet achter Ability points', () => {
      expect(document.querySelector('.current-level')?.textContent).toBe('LV. 20')
      expect(headTitle('Ability points')).not.toMatch(/Magician/)
    })

    it('toont een getal voor wat het level kost en niet "Nog niet doorgerekend"', () => {
      const home = homeScreen()
      expect(within(home).getByRole('heading', { level: 2, name: 'Report' }).closest('section')!.textContent).toMatch(/±\s*[\d.]+ meso|Gratis|Niet haalbaar/)
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
      fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
      fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
      const home = homeScreen()
      expect(statShown('INT')).toBe('60')
      expect(statShown('LUK')).toBe('10')
      const names = Array.from(home.querySelectorAll('.stat-line-name')).map((e) => e.textContent)
      expect(names).toEqual(expect.arrayContaining(['STR', 'DEX', 'INT', 'LUK', 'Accuracy', 'Evasion']))
      for (const n of ['Tijd per aanval (ms)', 'Weapon multiplier van je wapen']) expect(names, n).not.toContain(n)
      // Zijn wapen geeft M.ATT, geen weapon attack: de Attack uit het statvenster leidt de app niet af.
      expect(statShown('Attack')).toBe('?')
      // Geen uitleg in de popup: die leest een speler toch niet (Dave, 4 oktober 2026, #106).
      expect(home.querySelector('dialog .hint:not(.total-stats-hint)')).toBeNull()
      expect(home.textContent).not.toMatch(/Subi|stars|Weapon multiplier|Een cast duurt|Een Magician heeft geen munitie/)
      // W.ATT staat op 0 en M.ATT toont MagicTotal = floor(60 / 2) + 31 = 61 (#100).
      expect(statShown('W.ATT')).toBe('0')
      expect(statShown('M.ATT')).toBe('61')
      expect(within(statLine('M.ATT')).queryByRole('button')).toBeNull()
    })

    it('toont de verwachte Magician-accuracy en -avoid doorgestreept als je getal afwijkt (#77)', () => {
      fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
      // Accuracy: (12 x 60 + 20 x 20 + 6 x 10 + 1020) / 51 = 2200 / 51 = 43,1, dus 43. Avoid: floor(10 / 3) + floor(20 / 6) + 5 = 11.
      expect(statLine('Accuracy').querySelector('s')?.textContent).toBe('43')
      expect(statLine('Evasion').querySelector('s')?.textContent).toBe('11')
    })

    it('toont bij Skillpoints de skills van de Magician en niet die van de Thief of Warrior', () => {
      const skills = openHomeSkills()
      for (const name of ['Magic Guard', 'Magic Armor', 'Improved MP Recovery', 'Max MP Increase', 'Energy Bolt', 'Magic Claw']) expect(skills.textContent, name).toContain(name)
      for (const name of ['Lucky Seven', 'Nimble Body', 'Dark Sight', 'Power Strike', 'Slash Blast']) expect(skills.textContent, name).not.toContain(name)
    })

    it('noemt bij het equipmentadvies wands en staffs, geen claws', () => {
      const equip = within(homeScreen()).getByRole('heading', { level: 3, name: 'ATT' }).closest('.advice-part')!
      expect(equip.textContent).toMatch(/wand|staff/i)
      expect(equip.textContent).not.toMatch(/claw/i)
    })

    it('zet de kosten en de vier adviezen in één kaart Report: ATT, DEF, Skill en Mob (#126)', () => {
      const home = homeScreen()
      expect(home.querySelectorAll('.level-cost')).toHaveLength(1)
      const card = within(home).getByRole('heading', { level: 2, name: 'Report' }).closest('section')!
      const questions = within(card).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
      expect(questions).toEqual(['ATT', 'DEF', 'Skill', 'Mob'])
      // Elk advies heeft een antwoord, en het skilladvies noemt de mana die de skill kost.
      expect(card.querySelectorAll('.chip')).toHaveLength(4)
      expect(card.textContent).not.toMatch(NOT_YET)
      expect(card.textContent).toMatch(/MP/)
    })
  })

  describe('de Report-kaart na een level-up', () => {
    beforeEach(() => {
      open()
      afterLevelUp()
    })

    it('verhoogt het level, geeft +16 HP en laat INT en LUK staan', () => {
      expect(profileFields().level).toBe('21')
      expect(profileFields().hp).toBe('616')
      expect(profileFields().int).toBe('60')
      expect(profileFields().luk).toBe('10')
    })

    it('toont alle vier de vragen met een antwoord en nergens "Nog niet doorgerekend"', () => {
      const advice = reportCard()
      expect(advice.textContent).not.toMatch(NOT_YET)
      expect(Array.from(advice.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['ATT', 'DEF', 'Skill', 'Mob'])
    })

    it('noemt bij de skillvraag de Magician-skills die niet zijn doorgerekend, en geen Thief- of Warrior-skills', () => {
      const text = reportCard().textContent!
      expect(text).toMatch(/Niet doorgerekend: Magic Guard en Max MP Increase/)
      expect(text).not.toMatch(/Keen Eyes|Dark Sight|Lucky Seven|Power Strike|Slash Blast/)
    })

    it('noemt Magic Claw niet als punt zolang Energy Bolt op 0 staat', () => {
      open({ energyBolt: '0' })
      afterLevelUp()
      const section = within(reportCard()).getByRole('heading', { level: 3, name: 'Skill' }).closest<HTMLElement>('.question')!
      expect(section.textContent).not.toContain('Magic Claw → 1')
    })

    it('noemt wands en staffs, geen claws', () => {
      const claw = within(reportCard()).getByRole('heading', { level: 3, name: 'ATT' }).closest<HTMLElement>('.question')!
      expect(claw.textContent).not.toMatch(/claw/i)
      expect(claw.textContent).toMatch(/wand of staff|wapen/)
    })
  })

  it('geeft als skillpunt Energy Bolt (→ 4), met zijn MP, en zet het punt in het bewaarde profiel', () => {
    // Gemeten met skillPointAdvice voor dit profiel (INT 20, M.ATT 10, Energy Bolt 3): Energy Bolt wint; Magic Claw 1 geeft evenveel schade per cast en spaart niets.
    open({ int: '20', clawWatk: '10', energyBolt: '3' })
    afterLevelUp()
    const button = within(reportCard()).getByRole('button', { name: 'Punt zetten' })
    const section = button.closest<HTMLElement>('.question')!
    expect(section.querySelector('.verdict')!.textContent).toBe('Zet je skillpunt in Energy Bolt (→ 4).')
    // Energy Bolt 3 en 4 kosten allebei 8 MP per cast (de skillpagina).
    expect(section.textContent).toContain('Elke cast kost je dan 8 → 8 MP.')
    expect(profileFields().energyBolt).toBe('3')
    fireEvent.click(button)
    expect(profileFields().energyBolt).toBe('4')
    expect(profileFields().magicClaw).toBe('0')
    expect(profileFields().level).toBe('21')
    expect(within(reportCard()).getByText(/^Energy Bolt → 4 gezet./)).toBeTruthy()
  })
})

describe('de menubalk bovenin (issue #86)', () => {
  const bar = () => document.querySelector<HTMLElement>('header.topbar')!
  const openMenu = () => {
    fireEvent.click(within(bar()).getByRole('button', { name: 'Instellingen' }))
    return within(bar().querySelector('dialog') as HTMLDialogElement)
  }
  const homeJobCard = () => homeScreen().querySelector('section.job')

  it('staat boven de schermen, buiten main, met de naam van de app en een menuknop', () => {
    expect(bar().closest('main')).toBeNull()
    expect(bar().querySelector('.topbar-name')?.textContent).toBe('Mesowise')
    // De ondertitel staat rechts van de naam, en niet meer op het beginscherm (#130).
    expect(bar().querySelector('.topbar-name')?.nextElementSibling?.textContent).toMatch(/^Zo min mogelijk mesos/)
    expect(within(homeScreen()).queryByText(/Zo min mogelijk mesos/)).toBeNull()
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

describe('skillpunten per level (issue #136)', () => {
  const setProfile = (fields: Partial<ProfileDraft>) => {
    cleanup()
    localStorage.clear()
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, fields: { ...DEFAULT_PROFILE, ...fields } }))
    render(<App />)
  }
  /** Of er bij een skill nog een punt bij kan: de popup laat dan meer toe dan het level dat er staat. */
  const canRaise = (card: HTMLElement, skill: string) => {
    const row = within(card).getByRole('button', { name: `${skill} wijzigen` }).closest('.skill-row')!
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: `${skill} wijzigen` }))
    const d = document.querySelector(`dialog[aria-label="${skill}"]`) as HTMLElement
    const input = within(d).getByLabelText(/^Level/) as HTMLInputElement
    const raise = Number(input.max) > (Number(input.value) || 0)
    fireEvent.click(within(d).getByRole('button', { name: 'Sluiten zonder opslaan' }))
    return raise
  }

  // Dave, 5 oktober 2026: een rij was te vol; er staat nu alleen het level en een potlood, zoals bij Equip.
  it('toont per skill alleen het level en een potlood, zonder − en + in de rij', () => {
    setProfile({ level: '11', luckySeven: '3' })
    const card = openHomeSkills()
    const row = within(card).getByRole('button', { name: 'Lucky Seven wijzigen' }).closest('.skill-row') as HTMLElement
    expect(row.querySelector('.equip-value')!.textContent).toBe('3')
    expect(row.querySelector('input')).toBeNull()
    expect(within(row).getAllByRole('button')).toHaveLength(1)
  })

  it('toont in de popup van een skill hoeveel SP er over is, en zet een te hoog level op wat de pot toelaat', () => {
    setProfile({ level: '11', luckySeven: '1' })
    const card = openHomeSkills()
    fireEvent.click(within(card).getByRole('button', { name: 'Lucky Seven wijzigen' }))
    const d = document.querySelector('dialog[aria-label="Lucky Seven"]') as HTMLElement
    // Lv 11 geeft 4 SP voor de 1e job; Lucky Seven 1 laat er 3 over, dus hoogstens level 4.
    expect(d.querySelector('.stat-dialog-db')!.textContent).toBe('SP over: 3 van 4')
    expect((within(d).getByLabelText(/^Level/) as HTMLInputElement).max).toBe('4')
    setSkill(card, 'Lucky Seven', '9')
    expect(profileFields().luckySeven).toBe('4')
    // Een negatief level gaat naar 0.
    setSkill(card, 'Lucky Seven', '-2')
    expect(profileFields().luckySeven).toBe('0')
  })

  it('toont op de Skillpoints-kaart per pot "x / y SP"', () => {
    setProfile({ level: '11', luckySeven: '3', nimbleBody: '1', threeSnails: '2' })
    const card = openHomeSkills()
    expect(card.textContent).toContain('4 / 4 SP')
    expect(card.textContent).toContain('2 / 9 SP')
  })

  it('laat bij de skills van de 1e job geen punt meer toe als die pot vol is, en laat de Beginner-skills met rust', () => {
    setProfile({ level: '11', luckySeven: '3', nimbleBody: '1' })
    const card = openHomeSkills()
    expect(canRaise(card, 'Lucky Seven')).toBe(false)
    expect(canRaise(card, 'Keen Eyes')).toBe(false)
    expect(canRaise(card, 'Three Snails')).toBe(true)
  })

  it('laat bij de Beginner-skills geen punt meer toe als de Beginner-pot vol is', () => {
    setProfile({ level: '5', luckySeven: '0', threeSnails: '3', nimbleFeet: '1' })
    const card = openHomeSkills()
    expect(card.textContent).toContain('4 / 4 SP')
    expect(canRaise(card, 'Recovery')).toBe(false)
    expect(canRaise(card, 'Three Snails')).toBe(false)
  })

  it('laat een punt toe zolang er een over is, en zet er dan een bij', () => {
    setProfile({ level: '11', luckySeven: '3' })
    const card = openHomeSkills()
    expect(canRaise(card, 'Keen Eyes')).toBe(true)
    setSkill(card, 'Keen Eyes', '1')
    expect(profileFields().keenEyes).toBe('1')
    expect(card.textContent).toContain('4 / 4 SP')
    expect(canRaise(card, 'Keen Eyes')).toBe(false)
  })

  it('toont alleen wat je zette als het level geen geldig getal is, en laat een punt toe', () => {
    setProfile({ level: '', luckySeven: '3' })
    const card = openHomeSkills()
    expect(card.textContent).toContain('3 SP')
    expect(card.textContent).not.toMatch(/\d+ \/ \d+ SP/)
    expect(canRaise(card, 'Keen Eyes')).toBe(true)
  })

  it('zegt bij de skillvraag dat je skillpunten goed staan als de pot vol is', () => {
    setProfile({ level: '10', luckySeven: '1' })
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, spots: [mobDraft('Ribbon Pig')] }))
    cleanup()
    render(<App />)
    levelUp()
    const section = within(reportCard()).getByRole('heading', { level: 3, name: 'Skill' }).closest<HTMLElement>('.question')!
    // Level 11 geeft 3 punten erbij: er is dus nog iets te kiezen.
    expect(section.textContent).not.toContain('geen skillpunten meer over')
    // Zet de pot vol via de Skillpoints-kaart van het beginscherm.
    fireEvent.click(within(homeScreen()).getByRole('button', { name: 'Skillpoints bekijken' }))
    setSkill(homeScreen(), 'Lucky Seven', '4')
    // Geen punt meer: de app controleert nu of je punten goed staan. Lucky Seven 4 kost hier niet meer dan een andere verdeling.
    expect(section.querySelector('.chip')!.textContent).toBe('Goed gezet')
    expect(section.querySelector('.verdict')!.textContent).toBe('Je skillpunten staan goed.')
    expect(within(section).queryByRole('button', { name: 'Punt zetten' })).toBeNull()
  })
})

describe('een vrij skillpunt moet ergens heen, ook als geen skill meso bespaart', () => {
  // Level 20 Bowman op een plek waar Arrow Blow niets verandert; The Eye of Amazon 3 maakt Focus leerbaar, en Focus kost extra.
  const bowman = { ...DEFAULT_PROFILE, lukExtra: '0', level: '20', hp: '800', str: '20', dex: '80', luk: '4', clawWatk: '30', attackMs: '810', accuracy: '60', avoid: '10', wdef: '60', eyeOfAmazon: '3' }
  const skillSection = (job: string, fields: object, spot: string) => {
    cleanup()
    localStorage.setItem(JOB_KEY, JSON.stringify({ version: 1, job }))
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, fields }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, spots: [mobDraft(spot)] }))
    render(<App />)
    levelUp()
    return within(reportCard()).getByRole('heading', { level: 3, name: 'Skill' }).closest<HTMLElement>('.question')!
  }
  const lines = (section: HTMLElement) => Array.from(section.querySelectorAll('.skill-options li')).map((li) => li.textContent)

  it('noemt bij besparing 0 de hint "scheelt geen enkele skill meso", met Ja en de knop, en toont elke keuze met zijn eigen slot', () => {
    const section = skillSection('bowman', { ...bowman, arrowBlow: '1' }, 'Ribbon Pig')
    expect(section.querySelector('.chip')!.textContent).toBe('Arrow Blow → 2')
    expect(section.querySelector('.verdict')!.textContent).toBe('Zet je skillpunt in Arrow Blow (→ 2).')
    expect(section.textContent).toContain('Van lv 21 tot en met lv 25 bespaart geen enkele skill meso, maar je punt moet toch ergens heen.')
    expect(section.textContent).not.toContain('Bespaart ±')
    // Gelijkspel op 0 is robuust: geen "Hangt af van de aannames".
    expect(section.textContent).not.toContain('Hangt af van de aannames')
    expect(lines(section)).toEqual(['Arrow Blow → 2: scheelt niets', expect.stringMatching(/^Focus → 1: kost ± [\d.]+ meso extra$/)])
    expect(within(section).getByRole('button', { name: 'Punt zetten' })).toBeTruthy()
  })

  it('noemt bij een negatieve besparing de extra kosten van de skill die het minst kost, en laat de knop staan', () => {
    // Arrow Blow op 20 is het maximum: alleen Focus is nog te leren, en die kost extra.
    const section = skillSection('bowman', { ...bowman, arrowBlow: '20' }, 'Ribbon Pig')
    expect(section.querySelector('.chip')!.textContent).toBe('Focus → 1')
    expect(section.querySelector('.verdict')!.textContent).toBe('Zet je skillpunt in Focus (→ 1).')
    expect(section.textContent).toMatch(/Van lv 21 tot en met lv 25 bespaart geen enkele skill meso, maar je punt moet toch ergens heen\. Deze kost het minst extra: ± [\d.]+ meso\./)
    expect(section.textContent).not.toContain('Geen van de skills')
    expect(within(section).getByRole('button', { name: 'Punt zetten' })).toBeTruthy()
  })

  it('kiest bij alleen negatieve besparingen de minst negatieve, en sorteert de lijst op die volgorde', () => {
    const section = skillSection('bowman', { ...bowman, arrowBlow: '15' }, 'Ribbon Pig')
    expect(section.querySelector('.verdict')!.textContent).toBe('Zet je skillpunt in Focus (→ 1).')
    const l = lines(section)
    expect(l).toHaveLength(2)
    expect(l[0]).toMatch(/^Focus → 1: kost ± [\d.]+ meso extra$/)
    expect(l[1]).toMatch(/^Arrow Blow → 16: kost ± [\d.]+ meso extra$/)
    const num = (t: string) => Number(t.match(/± ([\d.]+) meso/)![1].replace(/\./g, ''))
    expect(num(l[0]!)).toBeLessThan(num(l[1]!))
  })

  it('zet het punt met de knop in de winnaar, ook als die extra kost', () => {
    const section = skillSection('bowman', { ...bowman, arrowBlow: '20' }, 'Ribbon Pig')
    fireEvent.click(within(section).getByRole('button', { name: 'Punt zetten' }))
    expect(profileFields().focus).toBe('1')
  })

  it('toont een regel per keuze met het juiste einde: bespaart, scheelt niets en kost extra', () => {
    // Warrior op Snail: Improved HP Recovery bespaart, Power Strike en Max HP Increase doen niets, Iron Body kost extra.
    const w = { ...DEFAULT_PROFILE, lukExtra: '0', level: '20', hp: '800', str: '90', dex: '20', luk: '4', clawWatk: '40', weaponMult: '1.8', attackMs: '750', accuracy: '40', avoid: '10', wdef: '60', powerStrike: '1', preciseStrikes: '0', improvedHpRecovery: '3', maxHpIncrease: '3' }
    const section = skillSection('warrior', w, 'Snail')
    expect(section.querySelector('.chip')!.textContent).toBe('Improved HP Recovery → 4')
    expect(section.querySelector('.verdict')!.textContent).toBe('Zet je skillpunt in Improved HP Recovery (→ 4).')
    expect(section.textContent).toMatch(/Bespaart ± [\d.]+ meso van lv 21 tot en met lv 25\./)
    const l = lines(section)
    expect(l).toHaveLength(5)
    expect(l[0]).toMatch(/^Improved HP Recovery → 4: bespaart ± [\d.]+ meso$/)
    expect(l).toContain('Power Strike → 2: scheelt niets')
    expect(l).toContain('Precise Strikes → 1: scheelt niets')
    expect(l).toContain('Max HP Increase → 4: scheelt niets')
    expect(l[4]).toMatch(/^Iron Body → 1: kost ± [\d.]+ meso extra$/)
  })

  const placedHint = (section: HTMLElement) => {
    fireEvent.click(within(section).getByRole('button', { name: 'Punt zetten' }))
    return within(reportCard()).getByText(/ gezet\./).textContent!
  }

  it('zegt na het zetten bij een besparing > 0 waarom het de beste keuze was en wat de tweede keuze doet', () => {
    const w = { ...DEFAULT_PROFILE, lukExtra: '0', level: '20', hp: '800', str: '90', dex: '20', luk: '4', clawWatk: '40', weaponMult: '1.8', attackMs: '750', accuracy: '40', avoid: '10', wdef: '60', powerStrike: '1', preciseStrikes: '0', improvedHpRecovery: '3', maxHpIncrease: '3' }
    const text = placedHint(skillSection('warrior', w, 'Snail'))
    expect(text).toMatch(/^Improved HP Recovery → 4 gezet\. De beste keuze: bespaart ± [\d.]+ meso van lv 21 tot en met lv 25\./)
    // De tweede keuze (Power Strike → 2, scheelt niets) staat er als eigen zin achter.
    expect(text).toContain(' De tweede keuze, Power Strike → 2, scheelt niets.')
  })

  it('zegt na het zetten bij een besparing < 0 dat geen skill bespaart en deze het minst extra kost, met de tweede keuze als extra kosten', () => {
    const text = placedHint(skillSection('bowman', { ...bowman, arrowBlow: '15' }, 'Ribbon Pig'))
    expect(text).toMatch(/^Focus → 1 gezet\. De beste keuze: geen skill bespaart hier meso, deze kost het minst extra \(± [\d.]+ meso\)\./)
    expect(text).toMatch(/ De tweede keuze, Arrow Blow → 16, kost ± [\d.]+ meso extra\./)
  })

  it('zegt na het zetten bij besparing 0 dat de winnaar niets extra kost, en noemt de tweede keuze die extra kost', () => {
    const text = placedHint(skillSection('bowman', { ...bowman, arrowBlow: '1' }, 'Ribbon Pig'))
    expect(text).toMatch(/^Arrow Blow → 2 gezet\. De beste keuze: geen skill bespaart hier meso, deze scheelt niets\./)
    expect(text).toMatch(/ De tweede keuze, Focus → 1, kost ± [\d.]+ meso extra\./)
  })

  it('noemt bij een gelijkspel dat de andere evenveel scheelt en dat de app dan de eerste kiest', () => {
    // Warrior op Snail met Improved HP Recovery op het maximum: Power Strike, Precise Strikes en Max HP Increase scheelt allemaal niets.
    const w = { ...DEFAULT_PROFILE, lukExtra: '0', level: '20', hp: '800', str: '90', dex: '20', luk: '4', clawWatk: '40', weaponMult: '1.8', attackMs: '750', accuracy: '40', avoid: '10', wdef: '60', powerStrike: '1', preciseStrikes: '0', improvedHpRecovery: '15' }
    const section = skillSection('warrior', w, 'Snail')
    const l = lines(section)
    expect(l.length).toBeGreaterThan(1)
    expect(l.slice(0, 2).every((x) => x!.endsWith('scheelt niets'))).toBe(true)
    expect(placedHint(section)).toMatch(/ scheelt evenveel; de app koos de eerste\./)
  })
})

describe('de kaart Report en het blok Stats op het beginscherm', () => {
  const home = () => {
    cleanup()
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, fields: { ...DEFAULT_PROFILE, lukExtra: '0', luckySeven: '2', luk: '60' } }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, spots: [mobDraft('Ribbon Pig')] }))
    render(<App />)
    return homeScreen()
  }
  const card = (h: HTMLElement) => within(h).getByRole('heading', { level: 2, name: 'Report' }).closest('section')!

  it('zet onder Report de koppen ATT, DEF, Skill en Mob in die volgorde, en niets van de oude vraag over equipment', () => {
    const c = card(home())
    expect(Array.from(c.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['ATT', 'DEF', 'Skill', 'Mob'])
    // ATT en DEF zijn afkortingen met hun volle naam als tooltip.
    expect(Array.from(c.querySelectorAll('h3 abbr')).map((a) => [a.textContent, a.getAttribute('title')])).toEqual([['ATT', 'Attack'], ['DEF', 'Defense']])
    expect(c.textContent).not.toContain('Moet ik mijn equipment nu upgraden?')
    expect(c.textContent).not.toContain('Wat kost dit level?')
  })

  it('zet onder elke kop één regel die zegt wat er wordt afgewogen', () => {
    const c = card(home())
    const leads = Array.from(c.querySelectorAll('h3')).map((h) => h.closest('.question-head')!.nextElementSibling!)
    for (const l of leads) {
      expect(l.tagName).toBe('P')
      expect(l.classList.contains('hint')).toBe(true)
    }
    expect(leads.map((l) => l.textContent)).toEqual([
      'Een sterker wapen: de prijs tegenover wat je bespaart doordat je sneller killt.',
      'Betere armor: de prijs tegenover de HP potions die je daardoor minder nodig hebt.',
      'Welke skill het meeste bespaart: sneller killen tegenover de extra mana potions.',
      'Welke mob dit level het goedkoopst is: hoe snel je killt tegenover wat je aan potions kwijt bent.',
    ])
  })

  it('zet de chip in dezelfde .question-head als zijn kop', () => {
    const c = card(home())
    const heads = Array.from(c.querySelectorAll('h3')).map((h) => h.closest('.question-head')!)
    expect(heads).toHaveLength(4)
    for (const head of heads) {
      expect(head.querySelectorAll('h3')).toHaveLength(1)
      expect(head.querySelectorAll('.chip')).toHaveLength(1)
    }
  })

  it('geeft ATT, DEF en Mob een label in plaats van Ja of Nee', () => {
    const c = card(home())
    const chips = Array.from(c.querySelectorAll('.chip')).map((x) => x.textContent!)
    expect(chips).toHaveLength(4)
    expect(chips[0]).toMatch(/^(Upgraden|Niet upgraden|Upgrade complete|Niet uit te rekenen)$/)
    expect(chips[1]).toMatch(/^(Upgraden|Niet upgraden|Upgrade complete|Niet uit te rekenen)$/)
    expect(chips[3]).toMatch(/^(Wisselen|Blijven|Niet uit te rekenen)$/)
    for (const t of chips) expect(t).not.toMatch(/^(Ja|Nee)$/)
  })

  it('zet Upgraden bij ATT of DEF alleen bij een winnaar, anders Niet upgraden, en Blijven bij Mob als je mob de goedkoopste is', () => {
    const c = card(home())
    const chipOf = (title: string) => within(c).getByRole('heading', { level: 3, name: title }).closest('.advice-part')!.querySelector('.chip')!.textContent
    // De verdict-regel zegt hetzelfde als het label: "Koop …" hoort bij Upgraden.
    for (const t of ['ATT', 'DEF']) {
      const part = within(c).getByRole('heading', { level: 3, name: t }).closest('.advice-part')!
      expect(part.textContent!.includes('Koop ')).toBe(chipOf(t) === 'Upgraden')
    }
    const mob = within(c).getByRole('heading', { level: 3, name: 'Mob' }).closest('.advice-part')!
    expect(mob.textContent!.includes('Blijf op ')).toBe(chipOf('Mob') === 'Blijven')
    expect(mob.textContent!.includes('Wissel naar ')).toBe(chipOf('Mob') === 'Wisselen')
  })

  it('zet Ability points en Total stats in één blok Stats zonder zichtbare kop, en alleen die twee', () => {
    const h = home()
    const group = h.querySelector('section.stats-group')!
    expect(group.getAttribute('aria-label')).toBe('Stats')
    expect(group.querySelector('h2')).toBeNull()
    expect(within(h).queryByRole('heading', { name: 'Stats' })).toBeNull()
    expect(within(group as HTMLElement).getAllByRole('button', { name: /Ability points|Total stats/ })).toHaveLength(2)
    expect(within(group as HTMLElement).getByRole('button', { name: 'Ability points bekijken' })).toBeTruthy()
    expect(within(group as HTMLElement).getByRole('button', { name: 'Total stats bekijken' })).toBeTruthy()
    // Geen andere kaart in het blok: de twee kaarten zijn de enige kinderen.
    expect(group.children).toHaveLength(2)
    expect(within(group as HTMLElement).queryByRole('button', { name: /Skillpoints|Equip/ })).toBeNull()
  })

  it('noemt bij een Thief op lv 10 wat hij draagt en vanaf welk level de eerstvolgende betere claw te dragen is', () => {
    cleanup()
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, fields: { ...DEFAULT_PROFILE, level: '10' } }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, spots: [mobDraft('Ribbon Pig')] }))
    render(<App />)
    const att = () => within(homeScreen()).getByRole('heading', { level: 3, name: 'ATT' }).closest('.advice-part')!
    // Zonder wapen in het slot staat er geen "Je draagt", wel de eerstvolgende claw.
    expect(att().textContent).not.toContain('Je draagt')
    expect(att().textContent).toContain('De eerstvolgende betere claw, Steel Titans, kun je vanaf lv 15 dragen.')
    openHomeEquipment()
    pick(cards()[0], 'Weapon', 'Garnier')
    expect(att().textContent).toMatch(/Je draagt Garnier \(ATT \d+\)\./)
    expect(att().textContent).toContain('De eerstvolgende betere claw, Steel Titans, kun je vanaf lv 15 dragen.')
  })

  describe('ATT en DEF: Upgrade complete, Niet upgraden en het wapen op lv 9', () => {
    const homeWith = (fields: object, equipment?: object, gender?: 'male' | 'female') => {
      cleanup()
      localStorage.clear()
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, fields: { ...DEFAULT_PROFILE, ...fields } }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, spots: [mobDraft('Ribbon Pig')] }))
      if (gender) localStorage.setItem('mesowise.gender.v1', JSON.stringify({ version: 1, gender }))
      if (equipment) localStorage.setItem(EQUIPMENT_KEY, JSON.stringify({ version: 1, slots: equipment }))
      render(<App />)
      return homeScreen()
    }
    const part = (h: HTMLElement, title: string) => within(h).getByRole('heading', { level: 3, name: title }).closest('.advice-part') as HTMLElement
    const chipOf = (el: HTMLElement) => el.querySelector('.chip')!

    it('noemt een Thief op lv 9 de Garnier vanaf lv 10, en wat hij draagt zodra het slot is ingevuld', () => {
      const h = homeWith({ level: '9', clawWatk: '5', luckySeven: '0', nimbleBody: '0' })
      expect(part(h, 'ATT').textContent).toContain('De eerstvolgende betere claw, Garnier, kun je vanaf lv 10 dragen.')
      expect(part(h, 'ATT').textContent).not.toContain('Je draagt')
      openHomeEquipment()
      pick(cards()[0], 'Weapon', 'Garnier')
      expect(part(homeScreen(), 'ATT').textContent).toMatch(/Je draagt Garnier \(ATT \d+\)\./)
      expect(part(homeScreen(), 'ATT').textContent).toContain('Steel Titans, kun je vanaf lv 15 dragen.')
    })

    it('noemt bij een ongeldig profiel op lv 9 geen "geen betere claw meer": onbekend is niet hetzelfde als het einde van de winkel', () => {
      // Lv 9 met de skillpunten van het voorbeeldprofiel: meer dan een Thief op lv 9 heeft, dus het profiel parst niet.
      const h = homeWith({ level: '9', clawWatk: '5' })
      const att = part(h, 'ATT')
      expect(att.textContent).toContain('Je karakter is niet volledig ingevuld')
      expect(att.textContent).not.toContain('De app kent geen betere claw meer')
      expect(att.textContent).not.toContain('De eerstvolgende betere claw')
      expect(chipOf(att).textContent).toBe('Niet uit te rekenen')
    })

    it('zet bij ATT de chip op "Upgrade complete" (klasse yes) als je de beste claw draagt die je level toelaat', () => {
      // Lv 15 met 13 ATT: Steel Titans (13) is de beste die je kunt dragen; Steel Igor komt pas op lv 20.
      const h = homeWith({ level: '15', luk: '60', dex: '40', clawWatk: '13' })
      const chip = chipOf(part(h, 'ATT'))
      expect(chip.textContent).toBe('Upgrade complete')
      expect(chip.classList.contains('yes')).toBe(true)
      expect(part(h, 'ATT').textContent).toContain('De eerstvolgende betere claw, Steel Igor, kun je vanaf lv 20 dragen.')
    })

    it('zegt na de laatste claw dat de app er geen betere kent', () => {
      const h = homeWith({ level: '30', luk: '80', dex: '40', clawWatk: '23' })
      expect(chipOf(part(h, 'ATT')).textContent).toBe('Upgrade complete')
      expect(part(h, 'ATT').textContent).toContain('De app kent geen betere claw meer voor je job.')
    })

    it('zet bij ATT "Niet upgraden" als een betere claw er is maar zich niet terugverdient', () => {
      const h = homeWith({ level: '15' })
      expect(chipOf(part(h, 'ATT')).textContent).toBe('Niet upgraden')
      expect(part(h, 'ATT').textContent).toContain('Geen claw verdient zich terug')
    })

    it('zet bij ATT "Niet upgraden" als een betere claw je stats nog niet haalt', () => {
      const h = homeWith({ level: '25', luk: '4', dex: '4' })
      const att = part(h, 'ATT')
      expect(chipOf(att).textContent).toBe('Niet upgraden')
      expect(chipOf(att).classList.contains('yes')).toBe(false)
      expect(att.textContent).toMatch(/Steel Titans: je hebt nog \d+ LUK en \d+ DEX nodig/)
    })

    it('zet bij DEF "Upgrade complete" als je in elk slot meer WDEF draagt dan de winkel biedt', () => {
      const slot = { pick: 'other', name: 'Testpak', stat: '999' }
      const h = homeWith({ level: '30', luk: '80', dex: '40' }, { hat: slot, top: slot, bottom: slot, shoes: slot, shield: slot, gloves: slot, cape: slot, earrings: slot }, 'male')
      const chip = chipOf(part(h, 'DEF'))
      expect(chip.textContent).toBe('Upgrade complete')
      expect(chip.classList.contains('yes')).toBe(true)
    })

    it('zet bij DEF zonder gekozen geslacht "Niet upgraden", ook als je overal meer WDEF draagt dan de winkel biedt', () => {
      const slot = { pick: 'other', name: 'Testpak', stat: '999' }
      const h = homeWith({ level: '30', luk: '80', dex: '40' }, { hat: slot, top: slot, bottom: slot, shoes: slot, shield: slot, gloves: slot, cape: slot, earrings: slot })
      const chip = chipOf(part(h, 'DEF'))
      expect(chip.textContent).toBe('Niet upgraden')
      expect(chip.classList.contains('yes')).toBe(false)
    })

    it('zet bij DEF "Niet upgraden" als er stukken zijn maar geen zich terugverdient', () => {
      const h = homeWith({ level: '10' })
      expect(chipOf(part(h, 'DEF')).textContent).toBe('Niet upgraden')
    })
  })
})

describe('de plaatsingscheck als er geen skillpunt meer over is', () => {
  const skillPart = (fields: object, mob = 'Ribbon Pig') => {
    cleanup()
    localStorage.clear()
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, fields: { ...DEFAULT_PROFILE, ...fields } }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, spots: [mobDraft(mob)] }))
    render(<App />)
    return within(homeScreen()).getByRole('heading', { level: 3, name: 'Skill' }).closest('.advice-part') as HTMLElement
  }

  it('zegt "Goed gezet" (yes) als geen punt in een andere skill goedkoper was', () => {
    // Lv 10 geeft 1 punt: dat staat in Nimble Body. Het in Lucky Seven zetten kost extra mana, dus goedkoper kan niet.
    const part = skillPart({ level: '10', luckySeven: '0', nimbleBody: '1' })
    const chip = part.querySelector('.chip')!
    expect(chip.textContent).toBe('Goed gezet')
    expect(chip.classList.contains('yes')).toBe(true)
    expect(part.querySelector('.verdict')!.textContent).toBe('Je skillpunten staan goed.')
    expect(within(part).queryByRole('button', { name: 'Punt zetten' })).toBeNull()
  })

  it('noemt onder "Goed gezet" de beste andere verdeling met de extra kosten, als die iets kost', () => {
    const part = skillPart({ level: '10', luckySeven: '0', nimbleBody: '1' })
    expect(part.textContent).toContain('Geen enkel punt in een andere skill zou van lv 10 tot en met lv 14 goedkoper zijn.')
    expect(part.textContent).toMatch(/Het dichtstbij: een punt in Lucky Seven in plaats van in Nimble Body zou van lv 10 tot en met lv 14 ± [\d.]+ meso extra kosten\./)
    expect(part.textContent).not.toContain('scheelt evenveel')
  })

  it('zegt "Beter in {skill}" (no) en noemt de besparing als een punt in een andere skill goedkoper was', () => {
    // Lucky Seven 1 kost op deze mob veel extra mana; hetzelfde punt in Nimble Body kost niets.
    const part = skillPart({ level: '10', luckySeven: '1' })
    const chip = part.querySelector('.chip')!
    expect(chip.textContent).toBe('Beter in Nimble Body')
    expect(chip.classList.contains('no')).toBe(true)
    expect(part.querySelector('.verdict')!.textContent).toMatch(/^Een punt in Nimble Body in plaats van in Lucky Seven zou van lv 10 tot en met lv 14 ± [\d.]+ meso besparen\.$/)
    expect(within(part).queryByRole('button', { name: 'Punt zetten' })).toBeNull()
  })

  it('telt een skillpunt over 5 levels en zegt het als de EXP-tabel die horizon afkapt (#145)', () => {
    const early = skillPart({ level: '10', luckySeven: '0', nimbleBody: '1' })
    expect(early.textContent).not.toContain('EXP-tabel loopt tot')
    const late = skillPart({ level: '28' })
    expect(late.textContent).toMatch(/van lv 28 tot en met lv 30/i)
    expect(late.textContent).toContain('Een punt telt over 5 levels, maar de EXP-tabel loopt tot lv 30, dus verder rekent de app niet.')
  })

  it('houdt "Geen punt over" als de app het punt niet kan verplaatsen, omdat het in een skill staat die ze niet doorrekent', () => {
    const part = skillPart({ level: '10', luckySeven: '0', keenEyes: '1' })
    expect(part.querySelector('.chip')!.textContent).toBe('Geen punt over')
    expect(part.querySelector('.verdict')!.textContent).toBe('Je hebt op dit level geen skillpunten meer over.')
  })
})
