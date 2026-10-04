// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './app'
import { NPC_CLAWS } from './data/claws'
import { EQUIPMENT_KEY } from './equipment'
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

const stored = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null')
const profileFields = () => stored(PROFILE_KEY)?.fields
const slots = () => stored(EQUIPMENT_KEY)?.slots

/** De drie schermen van de flow: [0] thuis, [1] controle na de level-up, [2] advies. */
const panels = () => Array.from(document.querySelectorAll<HTMLElement>('.panel'))

/** De equipment-kaarten: [0] op het beginscherm, [1] op het controlescherm van de level-up. */
const cards = () => Array.from(document.querySelectorAll<HTMLElement>('section.equipment'))
const slotSelect = (card: HTMLElement, slot: string) => within(card).getByLabelText(new RegExp(`^${slot}`)) as HTMLSelectElement
const pick = (card: HTMLElement, slot: string, value: string) => fireEvent.change(slotSelect(card, slot), { target: { value } })
const badge = (card: HTMLElement, slot: string) => slotSelect(card, slot).closest('label')!.querySelector('em.was')?.textContent ?? null

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

  it('zet bij "Niets" de weapon attack op 0 en laat de aanvalssnelheid staan', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', 'none')
    expect(profileFields().clawWatk).toBe('0')
    expect(profileFields().attackMs).toBe(DEFAULT_PROFILE.attackMs)
  })

  it('past bij een armorstuk alleen het verschil in WDEF toe', () => {
    openHomeEquipment()
    const hat = slotSelect(cards()[0], 'Hat')
    const item = Array.from(hat.options).find((o) => /WDEF (\d+)\)$/.test(o.text))!
    const wdef = Number(/WDEF (\d+)\)$/.exec(item.text)![1])
    // van onbekend naar bekend verandert de WDEF niet: dat stuk zat er al in
    const before = profileFields()?.wdef
    pick(cards()[0], 'Hat', item.value)
    expect(profileFields()?.wdef).toBe(before)
    // van dit stuk naar niets haalt de WDEF van dat stuk eraf
    pick(cards()[0], 'Hat', 'none')
    expect(profileFields().wdef).toBe(String(Number(DEFAULT_PROFILE.wdef) - wdef))
  })
})

describe('bewaren na elke wijziging', () => {
  it('bewaart de equipment per slot', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    pick(cards()[0], 'Shoes', 'none')
    expect(slots().claw.pick).toBe(IGOR.name)
    expect(slots().shoes.pick).toBe('none')
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

  it('past bij "Ander item" het profiel pas aan als het getal is vastgelegd', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', 'other')
    const stat = within(cards()[0]).getByLabelText('WATK') as HTMLInputElement
    const before = profileFields()?.clawWatk
    fireEvent.input(stat, { target: { value: '31' } })
    expect(profileFields()?.clawWatk).toBe(before)
    fireEvent.change(stat)
    expect(profileFields().clawWatk).toBe('31')
    expect(slots().claw).toMatchObject({ pick: 'other', stat: '31' })
  })

  it('neemt een getal dat nog in het veld staat mee bij de level-up', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', 'other')
    fireEvent.input(within(cards()[0]).getByLabelText('WATK'), { target: { value: '44' } })
    levelUp()
    expect(profileFields().clawWatk).toBe('44')
    expect(profileFields().level).toBe('11')
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
    pick(cards()[0], 'Hat', 'none')
    const profileBefore = profileFields()
    const slotsBefore = slots()

    levelUp()
    pick(cards()[1], 'Weapon', MEBA.name)
    pick(cards()[1], 'Shoes', 'none')
    expect(profileFields().clawWatk).toBe(String(MEBA.watk))
    expect(slots().shoes.pick).toBe('none')

    undoLevelUp()
    expect(profileFields()).toEqual(profileBefore)
    expect(profileFields().level).toBe('10')
    expect(profileFields().clawWatk).toBe(String(IGOR.watk))
    expect(profileFields().attackMs).toBe(String(IGOR.speed.attackMs))
    expect(slots()).toEqual(slotsBefore)
    expect(slotSelect(cards()[0], 'Weapon').value).toBe(IGOR.name)
    expect(slotSelect(cards()[0], 'Shoes').value).toBe('unknown')
  })

  it('gooit een nog niet vastgelegd getal bij "Ander item" weg', () => {
    levelUp()
    pick(cards()[1], 'Weapon', 'other')
    fireEvent.input(within(cards()[1]).getByLabelText('WATK'), { target: { value: '77' } })
    undoLevelUp()
    expect(profileFields().clawWatk).toBe(DEFAULT_PROFILE.clawWatk)
    expect(slots().claw.pick).toBe('unknown')
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
    pick(cards()[1], 'Hat', 'none')
    expect(badge(cards()[1], 'Weapon')).not.toBeNull()
    expect(badge(cards()[1], 'Hat')).toBe('was Weet ik niet')
    expect(badge(cards()[1], 'Top')).toBeNull()
    expect(badge(cards()[1], 'Shoes')).toBeNull()
  })

  // Bekende bug #52: entryLabel leest `name`, maar een winkelitem staat in `pick`, dus de badge zegt "was Ander item".
  // Wordt deze test rood, dan is #52 opgelost: haal dan `.fails` weg.
  it.fails('noemt een winkelitem bij zijn naam (#52)', () => {
    openHomeEquipment()
    pick(cards()[0], 'Weapon', IGOR.name)
    levelUp()
    pick(cards()[1], 'Weapon', MEBA.name)
    expect(badge(cards()[1], 'Weapon')).toBe(`was ${IGOR.name}`)
  })

  it('noemt "Niets" en "Weet ik niet" bij naam', () => {
    openHomeEquipment()
    pick(cards()[0], 'Top', 'none')
    levelUp()
    pick(cards()[1], 'Top', 'other')
    expect(badge(cards()[1], 'Top')).toBe('was Niets')
    pick(cards()[1], 'Weapon', 'other')
    expect(badge(cards()[1], 'Weapon')).toBe('was Weet ik niet')
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
