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

    it('biedt bij Weapon de Warrior-wapens aan en geen Thief-claws, en Hat en Shoes met Warrior-armor', () => {
      const weapon = Array.from(slotSelect(cards()[0], 'Weapon').options).map((o) => o.value)
      expect(weapon).toContain('Gladius')
      expect(weapon).not.toContain('Meba')
      expect(Array.from(slotSelect(cards()[0], 'Hat').options).map((o) => o.value)).toContain('Bronze Full Helm')
      expect(Array.from(slotSelect(cards()[0], 'Hat').options).map((o) => o.value)).not.toContain('Red Thief Hood')
      expect(Array.from(slotSelect(cards()[0], 'Shoes').options).map((o) => o.value)).toContain('Bronze Grieves')
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
        expect(Array.from(slotSelect(cards()[0], 'Weapon').options).map((o) => o.value)).not.toContain('Gladius')
      })
    })
  }
})
