// Het karakterprofiel (Thief, Warrior, Bowman en Magician): de invulvelden, het omzetten naar getallen en het
// bewaren in localStorage. Alles uit de opslag is onbetrouwbaar: wat niet klopt, valt terug op de
// standaardwaarde. Het voorbeeldprofiel is een lv-10-Thief volgens het levelplan.
import { arrowFor } from './bowmanGear'
import type { Character } from './calc/mobModel'
import { MAGIC_DAMAGE, SPELL_CAST_MS } from './data/magician'
import { BOWMAN_SKILLS, isSkillKey, MAGICIAN_SKILLS, skillInfo, THIEF_SKILLS, WARRIOR_SKILLS, type SkillInfo, type SkillKey } from './data/skills'
import { SKILL_POOL_NAME, skillPointCap, skillPoolOf, type SkillPool } from './data/skillPoints'
import { ATTACK_MS, SUBI } from './data/thief'
import type { Requires, Stat } from './data/types'
import { STAT_NAME, weaponStatName } from './equipment'
import type { Gender } from './gender'
import type { Job } from './job'

export const PROFILE_KEY = 'mesowise.profile.v1'
const VERSION = 1
const MAX_FIELD_LENGTH = 12

/** Een getalveld van het profiel, met zijn label en grenzen. */
export interface ProfileField {
  key: ProfileKey
  label: string
  min: number
  max: number
  integer: boolean
  /** Alleen ter info (het statvenster uit het spel): de berekening gebruikt het veld niet, dus een leeg of fout veld blokkeert haar niet. */
  informative?: boolean
}

/** De stats van het profiel, met hun label en grenzen. */
const STATS = [
  { key: 'level', label: 'Level', min: 1, max: 200, integer: true },
  { key: 'hp', label: 'Max HP', min: 1, max: 30_000, integer: true },
  { key: 'str', label: 'STR', min: 0, max: 999, integer: true },
  { key: 'dex', label: 'DEX', min: 0, max: 999, integer: true },
  { key: 'int', label: 'INT', min: 0, max: 999, integer: true },
  { key: 'luk', label: 'LUK', min: 0, max: 999, integer: true },
  { key: 'clawWatk', label: `${STAT_NAME.weapon} van je wapen`, min: 0, max: 999, integer: true },
  // Total stats, in de volgorde van het statvenster. Alleen ter info: magic, magic def, crit, speed en jump. De Attack is geen veld: hij volgt uit je ability points en je equipment (statWindowRange in suggest.ts).
  // W.ATT en M.ATT ook niet: ze volgen uit je equipment (totalAttack, totalMagicAttack).
  { key: 'wdef', label: STAT_NAME.armor, min: 0, max: 9_999, integer: true },
  { key: 'magic', label: 'Magic', min: 0, max: 9_999, integer: true, informative: true },
  { key: 'magicDef', label: 'Magic Def', min: 0, max: 9_999, integer: true, informative: true },
  { key: 'accuracy', label: 'Accuracy', min: 0, max: 999, integer: true },
  { key: 'avoid', label: 'Evasion', min: 0, max: 999, integer: true },
  { key: 'critRate', label: 'Crit. Rate (%)', min: 0, max: 100, integer: false, informative: true },
  { key: 'critDamage', label: 'Crit. Damage (%)', min: 0, max: 999, integer: false, informative: true },
  { key: 'speed', label: 'Speed (%)', min: 0, max: 200, integer: false, informative: true },
  { key: 'jump', label: 'Jump (%)', min: 0, max: 200, integer: false, informative: true },
  { key: 'attackMs', label: 'Tijd per aanval (ms)', min: 100, max: 5_000, integer: false },
] as const

/**
/**
 * De weapon multiplier van je wapen, alleen voor een Warrior (de Thief en de Bowman hebben de vaste waarden van hun aanval).
 * Een wapen uit de winkel vult hem in; kies je een ander wapen, dan staat hier wat je zelf invult.
 */
const WEAPON_MULT_FIELD = { key: 'weaponMult', label: 'Weapon multiplier van je wapen', min: 1, max: 5, integer: false } as const

/** De M.ATT van het wapen van een Magician: hetzelfde invulveld als de ATT van een claw (`clawWatk`), met de naam die een Magician in het spel ziet. */
const MAGICIAN_WEAPON_FIELD: ProfileField = { key: 'clawWatk', label: `${weaponStatName('magician')} van je wapen`, min: 0, max: 999, integer: true }

/**
 * Je stars (issue #65): hun weapon attack en wat het herladen per ster kost. Geen kaart toont ze; de star die je bij
 * je equipment kiest, vult ze (zie applyEquipChange). Zonder keuze rekent de app met Subi. Een Warrior gooit niets:
 * voor hem tellen ze niet mee (zie toCharacter en suggestMonsters). Een Bowman schiet pijlen: voor hem staan ze in deze
 * velden vast op zijn pijl (zie parseProfile), de weapon attack van de pijl en zijn prijs per stuk.
 */
const AMMO = [
  // Zo ruim als de claw: een eigen item in het star-slot kan elk getal tot 999 hebben, en een veld dat geen kaart
  // toont, mag de berekening niet blokkeren.
  { key: 'starWatk', label: `${STAT_NAME.weapon} van je stars`, min: 0, max: 999, integer: true },
  { key: 'starRecharge', label: 'Herladen per star (meso)', min: 0, max: 100, integer: false },
] as const

/**
 * De pijlkeuze van een Bowman (issue #64), als 0 of 1 in het concept zodat ze met het profiel worden bewaard: of hij
 * Helpful Stranger heeft (de schakelaar), en of de bronze pijl in zijn ammo-slot staat (de equipment zet dat, zie
 * equipment.ts). Een oud bewaard profiel zonder deze velden laadt als uit en gewone pijl. Geen invulvelden.
 */
const ARROW_CHOICE = [
  { key: 'helpfulStranger', label: 'Ik heb Helpful Stranger', min: 0, max: 1, integer: true },
  { key: 'bronzeArrows', label: 'Bronze pijlen gekozen', min: 0, max: 1, integer: true },
] as const

/** De gezette skillpunten: per skill van 0 (nog niet geleerd) tot het maximum uit de spelgegevens. */
const skillFields = (skills: readonly SkillInfo[]): readonly ProfileField[] =>
  skills.map((s) => ({ key: s.key, label: s.name, min: 0, max: s.max, integer: true }))
const SKILL_FIELDS = skillFields(THIEF_SKILLS)
const WARRIOR_SKILL_FIELDS = skillFields(WARRIOR_SKILLS)
const BOWMAN_SKILL_FIELDS = skillFields(BOWMAN_SKILLS)
const MAGICIAN_SKILL_FIELDS = skillFields(MAGICIAN_SKILLS)
const BEGINNER_SKILL_FIELDS = skillFields(THIEF_SKILLS.filter((s) => s.job === 'Beginner'))

export type ProfileKey = (typeof STATS)[number]['key'] | (typeof AMMO)[number]['key'] | (typeof ARROW_CHOICE)[number]['key'] | typeof WEAPON_MULT_FIELD.key | SkillKey

/** De stats van je karakter; je skills hebben hun eigen kaart. */
export const STAT_FIELDS: readonly ProfileField[] = STATS

/** De velden van je stars; ze komen uit je equipment. */
export const AMMO_FIELDS: readonly ProfileField[] = AMMO

/** De getalvelden van een Thief: eerst de stats, dan je stars, dan de skills. */
export const PROFILE_FIELDS: readonly ProfileField[] = [...STAT_FIELDS, ...AMMO_FIELDS, ...SKILL_FIELDS]

/** De getalvelden van een Warrior: dezelfde stats plus de weapon multiplier (zonder stars), en de Beginner-skills met die van zijn 1e job. */
const WARRIOR_FIELDS: readonly ProfileField[] = [
  ...STAT_FIELDS,
  WEAPON_MULT_FIELD,
  ...BEGINNER_SKILL_FIELDS,
  ...WARRIOR_SKILL_FIELDS,
]

/** De getalvelden van een Bowman: de stats (zonder weapon multiplier en zonder pijlen, die vastliggen) en de skills van zijn 1e job. */
const BOWMAN_FIELDS: readonly ProfileField[] = [...STAT_FIELDS, ...BEGINNER_SKILL_FIELDS, ...BOWMAN_SKILL_FIELDS]

/**
 * De getalvelden van een Magician: dezelfde stats als de Warrior, maar zonder tijd per aanval (een spreuk duurt vast 810 ms) en
 * met de M.ATT van het wapen in het wapenveld; zonder weapon multiplier en stars, met de Beginner-skills en die van zijn 1e job.
 */
const MAGICIAN_FIELDS: readonly ProfileField[] = [
  ...STAT_FIELDS.filter((f) => f.key !== 'attackMs').map((f) => (f.key === 'clawWatk' ? MAGICIAN_WEAPON_FIELD : f)),
  ...BEGINNER_SKILL_FIELDS,
  ...MAGICIAN_SKILL_FIELDS,
]

/** Elk veld dat een profiel bewaart, van elke job. */
export const DRAFT_FIELDS: readonly ProfileField[] = [...PROFILE_FIELDS, WEAPON_MULT_FIELD, ...ARROW_CHOICE, ...WARRIOR_SKILL_FIELDS, ...BOWMAN_SKILL_FIELDS, ...MAGICIAN_SKILL_FIELDS]
export type ProfileDraft = Record<ProfileKey, string>

/**
 * Een ingevuld profiel, als getallen, met de job waarvoor het geldt (die bepaalt welk model rekent) en het geslacht
 * (issue #55: bepaalt welke armor je kunt dragen; zonder telt alleen wat beide kunnen dragen).
 */
export type Profile = Record<ProfileKey, number> & { job: Job; gender?: Gender }

/**
 * De velden die een job invult: elke job heeft de skills van zijn eigen 1e job, de Beginner-skills heeft elke job.
 * Een Warrior heeft ook de weapon multiplier; een Bowman heeft geen stars en geen multiplier; een Magician heeft geen tijd per aanval (en ook geen stars of multiplier). De getypte waarden blijven in het concept staan, zodat een
 * terugwissel niets kwijt is; parseProfile valideert een veld dat deze job niet invult niet en vult het met de
 * standaardwaarde. Een job zonder eigen skills (nog niet doorgerekend) ziet alleen de Beginner-skills.
 */
export const profileFieldsFor = (job: Job): readonly ProfileField[] =>
  job === 'thief'
    ? PROFILE_FIELDS
    : job === 'warrior'
      ? WARRIOR_FIELDS
      : job === 'bowman'
        ? BOWMAN_FIELDS
        : job === 'magician'
          ? MAGICIAN_FIELDS
        : PROFILE_FIELDS.filter((f) => !isSkillKey(f.key) || skillInfo(f.key).job !== 'Thief')

/**
 * De velden onder "Ability points" op de kaart "Je karakter", zoals in het statvenster van het spel. Alle andere
 * stats vallen onder "Total stats". INT staat er wel, maar de app rekent er niet mee.
 */
export const ABILITY_KEYS: readonly ProfileKey[] = ['str', 'dex', 'int', 'luk']

/** De stats (zonder skills en zonder je stars, die uit je equipment komen) die een job invult, voor de kaart "Je karakter". */
export const statFieldsFor = (job: Job): readonly ProfileField[] => profileFieldsFor(job).filter((f) => !isSkillKey(f.key) && !AMMO_FIELDS.some((a) => a.key === f.key))

/** Een voorbeeld-Thief op lv 10 (de stats uit het model in issue #15); vul je eigen karakter in. */
export const DEFAULT_PROFILE: ProfileDraft = {
  level: '10',
  hp: '444',
  str: '4',
  dex: '25',
  int: '4',
  luk: '40',
  clawWatk: '10',
  accuracy: '33',
  avoid: '23',
  wdef: '72',
  // Alleen ter info: leeg tot je ze zelf invult, zodat de app niets beweert wat jij niet invulde. De berekening gebruikt ze niet.
  magic: '',
  magicDef: '',
  critRate: '',
  critDamage: '',
  speed: '',
  jump: '',
  attackMs: String(ATTACK_MS.fast5),
  starWatk: String(SUBI.watk),
  starRecharge: String(SUBI.rechargePerStar),
  threeSnails: '0',
  nimbleFeet: '0',
  recovery: '0',
  nimbleBody: '0',
  keenEyes: '0',
  doubleStab: '0',
  disorder: '0',
  darkSight: '0',
  luckySeven: '1',
  weaponMult: '1.8',
  helpfulStranger: '0',
  bronzeArrows: '0',
  improvedHpRecovery: '0',
  maxHpIncrease: '0',
  ironBody: '0',
  powerStrike: '0',
  slashBlast: '0',
  preciseStrikes: '0',
  arrowBlow: '0',
  doubleShot: '0',
  criticalShot: '0',
  eyeOfAmazon: '0',
  focus: '0',
  magicGuard: '0',
  magicArmor: '0',
  improvedMpRecovery: '0',
  maxMpIncrease: '0',
  energyBolt: '1',
  magicClaw: '0',
}

/**
 * Het profiel als getallen, of een melding in gewoon Nederlands bij het eerste veld dat niet klopt (alleen de
 * velden die deze job invult). `key` zegt welk veld, zodat het scherm de melding toont bij de kaart waar dat
 * veld staat.
 */
export function parseProfile(d: ProfileDraft, job: Job = 'thief', gender: Gender | null = null): { profile: Profile } | { error: string; key: ProfileKey } {
  const out = (gender ? { job, gender } : { job }) as Profile
  const shown = profileFieldsFor(job)
  for (const draftField of DRAFT_FIELDS) {
    // Het veld zoals deze job het toont: een Magician noemt zijn wapenveld anders (M.ATT).
    const f = shown.find((s) => s.key === draftField.key)
    if (!f) {
      // Een veld dat deze job niet invult, telt niet mee: de standaardwaarde, en het concept zelf blijft zoals getypt.
      out[draftField.key] = Number(DEFAULT_PROFILE[draftField.key])
      continue
    }
    const text = d[f.key].trim()
    const n = text === '' ? NaN : Number(text)
    const where = isSkillKey(f.key) ? 'Skillpoints' : 'je karakter'
    const error = !Number.isFinite(n)
      ? `Vul bij ${where} "${f.label}" in.`
      : n < f.min || n > f.max
        ? `"${f.label}" moet tussen ${f.min} en ${f.max} liggen.`
        : f.integer && !Number.isInteger(n)
          ? `"${f.label}" moet een heel getal zijn.`
          : null
    if (error === null) out[f.key] = n
    else if (f.informative) out[f.key] = 0 // staat niet in de berekening: leeg of fout blokkeert niets, en telt als 0
    else return { error, key: f.key }
  }
  // Een Bowman schiet zijn pijl (de gewone, of de bronze met Helpful Stranger), ook als er in het concept stars van een andere job staan (zie AMMO).
  if (job === 'bowman') {
    const arrow = bowmanArrow(d)
    out.starWatk = arrow.watk
    out.starRecharge = arrow.pricePerArrow
  }
  // Je zet niet meer skillpunten dan je op dit level verdiende (issue #136). Het level is hier al goedgekeurd.
  for (const pool of ['beginner', 'job'] as const) {
    const spent = skillPointsSpent(out, job, pool)
    const cap = skillPointCap(out.level, pool)
    if (spent > cap) {
      const key = shown.find((f) => isSkillKey(f.key) && skillPoolOf(skillInfo(f.key).job) === pool)!.key
      return { error: `Je hebt ${spent} skillpunten in de ${SKILL_POOL_NAME[pool]} gezet, maar op level ${out.level} heb je er slechts ${cap}.`, key }
    }
  }
  return { profile: out }
}

/** De skillpunten die in een pot zijn gezet, alleen in de skills die deze job toont. */
export const skillPointsSpent = (values: Partial<Record<ProfileKey, number>>, job: Job, pool: SkillPool): number =>
  profileFieldsFor(job).reduce((sum, f) => (isSkillKey(f.key) && skillPoolOf(skillInfo(f.key).job) === pool ? sum + (values[f.key] ?? 0) : sum), 0)

/** Hoeveel punten van een pot dit profiel nog te zetten heeft (nooit onder 0). */
export const skillPointsLeft = (p: Profile, pool: SkillPool): number => Math.max(0, skillPointCap(p.level, pool) - skillPointsSpent(p, p.job, pool))

/** De pijl van een Bowman uit het concept: bronze alleen met de schakelaar aan én de bronze pijl gekozen (zie ARROW_CHOICE). */
const bowmanArrow = (d: ProfileDraft) => arrowFor(d.helpfulStranger.trim() === '1', d.bronzeArrows.trim() === '1')

/** De weapon attack die telt: bij een Thief die van je claw plus die van je stars, bij een Bowman plus die van zijn pijlen; een Warrior gooit niets. */
const weaponAttack = (job: Job, clawWatk: number, starWatk: number): number => (job === 'warrior' ? clawWatk : clawWatk + starWatk)

const whole = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text) : null)

/**
 * De W.ATT uit het statvenster, uit je equipment: dezelfde weapon attack als de berekening gebruikt. Null als het
 * wapen (of bij een Thief de stars) niet is ingevuld. Andere gedragen items geven in het model geen attack.
 * Een Magician heeft 0: zijn wapen geeft M.ATT (totalMagicAttack); de kaart toont altijd beide (Dave, #100).
 */
export function totalAttack(d: ProfileDraft, job: Job): number | null {
  if (job === 'magician') return 0
  const claw = whole(d.clawWatk)
  // Een Bowman schiet zijn pijl, ook als er in het concept stars van een andere job staan (zie parseProfile).
  const stars = job === 'warrior' ? 0 : job === 'bowman' ? bowmanArrow(d).watk : whole(d.starWatk)
  return claw === null || stars === null ? null : weaponAttack(job, claw, stars)
}

/**
 * De M.ATT uit het statvenster: bij een Magician MagicTotal = floor(INT / 2) + de M.ATT van zijn wapen, zoals de
 * berekening die gebruikt; null als INT of het wapen niet is ingevuld. De andere jobs hebben 0 (Dave, #100).
 */
export function totalMagicAttack(d: ProfileDraft, job: Job): number | null {
  if (job !== 'magician') return 0
  const wand = whole(d.clawWatk)
  const int = whole(d.int)
  return wand === null || int === null ? null : Math.floor(int / MAGIC_DAMAGE.intPerMagicAttack) + wand
}

/**
 * Het profiel in de vorm van het mob-model: bij een Thief telt de weapon attack van je stars mee bij die van je claw, bij een Bowman die van zijn pijlen;
 * een Warrior gooit niets. Een Magician heeft in `clawWatk` de M.ATT van zijn wapen (`matk`, geen weapon attack) en een vaste cast van 810 ms.
 */
export function toCharacter(p: Profile): Character {
  const magician = p.job === 'magician'
  return {
    level: p.level,
    hp: p.hp,
    str: p.str,
    dex: p.dex,
    int: p.int,
    luk: p.luk,
    watk: magician ? 0 : weaponAttack(p.job, p.clawWatk, p.starWatk),
    matk: magician ? p.clawWatk : 0,
    accuracy: p.accuracy,
    avoid: p.avoid,
    wdef: p.wdef,
    attackMs: magician ? SPELL_CAST_MS.normal : p.attackMs,
  }
}

/** Het bewaarde profiel; een ontbrekend of onbruikbaar veld krijgt de standaardwaarde. */
export function loadProfile(storage: Storage | null | undefined): ProfileDraft {
  const out = { ...DEFAULT_PROFILE }
  try {
    const raw = storage?.getItem(PROFILE_KEY)
    if (!raw) return out
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null || (data as { version?: unknown }).version !== VERSION) return out
    const fields = (data as { fields?: unknown }).fields
    if (typeof fields !== 'object' || fields === null) return out
    for (const f of DRAFT_FIELDS) {
      const v = (fields as Record<string, unknown>)[f.key]
      if (typeof v === 'string') out[f.key] = v.slice(0, MAX_FIELD_LENGTH)
    }
    return out
  } catch {
    return out
  }
}

/** Bewaar het profiel zoals ingevuld; true als het gelukt is. Mislukken breekt de app niet. */
export function saveProfile(storage: Storage | null | undefined, d: ProfileDraft): boolean {
  try {
    if (!storage) return false
    const fields = Object.fromEntries(DRAFT_FIELDS.map((f) => [f.key, d[f.key].slice(0, MAX_FIELD_LENGTH)]))
    storage.setItem(PROFILE_KEY, JSON.stringify({ version: VERSION, fields }))
    return true
  } catch {
    return false
  }
}

/** De hoofdstat voor schade en wapen-eisen: STR voor een Warrior, DEX voor een Bowman, INT voor een Magician, LUK voor een Thief. */
const mainStatKey = (job: Job): Stat => (job === 'warrior' ? 'str' : job === 'bowman' ? 'dex' : job === 'magician' ? 'int' : 'luk')

/** Een stat van het profiel; INT is het veld onder Ability points (#82). */
const statOf = (p: Profile, s: Stat): number => p[s]

/** De waarde van de hoofdstat van dit profiel (zie mainStatKey). */
export const mainStatOf = (p: Profile): number => statOf(p, mainStatKey(p.job))

/** Hoeveel je in één stat tekortkomt voor een item. */
export interface StatNeed {
  stat: Stat
  amount: number
}

const REQUIREMENT_STATS: readonly Stat[] = ['str', 'dex', 'int', 'luk']

/**
 * Wat je tekortkomt voor de eisen van een item (issue #69): per stat waar je onder de eis zit, de hoofdstat van je
 * job eerst. Leeg betekent dat je het kunt dragen; een stat die het item niet noemt, vraagt niets.
 */
export function shortfall(reqs: Partial<Requires<Stat>>, p: Profile): StatNeed[] {
  const main = mainStatKey(p.job)
  return [main, ...REQUIREMENT_STATS.filter((s) => s !== main)]
    .map((stat) => ({ stat, amount: Math.max(0, (reqs[stat] ?? 0) - statOf(p, stat)) }))
    .filter((n) => n.amount > 0)
}
