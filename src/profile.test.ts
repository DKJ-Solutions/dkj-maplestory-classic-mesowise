import { describe, expect, it } from 'vitest'
import { BRONZE_ARROW, PLAIN_ARROW } from './bowmanGear'
import { isSkillKey } from './data/skills'
import { apAtLevel, SUBI } from './data/thief'
import { DEFAULT_PROFILE, DRAFT_FIELDS, loadProfile, mainStatOf, parseProfile, shortfall, skillPointsLeft, skillPointsSpent, PROFILE_FIELDS, profileFieldsFor, PROFILE_KEY, saveProfile, statFieldsFor, toCharacter, totalAttack, totalMagicAttack, type ProfileDraft, STARTER_PROFILE, baseApSpent, draftStatTotal } from './profile'

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
    expect(parse({ level: '30', darkSight: '20', recovery: '3' })).toHaveProperty('profile')
  })

  it('wil hele getallen waar het spel hele getallen heeft', () => {
    expect(parse({ level: '10.5' })).toEqual({ error: '"Level" moet een heel getal zijn.', key: 'level' })
    expect(parse({ attackMs: '712.5' })).toHaveProperty('profile')
  })
})

describe('parseProfile en het geslacht (issue #55)', () => {
  it('zet het geslacht alleen in het profiel als het gegeven is', () => {
    const none = parseProfile(DEFAULT_PROFILE)
    const nul = parseProfile(DEFAULT_PROFILE, 'thief', null)
    expect('profile' in none && 'gender' in none.profile).toBe(false)
    expect('profile' in nul && 'gender' in nul.profile).toBe(false)
    for (const g of ['male', 'female'] as const) {
      for (const job of ['thief', 'warrior'] as const) {
        const r = parseProfile(DEFAULT_PROFILE, job, g)
        expect('profile' in r && r.profile.gender).toBe(g)
        expect('profile' in r && r.profile.job).toBe(job)
      }
    }
  })

  it('laat de getallen ongemoeid door het geslacht', () => {
    const a = parseProfile(DEFAULT_PROFILE)
    const b = parseProfile(DEFAULT_PROFILE, 'thief', 'female')
    if (!('profile' in a) || !('profile' in b)) throw new Error('profiel ongeldig')
    expect({ ...b.profile, gender: undefined }).toEqual({ ...a.profile, gender: undefined })
  })

  it('geeft bij een fout nog steeds de melding, ook met een geslacht', () => {
    expect(parseProfile({ ...DEFAULT_PROFILE, luk: '' }, 'thief', 'male')).toEqual({ error: 'Vul bij je karakter "LUK" in.', key: 'luk' })
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

  it('geven zonder of met kapotte opslag het beginprofiel', () => {
    expect(loadProfile(null)).toEqual(STARTER_PROFILE)
    expect(loadProfile(fakeStorage())).toEqual(STARTER_PROFILE)
    expect(loadProfile(fakeStorage({ [PROFILE_KEY]: '{kapot' }))).toEqual(STARTER_PROFILE)
    expect(loadProfile(fakeStorage({ [PROFILE_KEY]: JSON.stringify({ version: 2, fields: { luk: '9' } }) }))).toEqual(STARTER_PROFILE)
  })

  it('verdeelt in het beginprofiel precies de base AP van level 10, met de rest van de LUK als extra AP van items', () => {
    expect(baseApSpent(STARTER_PROFILE)).toBe(apAtLevel(10))
    expect(draftStatTotal(STARTER_PROFILE, 'luk')).toBe(Number(DEFAULT_PROFILE.luk))
    expect(STARTER_PROFILE.lukExtra).toBe('3')
  })

  it('geeft een bewaard profiel van vóór de extra AP geen extra AP van items: je stats blijven wat je invulde', () => {
    const raw = JSON.stringify({ version: 1, fields: { luk: '60' } })
    const p = loadProfile(fakeStorage({ [PROFILE_KEY]: raw }))
    expect(p).toMatchObject({ luk: '60', strExtra: '0', dexExtra: '0', intExtra: '0', lukExtra: '0' })
  })

  it('geeft een bewaard profiel van vóór de nieuwe skills de standaardwaarde voor die skills', () => {
    const raw = JSON.stringify({ version: 1, fields: { luk: '60', luckySeven: '7', nimbleBody: '3' } })
    const p = loadProfile(fakeStorage({ [PROFILE_KEY]: raw }))
    expect(p).toMatchObject({ luk: '60', luckySeven: '7', nimbleBody: '3', keenEyes: '0', threeSnails: '0' })
  })

  it('geeft een bewaard profiel van vóór INT (#82) INT 4, zonder dat de rest verandert', () => {
    const raw = JSON.stringify({ version: 1, fields: { str: '50', luk: '60' } })
    expect(loadProfile(fakeStorage({ [PROFILE_KEY]: raw }))).toEqual({ ...DEFAULT_PROFILE, str: '50', luk: '60', int: '4' })
  })

  it('rekent de Attack uit je equipment: bij een Thief claw plus stars, bij een Warrior alleen het wapen (#82)', () => {
    const d = { ...DEFAULT_PROFILE, clawWatk: '30', starWatk: '17' }
    expect(totalAttack(d, 'thief')).toBe(47)
    expect(totalAttack(d, 'warrior')).toBe(30)
    const r = parseProfile(d)
    if ('profile' in r) expect(totalAttack(d, 'thief')).toBe(toCharacter(r.profile).watk)
    expect(totalAttack({ ...d, clawWatk: '' }, 'thief')).toBeNull()
    expect(totalAttack({ ...d, starWatk: 'x' }, 'thief')).toBeNull()
    expect(totalAttack({ ...d, starWatk: 'x' }, 'warrior')).toBe(30)
  })

  it('rekent de Attack van een Bowman met de gewone pijl, ook als er stars van een Thief in het concept staan', () => {
    const d = { ...DEFAULT_PROFILE, clawWatk: '39', starWatk: '17' }
    expect(totalAttack(d, 'bowman')).toBe(39)
    const r = parseProfile(d, 'bowman')
    if (!('profile' in r)) throw new Error('profiel ongeldig')
    expect(totalAttack(d, 'bowman')).toBe(toCharacter(r.profile).watk)
    expect(totalAttack({ ...d, starWatk: 'x' }, 'bowman')).toBe(39)
  })

  it('geeft een Magician zijn M.ATT: floor(INT / 2) plus de M.ATT van zijn wapen, zoals de berekening (#100)', () => {
    const d = { ...DEFAULT_PROFILE, int: '101', clawWatk: '55', starWatk: '17' }
    expect(totalMagicAttack(d, 'magician')).toBe(105) // floor(50,5) + 55; stars tellen niet
    expect(totalMagicAttack({ ...d, int: '100' }, 'magician')).toBe(105)
    expect(totalMagicAttack({ ...d, clawWatk: '' }, 'magician')).toBeNull()
    expect(totalMagicAttack({ ...d, int: 'x' }, 'magician')).toBeNull()
  })

  it('geeft de andere jobs M.ATT 0, en een Magician W.ATT 0: de kaart toont altijd beide (#100)', () => {
    const d = { ...DEFAULT_PROFILE, int: '100', clawWatk: '30', starWatk: '17' }
    for (const job of ['thief', 'warrior', 'bowman'] as const) expect(totalMagicAttack(d, job), job).toBe(0)
    expect(totalAttack(d, 'magician')).toBe(0)
    expect(totalAttack({ ...d, clawWatk: '' }, 'magician')).toBe(0)
  })

  describe('Helpful Stranger (#64)', () => {
    const bowman = (over: Partial<ProfileDraft>) => {
      const r = parseProfile({ ...DEFAULT_PROFILE, clawWatk: '39', ...over }, 'bowman')
      if (!('profile' in r)) throw new Error('profiel ongeldig')
      return r.profile
    }

    it('rekent met de gewone pijl als de schakelaar uit staat, ook als de bronze pijl gekozen is', () => {
      for (const over of [{}, { bronzeArrows: '1' }, { helpfulStranger: '1' }]) {
        const p = bowman(over)
        expect(p, JSON.stringify(over)).toMatchObject({ starWatk: PLAIN_ARROW.watk, starRecharge: PLAIN_ARROW.pricePerArrow })
        expect(toCharacter(p).watk).toBe(39)
        expect(totalAttack({ ...DEFAULT_PROFILE, clawWatk: '39', ...over }, 'bowman')).toBe(39)
      }
    })

    it('rekent met +1 W.ATT en 2 meso per pijl als de schakelaar aan staat en de bronze pijl gekozen is', () => {
      const over = { helpfulStranger: '1', bronzeArrows: '1' }
      const p = bowman(over)
      expect(p).toMatchObject({ starWatk: BRONZE_ARROW.watk, starRecharge: BRONZE_ARROW.pricePerArrow })
      expect(toCharacter(p).watk).toBe(40)
      expect(totalAttack({ ...DEFAULT_PROFILE, clawWatk: '39', ...over }, 'bowman')).toBe(40)
      expect(BRONZE_ARROW).toMatchObject({ watk: 1, pricePerArrow: 2 })
    })

    it('laat de pijlkeuze een Thief niet raken', () => {
      const r = parseProfile({ ...DEFAULT_PROFILE, helpfulStranger: '1', bronzeArrows: '1' })
      expect('profile' in r && r.profile).toMatchObject({ starWatk: SUBI.watk, starRecharge: SUBI.rechargePerStar })
    })

    it('bewaart de keuze, en een oud profiel zonder deze velden laadt als uit', () => {
      const storage = fakeStorage()
      saveProfile(storage, { ...DEFAULT_PROFILE, helpfulStranger: '1', bronzeArrows: '1' })
      expect(loadProfile(storage)).toMatchObject({ helpfulStranger: '1', bronzeArrows: '1' })
      const old = fakeStorage({ [PROFILE_KEY]: JSON.stringify({ version: 1, fields: { luk: '60' } }) })
      expect(loadProfile(old)).toMatchObject({ luk: '60', helpfulStranger: '0', bronzeArrows: '0' })
    })
  })

  it('negeert een oude bewaarde attack: die is geen veld meer (#82)', () => {
    const raw = JSON.stringify({ version: 1, fields: { luk: '60', attack: '99' } })
    expect('attack' in loadProfile(fakeStorage({ [PROFILE_KEY]: raw }))).toBe(false)
  })

  it('geeft een bewaard profiel van vóór de info-velden (#82) blanco: niets beweert wat de speler niet invulde', () => {
    const raw = JSON.stringify({ version: 1, fields: { luk: '60' } })
    expect(loadProfile(fakeStorage({ [PROFILE_KEY]: raw }))).toMatchObject({ luk: '60', magic: '', magicDef: '', critRate: '', critDamage: '', speed: '', jump: '' })
  })

  it('houdt een bewaarde 0 bij een info-veld (#82)', () => {
    const raw = JSON.stringify({ version: 1, fields: { magicDef: '0', jump: '100' } })
    expect(loadProfile(fakeStorage({ [PROFILE_KEY]: raw }))).toMatchObject({ magicDef: '0', jump: '100', magic: '' })
  })

  it('laat een leeg of fout info-veld de berekening niet blokkeren (#82)', () => {
    const base = parseProfile(DEFAULT_PROFILE)
    const r = parseProfile({ ...DEFAULT_PROFILE, speed: 'x', critRate: '500', jump: '300', magic: '', magicDef: '  ' })
    expect('profile' in r).toBe(true)
    if ('profile' in r && 'profile' in base) {
      expect(r.profile).toEqual(base.profile)
      for (const k of ['magic', 'magicDef', 'critRate', 'critDamage', 'speed', 'jump'] as const) expect(Number.isFinite(r.profile[k]), k).toBe(true)
      expect(toCharacter(r.profile)).toEqual(toCharacter(base.profile))
    }
    expect('error' in parseProfile({ ...DEFAULT_PROFILE, accuracy: '' })).toBe(true)
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
  it('toont voor de Thief elk veld, in dezelfde volgorde', () => {
    expect(profileFieldsFor('thief')).toEqual(PROFILE_FIELDS)
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
    expect(parseW({ level: '50', preciseStrikes: '15', slashBlast: '20', ironBody: '20', maxHpIncrease: '15', improvedHpRecovery: '15' })).toHaveProperty('profile')
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

  it('geeft mainStatOf STR voor een Warrior, DEX voor een Bowman en LUK voor een Thief', () => {
    const w = parseW()
    const t = parseProfile(warriorDraft, 'thief')
    const b = parseProfile(warriorDraft, 'bowman')
    if (!('profile' in w) || !('profile' in t) || !('profile' in b)) throw new Error('profiel ongeldig')
    expect(mainStatOf(w.profile)).toBe(132)
    expect(mainStatOf(t.profile)).toBe(4)
    expect(mainStatOf(b.profile)).toBe(b.profile.dex)
    // Bij een Bowman staat DEX voorop in wat hij tekortkomt, STR erna.
    expect(shortfall({ str: b.profile.str + 1, dex: b.profile.dex + 2 }, b.profile)).toEqual([{ stat: 'dex', amount: 2 }, { stat: 'str', amount: 1 }])
  })

  it('noemt met shortfall per stat wat je tekortkomt, de hoofdstat eerst, en laat een stat die je haalt weg (issue #69)', () => {
    const w = parseW()
    const t = parseProfile(warriorDraft, 'thief')
    if (!('profile' in w) || !('profile' in t)) throw new Error('profiel ongeldig')
    // Warrior: STR 132, DEX 30. Dezelfde eis geeft STR eerst; DEX haalt hij.
    expect(shortfall({ dex: 140, str: 140 }, w.profile)).toEqual([{ stat: 'str', amount: 8 }, { stat: 'dex', amount: 110 }])
    expect(shortfall({ str: 132, dex: 30 }, w.profile)).toEqual([])
    // Thief: LUK 4 eerst, dan de rest in vaste volgorde.
    expect(shortfall({ str: 140, luk: 10, dex: 31 }, t.profile)).toEqual([{ stat: 'luk', amount: 6 }, { stat: 'str', amount: 8 }, { stat: 'dex', amount: 1 }])
    // Een stat die het item niet noemt, vraagt niets; een INT-eis leest je INT (standaard 4, #82).
    expect(shortfall({}, t.profile)).toEqual([])
    expect(shortfall({ int: 20 }, t.profile)).toEqual([{ stat: 'int', amount: 16 }])
    expect(shortfall({ int: 20 }, { ...t.profile, int: 20 })).toEqual([])
  })
})

describe('skillpunten per level (issue #136)', () => {
  const warrior = (over: Partial<ProfileDraft>) => parseProfile({ ...DEFAULT_PROFILE, luckySeven: '0', level: '30', str: '132', ...over }, 'warrior')
  const keyOf = (r: unknown) => (r as { key: string }).key

  it('laat precies het maximum aan 1e-jobpunten toe, en meldt er één meer', () => {
    // Level 11: 4 punten.
    expect(parse({ level: '11', luckySeven: '4' })).toHaveProperty('profile')
    expect(parse({ level: '11', luckySeven: '3', nimbleBody: '1' })).toHaveProperty('profile')
    const r = parse({ level: '11', luckySeven: '4', nimbleBody: '1' })
    expect(r).toMatchObject({ error: 'Je hebt 5 skillpunten in de skills van je 1e job gezet, maar op level 11 heb je er slechts 4.' })
    expect(['nimbleBody', 'keenEyes', 'doubleStab', 'disorder', 'darkSight', 'luckySeven']).toContain(keyOf(r))
  })

  it('meldt op level 10 een tweede punt van de 1e job, op een skill van de 1e job', () => {
    const r = parse({ level: '10', luckySeven: '2' })
    expect(r).toMatchObject({ error: 'Je hebt 2 skillpunten in de skills van je 1e job gezet, maar op level 10 heb je er slechts 1.' })
    expect(isSkillKey(keyOf(r))).toBe(true)
  })

  it('laat precies het maximum aan Beginner-punten toe, en meldt er één meer', () => {
    // Level 5: 4 punten.
    expect(parse({ level: '5', threeSnails: '3', nimbleFeet: '1', luckySeven: '0' })).toHaveProperty('profile')
    const r = parse({ level: '5', threeSnails: '3', nimbleFeet: '2', luckySeven: '0' })
    expect(r).toMatchObject({ error: 'Je hebt 5 skillpunten in de Beginner-skills gezet, maar op level 5 heb je er slechts 4.' })
    expect(['threeSnails', 'nimbleFeet', 'recovery']).toContain(keyOf(r))
  })

  it('geeft op level 10 geen Beginner-fout bij 9 punten, en op level 1 bij 1 punt wel', () => {
    expect(parse({ level: '10', threeSnails: '3', nimbleFeet: '3', recovery: '3', luckySeven: '1' })).toHaveProperty('profile')
    expect(parse({ level: '1', threeSnails: '1', luckySeven: '0' })).toMatchObject({ error: expect.stringContaining('op level 1 heb je er slechts 0') })
  })

  it('houdt de twee potten gescheiden: een volle Beginner-pot neemt niets van de 1e job af', () => {
    expect(parse({ level: '10', threeSnails: '3', nimbleFeet: '3', recovery: '3', luckySeven: '1' })).toHaveProperty('profile')
  })

  it('geeft bij een Warrior op level 30 met 61 punten geen fout, en met 62 een fout op een Warrior-skill', () => {
    // 20 + 20 + 20 + 1 = 61
    expect(warrior({ powerStrike: '20', slashBlast: '20', ironBody: '20', maxHpIncrease: '1' })).toHaveProperty('profile')
    const r = warrior({ powerStrike: '20', slashBlast: '20', ironBody: '20', maxHpIncrease: '2' })
    expect(r).toMatchObject({ error: 'Je hebt 62 skillpunten in de skills van je 1e job gezet, maar op level 30 heb je er slechts 61.' })
    expect(['powerStrike', 'slashBlast', 'preciseStrikes', 'ironBody', 'maxHpIncrease', 'improvedHpRecovery']).toContain(keyOf(r))
  })

  it('meldt bij een Warrior een Beginner-overschrijding op een Beginner-skill', () => {
    const r = warrior({ level: '5', threeSnails: '3', nimbleFeet: '2', powerStrike: '0' })
    expect(r).toMatchObject({ error: 'Je hebt 5 skillpunten in de Beginner-skills gezet, maar op level 5 heb je er slechts 4.' })
    expect(['threeSnails', 'nimbleFeet', 'recovery']).toContain(keyOf(r))
  })

  it('telt velden die de job niet toont niet mee: Thief-skills van een Warrior en andersom', () => {
    expect(warrior({ level: '10', powerStrike: '1', luckySeven: '20', nimbleBody: '20' })).toHaveProperty('profile')
    expect(parse({ level: '10', luckySeven: '1', powerStrike: '20' })).toHaveProperty('profile')
  })
})

describe('skillPointsSpent en skillPointsLeft (issue #136)', () => {
  const p = (over: Partial<ProfileDraft>) => {
    const r = parseProfile({ ...DEFAULT_PROFILE, luckySeven: '0', ...over })
    if (!('profile' in r)) throw new Error(r.error)
    return r.profile
  }

  it('telt per pot alleen de skills die de job toont', () => {
    const profile = { ...p({ level: '30', luckySeven: '5', nimbleBody: '3', threeSnails: '2', recovery: '1' }), powerStrike: 9 }
    expect(skillPointsSpent(profile, 'thief', 'job')).toBe(8)
    expect(skillPointsSpent(profile, 'thief', 'beginner')).toBe(3)
    // Voor een Warrior tellen Lucky Seven en Nimble Body niet; Power Strike wel.
    expect(skillPointsSpent(profile, 'warrior', 'job')).toBe(9)
  })

  it('geeft wat er nog over is per pot', () => {
    const profile = p({ level: '11', luckySeven: '3', threeSnails: '2' })
    expect(skillPointsLeft(profile, 'job')).toBe(1)
    expect(skillPointsLeft(profile, 'beginner')).toBe(7)
  })

  it('geeft 0 als de pot precies vol is', () => {
    expect(skillPointsLeft(p({ level: '10', luckySeven: '1' }), 'job')).toBe(0)
  })

  it('komt nooit onder 0, ook niet als er meer staat dan het level geeft', () => {
    expect(skillPointsLeft({ ...p({ level: '30' }), level: 10, luckySeven: 20 }, 'job')).toBe(0)
  })
})

describe('base AP en extra AP van items (Dave, 4 oktober 2026)', () => {
  const draft: ProfileDraft = { ...DEFAULT_PROFILE, str: '4', dex: '25', int: '4', luk: '37', strExtra: '2', dexExtra: '5', intExtra: '0', lukExtra: '3' }

  it('telt in het profiel de extra AP op bij de base AP: daar rekent de app mee', () => {
    const parsed = parseProfile(draft)
    expect('profile' in parsed && parsed.profile).toMatchObject({ str: 6, dex: 30, int: 4, luk: 40 })
    expect('profile' in parsed && toCharacter(parsed.profile)).toMatchObject({ str: 6, dex: 30, luk: 40 })
  })

  it('telt de extra AP mee voor de eisen van een item', () => {
    const parsed = parseProfile(draft)
    if (!('profile' in parsed)) throw new Error(parsed.error)
    expect(shortfall({ dex: 30 }, parsed.profile)).toEqual([])
    expect(shortfall({ dex: 31 }, parsed.profile)).toEqual([{ stat: 'dex', amount: 1 }])
  })

  it('geeft het totaal uit het concept, en leeg bij items telt als 0', () => {
    expect(draftStatTotal(draft, 'dex')).toBe(30)
    expect(draftStatTotal({ ...draft, dexExtra: '' }, 'dex')).toBe(25)
    expect(draftStatTotal({ ...draft, dex: 'abc' }, 'dex')).toBeNull()
  })

  it('telt alleen de base AP bij wat je op je level hebt verdeeld', () => {
    expect(baseApSpent(draft)).toBe(70)
  })

  it('weigert een extra AP buiten 0 tot 999, met de naam van de stat', () => {
    expect(parseProfile({ ...draft, lukExtra: '1000' })).toEqual({ error: '"Extra LUK" moet tussen 0 en 999 liggen.', key: 'lukExtra' })
  })
})
