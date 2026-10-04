import { describe, expect, it } from 'vitest'
import { ATTACK_MS, SPEED } from './attackSpeed'
import { NPC_CLAWS } from './claws'
import { ATTACK_MS as THIEF_ATTACK_MS } from './thief'
import { NPC_WARRIOR_WEAPONS } from './warrior'

const keys = Object.keys(ATTACK_MS) as (keyof typeof ATTACK_MS)[]
const msValues: number[] = Object.values(ATTACK_MS)

describe('aanvalssnelheden (gedeelde tabel)', () => {
  it('heeft de zes cycli uit het spel', () => {
    expect(ATTACK_MS).toEqual({ faster3: 660, fast4: 720, fast5: 750, normal6: 810, slow7: 870, slow8: 900 })
  })

  it('draagt bij elke cyclus het label zoals het spel het noemt', () => {
    expect(SPEED).toEqual({
      faster3: { label: 'Faster (3)', attackMs: 660 },
      fast4: { label: 'Fast (4)', attackMs: 720 },
      fast5: { label: 'Fast (5)', attackMs: 750 },
      normal6: { label: 'Normal (6)', attackMs: 810 },
      slow7: { label: 'Slow (7)', attackMs: 870 },
      slow8: { label: 'Slow (8)', attackMs: 900 },
    })
  })

  it('heeft in SPEED en ATTACK_MS dezelfde sleutels en dezelfde ms', () => {
    expect(Object.keys(SPEED)).toEqual(keys)
    for (const k of keys) expect(SPEED[k].attackMs, k).toBe(ATTACK_MS[k])
  })

  it('wordt trager naarmate het snelheidsnummer hoger wordt', () => {
    expect(msValues).toEqual([...msValues].sort((a, b) => a - b))
    expect(new Set(msValues).size).toBe(msValues.length)
    // het getal in het label volgt de volgorde van de tabel
    const nums = keys.map((k) => Number(/\((\d)\)/.exec(SPEED[k].label)?.[1]))
    expect(nums).toEqual([3, 4, 5, 6, 7, 8])
  })

  it('is via ./thief hetzelfde object als via ./attackSpeed', () => {
    expect(THIEF_ATTACK_MS).toBe(ATTACK_MS)
  })
})

describe('geen drift: wapens gebruiken alleen snelheden uit de tabel', () => {
  const pairs = Object.values(SPEED).map((s) => `${s.label}|${s.attackMs}`)

  it('elke claw heeft een label + ms-paar dat in SPEED bestaat', () => {
    for (const c of NPC_CLAWS) expect(pairs, c.name).toContain(`${c.speed.label}|${c.speed.attackMs}`)
  })

  it('elk Warrior-wapen heeft een label + ms-paar dat in SPEED bestaat', () => {
    for (const w of NPC_WARRIOR_WEAPONS) expect(pairs, w.name).toContain(`${w.speed.label}|${w.speed.attackMs}`)
  })

  it('een stabMs (steek) is altijd een cyclus uit ATTACK_MS', () => {
    for (const w of NPC_WARRIOR_WEAPONS) {
      const stab = w.speed.stabMs
      if (stab !== undefined) expect(msValues, w.name).toContain(stab)
    }
  })
})
