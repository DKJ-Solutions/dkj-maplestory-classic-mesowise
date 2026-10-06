// De Magician in het model en de adviezen (issue #43, stap 2): wat de Magician anders doet dan de Thief en de Warrior,
// naast de tests van die twee (die ongewijzigd blijven). De getallen zijn met de hand uit de gegevens van
// data/magician.ts nagerekend, niet uit de code onder test. De formule zelf staat in calc/mobModel.test.ts (spellAttack).
import { describe, expect, it } from 'vitest'
import { armorUpgradeAdvice } from './armorUpgrade'
import { ASSUMPTIONS, estimateMob, spellAttack } from './calc/mobModel'
import { clawUpgradeAdvice, withClaw } from './clawUpgrade'
import { NPC_ARMOR } from './data/armor'
import { NPC_CLAWS } from './data/claws'
import {
  ENERGY_BOLT_LEVELS,
  MAGIC_CLAW_HITS,
  MAGIC_CLAW_LEVELS,
  MAGICIAN_MP_POTIONS,
  NPC_MAGICIAN_ARMOR,
  NPC_MAGICIAN_WEAPONS,
  SPELL_CAST_MS,
} from './data/magician'
import { ALL_SKILLS, isSkillKey, MAGICIAN_SKILLS, mpPerUse, THIEF_SKILLS } from './data/skills'
import { findKnownSpot, mobDraft } from './data/spots'
import { mobGroup } from './testing/mobGroup'
import { NPC_WARRIOR_WEAPONS } from './data/warrior'
import { COMMON_WORN_ARMOR } from './data/wornItems'
import { WORN_WARRIOR_ARMOR } from './data/wornWarrior'
import {
  applyEquipChange,
  catalogItems,
  databaseStat,
  equipmentForJob,
  loadEquipment,
  slotsFor,
  statName,
  wornMdef,
  wornStat,
  type EquipEntry,
} from './equipment'
import { expectedStat } from './expectedStats'
import { isComputed } from './job'
import { applyLevelUp, applySkillPoint } from './levelUp'
import { MAGICIAN_ARMOR, MAGICIAN_WEAPONS, WORN_MAGICIAN_ARMOR } from './magicianGear'
import { bestExpPerMeso } from './mesoCostAt'
import {
  DEFAULT_PROFILE,
  DRAFT_FIELDS,
  loadProfile,
  mainStatOf,
  parseProfile,
  profileFieldsFor,
  saveProfile,
  statFieldsFor,
  toCharacter,
  type Profile,
  type ProfileDraft,
} from './profile'
import { NOT_MODELLED, notModelled, skillPointAdvice, skillsOf } from './skillPoint'
import { newDraft, type SpotDraft } from './spotDraft'
import { energyBoltAt, hourPlan, magicClawAt, MAGICIAN_MP_POTION, MP_POTION, mpPotionFor, pickMonster, potionFactorOf, resolveSpot, suggestMonsters } from './suggest'

const mDraft: ProfileDraft = {
  ...DEFAULT_PROFILE,
  level: '30',
  hp: '1000',
  int: '100',
  dex: '20',
  luk: '30',
  lukExtra: '0',
  clawWatk: '55',
  accuracy: '80',
  avoid: '20',
  wdef: '100',
  energyBolt: '20',
  magicClaw: '0',
}
const parseM = (over: Partial<ProfileDraft> = {}): Profile => {
  const r = parseProfile({ ...mDraft, ...over }, 'magician')
  if (!('profile' in r)) throw new Error(`Magician-profiel ongeldig: ${r.error}`)
  return r.profile
}
const magician = parseM()

const mixedMobs = mobGroup('Snail', 'Blue Snail', 'Red Snail', 'Stump', 'Dark Stump', 'Green Mushroom', 'Axe Stump', 'Dark Axe Stump')
const own = (id: string, expPerHour: number, potions: number): SpotDraft => ({ ...newDraft(id), name: id, expPerHour: String(expPerHour), potions: String(potions) })
const drafts = [{ ...mobDraft('Ribbon Pig')!, id: 'a' }, own('b', 1_000, 10_000)]
const epm = (p: Profile) => {
  const v = bestExpPerMeso(drafts, p, ASSUMPTIONS)
  if (v === undefined) throw new Error('geen beste plek')
  return v
}

const shop = (name: string): EquipEntry => ({ pick: name, name: '', stat: '' })
const unknown: EquipEntry = { pick: 'unknown', name: '', stat: '' }

describe('de Magician rekent', () => {
  it('is een job die de app doorrekent', () => {
    expect(isComputed('magician')).toBe(true)
  })
})

describe('magicianGear: de winkelgegevens in de vorm van de Thief-lijsten', () => {
  it('zet bij een wapen de M.ATT in watk, met INT en LUK in hun eigen stat en de vaste cast van 810 ms', () => {
    const mithril = MAGICIAN_WEAPONS.find((w) => w.name === 'Mithril Wand')!
    // Mithril Wand (item 653): level 30, INT 60, LUK 20, M.ATT 55, 22.000 meso.
    expect(mithril).toMatchObject({ level: 30, watk: 55, int: 60, luk: 20, price: 22_000, speed: { attackMs: 810 } })
    expect(mithril.mult).toBeUndefined()
    expect(MAGICIAN_WEAPONS.map((w) => w.name)).toEqual(NPC_MAGICIAN_WEAPONS.map((w) => w.name))
    for (const w of MAGICIAN_WEAPONS) expect(w.speed.attackMs, w.name).toBe(SPELL_CAST_MS.normal)
  })

  it('geeft een staff zijn M.ATT, niet zijn W.ATT (Wizard Staff: M.ATT 45, W.ATT 35)', () => {
    expect(NPC_MAGICIAN_WEAPONS.find((w) => w.name === 'Wizard Staff')).toMatchObject({ watk: 35, matk: 45 })
    expect(MAGICIAN_WEAPONS.find((w) => w.name === 'Wizard Staff')).toMatchObject({ watk: 45, int: 50, luk: 20 })
  })

  it('zet bij armor INT in int en LUK in luk, en neemt alleen de WDEF mee', () => {
    // Wizardry Hat (item 768): level 20, INT 30, LUK 10, WDEF 12 (MDEF 14).
    expect(MAGICIAN_ARMOR.find((a) => a.name === 'Wizardry Hat')).toMatchObject({ slot: 'hat', level: 20, int: 30, luk: 10, wdef: 12, price: 3_600 })
    expect(MAGICIAN_ARMOR).toHaveLength(NPC_MAGICIAN_ARMOR.length)
    expect(new Set(MAGICIAN_ARMOR.map((a) => a.slot))).toEqual(new Set(['hat', 'top', 'bottom', 'overall', 'shoes']))
  })

  it('heeft items zonder prijs: de items zonder jobregel, dezelfde objecten als bij de Thief, zonder wat de Magician in de winkel koopt', () => {
    expect(WORN_MAGICIAN_ARMOR.length).toBeGreaterThan(0)
    for (const a of WORN_MAGICIAN_ARMOR) expect(COMMON_WORN_ARMOR).toContain(a)
    const npc = new Set(NPC_MAGICIAN_ARMOR.map((a) => a.name))
    for (const a of WORN_MAGICIAN_ARMOR) expect(npc.has(a.name), a.name).toBe(false)
    expect(WORN_MAGICIAN_ARMOR.map((a) => a.name)).toContain('Blue Sauna Robe')
  })
})

describe('profiel: de velden van een Magician', () => {
  it('toont de stats van het statvenster met de M.ATT van het wapen, en geen tijd per aanval, multiplier of stars', () => {
    const keys = profileFieldsFor('magician').map((f) => f.key)
    // Dezelfde stats en volgorde als de Warrior (kaarten Ability points en Total stats, #82), zonder de tijd per aanval.
    expect(keys.slice(0, 5)).toEqual(['level', 'hp', 'str', 'dex', 'int'])
    expect(keys).toContain('luk')
    for (const k of ['attackMs', 'weaponMult', 'starWatk', 'starRecharge']) expect(keys, k).not.toContain(k)
    // De extra AP van items staat niet als eigen stat op de kaart: die staat in de popup van zijn stat.
    expect(statFieldsFor('magician').map((f) => f.key)).toEqual(keys.filter((k) => !isSkillKey(k) && !k.endsWith('Extra')))
  })

  it('noemt het wapenveld M.ATT en niet ATT', () => {
    expect(profileFieldsFor('magician').find((f) => f.key === 'clawWatk')!.label).toBe('M.ATT van je wapen')
  })

  it('heeft de Beginner-skills en de zes skills van de 1e job van een Magician, en geen skills van een Thief of Warrior', () => {
    const keys = profileFieldsFor('magician').map((f) => f.key).filter(isSkillKey)
    expect(keys.sort()).toEqual(
      [...THIEF_SKILLS.filter((s) => s.job === 'Beginner'), ...MAGICIAN_SKILLS].map((s) => s.key).sort(),
    )
    expect(MAGICIAN_SKILLS).toHaveLength(6)
  })

  it('deelt het INT-veld met de andere jobs en geeft hen de Magician-skills niet', () => {
    for (const j of ['thief', 'warrior', 'bowman'] as const) {
      const keys = profileFieldsFor(j).map((f) => f.key)
      expect(keys, j).toContain('int')
      expect(keys, j).not.toContain('energyBolt')
    }
    expect(DRAFT_FIELDS.filter((f) => f.key === 'int')).toHaveLength(1)
  })

  it('valideert voor een Magician INT en zijn skills, en voor een andere job niet', () => {
    expect(parseProfile({ ...mDraft, int: '' }, 'magician')).toMatchObject({ key: 'int' })
    expect(parseProfile({ ...mDraft, int: '1000' }, 'magician')).toMatchObject({ key: 'int' })
    expect(parseProfile({ ...mDraft, energyBolt: '21' }, 'magician')).toMatchObject({ key: 'energyBolt' })
    expect(parseProfile({ ...mDraft, magicClaw: 'x' }, 'magician')).toMatchObject({ key: 'magicClaw' })
    // De Magician-skills telt een andere job niet mee.
    for (const j of ['thief', 'warrior'] as const) expect(parseProfile({ ...mDraft, energyBolt: '99' }, j), j).toHaveProperty('profile')
  })

  it('valideert voor een Magician geen tijd per aanval, multiplier of Thief- en Warrior-skills', () => {
    const r = parseProfile({ ...mDraft, attackMs: 'x', weaponMult: '', luckySeven: '99', powerStrike: 'x' }, 'magician')
    expect(r).toHaveProperty('profile')
    expect('profile' in r && r.profile.luckySeven).toBe(Number(DEFAULT_PROFILE.luckySeven))
  })

  it('meldt een fout in het wapenveld met M.ATT', () => {
    const r = parseProfile({ ...mDraft, clawWatk: '' }, 'magician')
    expect(r).toEqual({ error: 'Vul bij je karakter "M.ATT van je wapen" in.', key: 'clawWatk' })
  })

  it('geeft het voorbeeldprofiel Energy Bolt 1 en de rest van de Magician-skills op 0', () => {
    expect(DEFAULT_PROFILE).toMatchObject({ energyBolt: '1', magicClaw: '0', magicGuard: '0', magicArmor: '0', improvedMpRecovery: '0', maxMpIncrease: '0' })
  })

  it('bewaart en laadt INT en de Magician-skills', () => {
    const data = new Map<string, string>()
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) } as Storage
    expect(saveProfile(storage, { ...mDraft, int: '77', magicClaw: '3' })).toBe(true)
    expect(loadProfile(storage)).toMatchObject({ int: '77', magicClaw: '3', energyBolt: '20' })
  })

  it('toCharacter: de M.ATT van het wapen is matk (geen watk), INT telt mee en een cast duurt 810 ms, wat er ook in de tijd-per-aanval staat', () => {
    const c = toCharacter(parseM({ attackMs: '999', starWatk: '15' }))
    expect(c).toMatchObject({ int: 100, matk: 55, watk: 0, attackMs: 810, level: 30, luk: 30, dex: 20 })
    // Een Warrior en een Thief hebben geen matk.
    const w = parseProfile({ ...mDraft, str: '10' }, 'warrior')
    if (!('profile' in w)) throw new Error('ongeldig')
    expect(toCharacter(w.profile)).toMatchObject({ matk: 0, watk: 55, attackMs: Number(DEFAULT_PROFILE.attackMs) })
  })

  it('mainStatOf is INT voor een Magician; de Thief houdt LUK', () => {
    expect(mainStatOf(magician)).toBe(100)
    const t = parseProfile(DEFAULT_PROFILE, 'thief')
    if (!('profile' in t)) throw new Error('ongeldig')
    expect(mainStatOf(t.profile)).toBe(t.profile.luk)
  })
})

describe('expectedStat voor een Magician', () => {
  it('rekent de accuracy uit INT, level en LUK: floor((1,2 x 100 + 2 x 30 + 0,6 x 30) / 5,1 + 20) = 58', () => {
    // 12 x 100 + 20 x 30 + 6 x 30 + 1020 = 3000; 3000 / 51 = 58,8.
    expect(expectedStat('accuracy', mDraft, 'magician')).toBe(58)
  })

  it('rekent de avoid zoals bij elke job: floor(30 / 3) + floor(20 / 6) + 5 = 18', () => {
    expect(expectedStat('avoid', mDraft, 'magician')).toBe(18)
  })

  it('geeft geen bonus voor een skill (de Magician heeft in de 1e job geen accuracy-passief) en kijkt niet naar STR en DEX voor accuracy', () => {
    expect(expectedStat('accuracy', { ...mDraft, nimbleBody: '15', preciseStrikes: '15', str: '999' }, 'magician')).toBe(58)
    expect(expectedStat('accuracy', { ...mDraft, dex: '999' }, 'magician')).toBe(58)
  })

  it('heeft geen verwachting als INT geen geheel getal is, of voor een andere stat', () => {
    expect(expectedStat('accuracy', { ...mDraft, int: '' }, 'magician')).toBeUndefined()
    expect(expectedStat('accuracy', { ...mDraft, int: '1.5' }, 'magician')).toBeUndefined()
    expect(expectedStat('int', mDraft, 'magician')).toBeUndefined()
  })
})

describe('Magician: applyLevelUp', () => {
  const m: ProfileDraft = { ...mDraft, level: '10', hp: '444' }

  it('geeft +16 HP per level (de Beginner en de Magician hebben dezelfde HP per level) en laat INT, DEX, LUK en STR staan', () => {
    for (const level of ['9', '10', '50']) {
      const out = applyLevelUp({ ...m, level }, 'magician')
      expect(out.level).toBe(String(Number(level) + 1))
      expect(out.hp, level).toBe('460')
      for (const k of ['int', 'dex', 'luk', 'str'] as const) expect(out[k], `${level} ${k}`).toBe(m[k])
    }
  })

  it('past de accuracy aan met het verschil van het stat-deel: INT 100, LUK 30, level 30 → 31: 58 → 59, dus +1', () => {
    // 12 x 100 + 20 x 31 + 6 x 30 + 1020 = 3020; 3020 / 51 = 59,2.
    expect(applyLevelUp({ ...m, level: '30', accuracy: '80' }, 'magician').accuracy).toBe('81')
  })

  it('laat de accuracy staan als INT of LUK geen geheel getal is', () => {
    expect(applyLevelUp({ ...m, int: '', accuracy: '80' }, 'magician').accuracy).toBe('80')
    expect(applyLevelUp({ ...m, luk: 'x', accuracy: '80' }, 'magician').accuracy).toBe('80')
  })

  it('geeft de MP per cast van Energy Bolt en Magic Claw (0 op level 0)', () => {
    expect([0, 1, 5, 20].map((l) => mpPerUse('energyBolt', l))).toEqual([0, 8, 9, 16])
    expect([0, 1, 5, 20].map((l) => mpPerUse('magicClaw', l))).toEqual([0, 10, 11, 20])
  })

  it('zet met applySkillPoint een punt in Energy Bolt en laat de rest staan', () => {
    const out = applySkillPoint({ ...mDraft, energyBolt: '3' }, 'energyBolt', 'magician')
    expect(out).toEqual({ ...mDraft, energyBolt: '4' })
  })
})

describe('Magician: de spreuken en het voorstel', () => {
  it('geeft Energy Bolt en Magic Claw zoals de skillpagina, niet geïnterpoleerd, null op level 0 en geklemd boven 20', () => {
    expect(energyBoltAt(1)).toEqual({ level: 1, mp: 8, damagePct: 90, mastery: 1 })
    expect(energyBoltAt(20)).toEqual({ level: 20, mp: 16, damagePct: 130, mastery: 10 })
    expect(magicClawAt(1)).toEqual({ level: 1, mp: 10, damagePct: 45, mastery: 1 })
    expect(magicClawAt(20)).toEqual({ level: 20, mp: 20, damagePct: 65, mastery: 10 })
    expect(energyBoltAt(0)).toBeNull()
    expect(magicClawAt(0)).toBeNull()
    expect(energyBoltAt(25)).toEqual(energyBoltAt(20))
    expect(ENERGY_BOLT_LEVELS).toHaveLength(20)
    expect(MAGIC_CLAW_LEVELS).toHaveLength(20)
  })

  it('rekent met Energy Bolt op het gezette level: de aanval van spellAttack, één klap, geen munitie', () => {
    const c = toCharacter(magician)
    const attack = spellAttack(c, energyBoltAt(20)!, 1)
    for (const s of suggestMonsters(magician, mixedMobs)) {
      expect(s.estimate).toEqual(estimateMob(c, attack, s.monster))
      expect(s.estimate.starsPerKill).toBe(s.estimate.attacksToKill)
      expect(s.rechargePerStar).toBe(0)
    }
  })

  /** De EXP per meso aan potions van één spreuk op één monster, via hourPlan (niet via de keuze in suggestMonsters). */
  const epmOf = (p: Profile, spell: 'bolt' | 'claw', monster: (typeof mixedMobs.monsters)[number]) => {
    const c = toCharacter(p)
    const attack = spell === 'bolt' ? spellAttack(c, energyBoltAt(p.energyBolt)!, 1) : spellAttack(c, magicClawAt(p.magicClaw)!, MAGIC_CLAW_HITS)
    const estimate = estimateMob(c, attack, monster)
    const s = { monster, estimate, expPerHour: monster.expPerKill * estimate.killsPerHour, rechargePerStar: 0, mpPotion: MAGICIAN_MP_POTION, buffMpPerHour: 0, potionFactor: potionFactorOf(p) }
    const plan = hourPlan(s, estimate.killsPerHour)
    return { estimate, epm: plan.potions > 0 ? plan.expPerHour / plan.potions : Infinity }
  }

  it('kiest per monster de spreuk met de meeste EXP per meso aan potions, voor elke combinatie van levels', () => {
    for (const [eb, mc] of [[1, 20], [20, 1], [10, 10], [19, 20], [20, 19], [5, 3]]) {
      const p = parseM({ energyBolt: String(eb), magicClaw: String(mc) })
      for (const s of suggestMonsters(p, mixedMobs)) {
        const bolt = epmOf(p, 'bolt', s.monster)
        const claw = epmOf(p, 'claw', s.monster)
        const want = claw.epm > bolt.epm ? claw : bolt
        expect(s.estimate, `${eb}/${mc} ${s.monster.name}`).toEqual(want.estimate)
      }
    }
  })

  it('casts Magic Claw (2 klappen, 20 MP) waar die goedkoper in potions is dan Energy Bolt, en anders Energy Bolt (1 klap)', () => {
    const p = parseM({ energyBolt: '1', magicClaw: '20' })
    for (const s of suggestMonsters(p, mixedMobs)) {
      const claw = s.estimate.starsPerKill === s.estimate.attacksToKill * 2
      expect(s.estimate.mpPerKill, s.monster.name).toBe(s.estimate.attacksToKill * (claw ? 20 : 8))
    }
  })

  it('heeft geen voorstel zonder spreuk: de gewone wand-aanval staat niet in de gegevens', () => {
    expect(suggestMonsters(parseM({ energyBolt: '0', magicClaw: '0' }), mixedMobs)).toEqual([])
    expect(pickMonster([], undefined)).toBeUndefined()
  })

  it('rekent met de M.ATT van het wapen en niet met zijn weapon attack: dezelfde Magician met meer M.ATT haalt minder klappen per kill', () => {
    const low = suggestMonsters(parseM({ clawWatk: '10' }), mixedMobs).reduce((n, s) => n + s.estimate.attacksToKill, 0)
    const high = suggestMonsters(parseM({ clawWatk: '100' }), mixedMobs).reduce((n, s) => n + s.estimate.attacksToKill, 0)
    expect(high).toBeLessThan(low)
  })

  it('negeert de tijd-per-aanval in het profiel: een cast duurt 810 ms', () => {
    const a = suggestMonsters(parseM({ attackMs: '100' }), mixedMobs).map((s) => s.expPerHour)
    const b = suggestMonsters(parseM({ attackMs: '5000' }), mixedMobs).map((s) => s.expPerHour)
    expect(a).toEqual(b)
    expect(SPELL_CAST_MS.normal).toBe(810)
  })

  it('gebruikt de raakkans uit de accuracy van het profiel, zoals de andere jobs', () => {
    const lo = suggestMonsters(parseM({ accuracy: '1' }), mixedMobs)
    const hi = suggestMonsters(parseM({ accuracy: '999' }), mixedMobs)
    for (const m of mixedMobs.monsters) {
      const a = lo.find((s) => s.monster.name === m.name)!.estimate.hitChance
      const b = hi.find((s) => s.monster.name === m.name)!.estimate.hitChance
      expect(b, m.name).toBeGreaterThanOrEqual(a)
    }
    expect(Math.min(...lo.map((s) => s.estimate.hitChance))).toBeLessThan(1)
  })

  it('rekent de MP-potion van een Magician aan de Orange (50 MP voor 50 meso), niet aan de Blue', () => {
    expect(MAGICIAN_MP_POTION).toBe(MAGICIAN_MP_POTIONS[0])
    expect(MAGICIAN_MP_POTION).toMatchObject({ name: 'Orange', mp: 50, price: 50 })
    expect(mpPotionFor('magician')).toBe(MAGICIAN_MP_POTION)
    expect(mpPotionFor('thief')).toBe(MP_POTION)
    expect(mpPotionFor('warrior')).toBe(MP_POTION)
    // De Lemon kost evenveel per MP als de Orange (1 meso per MP), de Blue Potion meer (1,1).
    for (const p of MAGICIAN_MP_POTIONS) expect(p.price / p.mp).toBe(1)
  })

  it('telt de MP van de spreuk mee: MP per kill = casts · 16, en het kost Orange-potions van 50 MP à 50 meso', () => {
    const s = suggestMonsters(magician, mixedMobs)[0]
    expect(s.mpPotion).toBe(MAGICIAN_MP_POTION)
    expect(s.estimate.mpPerKill).toBe(s.estimate.attacksToKill * 16)
    const plan = hourPlan(s, 100)
    expect(plan.mpPotionsPerHour).toBeCloseTo((100 * s.estimate.mpPerKill) / 50, 9)
    expect(plan.mpPotionsPerHour).toBeGreaterThan(0)
    expect(plan.potions).toBeCloseTo(plan.hpPotionsPerHour * 150 + plan.mpPotionsPerHour * 50, 9)
  })

  it('heeft geen munitiekosten', () => {
    const s = suggestMonsters(magician, mixedMobs)[0]
    expect(hourPlan(s, 100).ammo).toBe(0)
    expect(hourPlan(s, 12_345).ammo).toBe(0)
  })

  it('laat de Thief en de Warrior zonder Magician-spullen: dezelfde Blue Potion voor MP, en de Thief laadt nog steeds stars', () => {
    const t = parseProfile(DEFAULT_PROFILE)
    if (!('profile' in t)) throw new Error('ongeldig')
    const s = suggestMonsters(t.profile, mixedMobs)[0]
    expect(s.mpPotion).toBe(MP_POTION)
    expect(s.rechargePerStar).toBe(0.3)
  })

  it('vult bij resolveSpot de munitie met 0 en de potions met het voorstel, en laat de reiskosten en een ingevulde munitie staan', () => {
    const chosen = { ...mobDraft('Ribbon Pig')!, id: 'a', travel: '100' }
    const known = findKnownSpot('mob:Ribbon Pig')!
    const s = pickMonster(suggestMonsters(magician, known), undefined)!
    const plan = hourPlan(s, s.estimate.killsPerHour)
    const spot = resolveSpot(chosen, known, magician)
    expect(spot.cost).toEqual({ potions: plan.potions, ammo: 0, travel: 100 })
    expect(spot.cost.potions).toBeGreaterThan(0)
    expect(resolveSpot({ ...chosen, ammo: '55' }, known, magician).cost.ammo).toBe(55)
  })

  it('laat bij een Magician zonder spreuk een bekende plek zoals de speler hem invulde (geen voorstel)', () => {
    const known = findKnownSpot('mob:Ribbon Pig')!
    const chosen = { ...mobDraft('Ribbon Pig')!, id: 'a', expPerHour: '500' }
    expect(resolveSpot(chosen, known, parseM({ energyBolt: '0' })).expPerHour).toBe(500)
  })
})

describe('Magician: skillpunten', () => {
  it('rekent Energy Bolt, Magic Claw, Improved MP Recovery en Magic Armor door en geeft de Magician geen skill van een andere job', () => {
    expect(skillsOf('magician').map((s) => s.id)).toEqual(['energyBolt', 'magicClaw', 'improvedMpRecovery', 'magicArmor'])
    expect(skillsOf('magician').map((s) => s.max)).toEqual([20, 20, 15, 20])
  })

  it('zet bij Improved MP Recovery één level erbij en laat de rest staan (#141)', () => {
    const mr = skillsOf('magician').find((s) => s.id === 'improvedMpRecovery')!
    expect(mr.plusOne(magician)).toEqual({ ...magician, improvedMpRecovery: 1 })
  })

  it('laat een punt in Improved MP Recovery de mesokosten zakken: een Magician drinkt MP-potions voor elke spreuk (#141)', () => {
    const advice = skillPointAdvice(drafts, parseM({ energyBolt: '5', magicClaw: '0' }))
    if (advice.kind !== 'advice') throw new Error('geen advies')
    expect(advice.choices.find((c) => c.id === 'improvedMpRecovery')!.saving!).toBeGreaterThan(0)
  })

  it('zet bij Energy Bolt één level erbij en laat de rest staan', () => {
    const [bolt, claw] = skillsOf('magician')
    expect(bolt.plusOne(magician)).toEqual({ ...magician, energyBolt: 21 })
    expect(claw.plusOne(magician)).toEqual({ ...magician, magicClaw: 1 })
  })

  it('noemt de twee andere skills van de 1e job onder "niet doorgerekend", en elke 1e-job-skill staat in precies één van de twee', () => {
    expect(notModelled('magician')).toEqual(['Magic Guard', 'Max MP Increase'])
    expect(notModelled('thief')).toBe(NOT_MODELLED)
    const modelled = skillsOf('magician').map((s) => s.name)
    expect([...modelled, ...notModelled('magician')].sort()).toEqual(MAGICIAN_SKILLS.map((s) => s.name).sort())
  })

  it('biedt Magic Claw pas aan als Energy Bolt minstens level 1 heeft (de skillpagina: "Vraagt Energy Bolt 1")', () => {
    const [, claw] = skillsOf('magician')
    expect(claw.learnable!({ ...magician, energyBolt: 0, magicClaw: 0 })).toBe(false)
    expect(claw.learnable!({ ...magician, energyBolt: 1, magicClaw: 0 })).toBe(true)
    // Wie Magic Claw al heeft, kan hem altijd verder zetten.
    expect(claw.learnable!({ ...magician, energyBolt: 0, magicClaw: 4 })).toBe(true)
  })

  it('rekent per spreuk de mesokosten met één punt erbij, en de besparing tegen de kosten zonder', () => {
    const p = parseM({ energyBolt: '5', magicClaw: '0' })
    const advice = skillPointAdvice(drafts, p)
    if (advice.kind !== 'advice') throw new Error('geen advies')
    expect(advice.choices.map((c) => c.id).sort()).toEqual(['energyBolt', 'improvedMpRecovery', 'magicClaw'])
    for (const c of advice.choices) {
      const skill = skillsOf('magician').find((s) => s.id === c.id)!
      expect(c.to).toBe(skill.level(p) + 1)
      expect(c.saving).toBeCloseTo(advice.base - c.meso!, 6)
    }
    expect(advice.winner).toBe(advice.choices[0].saving! > 0 ? advice.choices[0].id : null)
  })

  it('geeft Magic Claw niet als keuze zolang Energy Bolt op 0 staat (je kunt hem dan niet leren), en dan is Energy Bolt het enige punt', () => {
    // Zonder spreuk is er geen voorstel voor de bekende plek; het eerste punt in Energy Bolt maakt hem weer bruikbaar.
    const advice = skillPointAdvice(drafts, parseM({ energyBolt: '0', magicClaw: '0' }))
    if (advice.kind !== 'advice') throw new Error('geen advies')
    // Improved MP Recovery mag wel, maar zonder spreuk drinkt de Magician geen MP-potions: dat punt bespaart niets.
    expect(advice.choices.map((c) => c.id)).not.toContain('magicClaw')
    expect(advice.choices[0].id).toBe('energyBolt')
    expect(advice.winner).toBe('energyBolt')
    expect(advice.choices[0].saving!).toBeGreaterThan(0)
  })

  it('heeft zonder enige plek om mee te rekenen geen advies', () => {
    expect(skillPointAdvice([], parseM())).toEqual({ kind: 'none' })
    expect(skillPointAdvice(drafts, null)).toEqual({ kind: 'none' })
  })

  it('slaat een spreuk op het maximum over en noemt hem bij naam; beide op het maximum geeft niets te kiezen', () => {
    const one = skillPointAdvice(drafts, parseM({ energyBolt: '20', magicClaw: '3' }))
    expect(one).toMatchObject({ kind: 'advice', maxed: ['Energy Bolt'] })
    if (one.kind === 'advice') expect(one.choices.map((c) => c.id).sort()).toEqual(['improvedMpRecovery', 'magicClaw'])
    expect(skillPointAdvice(drafts, parseM({ energyBolt: '20', magicClaw: '20', improvedMpRecovery: '15' }))).toMatchObject({
      kind: 'advice',
      choices: [],
      winner: null,
      maxed: ['Energy Bolt', 'Magic Claw', 'Improved MP Recovery'],
    })
  })

  it('kent de skills aan de app toe: elke Magician-skill is een skill-veld van het profiel', () => {
    for (const s of MAGICIAN_SKILLS) {
      expect(isSkillKey(s.key), s.key).toBe(true)
      expect(ALL_SKILLS).toContain(s)
      expect(s.source.url).toMatch(/^https:\/\/meowdb\.com\/msclassic\/skills\/magician\/[a-z-]+$/)
    }
  })
})

// EXP tot het volgende level, met de hand uit de tabel overgenomen, los van expToNextLevel.
const EXP_AT: Record<number, number> = {
  10: 1_716, 11: 2_360, 12: 3_216, 13: 4_200, 14: 5_460, 15: 7_050, 16: 8_840, 17: 11_040, 18: 13_716, 19: 16_680,
  20: 20_216, 21: 24_402, 22: 28_980, 23: 34_320, 24: 40_512, 25: 47_216, 26: 54_900, 27: 63_666, 28: 73_080, 29: 83_720, 30: 95_700,
}
const expSum = (from: number, to: number) => {
  let sum = 0
  for (let l = from; l <= to; l++) sum += EXP_AT[l]
  return sum
}

describe('Magician-wapens: de winkel', () => {
  const advice = (p: Profile) => {
    const a = clawUpgradeAdvice(drafts, p)
    if (a.kind !== 'advice') throw new Error('advies verwacht')
    return a
  }
  /** Een Magician met stats ruim genoeg voor elk item. */
  const strong = (over: Partial<Profile> = {}): Profile => ({ ...parseM({ int: '200', luk: '200', clawWatk: '0' }), ...over })

  it('rekent met de wands en staffs van de Magician en nooit met Thief-claws of Warrior-wapens', () => {
    const a = advice(strong({ level: 30 }))
    const all = [...a.choices.map((c) => c.claw), ...a.notWearable.map((u) => u.claw)]
    expect(all.length).toBeGreaterThan(0)
    for (const c of all) {
      expect(MAGICIAN_WEAPONS, c.name).toContain(c)
      expect(NPC_CLAWS.map((x) => x.name), c.name).not.toContain(c.name)
      expect(NPC_WARRIOR_WEAPONS.map((x) => x.name), c.name).not.toContain(c.name)
    }
  })

  it('geeft alleen wapens waar je level voor volstaat en die meer M.ATT geven dan het jouwe', () => {
    for (const level of [10, 15, 20, 25, 30]) {
      for (const current of [0, 27, 41]) {
        const a = advice(strong({ level, clawWatk: current }))
        for (const c of a.choices) {
          expect(c.claw.level, `${c.claw.name} lv ${level}`).toBeLessThanOrEqual(level)
          expect(c.claw.watk, `${c.claw.name} tegen ${current}`).toBeGreaterThan(current)
        }
      }
    }
  })

  it('laat een staff met minder M.ATT dan je wand weg (Wooden Staff 24 tegen Wooden Wand 27), ook al heeft hij meer weapon attack', () => {
    const wand = NPC_MAGICIAN_WEAPONS.find((w) => w.name === 'Wooden Wand')!
    const staff = NPC_MAGICIAN_WEAPONS.find((w) => w.name === 'Wooden Staff')!
    expect(staff.matk).toBeLessThan(wand.matk)
    expect(staff.watk).toBeGreaterThan(wand.watk)
    const a = advice(strong({ level: 10, clawWatk: wand.matk }))
    expect(a.choices.map((c) => c.claw.name)).not.toContain('Wooden Staff')
  })

  it('laat de horizon lopen tot net vóór de volgende wand of staff met meer M.ATT (Hardwood Wand 34 op lv 15 tot en met lv 19, want Metal Wand 41 komt op lv 20)', () => {
    const a = advice(strong({ level: 15, clawWatk: 0 }))
    const hardwood = a.choices.find((c) => c.claw.name === 'Hardwood Wand')!
    expect(hardwood).toMatchObject({ from: 15, to: 19, truncated: false })
    // Het verschil in kosten over de horizon: de EXP van lv 15 t/m 19 gedeeld door de EXP per meso zonder en met de wand.
    const sum = expSum(15, 19)
    const p = strong({ level: 15, clawWatk: 0 })
    expect(hardwood.saving).toBeCloseTo(sum / epm(p) - sum / epm(withClaw(p, hardwood.claw)), 6)
    expect(hardwood.net).toBeCloseTo(hardwood.saving! - 5_000, 6)
  })

  it('zet een wapen zonder genoeg INT of LUK bij de niet-draagbare, met het tekort in INT en LUK', () => {
    // Mithril Wand (lv 30) vraagt INT 60 en LUK 20. Met INT 50 en LUK 5 ontbreken 10 INT en 15 LUK.
    const a = advice(strong({ level: 30, int: 50, luk: 5, clawWatk: 0 }))
    const mithril = a.notWearable.find((u) => u.claw.name === 'Mithril Wand')
    expect(mithril).toEqual({ claw: MAGICIAN_WEAPONS.find((w) => w.name === 'Mithril Wand'), needs: [{ stat: 'int', amount: 10 }, { stat: 'luk', amount: 15 }] })
    expect(a.choices.map((c) => c.claw.name)).not.toContain('Mithril Wand')
  })

  it('kijkt bij een Magician niet naar STR en DEX: een hoge DEX of STR maakt een INT- of LUK-tekort niet goed', () => {
    const a = advice(strong({ level: 30, int: 50, luk: 5, dex: 999, str: 999, clawWatk: 0 }))
    expect(a.notWearable.find((u) => u.claw.name === 'Mithril Wand')).toMatchObject({ needs: [{ stat: 'int', amount: 10 }, { stat: 'luk', amount: 15 }] })
  })

  it('draagt een wapen bij precies genoeg INT en LUK (Mithril Wand 60/20), en niet bij één INT of LUK te weinig', () => {
    const exact = advice(strong({ level: 30, int: 60, luk: 20, clawWatk: 0 }))
    expect(exact.notWearable.find((u) => u.claw.name === 'Mithril Wand')).toBeUndefined()
    expect(exact.choices.map((c) => c.claw.name)).toContain('Mithril Wand')
    expect(advice(strong({ level: 30, int: 59, luk: 20, clawWatk: 0 })).notWearable.find((u) => u.claw.name === 'Mithril Wand')).toMatchObject({ needs: [{ stat: 'int', amount: 1 }] })
    expect(advice(strong({ level: 30, int: 60, luk: 19, clawWatk: 0 })).notWearable.find((u) => u.claw.name === 'Mithril Wand')).toMatchObject({ needs: [{ stat: 'luk', amount: 1 }] })
  })

  it('zet met withClaw de M.ATT in het profiel en laat de weapon multiplier staan', () => {
    const mithril = MAGICIAN_WEAPONS.find((w) => w.name === 'Mithril Wand')!
    const p = withClaw(magician, mithril)
    expect(p).toMatchObject({ clawWatk: 55, attackMs: 810, weaponMult: magician.weaponMult })
  })

  it('geeft een Thief nog steeds de Thief-claws', () => {
    const t = parseProfile(DEFAULT_PROFILE)
    if (!('profile' in t)) throw new Error('ongeldig')
    const a = clawUpgradeAdvice(drafts, { ...t.profile, level: 30, luk: 200, dex: 200 })
    if (a.kind !== 'advice') throw new Error('advies verwacht')
    for (const c of a.choices) expect(NPC_CLAWS).toContain(c.claw)
  })
})

describe('Magician-armor: de winkel', () => {
  const advice = (p: Profile, worn = {}) => {
    const a = armorUpgradeAdvice(drafts, p, worn)
    if (a.kind !== 'advice') throw new Error('advies verwacht')
    return a
  }
  const strong = (over: Partial<Profile> = {}): Profile => ({ ...parseM({ int: '200', luk: '200' }), ...over })

  it('rekent met de armor van de Magician (hats, tops, bottoms, shoes) en nooit met Thief-armor', () => {
    const a = advice(strong({ level: 30 }))
    expect(a.choices.length).toBeGreaterThan(0)
    for (const c of a.choices) for (const piece of [c.armor, c.with ?? c.armor]) expect(MAGICIAN_ARMOR, piece.name).toContain(piece)
    // Een Magician-stuk dat ook bij de Thief staat (White Bandana, Red Baseball Cap) is hetzelfde item.
    for (const m of MAGICIAN_ARMOR) {
      const t = NPC_ARMOR.find((x) => x.name === m.name)
      if (t) expect([t.slot, t.level, t.wdef, t.price], m.name).toEqual([m.slot, m.level, m.wdef, m.price])
    }
    // Eén keuze per slot, en het paar top + bottom (#87, er is een overall) als eigen keuze.
    expect(new Set(a.choices.map((c) => (c.with ? 'pair' : c.armor.slot))).size).toBe(a.choices.length)
  })

  it('geeft alleen stukken waar je level voor volstaat en die meer WDEF geven dan wat je draagt', () => {
    const a = advice(strong({ level: 20 }), { hat: 10, top: 15 })
    for (const c of a.choices) {
      expect(c.armor.level).toBeLessThanOrEqual(20)
      expect(c.armor.wdef).toBeGreaterThan(c.replaces ?? -1)
    }
  })

  it('zet een stuk zonder genoeg INT of LUK bij de niet-draagbare, met het tekort aan INT en LUK', () => {
    // INT 25 en LUK 5 op level 25: de Wind Shoes (lv 25, INT 40, LUK 15) zijn de beste schoenen en mist 15 INT en 10 LUK.
    const a = advice(strong({ level: 25, int: 25, luk: 5 }))
    expect(a.notWearable.length).toBeGreaterThan(0)
    for (const u of a.notWearable) {
      const need = (stat: 'int' | 'luk') => u.needs.find((n) => n.stat === stat)?.amount ?? 0
      expect(need('int'), u.armor.name).toBe(Math.max(0, (u.armor.int ?? 0) - 25))
      expect(need('luk'), u.armor.name).toBe(Math.max(0, (u.armor.luk ?? 0) - 5))
      expect(u.needs.length, u.armor.name).toBeGreaterThan(0)
    }
    expect(a.notWearable.find((u) => u.armor.name === 'Wind Shoes')).toMatchObject({ needs: [{ stat: 'int', amount: 15 }, { stat: 'luk', amount: 10 }] })
  })

  it('kijkt bij een Magician niet naar DEX: een hoge DEX maakt een LUK-tekort niet goed', () => {
    const a = advice(strong({ level: 25, int: 25, luk: 5, dex: 999 }))
    expect(a.notWearable.find((u) => u.armor.name === 'Wind Shoes')).toMatchObject({ needs: [{ stat: 'int', amount: 15 }, { stat: 'luk', amount: 10 }] })
  })

  it('geeft een stuk dat meer INT vraagt dan je hebt niet als winnaar', () => {
    const a = advice(strong({ level: 30, int: 5, luk: 200 }))
    for (const c of a.choices) expect(c.armor.luk, c.armor.name).toBeLessThanOrEqual(5)
  })
})

describe('Magician: equipment', () => {
  it('heeft geen ammo-slot, wel Weapon, Shield, Hat, Top, Bottom, Overall, Shoes, Gloves, Cape en Earrings', () => {
    expect(slotsFor('magician').map((s) => s.slot)).toEqual(['claw', 'shield', 'hat', 'top', 'bottom', 'overall', 'shoes', 'gloves', 'cape', 'earrings'])
    expect(catalogItems('ammo', 'magician')).toEqual([])
  })

  it('geeft bij Weapon de wands en staffs met M.ATT als stat en een vaste 810 ms, zonder multiplier', () => {
    const items = catalogItems('claw', 'magician')
    expect(items.map((i) => i.name)).toEqual(NPC_MAGICIAN_WEAPONS.map((w) => w.name))
    expect(items.find((i) => i.name === 'Mithril Wand')).toEqual({ name: 'Mithril Wand', level: 30, stat: 55, attackMs: 810 })
    expect(items.find((i) => i.name === 'Wooden Staff')).toEqual({ name: 'Wooden Staff', level: 10, stat: 24, attackMs: 810 })
    for (const i of items) expect(i.mult, i.name).toBeUndefined()
  })

  it('geeft bij Hat, Top, Bottom en Shoes de armor van de Magician met WDEF als stat, dan de items zonder prijs', () => {
    for (const slot of ['hat', 'top', 'bottom', 'shoes'] as const) {
      const names = catalogItems(slot, 'magician').map((i) => i.name)
      expect(names, slot).toEqual([...NPC_MAGICIAN_ARMOR, ...WORN_MAGICIAN_ARMOR].filter((a) => a.slot === slot).map((a) => a.name))
      expect(names.length, slot).toBeGreaterThan(0)
    }
    expect(catalogItems('hat', 'magician').find((i) => i.name === 'Wizardry Hat')).toEqual({ name: 'Wizardry Hat', level: 20, stat: 12, mdef: 14 })
    // Doros Robe / Doroness Robe (#76) is zijn eigen overall; de Sauna Robe heeft geen jobregel en geldt voor elke klas.
    expect(catalogItems('overall', 'magician').map((i) => i.name)).toEqual(['Doros Robe / Doroness Robe', 'Blue Sauna Robe'])
  })

  it('telt de MDEF van de Magician-armor op voor de Magic Def (#91): Wizardry Hat 14, Doros Robe 49, Wind Shoes 9', () => {
    const pick = (name: string): EquipEntry => ({ pick: name, name: '', stat: '' })
    const eq = { ...equipmentForJob(loadEquipment(undefined, 'magician'), 'magician'), hat: pick('Wizardry Hat'), overall: pick('Doros Robe / Doroness Robe'), shoes: pick('Wind Shoes') }
    expect(wornMdef(eq, 'magician')).toBe(14 + 49 + 9)
  })

  it('heeft geen dubbele namen in een lijst, geen wapennaam die ook bij de Thief of Warrior staat, en dezelfde stats bij een gedeelde armornaam', () => {
    const slots = ['claw', 'hat', 'top', 'bottom', 'overall', 'shoes'] as const
    const all = slots.flatMap((s) => catalogItems(s, 'magician').map((i) => i.name))
    expect(new Set(all).size).toBe(all.length)
    const claws = new Set([...catalogItems('claw', 'thief'), ...catalogItems('claw', 'warrior')].map((i) => i.name))
    for (const c of catalogItems('claw', 'magician')) expect(claws.has(c.name), c.name).toBe(false)
    for (const s of slots.filter((x) => x !== 'claw')) {
      for (const j of ['thief', 'warrior'] as const) {
        const other = catalogItems(s, j)
        for (const m of catalogItems(s, 'magician')) {
          const o = other.find((i) => i.name === m.name)
          if (o) expect(o, `${s} ${j} ${m.name}`).toEqual(m)
        }
      }
    }
    // De items zonder jobregel zijn dezelfde rijen als bij de Warrior.
    for (const a of WORN_WARRIOR_ARMOR.filter((x) => COMMON_WORN_ARMOR.includes(x))) {
      const inMage = catalogItems(a.slot, 'magician').find((i) => i.name === a.name)
      if (inMage) expect(inMage.stat).toBe(a.wdef)
    }
  })

  it('geeft wornStat en databaseStat van een wapen zijn M.ATT', () => {
    expect(wornStat('claw', shop('Mithril Wand'))).toBe(55)
    expect(databaseStat('claw', shop('Wizard Staff'))).toBe(45)
    expect(wornStat('hat', shop('Wizardry Hat'))).toBe(12)
  })

  it('noemt de wapenstat M.ATT bij een Magician en ATT bij de andere jobs; armor blijft DEF', () => {
    expect(statName('claw', 'magician')).toBe('M.ATT')
    expect(statName('claw', 'warrior')).toBe('ATT')
    expect(statName('claw', 'thief')).toBe('ATT')
    expect(statName('claw')).toBe('ATT')
    expect(statName('hat', 'magician')).toBe('DEF')
  })

  it('zet bij een wand de M.ATT in clawWatk en 810 ms in de aanvalstijd, en laat de rest van het profiel staan', () => {
    const p = { ...mDraft, attackMs: '750', weaponMult: '2.6' }
    const out = applyEquipChange(p, 'claw', unknown, shop('Mithril Wand'))
    expect(out).toEqual({ ...p, clawWatk: '55', attackMs: '810' })
  })

  it('telt bij Magician-armor alleen het verschil in WDEF (Apprentice Hat 8 naar Moon Conehat 10: +2)', () => {
    expect(applyEquipChange({ ...mDraft, wdef: '60' }, 'hat', shop('Apprentice Hat'), shop('Moon Conehat')).wdef).toBe('62')
  })

  it('zet bij een wissel van Warrior naar Magician elk Warrior-wapen en elke Warrior-hat op "nog niet ingevuld", en houdt een Magician-keuze bij een Magician', () => {
    const warriorGear = { ...loadEquipment(null, 'warrior'), claw: shop('Gladius'), hat: shop('Bronze Full Helm') }
    const out = equipmentForJob(warriorGear, 'magician')
    expect(out.claw).toEqual(unknown)
    expect(out.hat).toEqual(unknown)
    const mageGear = { ...loadEquipment(null, 'magician'), claw: shop('Mithril Wand'), hat: shop('Wizardry Hat') }
    expect(equipmentForJob(mageGear, 'magician')).toEqual(mageGear)
    expect(equipmentForJob(mageGear, 'thief').claw).toEqual(unknown)
    expect(equipmentForJob(mageGear, 'thief').hat).toEqual(unknown)
  })

  it('laadt een bewaarde Magician-keuze voor een Magician en niet voor een Warrior', () => {
    const storage = {
      getItem: () => JSON.stringify({ version: 1, slots: { claw: { pick: 'Mithril Wand' }, hat: { pick: 'Wizardry Hat' } } }),
    } as unknown as Storage
    expect(loadEquipment(storage, 'magician').claw).toEqual(shop('Mithril Wand'))
    expect(loadEquipment(storage, 'warrior').claw).toEqual(unknown)
  })
})

describe('Magician: de keuze tussen Energy Bolt en Magic Claw, de randen', () => {
  const hand = (p: Profile) => toCharacter(p)
  const mpPerCast = (p: Profile) => {
    const s = suggestMonsters(p, mixedMobs)[0]
    return { attacks: s.estimate.attacksToKill, mpPerCast: s.estimate.mpPerKill / s.estimate.attacksToKill, stars: s.estimate.starsPerKill / s.estimate.attacksToKill }
  }

  it('rekent de hele keten met de hand: INT 100, M.ATT 55, Energy Bolt 20 geeft per cast 256,62 tot 273 en 16 MP, 1 klap', () => {
    // MagicTotal = 50 + 55 = 105; max = 1,3 · 105 · 2 = 273; min = 1,3 · 105 · (1 + 100 · 0,88 / 100) = 256,62.
    const by = { min: 256.62, max: 273, stars: 1, mpPerAttack: 16, magic: true as const }
    const c = hand(magician)
    for (const s of suggestMonsters(magician, mixedMobs)) {
      const e = estimateMob(c, by, s.monster)
      expect(s.estimate.attacksToKill, s.monster.name).toBe(e.attacksToKill)
      expect(s.estimate.mpPerKill, s.monster.name).toBe(e.mpPerKill)
      expect(s.estimate.killsPerHour, s.monster.name).toBeCloseTo(e.killsPerHour, 6)
    }
  })

  it('kiest bij gelijke schade per cast (Energy Bolt 20: 130% tegen Magic Claw 20: 2 x 65%) Energy Bolt, de goedkopere in MP (16 tegen 20)', () => {
    const r = mpPerCast(parseM({ energyBolt: '20', magicClaw: '20' }))
    expect(r).toMatchObject({ mpPerCast: 16, stars: 1 })
  })

  it('negeert Magic Claw als Energy Bolt op 0 staat (je kunt hem dan niet leren, ook als een opgeslagen profiel hem heeft): geen voorstel', () => {
    expect(suggestMonsters(parseM({ energyBolt: '0', magicClaw: '5' }), mixedMobs)).toEqual([])
    expect(suggestMonsters(parseM({ energyBolt: '1', magicClaw: '5' }), mixedMobs).length).toBeGreaterThan(0)
  })

  it('geeft bij INT 0 en M.ATT 0 wel een voorstel (de schade is dan 0, dus minimaal 1 per klap) in plaats van te crashen', () => {
    // Het profiel laat INT niet onder 4 (het minimum van elke stat); het model zelf moet INT 0 nog steeds aankunnen.
    const p = { ...parseM({ clawWatk: '0' }), int: 0 }
    const out = suggestMonsters(p, mixedMobs)
    expect(out.length).toBeGreaterThan(0)
    for (const s of out) {
      expect(Number.isFinite(s.estimate.killsPerHour), s.monster.name).toBe(true)
      expect(s.estimate.attacksToKill, s.monster.name).toBeGreaterThan(0)
    }
  })

  it('geeft meer INT een hogere of gelijke schade per cast: de klappen per kill dalen nooit als INT stijgt', () => {
    let previous = Infinity
    for (const int of ['4', '5', '50', '99', '100', '500']) {
      const total = suggestMonsters(parseM({ int }), mixedMobs).reduce((n, s) => n + s.estimate.attacksToKill, 0)
      expect(total, `INT ${int}`).toBeLessThanOrEqual(previous)
      previous = total
    }
  })
})

describe('Magician-armor: de INT-eis op de grens', () => {
  const strong = (over: Partial<Profile> = {}): Profile => ({ ...parseM({ int: '200', luk: '200' }), ...over })
  const wind = (p: Profile) => {
    const a = armorUpgradeAdvice(drafts, p)
    if (a.kind !== 'advice') throw new Error('advies verwacht')
    return a
  }

  it('draagt de Wind Shoes (level 25, INT 40, LUK 15) bij precies INT 40 en LUK 15, en niet bij één INT of één LUK minder', () => {
    const ok = wind(strong({ level: 25, int: 40, luk: 15 }))
    expect(ok.notWearable.find((u) => u.armor.name === 'Wind Shoes')).toBeUndefined()
    expect(wind(strong({ level: 25, int: 39, luk: 15 })).notWearable.find((u) => u.armor.name === 'Wind Shoes')).toMatchObject({ needs: [{ stat: 'int', amount: 1 }] })
    expect(wind(strong({ level: 25, int: 40, luk: 14 })).notWearable.find((u) => u.armor.name === 'Wind Shoes')).toMatchObject({ needs: [{ stat: 'luk', amount: 1 }] })
  })
})
