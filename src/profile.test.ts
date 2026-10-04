import { describe, expect, it } from 'vitest'
import { DEFAULT_PROFILE, loadProfile, parseProfile, PROFILE_FIELDS, profileFieldsFor, PROFILE_KEY, saveProfile, toCharacter, type ProfileDraft } from './profile'

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
    expect(parse({ luk: '' })).toEqual({ error: 'Vul bij je karakter "LUK" in.', key: 'luk' })
    expect(parse({ luk: 'abc' })).toEqual({ error: 'Vul bij je karakter "LUK" in.', key: 'luk' })
  })

  it('meldt een getal buiten de grenzen', () => {
    expect(parse({ level: '0' })).toHaveProperty('error')
    expect(parse({ luckySeven: '21' })).toHaveProperty('error')
    expect(parse({ attackMs: '50' })).toHaveProperty('error')
    expect(parse({ luckySeven: '0' })).toHaveProperty('profile')
  })

  it('meldt een fout skillveld bij Skillpoints, met de grens uit de spelgegevens', () => {
    expect(parse({ keenEyes: '' })).toEqual({ error: 'Vul bij Skillpoints "Keen Eyes" in.', key: 'keenEyes' })
    expect(parse({ threeSnails: '4' })).toEqual({ error: '"Three Snails" moet tussen 0 en 3 liggen.', key: 'threeSnails' })
    expect(parse({ darkSight: '20', recovery: '3' })).toHaveProperty('profile')
  })

  it('wil hele getallen waar het spel hele getallen heeft', () => {
    expect(parse({ level: '10.5' })).toEqual({ error: '"Level" moet een heel getal zijn.', key: 'level' })
    expect(parse({ attackMs: '712.5' })).toHaveProperty('profile')
  })
})

describe('toCharacter', () => {
  it('telt de weapon attack van de Subi-stars (15) bij die van de claw', () => {
    const r = parseProfile(DEFAULT_PROFILE)
    if (!('profile' in r)) throw new Error('voorbeeldprofiel ongeldig')
    expect(toCharacter(r.profile).watk).toBe(10 + 15)
  })

  it('telt de weapon attack van de gekozen stars mee in plaats van die van Subi', () => {
    const r = parseProfile({ ...DEFAULT_PROFILE, starWatk: '23' })
    if (!('profile' in r)) throw new Error('profiel ongeldig')
    expect(toCharacter(r.profile).watk).toBe(10 + 23)
  })

  it('blokkeert de berekening niet bij een eigen star met een hoge weapon attack', () => {
    expect('profile' in parseProfile({ ...DEFAULT_PROFILE, starWatk: '150' })).toBe(true)
  })

  it('begint met de stars van Subi: weapon attack 15, herladen 0,3 per star', () => {
    expect(DEFAULT_PROFILE.starWatk).toBe('15')
    expect(DEFAULT_PROFILE.starRecharge).toBe('0.3')
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

  it('geeft een bewaard profiel van vóór de nieuwe skills de standaardwaarde voor die skills', () => {
    const raw = JSON.stringify({ version: 1, fields: { luk: '60', luckySeven: '7', nimbleBody: '3' } })
    const p = loadProfile(fakeStorage({ [PROFILE_KEY]: raw }))
    expect(p).toMatchObject({ luk: '60', luckySeven: '7', nimbleBody: '3', keenEyes: '0', threeSnails: '0' })
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

describe('profileFieldsFor', () => {
  // De zes skills van de 1e job van een Thief; de Beginner-skills heeft elke job.
  const hidden = ['nimbleBody', 'keenEyes', 'doubleStab', 'disorder', 'darkSight', 'luckySeven']

  it('toont voor de Thief elk veld, in dezelfde volgorde', () => {
    expect(profileFieldsFor('thief')).toEqual(PROFILE_FIELDS)
  })

  it('verbergt voor een andere job de Thief-skills van de 1e job, houdt de Beginner-skills en de volgorde', () => {
    const expected = PROFILE_FIELDS.filter((f) => !hidden.includes(f.key))
    expect(expected.length).toBe(PROFILE_FIELDS.length - hidden.length)
    for (const j of ['warrior', 'magician', 'bowman'] as const) {
      const keys = profileFieldsFor(j).map((f) => f.key)
      expect(profileFieldsFor(j), j).toEqual(expected)
      for (const k of hidden) expect(keys, j).not.toContain(k)
      for (const k of ['threeSnails', 'nimbleFeet', 'recovery']) expect(keys, j).toContain(k)
    }
  })

  it('valideert de Thief-skills alleen voor een Thief; voor een andere job staat de standaardwaarde in het profiel', () => {
    const draft = { ...DEFAULT_PROFILE, luckySeven: '', nimbleBody: 'x', darkSight: '99' }
    expect(parseProfile(draft, 'thief')).toHaveProperty('error')
    const warrior = parseProfile(draft, 'warrior')
    expect(warrior).toHaveProperty('profile')
    expect('profile' in warrior && warrior.profile.luckySeven).toBe(Number(DEFAULT_PROFILE.luckySeven))
    expect(draft.luckySeven).toBe('')
  })

  it('noemt het wapenveld niet meer een claw', () => {
    const label = PROFILE_FIELDS.find((f) => f.key === 'clawWatk')!.label
    expect(label).toBe('ATT van je wapen')
    expect(label).not.toMatch(/claw/i)
  })
})
