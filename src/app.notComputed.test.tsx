// @vitest-environment happy-dom
import { cleanup, fireEvent, render, within } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './app'
import { JOB_KEY } from './job'

// Alle vier jobs worden nu doorgerekend, dus de tak "geen advies, alleen Profile" (#192) is in de echte app niet te bereiken.
// Hier doet isComputed alsof een job nog niet is doorgerekend, zodat die tak toch een test heeft zodra er weer zo'n job komt.
vi.mock('./job', async (original) => ({ ...(await original<typeof import('./job')>()), isComputed: () => false }))

const CARD_CLASS = { Equip: '.equipment', Skillpoints: '.skills', Monster: '.hunted', Potions: '.potions', 'Ability points': '.profile', 'Total stats': '.total-stats' } as const

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('een job die de app niet doorrekent (#192)', () => {
  it('geeft op elke kaart alleen Profile, en die opent nog gewoon de popup', () => {
    localStorage.clear()
    localStorage.setItem(JOB_KEY, JSON.stringify({ version: 1, job: 'magician' }))
    render(<App />)
    for (const [title, cls] of Object.entries(CARD_CLASS)) {
      const card = document.querySelector<HTMLElement>(`main section${cls}`)!
      expect([...card.querySelectorAll('.view-actions button')].map((b) => b.textContent), title).toEqual(['Profile'])
      expect(within(card).queryByRole('button', { name: 'Cheapest' }), title).toBeNull()
      expect(card.querySelectorAll('.spot-head button'), title).toHaveLength(0)
      fireEvent.click(within(card).getByRole('button', { name: 'Profile' }))
      const dialog = card.querySelector<HTMLElement>('dialog.card-dialog')
      expect(dialog, title).not.toBeNull()
      expect(dialog!.querySelector('.stat-dialog-name')!.textContent, title).not.toMatch(/^Cheapest/)
      fireEvent.click(within(dialog!).getByRole('button', { name: 'Sluiten' }))
    }
  })
})
