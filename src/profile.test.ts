import { describe, expect, it } from 'vitest'
import { DEFAULT_PROFILE, isDefaultProfile, loadProfile, parseProfile, PROFILE_KEY, saveProfile, toCharacter, type ProfileDraft } from './profile'

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

const parse = (over: Partial<ProfileDraft>) => parseProfile({ ...DEFAULT_PROFILE, ...over })

describe('parseProfile', () => {
  it('leest het voorbeeldprofiel', () => {
    const r = parseProfile(DEFAULT_PROFILE)
    expect('profile' in r && r.profile.level).toBe(10)
    expect('profile' in r && r.profile.attackMs).toBe(750)
  })

  it('meldt een leeg veld', () => {
    expect(parse({ luk: '' })).toEqual({ error: 'Vul bij je karakter "LUK" in.' })
    expect(parse({ luk: 'abc' })).toEqual({ error: 'Vul bij je karakter "LUK" in.' })
  })

  it('meldt een getal buiten de grenzen', () => {
    expect(parse({ level: '0' })).toHaveProperty('error')
    expect(parse({ luckySeven: '21' })).toHaveProperty('error')
    expect(parse({ attackMs: '50' })).toHaveProperty('error')
    expect(parse({ luckySeven: '0' })).toHaveProperty('profile')
  })

  it('wil hele getallen waar het spel hele getallen heeft', () => {
    expect(parse({ level: '10.5' })).toEqual({ error: '"Level" moet een heel getal zijn.' })
    expect(parse({ attackMs: '712.5' })).toHaveProperty('profile')
  })
})

describe('isDefaultProfile', () => {
  it('herkent het voorbeeld, en een eigen waarde maakt het je eigen profiel', () => {
    expect(isDefaultProfile(DEFAULT_PROFILE)).toBe(true)
    expect(isDefaultProfile({ ...DEFAULT_PROFILE, luk: '41' })).toBe(false)
  })
})

describe('toCharacter', () => {
  it('telt de weapon attack van de Subi-stars (15) bij die van de claw', () => {
    const r = parseProfile(DEFAULT_PROFILE)
    if (!('profile' in r)) throw new Error('voorbeeldprofiel ongeldig')
    expect(toCharacter(r.profile).watk).toBe(10 + 15)
  })
})

describe('loadProfile en saveProfile', () => {
  it('geven heen en terug hetzelfde profiel', () => {
    const storage = fakeStorage()
    const draft = { ...DEFAULT_PROFILE, luk: '55', level: '' }
    expect(saveProfile(storage, draft)).toBe(true)
    expect(loadProfile(storage)).toEqual(draft)
  })

  it('geven zonder of met kapotte opslag het voorbeeldprofiel', () => {
    expect(loadProfile(null)).toEqual(DEFAULT_PROFILE)
    expect(loadProfile(fakeStorage())).toEqual(DEFAULT_PROFILE)
    expect(loadProfile(fakeStorage({ [PROFILE_KEY]: '{kapot' }))).toEqual(DEFAULT_PROFILE)
    expect(loadProfile(fakeStorage({ [PROFILE_KEY]: JSON.stringify({ version: 2, fields: { luk: '9' } }) }))).toEqual(DEFAULT_PROFILE)
  })

  it('houdt een goed veld en geeft een fout veld de standaardwaarde', () => {
    const raw = JSON.stringify({ version: 1, fields: { luk: '60', dex: 7, geheim: 'x', level: '9'.repeat(50) } })
    const p = loadProfile(fakeStorage({ [PROFILE_KEY]: raw }))
    expect(p.luk).toBe('60')
    expect(p.dex).toBe(DEFAULT_PROFILE.dex)
    expect(p.level).toHaveLength(12)
    expect('geheim' in p).toBe(false)
  })

  it('breekt niet als de opslag faalt', () => {
    const storage = fakeStorage()
    storage.setItem = () => {
      throw new Error('vol')
    }
    expect(saveProfile(storage, DEFAULT_PROFILE)).toBe(false)
    expect(saveProfile(null, DEFAULT_PROFILE)).toBe(false)
  })
})
