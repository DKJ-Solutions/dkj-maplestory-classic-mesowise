import { describe, expect, it } from 'vitest'
import { isSkillKey } from './data/skills'
import { DEFAULT_PROFILE, DRAFT_FIELDS, loadProfile, mainStatOf, parseProfile, PROFILE_FIELDS, profileFieldsFor, PROFILE_KEY, saveProfile, statFieldsFor, toCharacter, type ProfileDraft } from './profile'

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
    for (const j of ['magician', 'bowman'] as const) {
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
    expect(label).toBe('Weapon attack van je wapen')
    expect(label).not.toMatch(/claw/i)
  })
})

describe('Warrior-profiel: job, weaponMult en skills', () => {
  const warriorDraft: ProfileDraft = { ...DEFAULT_PROFILE, level: '30', str: '132', dex: '30', luk: '4', clawWatk: '47', weaponMult: '1.8', attackMs: '720', powerStrike: '20' }
  const parseW = (over: Partial<ProfileDraft> = {}) => parseProfile({ ...warriorDraft, ...over }, 'warrior')

  it('zet de job in het profiel (Thief standaard) en leest de Warrior-velden als getallen', () => {
    const t = parseProfile(DEFAULT_PROFILE)
    expect('profile' in t && t.profile.job).toBe('thief')
    const w = parseW()
    if (!('profile' in w)) throw new Error('Warrior-profiel ongeldig')
    expect(w.profile).toMatchObject({ job: 'warrior', str: 132, dex: 30, clawWatk: 47, weaponMult: 1.8, powerStrike: 20, preciseStrikes: 0 })
  })

  it('valideert de weapon multiplier alleen voor een Warrior, tussen 1 en 5', () => {
    expect(parseW({ weaponMult: '' })).toEqual({ error: 'Vul bij je karakter "Weapon multiplier van je wapen" in.', key: 'weaponMult' })
    expect(parseW({ weaponMult: '0.5' })).toHaveProperty('error')
    expect(parseW({ weaponMult: '5.5' })).toHaveProperty('error')
    expect(parseW({ weaponMult: '2.5' })).toHaveProperty('profile')
    // Een Thief vult het veld niet in: een kapotte waarde telt niet mee en het profiel krijgt de standaardwaarde.
    const t = parseProfile({ ...DEFAULT_PROFILE, weaponMult: 'x' }, 'thief')
    expect('profile' in t && t.profile.weaponMult).toBe(1.8)
  })

  it('valideert de Warrior-skills met de maxima uit de spelgegevens, en de Thief-skills niet', () => {
    expect(parseW({ powerStrike: '21' })).toEqual({ error: '"Power Strike" moet tussen 0 en 20 liggen.', key: 'powerStrike' })
    expect(parseW({ preciseStrikes: '16' })).toHaveProperty('error')
    expect(parseW({ preciseStrikes: '15', slashBlast: '20', ironBody: '20', maxHpIncrease: '15', improvedHpRecovery: '15' })).toHaveProperty('profile')
    // De Thief-skills zijn voor een Warrior verborgen, dus een kapotte waarde telt niet.
    expect(parseW({ luckySeven: 'x', nimbleBody: '99' })).toHaveProperty('profile')
    // En omgekeerd: een kapotte Warrior-skill telt niet voor een Thief.
    expect(parseProfile({ ...DEFAULT_PROFILE, powerStrike: 'x', weaponMult: '' }, 'thief')).toHaveProperty('profile')
  })

  it('toont een Warrior de stats met weapon multiplier, de Beginner-skills en zijn eigen zes skills, en geen Thief-skills', () => {
    const keys = profileFieldsFor('warrior').map((f) => f.key)
    for (const k of ['str', 'dex', 'luk', 'weaponMult', 'threeSnails', 'nimbleFeet', 'recovery', 'powerStrike', 'slashBlast', 'preciseStrikes', 'ironBody', 'maxHpIncrease', 'improvedHpRecovery']) expect(keys, k).toContain(k)
    for (const k of ['luckySeven', 'nimbleBody', 'keenEyes', 'doubleStab', 'disorder', 'darkSight']) expect(keys, k).not.toContain(k)
    // De Thief ziet de weapon multiplier en de Warrior-skills niet.
    const thief = profileFieldsFor('thief').map((f) => f.key)
    for (const k of ['weaponMult', 'powerStrike', 'preciseStrikes']) expect(thief, k).not.toContain(k)
  })

  it('geeft statFieldsFor zonder skills, met de weapon multiplier alleen bij een Warrior', () => {
    expect(statFieldsFor('thief').map((f) => f.key)).not.toContain('weaponMult')
    expect(statFieldsFor('warrior').map((f) => f.key)).toContain('weaponMult')
    for (const j of ['thief', 'warrior', 'magician', 'bowman'] as const) for (const f of statFieldsFor(j)) expect(isSkillKey(f.key), `${j} ${f.key}`).toBe(false)
  })

  it('geeft de standaardwaarde van een Thief ook alle nieuwe velden', () => {
    expect(DEFAULT_PROFILE).toMatchObject({ weaponMult: '1.8', powerStrike: '0', slashBlast: '0', preciseStrikes: '0', ironBody: '0', maxHpIncrease: '0', improvedHpRecovery: '0' })
    for (const f of DRAFT_FIELDS) expect(DEFAULT_PROFILE[f.key], f.key).toBeDefined()
  })

  it('bewaart en laadt weaponMult en de Warrior-skills heen en terug', () => {
    const storage = fakeStorage()
    const draft = { ...warriorDraft, weaponMult: '2.6', preciseStrikes: '7', slashBlast: '3' }
    expect(saveProfile(storage, draft)).toBe(true)
    expect(loadProfile(storage)).toEqual(draft)
    expect(JSON.parse(storage.getItem(PROFILE_KEY)!).fields).toMatchObject({ weaponMult: '2.6', preciseStrikes: '7', slashBlast: '3' })
  })

  it('geeft een bewaard profiel van vóór de Warrior de standaardwaarde voor de nieuwe velden', () => {
    const raw = JSON.stringify({ version: 1, fields: { luk: '60', luckySeven: '7' } })
    const p = loadProfile(fakeStorage({ [PROFILE_KEY]: raw }))
    expect(p).toMatchObject({ luk: '60', luckySeven: '7', weaponMult: '1.8', powerStrike: '0', preciseStrikes: '0', slashBlast: '0' })
    // En het is meteen bruikbaar voor een Warrior.
    expect(parseProfile(p, 'warrior')).toHaveProperty('profile')
  })

  it('houdt een kapotte of te lange Warrior-waarde uit de opslag buiten', () => {
    const raw = JSON.stringify({ version: 1, fields: { weaponMult: 2.6, powerStrike: '9'.repeat(50) } })
    const p = loadProfile(fakeStorage({ [PROFILE_KEY]: raw }))
    expect(p.weaponMult).toBe('1.8')
    expect(p.powerStrike).toHaveLength(12)
  })

  it('geeft toCharacter voor een Warrior alleen de weapon attack van het wapen, zonder Subi', () => {
    const w = parseW()
    if (!('profile' in w)) throw new Error('Warrior-profiel ongeldig')
    expect(toCharacter(w.profile).watk).toBe(47)
    expect(toCharacter(w.profile)).toMatchObject({ level: 30, str: 132, dex: 30, luk: 4, attackMs: 720 })
    // Dezelfde cijfers als Thief krijgen wel Subi erbij.
    const t = parseProfile({ ...warriorDraft }, 'thief')
    expect('profile' in t && toCharacter(t.profile).watk).toBe(47 + 15)
  })

  it('geeft mainStatOf STR voor een Warrior en LUK voor een Thief', () => {
    const w = parseW()
    const t = parseProfile(warriorDraft, 'thief')
    if (!('profile' in w) || !('profile' in t)) throw new Error('profiel ongeldig')
    expect(mainStatOf(w.profile)).toBe(132)
    expect(mainStatOf(t.profile)).toBe(4)
  })
})
