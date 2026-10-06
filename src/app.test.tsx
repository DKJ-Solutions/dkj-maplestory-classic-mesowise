// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App, totalCostWho } from './app'
import { NPC_CLAWS } from './data/claws'
import { EQUIPMENT_KEY, familyName, searchCatalog } from './equipment'
import { JOB_KEY } from './job'
import { POTION_CHOICE_KEY } from './potions'
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
const GARNIER = claw('Garnier')

/** Twee items uit de catalogus van een slot met een verschillende stat en een naam die niet in de ander zit, allebei te dragen op lv 10 (#188: de lijst staat met het hoogste level bovenaan). */
const twoItems = (slot: 'hat' | 'top' | 'shoes') => {
  const items = searchCatalog(slot, 'thief', '', false, '', 10)
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
/** Kies een catalogusitem: typ de naam in de zoekbalk en tik de optie aan; de lijst toont kleuren als één rij onder hun gedeelde naam (#188). */
const pick = (card: HTMLElement, slot: string, name: string) => {
  const isFamilyOf = (label: string | null | undefined) => !!label && (label === name || name.endsWith(` ${label}`))
  const option = options(typeIn(card, slot, name)).find((o) => isFamilyOf(o.querySelector('.equip-name')?.textContent))
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
/** De naam van wat in een slot staat, zonder het level dat erachter staat (#188: "Steel Igor (Lv. 20)"). */
const worn = (card: HTMLElement, slot: string) => rowOf(card, slot).querySelector('.equip-picked')?.textContent?.replace(/ \(Lv\. \d+\)$/, '') ?? null

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
const openHomeEquipment = () => fireEvent.click(within(cards()[0]).getByRole('button', { name: 'Your character' }))
const levelUp = () => fireEvent.click(screen.getByRole('button', { name: /Level up/ }))
/** De open Monster-popup. */
const mobDialog = () => document.querySelector<HTMLElement>('section.hunted dialog.card-dialog')!
/** Een mob kiezen in de open Monster-popup en hem met Opslaan vastleggen; Opslaan sluit de popup, dus hij gaat weer open. */
const chooseMob = (name: string) => {
  fireEvent.change(within(mobDialog()).getByLabelText('De mob die je het meest killt'), { target: { value: name } })
  fireEvent.click(within(mobDialog()).getByRole('button', { name: 'Opslaan' }))
  fireEvent.click(screen.getByRole('button', { name: 'Monster bekijken' }))
}

/** Het scherm opnieuw opbouwen op een hoger character-level: de zoekbalk toont alleen wat je op je level kunt dragen (#188). Wat al is opgeslagen blijft staan. */
const atLevel = (level: string) => {
  const fields = { ...DEFAULT_PROFILE, ...(profileFields() ?? {}), level }
  cleanup()
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, fields }))
  render(<App />)
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
    // Het rapport van Equip zit in de bekijken-popup (#188): die gaat eerst open.
    const reportButton = (title: string) => {
      if (title === 'Equip' && !document.querySelector('dialog.card-dialog')) openHomeEquipment()
      return report(title)!
    }
    const openReport = (title: string) => {
      fireEvent.click(reportButton(title))
      return document.querySelector('dialog.report-dialog') as HTMLDialogElement
    }

    it('staat bij Equip in de bekijken-popup en bij Skillpoints, Monster en Potions in de kop naast het oog, en niet bij Ability points en Total stats', () => {
      // De Equip-kaart heeft geen oog in de kop (#188): in de kaart alleen Your character en Cheapest, het rapport zit in hun popup.
      const card = homeScreen().querySelector<HTMLElement>('section.equipment')!
      expect(card.querySelector('.spot-head button')).toBeNull()
      expect([...card.querySelectorAll('.equip-actions button')].map((b) => b.textContent)).toEqual(['Your character', 'Cheapest'])
      expect(report('Equip')).toBeNull()
      for (const view of ['Your character', 'Cheapest']) {
        fireEvent.click(within(card).getByRole('button', { name: view }))
        expect(report('Equip')!.closest('dialog.card-dialog'), view).not.toBeNull()
        fireEvent.click(within(card.querySelector<HTMLElement>('dialog.card-dialog')!).getByRole('button', { name: 'Sluiten' }))
      }
      for (const title of ['Skillpoints', 'Monster', 'Potions']) {
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

    it('zet de kaarten met een rapport bij elkaar, met de Stats-groep onder Potions, dan Total cost en de Report-kaart', () => {
      const stats = homeScreen().querySelector('section.stats-group')!
      const equip = homeScreen().querySelector('section.equipment')!
      const skills = report('Skillpoints')!.closest('section')!
      const mob = report('Monster')!.closest('section')!
      const potions = report('Potions')!.closest('section')!
      expect(equip.nextElementSibling).toBe(skills)
      expect(skills.nextElementSibling).toBe(mob)
      expect(mob.nextElementSibling).toBe(potions)
      expect(potions.nextElementSibling).toBe(stats)
      expect(stats.nextElementSibling).toBe(homeScreen().querySelector('section.total-cost'))
      // Eén Total cost-kaart, ook met Cheapest en Difference erin (#183), dan het Report.
      expect(homeScreen().querySelectorAll('section.total-cost')).toHaveLength(1)
      expect(stats.nextElementSibling!.nextElementSibling).toBe(homeScreen().querySelector('section.level-cost'))
    })

    it('toont bij Equip het advies over je wapen en je armor (ATT en DEF)', () => {
      const dialog = openReport('Equip')
      expect(dialog.open).toBe(true)
      expect(dialog.getAttribute('aria-label')).toBe('Report: Equip')
      expect(Array.from(dialog.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['ATT', 'DEF'])
      // De inhoud van de kaart zelf staat er niet in: die zit in de popup eronder.
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
        const popup = document.querySelector<HTMLElement>('dialog.card-dialog')
        if (popup) fireEvent.click(within(popup).getAllByRole('button', { name: 'Sluiten' })[0])
      }
    })

    it('opent het rapport van Equip vanuit de bekijken-popup, en die blijft open als je het rapport sluit (#188)', () => {
      openReport('Equip')
      expect(document.querySelector('dialog.card-dialog')).not.toBeNull()
      expect(report('Equip')!.getAttribute('aria-expanded')).toBe('true')
      fireEvent.click(within(document.querySelector('dialog.report-dialog') as HTMLElement).getByRole('button', { name: 'Sluiten' }))
      expect(document.querySelector('dialog.report-dialog')).toBeNull()
      expect(document.querySelector('dialog.card-dialog')).not.toBeNull()
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
    atLevel('20')
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    expect(profileFields().clawWatk).toBe(String(IGOR.watk))
    expect(profileFields().attackMs).toBe(String(IGOR.speed.attackMs))
    // de rest van het profiel is onaangeroerd
    expect(profileFields().level).toBe('20')
    expect(profileFields().wdef).toBe(DEFAULT_PROFILE.wdef)
  })

  it('toont de nieuwe aanvalstijd op de karakterkaart', () => {
    atLevel('20')
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
    expect(statShown('Tijd per aanval (ms)')).toBe(String(IGOR.speed.attackMs))
  })

  it('houdt in de kaartkop alleen de titel, ook als je iets draagt', () => {
    atLevel('20')
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    expect(cards()[0].querySelector('.spot-head .spot-name')?.textContent?.trim()).toBe('Equip')
  })

  it('zet achter een item uit de catalogus het level dat hij vraagt, en niet achter een eigen item (#188)', () => {
    atLevel('20')
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    expect(rowOf(cards()[0], 'Weapon').querySelector('.equip-picked')?.textContent).toBe(`${IGOR.name} (Lv. ${IGOR.level})`)
    pickOwn(cards()[0], 'Hat', 'Mijn hoed')
    expect(rowOf(cards()[0], 'Hat').querySelector('.equip-picked')?.textContent).toBe('Mijn hoed')
  })

  it('toont in Total cost onder Cheapest een knop Equip bekijken met de equip waarmee die factuur rekent: wat je draagt (#188)', () => {
    atLevel('20')
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    fireEvent.click(within(cards()[0]).getByRole('button', { name: 'Sluiten' }))
    const part = document.querySelector<HTMLElement>('section.total-cost .cheapest-cost')!
    fireEvent.click(within(part).getByRole('button', { name: 'Equip bekijken' }))
    const dialog = part.querySelector<HTMLElement>('dialog.card-dialog')!
    expect(dialog.querySelector('.stat-dialog-name')?.textContent).toBe('Equip van Cheapest')
    const weapon = [...dialog.querySelectorAll('.equip-row')].find((r) => r.querySelector('.slot-name')?.textContent === 'Weapon')!
    expect(weapon.querySelector('.equip-fixed')?.textContent).toBe(`${IGOR.name} (Lv. ${IGOR.level})`)
    expect(dialog.textContent).not.toContain('Te kopen:')
  })

  it('toont in de kaart geen tabel maar twee knoppen die allebei de Equip-popup openen: links wat je draagt, rechts de goedkoopste (#188)', () => {
    atLevel('20')
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    fireEvent.click(within(cards()[0]).getByRole('button', { name: 'Sluiten' }))
    expect(cards()[0].querySelector('table')).toBeNull()
    fireEvent.click(within(cards()[0]).getByRole('button', { name: 'Your character' }))
    expect(within(cards()[0]).getByLabelText('Zoek je Weapon')).toBeTruthy()
    fireEvent.click(within(cards()[0]).getByRole('button', { name: 'Sluiten' }))
    fireEvent.click(within(cards()[0]).getByRole('button', { name: 'Cheapest' }))
    const dialog = cards()[0].querySelector<HTMLElement>('dialog.card-dialog')!
    expect(dialog.querySelector('.stat-dialog-name')?.textContent).toBe('Cheapest')
    // Dezelfde rijen, maar om te lezen: geen zoekbalk en geen potlood.
    expect(dialog.querySelectorAll('.equip-row').length).toBeGreaterThan(0)
    expect(within(dialog).queryByLabelText('Zoek je Weapon')).toBeNull()
    expect(dialog.querySelector('.equip-edit')).toBeNull()
    expect(dialog.textContent).toContain('Te kopen:')
    // Het wapen heeft zijn ATT, ook als het een winkelstuk is dat je nog moet kopen.
    const weapon = [...dialog.querySelectorAll('.equip-row')].find((r) => r.querySelector('.slot-name')?.textContent === 'Weapon')!
    expect(weapon.querySelector('.equip-value strong')?.textContent).toMatch(/^\d+$/)
  })

  it('toont de inhoud in een popup achter het oog, en klapt niet meer open (#106)', () => {
    const head = within(cards()[0]).getByRole('button', { name: 'Your character' })
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
    expect(Array.from(head.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'))).toEqual([])
  })

  it('sluit de popup met het kruisje, en zet de focus daarna op de kop (#106)', async () => {
    openHomeEquipment()
    const head = within(cards()[0]).getByRole('button', { name: 'Your character' })
    expect(head.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(within(cards()[0].querySelector('dialog')!).getByRole('button', { name: 'Sluiten' }))
    expect(head.getAttribute('aria-expanded')).toBe('false')
    expect(cards()[0].querySelector('dialog')).toBeNull()
    await new Promise((done) => requestAnimationFrame(() => done(undefined)))
    expect(document.activeElement).toBe(head)
  })

  it('houdt een keuze uit de popup vast nadat je hem sluit en weer opent (#106)', () => {
    atLevel('20')
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    fireEvent.click(within(cards()[0].querySelector('dialog')!).getByRole('button', { name: 'Sluiten' }))
    openHomeEquipment()
    expect(worn(cards()[0], 'Weapon')).toBe(IGOR.name)
  })

  it('toont na de keuze de naam als knop en de ATT in het waardevak', () => {
    atLevel('20')
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    expect(within(cards()[0]).getByRole('button', { name: `Weapon: ${IGOR.name} (Lv. ${IGOR.level}). Tik om te zoeken.` })).toBeTruthy()
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

  it('maakt een slot weer leeg met "Empty": armor telt dan als 0 DEF, een wapen is weer nog niet ingevuld (#188)', () => {
    atLevel('20')
    openHomeEquipment()
    const card = cards()[0]
    pick(card, 'Hat', HAT_A.name)
    pick(card, 'Hat', HAT_B.name)
    const withHat = Number(profileFields().wdef)
    pick(card, 'Hat', 'Empty')
    expect(slots().hat.pick).toBe('empty')
    expect(worn(card, 'Hat')).toBeNull()
    expect(Number(profileFields().wdef)).toBe(withHat - HAT_B.stat)
    pick(card, 'Weapon', IGOR.name)
    const watk = profileFields().clawWatk
    pick(card, 'Weapon', 'Empty')
    expect(slots().claw.pick).toBe('unknown')
    expect(profileFields().clawWatk).toBe(watk)
  })

  it('biedt "Empty" alleen aan als er iets in het slot staat (#188)', () => {
    openHomeEquipment()
    const labels = () => options(typeIn(cards()[0], 'Hat', '')).map((o) => o.querySelector('.equip-name')?.textContent)
    expect(labels()).not.toContain('Empty')
    pick(cards()[0], 'Hat', HAT_A.name)
    expect(labels()[0]).toBe('Empty')
  })

  it('past bij een armorstuk alleen het verschil in WDEF toe', () => {
    atLevel('20')
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
    atLevel('30')
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

  it('biedt in de zoekbalk alleen wat je op je level kunt dragen: op lv 10 de Garnier maar niet de Steel Igor (lv 20), op lv 20 beide (#188)', () => {
    openHomeEquipment()
    const offered = (text: string) => options(typeIn(cards()[0], 'Weapon', text)).map((o) => o.querySelector('.equip-name')?.textContent)
    expect(offered('Garnier')).toContain('Garnier')
    expect(offered('Steel Igor')).not.toContain('Steel Igor')
    atLevel('20')
    openHomeEquipment()
    expect(offered('Steel Igor')).toContain('Steel Igor')
    expect(offered('Garnier')).toContain('Garnier')
  })
})

describe('equipment: de popup achter het potlood', () => {
  const fillIgor = () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
  }

  it('toont de ATT voor het wapen en de DEF voor armor op de potloodknop', () => {
    atLevel('20')
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    pick(cards()[0], 'Hat', HAT_A.name)
    expect(within(rowOf(cards()[0], 'Weapon')).getByRole('button', { name: 'ATT corrigeren' })).toBeTruthy()
    expect(within(rowOf(cards()[0], 'Hat')).getByRole('button', { name: 'DEF corrigeren' })).toBeTruthy()
  })

  it('past niets toe zolang je in de popup typt, ook niet met − en +', () => {
    atLevel('20')
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
    atLevel('20')
    fillIgor()
    correct(cards()[0], 'Weapon', 'ATT', '31')
    expect(profileFields().clawWatk).toBe('31')
    expect(profileFields().attackMs).toBe(String(IGOR.speed.attackMs))
    expect(slots().claw).toMatchObject({ pick: IGOR.name, stat: '31' })
    // een gecorrigeerde stat staat als correctie in het waardevak
    expect(rowOf(cards()[0], 'Weapon').querySelector('.equip-value')!.getAttribute('aria-label')).toBe(`ATT 31, gecorrigeerd, verwacht ${IGOR.watk}`)
  })

  it('legt het concept ook vast met Enter in het getal', () => {
    atLevel('20')
    fillIgor()
    const h = openDialog(cards()[0], 'Weapon', 'ATT')
    h.type('33')
    fireEvent.keyDown(h.input(), { key: 'Enter' })
    expect(profileFields().clawWatk).toBe('33')
  })

  // Dave, 5 oktober 2026: zodra er iets gewijzigd is, wordt het kruisje een vinkje dat opslaat; Opslaan onderin blijft.
  it('maakt van ✕ een vinkje dat opslaat zodra het concept afwijkt', () => {
    atLevel('20')
    fillIgor()
    const h = openDialog(cards()[0], 'Weapon', 'ATT')
    expect(h.d.getByRole('button', { name: 'Sluiten zonder opslaan' })).toBeTruthy()
    expect(h.d.queryByRole('button', { name: 'Opslaan en sluiten' })).toBeNull()
    const field = h.input()
    h.type('31')
    // Het vak blijft hetzelfde element: wisselen de knoppen, dan houdt het zijn focus en kun je verder typen.
    expect(h.input()).toBe(field)
    expect(h.d.queryByRole('button', { name: 'Sluiten zonder opslaan' })).toBeNull()
    fireEvent.click(h.d.getByRole('button', { name: 'Opslaan en sluiten' }))
    expect(profileFields().clawWatk).toBe('31')
    expect(rowOf(cards()[0], 'Weapon').querySelector('dialog')).toBeNull()
  })

  // Dave, 5 oktober 2026: naast het vinkje een rode terugdraai-pijl Annuleren, die de wijziging weggooit.
  it('gooit het concept weg met Annuleren naast het vinkje', () => {
    atLevel('20')
    fillIgor()
    const h = openDialog(cards()[0], 'Weapon', 'ATT')
    expect(h.d.queryByRole('button', { name: 'Annuleren' })).toBeNull()
    h.type('31')
    fireEvent.click(h.d.getByRole('button', { name: 'Annuleren' }))
    expect(profileFields().clawWatk).toBe(String(IGOR.watk))
    expect(slots().claw.stat).toBe('')
    expect(rowOf(cards()[0], 'Weapon').querySelector('dialog')).toBeNull()
    // een nieuwe popup begint weer bij de toegepaste stand
    expect(openDialog(cards()[0], 'Weapon', 'ATT').input().value).toBe(String(IGOR.watk))
  })

  it('zet het vinkje terug naar ✕ als het concept weer gelijk is aan wat er staat', () => {
    atLevel('20')
    fillIgor()
    const h = openDialog(cards()[0], 'Weapon', 'ATT')
    h.type('31')
    h.type(String(IGOR.watk))
    h.close()
    expect(profileFields().clawWatk).toBe(String(IGOR.watk))
    expect(rowOf(cards()[0], 'Weapon').querySelector('dialog')).toBeNull()
  })

  it('gooit het concept weg met Escape', () => {
    atLevel('20')
    fillIgor()
    const h = openDialog(cards()[0], 'Weapon', 'ATT')
    h.type('31')
    fireEvent(h.dialog, new Event('cancel', { cancelable: true }))
    expect(profileFields().clawWatk).toBe(String(IGOR.watk))
    expect(rowOf(cards()[0], 'Weapon').querySelector('dialog')).toBeNull()
  })

  it('gooit het concept weg met een tik op de achtergrond van de popup', () => {
    atLevel('20')
    fillIgor()
    const h = openDialog(cards()[0], 'Weapon', 'ATT')
    h.type('31')
    fireEvent.click(h.dialog)
    expect(profileFields().clawWatk).toBe(String(IGOR.watk))
    expect(rowOf(cards()[0], 'Weapon').querySelector('dialog')).toBeNull()
  })

  it('biedt Opslaan alleen aan als het concept afwijkt, en Reset alleen bij een correctie', () => {
    atLevel('20')
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
    atLevel('20')
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    pick(cards()[0], 'Shoes', SHOE_A.name)
    expect(slots().claw.pick).toBe(IGOR.name)
    expect(slots().shoes.pick).toBe(SHOE_A.name)
    expect(slots().hat.pick).toBe('unknown')
  })

  it('bewaart een tweede wissel in hetzelfde slot meteen daarna', () => {
    atLevel('25')
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

  it('toont geen level, ATT en DEF: die liggen elders vast; Max HP en Max MP alleen op Total stats (Dave, 6 oktober 2026)', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    const names = [...cardNames('section.profile'), ...cardNames('section.total-stats')]
    expect(names).not.toContain('Level')
    expect(cardNames('section.profile')).not.toContain('Max HP')
    expect(names.filter((n) => n === 'Max HP' || n === 'Max MP')).toEqual(['Max HP', 'Max MP'])
    expect(names).not.toContain('ATT van je wapen')
    expect(names).not.toContain('DEF')
    expect(names).toContain('Tijd per aanval (ms)')
  })

  it('zet de stats in twee kaarten zoals het statvenster: Ability points (STR, DEX, INT, LUK) en Total stats (#82)', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
    expect(cardNames('section.profile')).toEqual(['STR', 'DEX', 'INT', 'LUK'])
    expect(cardNames('section.total-stats')).toEqual(['Max HP', 'Max MP', 'Attack', 'W.ATT', 'M.ATT', 'Weapon Def', 'Magic', 'Magic Def', 'Accuracy', 'Evasion', 'Crit. Rate (%)', 'Crit. Damage (%)', 'Speed (%)', 'Jump (%)', 'Tijd per aanval (ms)'])
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
    // Met een wijziging is het kruisje een vinkje; weggooien gaat met Escape (of een tik naast de popup).
    fireEvent(statLine('LUK').querySelector('dialog')!, new Event('cancel', { cancelable: true }))
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
    chooseMob('Pig')
    expect(stored(STORAGE_KEY).spots).toMatchObject([{ known: 'mob:Pig', monster: 'Pig' }])
    chooseMob('Slime')
    expect(stored(STORAGE_KEY).spots).toMatchObject([{ known: 'mob:Slime', monster: 'Slime' }])
    expect((within(mobDialog()).getByLabelText('De mob die je het meest killt') as HTMLSelectElement).value).toBe('Slime')
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
  it('legt een gekozen mob pas vast met Opslaan, dat de popup sluit; sluiten zonder opslaan gooit de keuze weg', () => {
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
    // Met een gekozen mob is het kruisje een vinkje, met Annuleren ernaast dat de keuze weggooit.
    expect(within(dialog).queryByRole('button', { name: 'Sluiten' })).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuleren' }))
    fireEvent.click(screen.getByRole('button', { name: 'Monster bekijken' }))
    expect((within(mobDialog()).getByLabelText('De mob die je het meest killt') as HTMLSelectElement).value).toBe('Pig')
    expect(stored(STORAGE_KEY).spots).toMatchObject([{ known: 'mob:Pig' }])
    // Opslaan legt de mob vast en sluit de popup (Dave, 5 oktober 2026).
    fireEvent.change(within(mobDialog()).getByLabelText('De mob die je het meest killt'), { target: { value: 'Slime' } })
    fireEvent.click(within(mobDialog()).getByRole('button', { name: 'Opslaan' }))
    expect(document.querySelector('section.hunted dialog.card-dialog')).toBeNull()
    expect(stored(STORAGE_KEY).spots).toMatchObject([{ known: 'mob:Slime' }])
    // Het vinkje rechtsboven doet hetzelfde als Opslaan onderin.
    fireEvent.click(screen.getByRole('button', { name: 'Monster bekijken' }))
    fireEvent.change(within(mobDialog()).getByLabelText('De mob die je het meest killt'), { target: { value: 'Pig' } })
    fireEvent.click(within(mobDialog()).getByRole('button', { name: 'Opslaan en sluiten' }))
    expect(document.querySelector('section.hunted dialog.card-dialog')).toBeNull()
    expect(stored(STORAGE_KEY).spots).toMatchObject([{ known: 'mob:Pig' }])
    fireEvent.click(screen.getByRole('button', { name: 'Monster bekijken' }))
    const again = document.querySelector<HTMLElement>('section.hunted dialog.card-dialog')!
    expect((within(again).getByLabelText('De mob die je het meest killt') as HTMLSelectElement).value).toBe('Pig')
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
    atLevel('20')
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    pick(cards()[0], 'Ammo', 'Wolbi Throwing Stars')
    expect(slots().ammo.pick).toBe('Wolbi Throwing Stars')
    expect(profileFields().starWatk).toBe('17')
    expect(profileFields().starRecharge).toBe('0.4')
  })

  it('toont bij Total stats de Attack als schadebereik uit je ability points en je equipment: claw plus stars (#82, #108)', () => {
    atLevel('20')
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
    atLevel('30')
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

  it('verbergt bij een Thief het ammo-slot zonder wapen en met een dagger, en toont het met een claw (#188)', () => {
    atLevel('20')
    openHomeEquipment()
    const ammo = () => within(cards()[0]).queryByLabelText('Zoek je Ammo')
    expect(ammo()).toBeNull()
    pick(cards()[0], 'Weapon', IGOR.name)
    expect(ammo()).not.toBeNull()
  })

  it('toont het ammo-slot zonder "optioneel", net als elk slot (#117): leeg blijft het advies gewoon rekenen', () => {
    atLevel('20')
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    const row = rowOf(cards()[0], 'Ammo')
    expect(row.querySelector('.slot-name')?.textContent).toBe('Ammo')
    expect(searchBox(cards()[0], 'Ammo').placeholder).toBe('Zoek wat je draagt')
    expect(slots()?.ammo?.pick ?? 'unknown').toBe('unknown')
    expect(profileFields()?.starWatk ?? DEFAULT_PROFILE.starWatk).toBe(DEFAULT_PROFILE.starWatk)
  })

  it('biedt bij een Bowman pijlen aan in het ammo-slot', () => {
    atLevel('20')
    fireEvent.click(screen.getByRole('button', { name: 'Bowman' }))
    openHomeEquipment()
    pick(cards()[0], 'Weapon', 'Balanche')
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
    atLevel('25')
    openHomeEquipment()
    typeIn(cards()[0], 'Weapon', MEBA.name)
    fireEvent.keyDown(searchBox(cards()[0], 'Weapon'), { key: 'Enter' })
    expect(slots().claw.pick).toBe(MEBA.name)
  })

  it('biedt in de slots van #117 de items met een bron aan (#125): Gloves voor een Thief, zonder die van een andere job', () => {
    atLevel('20')
    openHomeEquipment()
    const row = typeIn(cards()[0], 'Gloves', 'Duo')
    expect(options(row).map((o) => o.querySelector('.equip-name')?.textContent)).toEqual(['Duo']) // de drie kleuren staan als één rij (#188)
    expect(options(typeIn(cards()[0], 'Gloves', 'Juno')).map((o) => o.textContent)).toEqual(['Gebruik "Juno" als eigen item'])
    pick(cards()[0], 'Gloves', 'Work Gloves')
    expect(worn(cards()[0], 'Gloves')).toBe('Work Gloves')
    expect(slots().gloves.pick).toBe('Work Gloves')
  })

  it('biedt bij Bottom het Red Miniskirt aan zonder gekozen geslacht, en niet meer met Male gekozen (#188)', () => {
    atLevel('20')
    openHomeEquipment()
    const labels = () => options(typeIn(cards()[0], 'Bottom', 'Miniskirt')).map((o) => o.querySelector('.equip-name')?.textContent)
    expect(labels()).toContain('Red Miniskirt')
    localStorage.setItem('mesowise.gender.v1', JSON.stringify({ version: 1, gender: 'male' }))
    atLevel('20')
    openHomeEquipment()
    expect(labels()).not.toContain('Red Miniskirt')
  })

  it('toont bij een wapen in de zoeklijst de soort, het level, de ATT en de snelheid: Steel Titans (CLAW, LV 15, ATT 13, FAST) (#188)', () => {
    atLevel('15')
    openHomeEquipment()
    const row = options(typeIn(cards()[0], 'Weapon', 'Steel Titans')).find((o) => o.querySelector('.equip-name')?.textContent === 'Steel Titans')!
    expect(row.querySelector('.equip-meta')?.textContent).toBe('(CLAW, LV 15, ATT 13, FAST)')
  })

  it('toont in de Shoes-lijst "LV 0" in de meta van Rubber Boots (#188)', () => {
    atLevel('20')
    openHomeEquipment()
    const list = options(typeIn(cards()[0], 'Shoes', 'Rubber')).filter((o) => !o.textContent?.startsWith('Gebruik "'))
    expect(list).toHaveLength(1)
    expect(list[0].querySelector('.equip-meta')?.textContent).toBe('(LV 0, DEF 2)')
  })

  it('biedt geen eigen-item-rij als je precies een naam uit de lijst typt', () => {
    atLevel('20')
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
    atLevel('20')
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
    atLevel('25')
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
    expect(profileFields().level).toBe('25')
    expect(profileFields().clawWatk).toBe(String(IGOR.watk))
    expect(profileFields().attackMs).toBe(String(IGOR.speed.attackMs))
    expect(slots()).toEqual(slotsBefore)
    expect(worn(cards()[0], 'Weapon')).toBe(IGOR.name)
    expect(worn(cards()[0], 'Hat')).toBe(familyName('hat', HAT_B.name)) // de knop toont de naam zonder kleur (#188)
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
    atLevel('25')
    levelUp()
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    const luk = openAbility('LUK')
    luk.typeBase('40')
    luk.save()
    expect(profileFields().luk).toBe('40')
    openHomeEquipment()
    pick(cards()[0], 'Weapon', MEBA.name)
    fireEvent.click(backButton())
    expect(profileFields()).toEqual({ ...DEFAULT_PROFILE, level: '25' })
    expect(worn(cards()[0], 'Weapon')).toBeNull()
  })

  it('zet bij twee level-ups achter elkaar alleen de equipment van het tweede level terug, niet die van het eerste', () => {
    atLevel('25')
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    levelUp()
    pick(cards()[0], 'Weapon', MEBA.name)
    levelUp()
    pick(cards()[0], 'Hat', HAT_A.name)
    expect(level()).toBe('LV. 27')
    fireEvent.click(backButton())
    expect(level()).toBe('LV. 26')
    expect(worn(cards()[0], 'Weapon')).toBe(MEBA.name)
    expect(worn(cards()[0], 'Hat')).toBeNull()
    expect(profileFields().clawWatk).toBe(String(MEBA.watk))
  })

  it('zet na de herstelde snapshot een tweede Back alleen het level een terug: stats en equipment blijven', () => {
    atLevel('20')
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    levelUp()
    fireEvent.click(backButton())
    const before = profileFields()
    fireEvent.click(backButton())
    expect(profileFields()).toEqual({ ...before, level: '19' })
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
    atLevel('20')
    // In de echte app zit de level-up-knop achter de modal; levelUp() in app.tsx legt een open concept toch vast
    // (commitAllEquipment), zodat een getal nooit stil verloren gaat. fireEvent omzeilt de modal.
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    const h = openDialog(cards()[0], 'Weapon', 'ATT')
    h.type('44')
    expect(profileFields().clawWatk).toBe(String(IGOR.watk))
    levelUp()
    expect(profileFields().clawWatk).toBe('44')
    expect(profileFields().level).toBe('21')
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
  const wear = (item: string) => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', item)
  }

  it('schrijft de base AP van het level zonder melding, laat de veranderde vakken oplichten en zet (0) in de kop; extra AP en accuracy blijven staan', () => {
    levelUp()
    expect(headingText()).toBe('Ability points(5)5 AP te verdelen')
    wear(GARNIER.name)
    const before = { ...profileFields() }
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    fireEvent.click(fillButton())
    // Level 11 = 75 AP: DEX op het minimum dat de Garnier en de skills vragen (10), LUK de rest (75 - 4 - 4 - 10 = 57), STR en INT 4.
    expect(homeScreen().querySelector('.ap-autofill .hint')).toBeNull()
    // DEX en LUK veranderden en lichten op; STR en INT bleven 4.
    const flashing = (label: string) => statLine(label).querySelector('.ap-base')!.classList.contains('flash')
    expect(['STR', 'DEX', 'INT', 'LUK'].map(flashing)).toEqual([false, true, false, true])
    expect(profileFields()).toMatchObject({ str: '4', dex: '10', int: '4', luk: '57', level: '11' })
    expect(profileFields().lukExtra).toBe(before.lukExtra)
    expect(profileFields().accuracy).toBe(before.accuracy)
    expect(statShown('DEX')).toBe('10')
    expect(statShown('LUK')).toBe('57')
    expect(apNote()).toBe('0 AP te verdelen')
    expect(headingText()).toBe('Ability points(0)0 AP te verdelen')
  })

  it('te weinig AP voor het equipment: er wordt niets geschreven en de melding zegt waarom, het (n) blijft staan', () => {
    // Steel Igor vraagt lv 20, dus je draagt hem eerst op lv 20 en zakt dan terug naar lv 9 (65 AP) waar hij te veel vraagt.
    atLevel('20')
    wear(IGOR.name)
    atLevel('9')
    const before = { ...profileFields() }
    fireEvent.click(screen.getByRole('button', { name: 'Ability points bekijken' }))
    fireEvent.click(fillButton())
    expect(screen.getByText('Je level geeft te weinig AP voor je equipment: je hebt er 65 en je equipment vraagt er 73. Er is niets ingevuld.')).toBeTruthy()
    const after = profileFields()
    for (const k of ['str', 'dex', 'int', 'luk'] as const) expect(after[k]).toBe(before[k])
  })

  it('past de speler daarna een stat aan, dan verdwijnt de melding van een mislukte poging', () => {
    // Steel Igor vraagt lv 20, dus je draagt hem eerst op lv 20 en zakt dan terug naar lv 9 (65 AP) waar hij te veel vraagt.
    atLevel('20')
    wear(IGOR.name)
    atLevel('9')
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
      atLevel('30')
      openHomeEquipment()
      const found = (slot: string, text: string) => options(typeIn(cards()[0], slot, text)).map((o) => o.querySelector('.equip-name')?.textContent)
      expect(found('Weapon', 'Gladius')).toContain('Gladius')
      expect(found('Weapon', 'Meba')).not.toContain('Meba')
      expect(found('Hat', 'Bronze Full Helm')).toContain('Bronze Full Helm')
      expect(found('Hat', 'Red Thief Hood')).not.toContain('Thief Hood')
      expect(found('Shoes', 'Bronze Grieves')).toContain('Bronze Grieves') // een ander materiaal dan Steel Grieves, geen kleur: een eigen rij (#188)
    })

    it('toont geen uitleg boven de slots (net als de Thief) en laat bij Top en Bottom zoeken', () => {
      openHomeEquipment()
      expect(cards()[0].querySelector('.hint')).toBeNull()
      for (const slot of ['Top', 'Bottom']) expect(options(typeIn(cards()[0], slot, '')).length).toBeGreaterThan(0)
    })

    it('zet bij een gekozen wapen weapon attack, aanvalssnelheid en weapon multiplier in het bewaarde profiel', () => {
      atLevel('30')
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
      expect(cardNames('section.total-stats')).toEqual(['Max HP', 'Max MP', 'Attack', 'W.ATT', 'M.ATT', 'Weapon Def', 'Magic', 'Magic Def', 'Accuracy', 'Evasion', 'Crit. Rate (%)', 'Crit. Damage (%)', 'Speed (%)', 'Jump (%)', 'Tijd per aanval (ms)', 'Weapon multiplier van je wapen'])
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

    it('toont alle vijf de vragen met een antwoord en nergens "Nog niet doorgerekend"', () => {
      const advice = reportCard()
      expect(advice.textContent).not.toMatch(NOT_YET)
      expect(Array.from(advice.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['ATT', 'DEF', 'Skill', 'Mob', 'Potions'])
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
  const card = () => document.querySelector<HTMLElement>('section.job')!
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
  const title = () => card().querySelector('.job-title')!.textContent
  // Je job en geslacht zoals ze ingedrukt staan, als "Warrior (f)", achter het potlood (dat dit even opent en weer sluit).
  const jobTitle = () => {
    const edit = within(card()).queryByRole('button', { name: 'Job en geslacht wijzigen' })
    if (edit) fireEvent.click(edit)
    const on = (name: string) => within(within(card()).getByRole('group', { name })).queryAllByRole('button').find((b) => b.getAttribute('aria-pressed') === 'true')?.textContent
    const gender = on('Gender:')
    const shown = `${on('Job:')}${gender ? ` (${gender === 'Male' ? 'm' : 'f'})` : ''}`
    if (edit) fireEvent.click(within(card()).getByRole('button', { name: 'Job en geslacht niet wijzigen' }))
    return shown
  }
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
    expect(title()).toBe('Job:')
    const [job, gender] = Array.from(card().querySelectorAll('h2'))
    expect(gender.tagName).toBe(job.tagName)
    expect(gender.textContent).toBe('Gender:')
  })

  it('heet op het beginscherm gekozen Character, met de job achter het potlood', () => {
    withWarrior()
    expect(title()).toBe('Character')
    expect(jobTitle()).toBe('Warrior')
  })

  const pencil = () => within(card()).getByRole('button', { name: /^Job en geslacht (niet )?wijzigen$/ })
  const save = () => within(card()).queryByRole('button', { name: 'Opslaan' })
  const jobButton = (name: string) => within(within(card()).getByRole('group', { name: 'Job:' })).getByRole('button', { name })

  it('toont op het beginscherm met het potlood de jobs weer, met je keuze ingedrukt, en nog geen Opslaan', () => {
    withWarrior()
    expect(screen.queryByRole('group', { name: 'Job:' })).toBeNull()
    fireEvent.click(pencil())
    expect(jobButton('Warrior').getAttribute('aria-pressed')).toBe('true')
    expect(save()).toBeNull()
  })

  it('Thief met Cass -> Warrior -> Thief: het wapenslot is leeg en het profiel rekent weer met een claw, niet met Double Stab (#170)', () => {
    cleanup()
    localStorage.clear()
    localStorage.setItem(JOB_KEY, JSON.stringify({ version: 1, job: 'thief' }))
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, fields: { ...DEFAULT_PROFILE, level: '30', dagger: '1', doubleStab: '1' } }))
    localStorage.setItem(EQUIPMENT_KEY, JSON.stringify({ version: 1, slots: { claw: { pick: 'Cass', name: '', stat: '' } } }))
    render(<App />)
    expect(stored(PROFILE_KEY).fields.dagger).toBe('1')
    for (const next of ['Warrior', 'Thief']) {
      fireEvent.click(pencil())
      fireEvent.click(jobButton(next))
      fireEvent.click(save()!)
    }
    expect(stored(JOB_KEY).job).toBe('thief')
    expect(slots().claw.pick).toBe('unknown')
    expect(stored(PROFILE_KEY).fields.dagger).toBe('0')
  })

  it('toont een kruis in plaats van het potlood zolang de keuze open staat', () => {
    withWarrior()
    const icon = () => pencil().querySelector('path')!.getAttribute('d')
    const closed = icon()
    fireEvent.click(pencil())
    expect(icon()).toBe('M6 6l12 12M18 6L6 18')
    fireEvent.click(pencil())
    expect(icon()).toBe(closed)
  })

  it('gooit het concept weg als je het potlood weer dichtklikt', () => {
    withWarrior()
    fireEvent.click(pencil())
    fireEvent.click(jobButton('Thief'))
    expect(save()).toBeTruthy()
    fireEvent.click(pencil())
    expect(stored(JOB_KEY)).toEqual({ version: 1, job: 'warrior' })
    expect(jobTitle()).toBe('Warrior')
  })

  it('leest een bewaarde keuze bij het starten: geen hint, en de keuze in het menu', () => {
    withWarrior('female')
    expect(screen.queryByText(JOB_HINT)).toBeNull()
    const rows = Array.from(document.querySelectorAll('dialog .menu-row'), (r) => `${r.querySelector('.menu-label')!.textContent} ${r.querySelector('.menu-value')!.textContent}`)
    expect(rows).toEqual(['Job: Warrior', 'Gender: Female'])
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

  describe('het shield-slot (#172)', () => {
    beforeEach(open)
    const hasShieldRow = () => within(cards()[0]).queryByLabelText('Zoek je Shield') !== null

    it('toont het shield-slot met een Sword in de hand, laat het weg met een boog en haalt een gekozen shield eraf', () => {
      atLevel('30')
      openHomeEquipment()
      pick(cards()[0], 'Weapon', 'Sword')
      expect(hasShieldRow()).toBe(true)
      pick(cards()[0], 'Shield', 'Pan Lid')
      expect(slots().shield.pick).toBe('Pan Lid')
      pick(cards()[0], 'Weapon', 'Ryden')
      expect(hasShieldRow()).toBe(false)
      expect(slots().shield.pick).toBe('unknown')
      pick(cards()[0], 'Weapon', 'Razor')
      expect(hasShieldRow()).toBe(true)
    })
  })

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
      pick(card, 'Weapon', 'Balanche')
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
      // Alleen "Empty" (er staat iets in het slot, #188) en het eigen item; geen bronze pijl meer.
      expect(found('Ammo', 'Bronze').filter((n) => !n?.startsWith('Gebruik'))).toEqual(['Empty'])
    })

    it('zoekt bij Weapon in de bogen en kruisbogen, bij Ammo in de pijlen, en niet in claws of Warrior-wapens', () => {
      atLevel('25')
      openHomeEquipment()
      expect(found('Weapon', 'Balanche')).toContain('Balanche')
      expect(found('Weapon', 'Meba')).not.toContain('Meba')
      expect(found('Weapon', 'Gladius')).not.toContain('Gladius')
      pick(cards()[0], 'Weapon', 'Balanche')
      expect(found('Ammo', 'Arrows')).toEqual(expect.arrayContaining(['Arrows for Bows', 'Arrows for Crossbows']))
      expect(found('Hat', 'Hunter')).toContain('Hunter')
      expect(found('Hat', 'Red Thief Hood')).not.toContain('Thief Hood')
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

    it('toont het ammo-slot pas naast een boog of kruisboog (#188)', () => {
      openHomeEquipment()
      expect(within(cards()[0]).queryByLabelText('Zoek je Ammo')).toBeNull()
      pick(cards()[0], 'Weapon', 'Balanche')
      expect(within(cards()[0]).queryByLabelText('Zoek je Ammo')).not.toBeNull()
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

    it('toont alle vijf de vragen met een antwoord en nergens "Nog niet doorgerekend"', () => {
      const advice = reportCard()
      expect(advice.textContent).not.toMatch(NOT_YET)
      expect(Array.from(advice.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['ATT', 'DEF', 'Skill', 'Mob', 'Potions'])
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
      atLevel('30')
      openHomeEquipment()
      const found = (slot: string, text: string) => options(typeIn(cards()[0], slot, text)).map((o) => o.querySelector('.equip-name')?.textContent)
      expect(found('Weapon', 'Mithril Wand')).toContain('Mithril Wand')
      expect(found('Weapon', 'Meba')).not.toContain('Meba')
      expect(found('Weapon', 'Gladius')).not.toContain('Gladius')
      expect(found('Hat', 'Wizardry Hat')).toContain('Wizardry Hat')
      expect(found('Hat', 'Red Thief Hood')).not.toContain('Thief Hood')
      expect(found('Shoes', 'Wind Shoes')).toContain('Wind Shoes')
    })

    it('toont geen Ammo-slot', () => {
      openHomeEquipment()
      expect(cards()[0].textContent).not.toMatch(/Ammo/)
    })

    it('noemt de stat van het wapen M.ATT, zet hem bij een gekozen wand in het profiel, met 810 ms, en laat de rest staan', () => {
      atLevel('30')
      openHomeEquipment()
      pick(cards()[0], 'Weapon', 'Mithril Wand')
      expect(profileFields().clawWatk).toBe('55')
      expect(profileFields().attackMs).toBe('810')
      expect(rowOf(cards()[0], 'Weapon').querySelector('.equip-value')!.getAttribute('aria-label')).toBe('M.ATT 55')
      expect(profileFields().int).toBe('60')
      expect(profileFields().wdef).toBe('40')
    })

    it('laat de M.ATT van het wapen via het potlood corrigeren', () => {
      atLevel('30')
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

    it('zet de kosten en de vijf adviezen in één kaart Report: ATT, DEF, Skill, Mob en Potions (#126)', () => {
      const home = homeScreen()
      expect(home.querySelectorAll('.level-cost')).toHaveLength(1)
      const card = within(home).getByRole('heading', { level: 2, name: 'Report' }).closest('section')!
      const questions = within(card).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
      expect(questions).toEqual(['ATT', 'DEF', 'Skill', 'Mob', 'Potions'])
      // Elk advies heeft een antwoord, en het skilladvies noemt de mana die de skill kost.
      expect(card.querySelectorAll('.chip')).toHaveLength(5)
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

    it('toont alle vijf de vragen met een antwoord en nergens "Nog niet doorgerekend"', () => {
      const advice = reportCard()
      expect(advice.textContent).not.toMatch(NOT_YET)
      expect(Array.from(advice.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['ATT', 'DEF', 'Skill', 'Mob', 'Potions'])
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

  it('laat de downloadlink weg in het offline-bestand zelf', () => {
    vi.stubEnv('MODE', 'offline')
    try {
      expect(openMenu().queryByRole('link', { name: 'Offlineversie downloaden' })).toBeNull()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('biedt in het menu de offlineversie als download aan', () => {
    const link = openMenu().getByRole('link', { name: 'Offlineversie downloaden' })
    expect(link.getAttribute('href')).toBe(`${import.meta.env.BASE_URL}mesowise-offline.html`)
    expect(link.hasAttribute('download')).toBe(true)
  })

  const rows = (menu: ReturnType<typeof openMenu>) =>
    menu.getAllByRole('listitem').map((r) => `${r.querySelector('.menu-label')!.textContent} ${r.querySelector('.menu-value')!.textContent}`)
  // Het tweede paneel, boven het menu (Dave, 5 oktober 2026).
  const choicePanel = () => within(bar().querySelectorAll('dialog')[1] as HTMLDialogElement)
  const slid = () => act(() => new Promise((r) => setTimeout(r, 350)))
  const chooseWarriorMale = () => {
    fireEvent.click(within(homeJobCard() as HTMLElement).getByRole('button', { name: 'Warrior' }))
    fireEvent.click(within(homeJobCard() as HTMLElement).getByRole('button', { name: 'Male' }))
  }

  it('toont de jobkaart op het beginscherm tot job en geslacht gekozen zijn (#55), en daarna alleen in het menu', () => {
    expect(homeJobCard()).not.toBeNull()
    fireEvent.click(within(homeJobCard() as HTMLElement).getByRole('button', { name: 'Warrior' }))
    expect(homeJobCard()).not.toBeNull()
    fireEvent.click(within(homeJobCard() as HTMLElement).getByRole('button', { name: 'Male' }))
    expect(homeJobCard()).toBeNull()
    // In het menu een rij per instelling, met wat je koos en een potlood; geen knoppen, en geen koppen behalve de titel van het menu (Dave, 5 oktober 2026).
    const menu = openMenu()
    expect(rows(menu)).toEqual(['Job: Warrior', 'Gender: Male'])
    expect(menu.getByRole('button', { name: 'Job wijzigen' })).toBeTruthy()
    expect(menu.getByRole('button', { name: 'Gender wijzigen' })).toBeTruthy()
    expect(menu.queryByRole('button', { name: 'Thief' })).toBeNull()
    expect(menu.queryAllByRole('heading').map((h) => h.textContent)).toEqual(['Instellingen'])
  })

  it('noemt een instelling die nog niet gekozen is "Niet gekozen"', () => {
    expect(rows(openMenu())).toEqual(['Job: Niet gekozen', 'Gender: Niet gekozen'])
  })

  it('wijzigt de job in een tweede paneel: Opslaan schuift het weg en het menu toont de nieuwe job', async () => {
    chooseWarriorMale()
    const menu = openMenu()
    fireEvent.click(menu.getByRole('button', { name: 'Job wijzigen' }))
    const panel = choicePanel()
    expect(panel.getByRole('button', { name: 'Warrior' }).getAttribute('aria-pressed')).toBe('true')
    // Nog niets gewijzigd: het kruisje, geen Opslaan.
    expect(panel.queryByRole('button', { name: 'Opslaan' })).toBeNull()
    fireEvent.click(panel.getByRole('button', { name: 'Thief' }))
    expect(stored(JOB_KEY)?.job).toBe('warrior')
    expect(panel.getByRole('button', { name: 'Opslaan en sluiten' })).toBeTruthy()
    fireEvent.click(panel.getByRole('button', { name: 'Opslaan' }))
    await slid()
    expect(stored(JOB_KEY)?.job).toBe('thief')
    expect(bar().querySelectorAll('dialog')).toHaveLength(1)
    expect(rows(menu)).toEqual(['Job: Thief', 'Gender: Male'])
    expect(document.activeElement).toBe(menu.getByRole('button', { name: 'Job wijzigen' }))
  })

  it('wijzigt het geslacht met het vinkje rechtsboven', async () => {
    chooseWarriorMale()
    const menu = openMenu()
    fireEvent.click(menu.getByRole('button', { name: 'Gender wijzigen' }))
    fireEvent.click(choicePanel().getByRole('button', { name: 'Female' }))
    fireEvent.click(choicePanel().getByRole('button', { name: 'Opslaan en sluiten' }))
    await slid()
    expect(stored('mesowise.gender.v1')).toEqual({ version: 1, gender: 'female' })
    expect(rows(menu)).toEqual(['Job: Warrior', 'Gender: Female'])
  })

  it('gooit de wijziging weg met Annuleren, en houdt het menu open', async () => {
    chooseWarriorMale()
    const menu = openMenu()
    fireEvent.click(menu.getByRole('button', { name: 'Job wijzigen' }))
    fireEvent.click(choicePanel().getByRole('button', { name: 'Thief' }))
    fireEvent.click(choicePanel().getByRole('button', { name: 'Annuleren' }))
    await slid()
    expect(stored(JOB_KEY)?.job).toBe('warrior')
    expect(bar().querySelectorAll('dialog')).toHaveLength(1)
    expect(rows(menu)).toEqual(['Job: Warrior', 'Gender: Male'])
  })

  it('laat het vinkje weer verdwijnen als je de oude keuze terugkiest', () => {
    chooseWarriorMale()
    fireEvent.click(openMenu().getByRole('button', { name: 'Job wijzigen' }))
    fireEvent.click(choicePanel().getByRole('button', { name: 'Thief' }))
    expect(choicePanel().getByRole('button', { name: 'Opslaan en sluiten' })).toBeTruthy()
    fireEvent.click(choicePanel().getByRole('button', { name: 'Warrior' }))
    expect(choicePanel().queryByRole('button', { name: 'Opslaan en sluiten' })).toBeNull()
    expect(choicePanel().queryByRole('button', { name: 'Opslaan' })).toBeNull()
  })

  it('kiest in het tweede paneel een job die nog niet gekozen was', async () => {
    const menu = openMenu()
    fireEvent.click(menu.getByRole('button', { name: 'Job wijzigen' }))
    expect(choicePanel().getByRole('button', { name: 'Thief' }).getAttribute('aria-pressed')).toBeNull()
    fireEvent.click(choicePanel().getByRole('button', { name: 'Thief' }))
    fireEvent.click(choicePanel().getByRole('button', { name: 'Opslaan' }))
    await slid()
    expect(stored(JOB_KEY)?.job).toBe('thief')
    expect(rows(menu)[0]).toBe('Job: Thief')
  })

  it('slaat toch op als je tijdens het wegschuiven nog op Opslaan tikt (review)', async () => {
    chooseWarriorMale()
    fireEvent.click(openMenu().getByRole('button', { name: 'Job wijzigen' }))
    const panel = choicePanel()
    fireEvent.click(panel.getByRole('button', { name: 'Thief' }))
    fireEvent.click(panel.getByRole('button', { name: 'Annuleren' }))
    fireEvent.click(panel.getByRole('button', { name: 'Opslaan' }))
    await slid()
    expect(stored(JOB_KEY)?.job).toBe('thief')
  })

  it('sluit met Escape alleen het bovenste paneel', async () => {
    chooseWarriorMale()
    fireEvent.click(openMenu().getByRole('button', { name: 'Job wijzigen' }))
    fireEvent(bar().querySelectorAll('dialog')[1], new Event('cancel', { cancelable: true }))
    await slid()
    expect(bar().querySelectorAll('dialog')).toHaveLength(1)
  })

  it('veegt alleen het bovenste paneel weg, niet het menu eronder', async () => {
    chooseWarriorMale()
    fireEvent.click(openMenu().getByRole('button', { name: 'Job wijzigen' }))
    const top = bar().querySelectorAll('dialog')[1] as HTMLDialogElement
    Object.defineProperty(top, 'offsetWidth', { configurable: true, value: 300 })
    fireEvent.touchStart(top, { touches: [{ clientX: 100, clientY: 300 }] })
    fireEvent.touchMove(top, { touches: [{ clientX: 160, clientY: 305 }] })
    fireEvent.touchMove(top, { touches: [{ clientX: 220, clientY: 310 }] })
    fireEvent.touchEnd(top, { touches: [] })
    expect((bar().querySelector('dialog') as HTMLDialogElement).style.transform).toBe('')
    await slid()
    expect(bar().querySelectorAll('dialog')).toHaveLength(1)
  })

  it('sluit het menu met "Sluiten" en zet de focus terug op de menuknop', async () => {
    chooseWarriorMale()
    fireEvent.click(openMenu().getByRole('button', { name: 'Sluiten' }))
    // Het paneel schuift eerst naar rechts weg en sluit dan.
    await slid()
    expect(bar().querySelector('dialog')).toBeNull()
    expect(document.activeElement).toBe(within(bar()).getByRole('button', { name: 'Instellingen' }))
  })

  describe('als paneel dat van rechts inschuift', () => {
    const drawer = () => bar().querySelector('dialog') as HTMLDialogElement
    const swipe = (dx: number, dy: number) => {
      const d = drawer()
      fireEvent.touchStart(d, { touches: [{ clientX: 100, clientY: 300 }] })
      fireEvent.touchMove(d, { touches: [{ clientX: 100 + dx / 2, clientY: 300 + dy / 2 }] })
      fireEvent.touchMove(d, { touches: [{ clientX: 100 + dx, clientY: 300 + dy }] })
      fireEvent.touchEnd(d, { touches: [] })
    }
    const openDrawer = () => {
      openMenu()
      Object.defineProperty(drawer(), 'offsetWidth', { configurable: true, value: 300 })
    }

    it('is een paneel en geen popup in het midden', () => {
      openMenu()
      expect(drawer().classList.contains('menu-drawer')).toBe(true)
      // Met Instellingen in de kop en zonder kaarticoon (Dave, 5 oktober 2026).
      expect(drawer().querySelector('.stat-dialog-head .stat-dialog-name')?.textContent).toBe('Instellingen')
      expect(drawer().querySelector('.card-icon')).toBeNull()
      expect(drawer().getAttribute('aria-label')).toBe('Instellingen')
    })

    it('sluit met een veeg naar rechts, na het wegschuiven, en zet de focus terug op de menuknop', async () => {
      openDrawer()
      swipe(120, 10)
      expect(drawer().style.transform).toBe('translateX(100%)')
      await act(() => new Promise((r) => setTimeout(r, 350)))
      expect(bar().querySelector('dialog')).toBeNull()
      expect(document.activeElement).toBe(within(bar()).getByRole('button', { name: 'Instellingen' }))
    })

    it('veert terug bij een korte veeg, en blijft open bij scrollen of een veeg naar links', () => {
      openDrawer()
      swipe(40, 0)
      expect(drawer()).not.toBeNull()
      expect(drawer().style.transform).toBe('')
      swipe(10, 200)
      swipe(-150, 0)
      expect(drawer()).not.toBeNull()
    })
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

  it('zet onder Report de koppen ATT, DEF, Skill, Mob en Potions in die volgorde, en niets van de oude vraag over equipment', () => {
    const c = card(home())
    expect(Array.from(c.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['ATT', 'DEF', 'Skill', 'Mob', 'Potions'])
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
      'Welke potion dit level het goedkoopst is: de prijs tegenover wat hij herstelt.',
    ])
  })

  it('zet de chip in dezelfde .question-head als zijn kop', () => {
    const c = card(home())
    const heads = Array.from(c.querySelectorAll('h3')).map((h) => h.closest('.question-head')!)
    expect(heads).toHaveLength(5)
    for (const head of heads) {
      expect(head.querySelectorAll('h3')).toHaveLength(1)
      expect(head.querySelectorAll('.chip')).toHaveLength(1)
    }
  })

  it('geeft ATT, DEF, Mob en Potions een label in plaats van Ja of Nee', () => {
    const c = card(home())
    const chips = Array.from(c.querySelectorAll('.chip')).map((x) => x.textContent!)
    expect(chips).toHaveLength(5)
    expect(chips[0]).toMatch(/^(Upgraden|Niet upgraden|Upgrade complete|Niet uit te rekenen)$/)
    expect(chips[1]).toMatch(/^(Upgraden|Niet upgraden|Upgrade complete|Niet uit te rekenen)$/)
    expect(chips[3]).toMatch(/^(Wisselen|Blijven|Niet uit te rekenen)$/)
    expect(chips[4]).toMatch(/^(Wisselen|Blijven|Niet uit te rekenen)$/)
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
    // Geen andere kaart in het blok: de twee kaarten zijn de enige kinderen. Potions heeft een rapport en staat erboven.
    expect(group.children).toHaveLength(2)
    expect(within(group as HTMLElement).queryByRole('button', { name: /Skillpoints|Equip|Potions/ })).toBeNull()
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
      // Op lv 9 biedt de zoekbalk de Garnier nog niet aan (hij vraagt lv 10, #188); op lv 10 wel.
      openHomeEquipment()
      expect(options(typeIn(cards()[0], 'Weapon', 'Garnier')).map((o) => o.querySelector('.equip-name')?.textContent)).not.toContain('Garnier')
      atLevel('10')
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

describe('de soort van een eigen wapen (#176)', () => {
  const open = (job: string, claw: object = { pick: 'other', name: 'Mijn wapen', stat: '28' }) => {
    cleanup()
    localStorage.clear()
    localStorage.setItem(JOB_KEY, JSON.stringify({ version: 1, job }))
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, fields: { ...DEFAULT_PROFILE, level: '20', luckySeven: '1', doubleStab: '1' } }))
    localStorage.setItem(EQUIPMENT_KEY, JSON.stringify({ version: 1, slots: { claw } }))
    render(<App />)
    openHomeEquipment()
  }
  const group = () => within(cards()[0]).queryByRole('group', { name: 'Soort wapen' })
  const kind = (name: 'Dagger' | 'Claw') => within(group()!).getByRole('button', { name }) as HTMLElement

  it('toont de keuze bij een Thief met een eigen wapen, met Claw als standaard', () => {
    open('thief')
    expect(group()).not.toBeNull()
    expect(kind('Claw').getAttribute('aria-pressed')).toBe('true')
    expect(kind('Dagger').getAttribute('aria-pressed')).toBe('false')
  })

  it('toont de keuze niet bij een catalogusclaw, een leeg wapenslot of een NPC-dagger', () => {
    open('thief', { pick: IGOR.name, name: '', stat: '' })
    expect(group()).toBeNull()
    open('thief', { pick: 'unknown', name: '', stat: '' })
    expect(group()).toBeNull()
    open('thief', { pick: 'Triangular Zamadar', name: '', stat: '' })
    expect(group()).toBeNull()
  })

  it('toont de keuze niet bij een andere job, ook niet met een eigen wapen', () => {
    for (const job of ['warrior', 'bowman', 'magician']) {
      open(job)
      expect(group(), job).toBeNull()
    }
  })

  it('verschijnt als je als Thief een eigen item kiest, en verdwijnt als je een catalogusclaw kiest', () => {
    open('thief', { pick: 'unknown', name: '', stat: '' })
    pickOwn(cards()[0], 'Weapon', 'Mijn wapen')
    expect(group()).not.toBeNull()
    pick(cards()[0], 'Weapon', IGOR.name)
    expect(group()).toBeNull()
  })

  it('Dagger zet dagger op 1 in het profiel en in de opslag, Claw weer op 0', () => {
    open('thief')
    expect(profileFields()?.dagger ?? '0').toBe('0')
    fireEvent.click(kind('Dagger'))
    expect(kind('Dagger').getAttribute('aria-pressed')).toBe('true')
    expect(kind('Claw').getAttribute('aria-pressed')).toBe('false')
    expect(profileFields().dagger).toBe('1')
    expect(slots().claw.weaponKind).toBe('dagger')
    fireEvent.click(kind('Claw'))
    expect(kind('Claw').getAttribute('aria-pressed')).toBe('true')
    expect(profileFields().dagger).toBe('0')
    expect('weaponKind' in slots().claw).toBe(false)
  })

  it('onthoudt de keuze na een herstart', () => {
    open('thief')
    fireEvent.click(kind('Dagger'))
    cleanup()
    render(<App />)
    openHomeEquipment()
    expect(kind('Dagger').getAttribute('aria-pressed')).toBe('true')
    expect(profileFields().dagger).toBe('1')
  })

  it('een dagger -> een ander eigen item zonder soort te kiezen: de keuze valt terug op Claw en dagger op 0', () => {
    open('thief', { pick: 'other', name: 'Mijn dagger', stat: '28', weaponKind: 'dagger' })
    expect(kind('Dagger').getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(kind('Dagger'))
    expect(profileFields().dagger).toBe('1')
    pickOwn(cards()[0], 'Weapon', 'Ander wapen')
    expect(kind('Claw').getAttribute('aria-pressed')).toBe('true')
    expect(kind('Dagger').getAttribute('aria-pressed')).toBe('false')
    expect(profileFields().dagger).toBe('0')
    expect('weaponKind' in slots().claw).toBe(false)
  })

  it('een dagger -> een catalogusclaw zet dagger op 0 en laat geen soort achter', () => {
    open('thief', { pick: 'other', name: 'Mijn dagger', stat: '28', weaponKind: 'dagger' })
    fireEvent.click(kind('Dagger'))
    pick(cards()[0], 'Weapon', IGOR.name)
    expect(profileFields().dagger).toBe('0')
    expect('weaponKind' in slots().claw).toBe(false)
  })
})

describe('de Potions-kaart (Dave, 6 oktober 2026)', () => {
  const potionsCard = () => homeScreen().querySelector<HTMLElement>('section.potions')!
  const openPotions = () => fireEvent.click(screen.getByRole('button', { name: 'Potions bekijken' }))
  const select = (kind: 'HP' | 'MP') => within(potionsCard()).getByLabelText(`${kind} potions`) as HTMLSelectElement
  const group = (kind: 'HP' | 'MP') => select(kind).closest<HTMLElement>('.potion-group')!
  /** De regels onder een keuze: naam, wat er staat, en of er een potlood is. */
  const lines = (kind: 'HP' | 'MP') =>
    Array.from(group(kind).querySelectorAll<HTMLElement>('.stat-line')).map((l) => [
      l.querySelector('.stat-line-name')!.textContent,
      l.querySelector('.equip-value strong')!.textContent,
      l.querySelector('.equip-edit') !== null,
    ])
  const line = (kind: 'HP' | 'MP', label: string) => Array.from(group(kind).querySelectorAll<HTMLElement>('.stat-line')).find((l) => l.querySelector('.stat-line-name')!.textContent === label)!
  const choose = (kind: 'HP' | 'MP', name: string) => fireEvent.change(select(kind), { target: { value: name } })
  const save = () => fireEvent.click(within(potionsCard()).getByRole('button', { name: 'Opslaan' }))
  const fix = (kind: 'HP' | 'MP', label: string, value: string) => {
    fireEvent.click(within(line(kind, label)).getByRole('button', { name: `${label} wijzigen` }))
    const d = within(line(kind, label).querySelector('dialog') as HTMLDialogElement)
    fireEvent.input(d.getByLabelText(`${label} in game`), { target: { value } })
    fireEvent.click(d.getByRole('button', { name: 'Opslaan' }))
  }
  const potionPart = () =>
    within(homeScreen().querySelector<HTMLElement>('section.level-cost')!).getByRole('heading', { level: 3, name: 'Potions' }).closest<HTMLElement>('.advice-part')!
  /** De regels onderaan het Potions-rapport op de Report-kaart: per potion de prijs per punt en wat hij van je balk vult. */
  const potionInfoLines = () => Array.from(potionPart().querySelectorAll('.potion-info')).map((p) => p.textContent)
  const withMob = () => {
    cleanup()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, spots: [mobDraft('Ribbon Pig')] }))
    render(<App />)
  }

  it('toont per soort een keuzemenu en daaronder de prijs in rood en het herstel in groen, met een potlood, zoals Monster', () => {
    openPotions()
    // HP en MP elk onder een eigen kop, met een lijn ertussen.
    expect(Array.from(potionsCard().querySelectorAll('.potion-group h3')).map((h) => h.textContent)).toEqual(['HP potions', 'MP potions'])
    // Geen label boven het keuzemenu: de kop is zijn naam (Dave, 6 oktober 2026).
    expect(potionsCard().textContent).not.toContain('die je gebruikt')
    expect(group('MP').previousElementSibling).toBe(group('HP'))
    expect(Array.from(select('HP').options).map((o) => o.textContent)).toEqual(['Orange Potion (150 meso)', 'White Potion (350 meso)'])
    expect(Array.from(select('MP').options).map((o) => o.textContent)).toEqual(['Blue Potion (220 meso)'])
    // Zonder keuze de goedkoopste.
    expect(select('HP').value).toBe('Orange Potion')
    expect(lines('HP')).toEqual([['Price', '−150 meso', true], ['Recovery', '+250 HP', true]])
    expect(lines('MP')).toEqual([['Price', '−220 meso', true], ['Recovery', '+200 MP', true]])
    expect(line('HP', 'Price').querySelector('strong.cost')).not.toBeNull()
    expect(line('HP', 'Recovery').querySelector('strong.gain')).not.toBeNull()
    // Geen Max HP of Max MP: die staan op Total stats.
    expect(cardNames('section.potions')).not.toContain('Max HP')
    // Wat een potion per punt kost en van je balk vult (250 van 444: 56%), staat in het rapport en niet op de kaart (Dave, 6 oktober 2026).
    // Per punt telt alleen wat er mist bij een halve balk (#181): 150 / 222 = 0,68 voor de Orange, 220 / 181,5 = 1,2 voor de Blue.
    expect(potionsCard().querySelector('.potion-info')).toBeNull()
    expect(potionInfoLines()).toEqual(['Orange Potion: 0,68 meso per HP · vult 56% van je Max HP · telt alleen wat er mist bij 50% van je balk', 'Blue Potion: 1,21 meso per MP · vult 55% van je Max MP · telt alleen wat er mist bij 50% van je balk'])
  })

  it('toont een gekozen potion eerst als concept, alleen om te lezen, en legt hem pas met Opslaan vast', () => {
    withMob()
    const before = levelCostText()
    expect(potionPart().querySelector('.chip')!.textContent).toBe('Blijven')
    openPotions()
    expect((within(potionsCard()).getByRole('button', { name: 'Opslaan' }) as HTMLButtonElement).disabled).toBe(true)
    choose('HP', 'White Potion')
    expect(lines('HP')).toEqual([['Price', '−350 meso', false], ['Recovery', '+500 HP', false]])
    expect(stored(POTION_CHOICE_KEY)).toBeNull()
    save()
    expect(stored(POTION_CHOICE_KEY)).toEqual({ version: 1, hp: 'White Potion', mp: null, fix: { hp: {}, mp: {} } })
    // Duurder per HP: het level kost meer, en het rapport raadt de Orange aan.
    expect(levelCostText()).not.toBe(before)
    expect(potionPart().querySelector('.chip')!.textContent).toBe('Wisselen')
    expect(potionPart().textContent).toContain('Wissel naar Orange Potion.')
    expect(potionPart().textContent).toMatch(/Met jouw potions kost dit level je ± [\d.]+ meso, met de goedkoopste kost het je ± [\d.]+ meso\./)
    // Weer open: de opgeslagen potion, nu met potlood.
    openPotions()
    expect(select('HP').value).toBe('White Potion')
    expect(lines('HP')).toEqual([['Price', '−350 meso', true], ['Recovery', '+500 HP', true]])
  })

  it('gooit een gekozen potion weg met Annuleren, zoals bij Monster', () => {
    openPotions()
    choose('HP', 'White Potion')
    fireEvent.click(within(potionsCard().querySelector<HTMLElement>('dialog.card-dialog')!).getByRole('button', { name: 'Annuleren' }))
    openPotions()
    expect(select('HP').value).toBe('Orange Potion')
    expect(stored(POTION_CHOICE_KEY)).toBeNull()
  })

  it('rekent met een gecorrigeerde prijs, toont het getal uit de database doorgestreept ernaast, en weegt hem in het rapport', () => {
    withMob()
    const before = levelCostText()
    openPotions()
    fix('HP', 'Price', '400')
    expect(stored(POTION_CHOICE_KEY).fix).toEqual({ hp: { name: 'Orange Potion', price: 400 }, mp: {} })
    expect(line('HP', 'Price').querySelector('.equip-value-db')!.textContent).toBe('−150 meso')
    expect(line('HP', 'Price').querySelector('.equip-value strong')!.textContent).toBe('−400 meso')
    expect(levelCostText()).not.toBe(before)
    // Voor 400 meso kost de Orange 1,8 per gebruikte HP, meer dan de White (1,58; er mist 222 HP bij een halve balk van 444): het rapport raadt de White aan.
    expect(potionPart().querySelector('.chip')!.textContent).toBe('Wisselen')
    expect(potionPart().textContent).toContain('Wissel naar White Potion.')
  })

  it('valt terug op de goedkoopste als de bewaarde keuze niet bij je job hoort', () => {
    cleanup()
    localStorage.setItem(POTION_CHOICE_KEY, JSON.stringify({ version: 1, hp: 'Lemon', mp: 'Lemon' }))
    render(<App />)
    openPotions()
    expect(select('HP').value).toBe('Orange Potion')
    expect(select('MP').value).toBe('Blue Potion')
  })

  it('zet Max HP en Max MP bovenaan Total stats; een aangepaste Max MP telt na Opslaan, en Level up verhoogt beide', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
    expect(cardNames('section.total-stats').slice(0, 3)).toEqual(['Max HP', 'Max MP', 'Attack'])
    expect(statShown('Max HP')).toBe(DEFAULT_PROFILE.hp)
    expect(statShown('Max MP')).toBe(DEFAULT_PROFILE.mp)
    const h = openStat('Max MP')
    h.type('400')
    h.save()
    expect(profileFields().mp).toBe('400')
    fireEvent.click(screen.getByRole('button', { name: 'Level up' }))
    // Een Thief van level 10 naar 11: +22 HP en +17 MP (de HP/MP-gids).
    expect(profileFields().hp).toBe('466')
    expect(profileFields().mp).toBe('417')
  })

  it('geeft een Magician de MP-potions van Len the Fairy erbij, en rekent met de Orange', () => {
    cleanup()
    localStorage.setItem(JOB_KEY, JSON.stringify({ version: 1, job: 'magician' }))
    render(<App />)
    openPotions()
    expect(Array.from(select('MP').options).map((o) => o.value)).toEqual(['Orange', 'Lemon', 'Blue Potion'])
    expect(select('MP').value).toBe('Orange')
  })

  it('laat het deel van je balk weg zolang Max MP leeg is', () => {
    cleanup()
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, fields: { ...DEFAULT_PROFILE, mp: '' } }))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Total stats bekijken' }))
    expect(statShown('Max MP')).toBe('?')
    openPotions()
    expect(potionInfoLines()[1]).toBe('Blue Potion: 1,1 meso per MP')
  })
})

describe('de kaart Total cost (Dave, 6 oktober 2026)', () => {
  const card = () => homeScreen().querySelector<HTMLElement>('section.total-cost')!
  // De factuur van je setup in game, het eerste deel van de kaart (#183).
  const inGame = () => card().querySelector<HTMLElement>('.cost-ingame')!
  const rows = () => Array.from(inGame().querySelectorAll('tbody tr')).map((r) => Array.from(r.children).map((c) => c.textContent))

  it('noemt in de ondertitel het level en de job, en zonder geldig level alleen de job', () => {
    expect(totalCostWho('15', 'warrior')).toBe('Lv. 15 Warrior')
    for (const level of ['', ' ', 'abc', '10.5', '0', '1e1', '0x10', '-3']) expect(totalCostWho(level, 'bowman'), level).toBe('Bowman')
  })

  it('heeft de kop en de ondertitel, en zonder mob de reden in plaats van een factuur', () => {
    expect(within(card()).getByRole('heading', { level: 2 }).textContent).toBe('Total cost')
    // Met het huidige level en de job (Dave, 6 oktober 2026); het voorbeeldprofiel is een Thief op level 10.
    expect(card().querySelector('.total-cost-sub')!.textContent).toBe('This is how much it cost to level up your Lv. 10 Thief')
    // Het level en de job vetgedrukt (Dave, 6 oktober 2026).
    expect(card().querySelector('.total-cost-sub strong')!.textContent).toBe('Lv. 10 Thief')
    expect(card().querySelector('table')).toBeNull()
    expect(card().textContent).toContain('Je hebt nog geen mob gekozen.')
  })

  it('zet per potion en voor de stars het aantal en de prijs op een factuur, met het totaal van de Report-kaart', () => {
    cleanup()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, spots: [mobDraft('Ribbon Pig')] }))
    render(<App />)
    expect(rows().map((r) => r[0])).toEqual(['Orange Potion', 'Blue Potion', 'Throwing stars'])
    for (const [, qty, meso] of rows()) {
      // Een potion heeft een vraagteken achter zijn aantal; de stars niet.
      expect(qty).toMatch(/^× [\d.]+\??$/)
      expect(meso).toMatch(/^−[\d.]+ meso$/)
    }
    expect(inGame().querySelectorAll('.invoice-meso.cost')).toHaveLength(4)
    const total = inGame().querySelector('tfoot')!.textContent!
    expect(total).toMatch(/^Total−[\d.]+ meso$/)
    // Het totaal is de som van de regels.
    const n = (t: string) => Number(t.replace(/[^\d]/g, ''))
    expect(n(total)).toBe(rows().reduce((s, r) => s + n(r[2]!), 0))
    // Geen regel met het level, de mob en de duur boven de factuur (Dave, 6 oktober 2026).
    expect(card().textContent).not.toContain('Van lv')
  })

  it('legt achter het aantal van een potion uit hoe de app eraan komt (Dave, 6 oktober 2026)', () => {
    cleanup()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, spots: [mobDraft('Ribbon Pig')] }))
    render(<App />)
    const whys = Array.from(inGame().querySelectorAll<HTMLButtonElement>('.invoice-why'))
    expect(whys.map((b) => b.getAttribute('aria-label'))).toEqual([
      expect.stringMatching(/^Hoe komt de app op \d+ Orange Potion\?$/),
      expect.stringMatching(/^Hoe komt de app op \d+ Blue Potion\?$/),
    ])
    fireEvent.click(whys[0])
    const dialog = card().querySelector<HTMLElement>('dialog')!
    // De titel vraagt naar het aantal (Dave, 6 oktober 2026).
    expect(dialog.getAttribute('aria-label')).toMatch(/^Hoezo \d+\?$/)
    const steps = Array.from(dialog.querySelectorAll('.why-steps li')).map((li) => li.textContent!.replace(/\s+/g, ' '))
    expect(steps).toHaveLength(4)
    expect(steps[0]).toMatch(/^Ribbon Pig raakt je per kill ± [\d,]+ keer voor ± [\d,]+ schade: ± [\d,]+ HP per kill\.$/)
    expect(steps[1]).toMatch(/^Je killt ± [\d.]+ Ribbon Pig per uur: ± [\d.]+ HP per uur\.$/)
    expect(steps[2]).toMatch(/^Dit level duurt ± \d+ min: ± [\d.]+ HP in totaal\.$/)
    // Het laatste getal is het aantal op de factuur.
    const qty = /op (\d+) Orange/.exec(whys[0].getAttribute('aria-label')!)![1]
    expect(steps[3]).toMatch(new RegExp(`^Eén Orange Potion herstelt 250 HP, maar je drinkt bij 50% van je balk en dan mist er maar 222 HP: [\\d.]+ / 222 = [\\d,]+, naar boven afgerond ${qty}\\.$`))
    expect(dialog.textContent).toContain('aanname zonder bron')
  })
})

describe('de vraag bovenaan (Dave, 6 oktober 2026)', () => {
  it('staat direct onder de level-rij, met het level en de job vetgedrukt', () => {
    const q = homeScreen().querySelector('.level-row')!.nextElementSibling!
    expect(q.classList.contains('app-question')).toBe(true)
    expect(q.textContent).toBe('How much does it cost to level up your Lv. 10 Thief?')
    expect(q.querySelector('strong')!.textContent).toBe('Lv. 10 Thief')
  })

  it('gaat mee met Level up', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Level up' }))
    expect(homeScreen().querySelector('.app-question strong')!.textContent).toBe('Lv. 11 Thief')
  })
})

describe('de uitleg achter een potion-aantal en het plafond op het herstel (#181)', () => {
  const card = () => homeScreen().querySelector<HTMLElement>('section.total-cost')!
  const lastStep = (fields: Partial<ProfileDraft>) => {
    cleanup()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, spots: [mobDraft('Ribbon Pig')] }))
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, fields: { ...DEFAULT_PROFILE, ...fields } }))
    render(<App />)
    fireEvent.click(card().querySelector<HTMLButtonElement>('.invoice-why')!)
    const steps = Array.from(card().querySelectorAll('dialog .why-steps li'), (li) => li.textContent!.replace(/\s+/g, ' '))
    return steps[steps.length - 1]
  }

  it('zegt bij een potion die overvult dat je bij 50% van je balk drinkt en er maar 222 van de 250 meetelt', () => {
    expect(lastStep({ hp: '444' })).toMatch(
      /^Eén Orange Potion herstelt 250 HP, maar je drinkt bij 50% van je balk en dan mist er maar 222 HP: [\d.]+ \/ 222 = [\d,]+, naar boven afgerond \d+\.$/,
    )
  })

  it('laat de capped-zin weg als de potion binnen het plafond blijft (Max HP 2000): gewoon 250 en delen door 250', () => {
    const step = lastStep({ hp: '2000' })
    expect(step).toMatch(/^Eén Orange Potion herstelt 250 HP: [\d.]+ \/ 250 = [\d,]+, naar boven afgerond \d+\.$/)
    expect(step).not.toContain('maar je drinkt')
  })

  it('laat de capped-zin weg als de potion het plafond precies haalt (Max HP 500: er mist 250 en de Orange herstelt 250)', () => {
    const step = lastStep({ hp: '500' })
    expect(step).toMatch(/^Eén Orange Potion herstelt 250 HP: [\d.]+ \/ 250 = /)
    expect(step).not.toContain('maar je drinkt')
  })
})

describe('Total cost: In game, Cheapest en Difference in één kaart (#183)', () => {
  const cheapestCard = () => document.querySelector<HTMLElement>('.total-cost .cheapest-cost')!
  const diffCard = () => document.querySelector<HTMLElement>('.total-cost .cost-difference')!
  const summary = () => document.querySelector<HTMLElement>('.cheapest-result')
  const yours = () => homeScreen().querySelector<HTMLElement>('.total-cost .cost-ingame')!
  const total = (card: HTMLElement) => card.querySelector('tfoot td:last-child')?.textContent
  const take = () => fireEvent.click(within(diffCard()).getByRole('button', { name: 'Overnemen' }))
  // Op level 20, met een mob gekozen, spelen mob, potions en skillpunten mee.
  const toLevel20 = () => {
    for (let i = 0; i < 10; i++) levelUp()
    fireEvent.click(screen.getByRole('button', { name: 'Monster bekijken' }))
    chooseMob('Slime')
  }
  const mesoOf = (text: string | null | undefined) => Number(text!.replace(/\D/g, ''))

  it('toont In game, Cheapest en Difference als drie delen van één kaart, de goedkoopste setup live en vóór je iets toepast', () => {
    toLevel20()
    const profileBefore = profileFields()
    const card = homeScreen().querySelector<HTMLElement>('section.total-cost')!
    expect(homeScreen().querySelectorAll('section.total-cost')).toHaveLength(1)
    expect(within(card).getByRole('heading', { level: 2 }).textContent).toBe('Total cost')
    expect(within(card).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Your character', 'Cheapest', 'Difference'])
    expect(yours().nextElementSibling).toBe(cheapestCard())
    expect(cheapestCard().nextElementSibling).toBe(diffCard())
    // Onder de h3 van In game en Cheapest de zin over hun factuur (Dave, #183).
    expect(yours().querySelector('.total-cost-sub')!.textContent).toBe('This is how much it cost to level up your Lv. 20 Thief')
    expect(cheapestCard().querySelector('.total-cost-sub')!.textContent).toBe('This is the cheapest way to level up a Lv. 20 Thief')
    expect(mesoOf(total(cheapestCard()))).toBeLessThan(mesoOf(total(yours())))
    // Vóór Overnemen zegt het totaal van Difference wat het scheelt, zonder een tweede regel eronder.
    expect(diffCard().querySelector('tfoot td.invoice-diff .cost')).not.toBeNull()
    expect(diffCard().querySelector('.cheapest-saving')).toBeNull()
    expect(diffCard().querySelectorAll('.cheapest-changes li').length).toBeGreaterThan(0)
    // Nog niets toegepast.
    expect(profileFields()).toEqual(profileBefore)
  })

  it('zet in Difference per soort kost wat je character en de goedkoopste setup betalen en het verschil, met als totaal het verschil van de twee facturen', () => {
    toLevel20()
    // Kolommen: de soort, Your character, Cheapest en Difference (Dave, #183).
    expect(Array.from(diffCard().querySelectorAll('thead th')).map((th) => th.textContent)).toEqual(['Your character', 'Cheapest', 'Difference'])
    const rows = Array.from(diffCard().querySelectorAll('tbody tr'))
    // Een soort kost, niet de naam van de potion of de munitie.
    expect(rows.map((tr) => tr.querySelector('th')!.textContent)).toEqual(['HP Potions', 'MP Potions', 'Ammo'])
    const signed = (t: string) => (t.startsWith('−') ? -mesoOf(t) : mesoOf(t))
    for (const tr of rows) {
      const [mine, cheap, d] = Array.from(tr.querySelectorAll('td')).map((td) => td.textContent!)
      expect(mine).toMatch(/^(−[\d.]+|0)$/)
      expect(cheap).toMatch(/^(−[\d.]+|0)$/)
      // Wat je laat liggen in rood met een min, zoals de kosten; is jouw setup goedkoper, dan groen met een plus.
      expect(d).toMatch(/^(\+[\d.]+|−[\d.]+|0)$/)
      expect(signed(d)).toBe(mesoOf(cheap) - mesoOf(mine))
    }
    const [mineTotal, cheapTotal, diffTotal] = Array.from(diffCard().querySelectorAll('tfoot td'))
    // De totalen zijn die van de twee facturen erboven, en het verschil is hun verschil.
    expect(mesoOf(mineTotal.textContent)).toBe(mesoOf(total(yours())))
    expect(mesoOf(cheapTotal.textContent)).toBe(mesoOf(total(cheapestCard())))
    expect(diffTotal.querySelector('.cost')).not.toBeNull()
    expect(diffTotal.textContent).toMatch(/^−/)
    expect(mesoOf(diffTotal.textContent)).toBe(mesoOf(total(yours())) - mesoOf(total(cheapestCard())))
    // De rijen tellen op tot het totaal.
    expect(rows.reduce((s, tr) => s + signed(tr.querySelector('td.invoice-diff')!.textContent!), 0)).toBe(-mesoOf(diffTotal.textContent))
  })

  it('zegt na Overnemen wat je bespaarde: het verschil van je oude en je nieuwe totaal, het totaal van Difference ervoor', () => {
    toLevel20()
    const first = mesoOf(total(yours()))
    const before = mesoOf(diffCard().querySelector('tfoot td.invoice-diff')!.textContent)
    take()
    const shown = mesoOf(diffCard().querySelector('.cheapest-saving')!.textContent!.replace(/meso.*$/, ''))
    expect(shown).toBe(first - mesoOf(total(yours())))
    expect(shown).toBe(before)
  })

  it('zet met Overnemen de setup toe: jouw Total cost krijgt het totaal van de kaart, en Ongedaan maken zet alles terug', () => {
    toLevel20()
    const profileBefore = profileFields()
    const costBefore = levelCostText()
    const yoursBefore = total(yours())
    const cheaperTotal = total(cheapestCard())
    take()
    expect(total(yours())).toBe(cheaperTotal)
    // Ook na Overnemen staat de volledige factuur op de kaart.
    expect(total(cheapestCard())).toBe(cheaperTotal)
    expect(levelCostText()).not.toBe(costBefore)
    expect(diffCard().querySelector('.cheapest-saving')?.textContent).toMatch(/bespaard op dit level/)
    fireEvent.click(within(summary()!).getByRole('button', { name: 'Ongedaan maken' }))
    expect(profileFields()).toEqual(profileBefore)
    expect(levelCostText()).toBe(costBefore)
    expect(total(yours())).toBe(yoursBefore)
    const potions = stored(POTION_CHOICE_KEY)
    expect(potions === null || (potions.hp === null && potions.mp === null)).toBe(true)
  })

  it('zegt dat je setup al de goedkoopste is als er niets te winnen valt, en toont ook dan de volledige factuur', () => {
    toLevel20()
    take()
    // Na herladen (de gekozen setup staat in de opslag) is er niets meer te winnen.
    cleanup()
    render(<App />)
    expect(diffCard().textContent).toContain('al de goedkoopste')
    expect(total(cheapestCard())).toBe(total(yours()))
    expect(total(cheapestCard())).toBeTruthy()
    expect(within(diffCard()).queryByRole('button', { name: 'Overnemen' })).toBeNull()
  })

  it('zet onder Difference je HP Potion, MP Potion, Skill, ATT en DEF, en het monster alleen als dat verandert; geen AP-regel', () => {
    toLevel20()
    const lines = Array.from(diffCard().querySelectorAll('.cheapest-changes li')).map((li) => li.textContent!)
    const labels = lines.map((l) => l.split(':')[0])
    expect(labels.filter((l) => l !== 'Monster')).toEqual(['HP Potion', 'MP Potion', 'Skill', 'ATT', 'DEF'])
    if (labels.includes('Monster')) expect(labels[0]).toBe('Monster')
    expect(labels).not.toContain('AP')
    // Een potion staat er altijd: verandert hij, dan "A → B", anders alleen zijn naam.
    for (const l of lines.filter((t) => /^(HP|MP) Potion:/.test(t))) expect(l).toMatch(/^(HP|MP) Potion: \S.*$/)
    // ATT en DEF zeggen wat het Equip-advies over je wapen en je armor zegt: kopen, niet upgraden of klaar (Overnemen koopt niets).
    const verdict = /^(Koop .+|Niet upgraden|Upgrade complete|niet uit te rekenen)$/
    expect(lines.find((l) => l.startsWith('ATT:'))!.replace(/^ATT: /, '')).toMatch(verdict)
    expect(lines.find((l) => l.startsWith('DEF:'))!.replace(/^DEF: /, '')).toMatch(verdict)
  })

  it('laat de uitkomst van Overnemen verdwijnen bij een ander level', () => {
    toLevel20()
    take()
    expect(within(summary()!).queryByRole('button', { name: 'Ongedaan maken' })).not.toBeNull()
    levelUp()
    expect(within(diffCard()).queryByRole('button', { name: 'Ongedaan maken' })).toBeNull()
  })

  it('laat Ongedaan maken verdwijnen bij een handmatige wijziging, zodat die niet gewist wordt', () => {
    toLevel20()
    take()
    fireEvent.click(screen.getByRole('button', { name: 'Monster bekijken' }))
    chooseMob('Snail')
    expect(within(diffCard()).queryByRole('button', { name: 'Ongedaan maken' })).toBeNull()
  })
})
