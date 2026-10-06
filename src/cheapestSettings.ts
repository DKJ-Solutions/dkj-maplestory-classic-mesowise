// De knop "Goedkoopste instellingen" (Dave, 6 oktober 2026, #183): zet de gratis instellingen op wat dit level het goedkoopst
// maakt: mob, potions, skillpunten en base AP. Zelf kiest de berekening geen equipment: de invoer is al de equip van Advised (cheapestEquip.ts, advisedEquipment), met wat die in de winkel kost buiten deze module (#192).
// Puur, zonder UI-import; hergebruikt de adviezen van de app, het scherm toont alleen wat hier uitkomt.
import { autoFillAp, autoFillPatch } from './autoFillAp'
import { bestVerdict } from './best'
import { mobDraft } from './data/spots'
import type { Equipment } from './equipment'
import type { Gender } from './gender'
import type { Job } from './job'
import { levelCost } from './levelCost'
import { applySkillPoint } from './levelUp'
import { mobAdvice } from './mobAdvice'
import { parseProfile, type Profile, type ProfileDraft } from './profile'
import { pickPotion, potionAdvice, POTION_KINDS, resolvePotions, type PotionChoice } from './potions'
import { skillPointAdvice } from './skillPoint'
import type { SpotDraft } from './spotDraft'

/** Hoeveel keer alles achter elkaar wordt toegepast: de keuzes beïnvloeden elkaar (een andere mob maakt een andere skill de beste). */
export const MAX_ROUNDS = 5
/** Een vangnet voor de skillpunten binnen één ronde; de pot van een job is kleiner. */
const MAX_POINTS = 100

/** Wat de knop leest en schrijft. De equipment hoort er alleen bij als invoer: de base AP volgt uit wat je draagt. */
export interface CheapestInput {
  job: Job
  gender: Gender | null
  equipment: Equipment
  drafts: SpotDraft[]
  profileDraft: ProfileDraft
  potionChoice: PotionChoice
}

export type ChangeKind = 'mob' | 'hp' | 'mp' | 'skills' | 'ap'
export interface Change {
  kind: ChangeKind
  /** De regel voor het scherm: "A → B". */
  text: string
}

export interface CheapestResult {
  /** De nieuwe stand; wat niet veranderde is hetzelfde object als in de invoer. */
  drafts: SpotDraft[]
  profileDraft: ProfileDraft
  potionChoice: PotionChoice
  changes: Change[]
  /** De HP- en MP-potion van de nieuwe stand, zodat het scherm ook een potion kan noemen die niet veranderde. */
  potions: Record<'hp' | 'mp', string>
  /** Wat het level kostte voor en na (null: geen EXP, undefined: niet uit te rekenen). */
  costBefore: number | null | undefined
  costAfter: number | null | undefined
  /** Voor min na, alleen als beide een getal zijn; anders null. */
  saving: number | null
  /** Hoeveel rondes er iets veranderde. */
  rounds: number
  /** Of de laatste toegestane ronde nog iets veranderde: dan was er misschien nog meer te winnen. */
  capped: boolean
}

const STAT_LABEL = { str: 'STR', dex: 'DEX', int: 'INT', luk: 'LUK' } as const
const STATS = Object.keys(STAT_LABEL) as (keyof typeof STAT_LABEL)[]

/** Het profiel zoals de app het doorrekent: het concept, met de potions die je gebruikt. Null als het niet klopt. */
export function profileOf(s: CheapestInput): Profile | null {
  const parsed = parseProfile(s.profileDraft, s.job, s.gender)
  return 'profile' in parsed ? { ...parsed.profile, potions: resolvePotions(s.job, s.potionChoice) } : null
}

function costOf(s: CheapestInput): number | null | undefined {
  const profile = profileOf(s)
  const c = levelCost(profile, bestVerdict(s.drafts, profile))
  return c.kind === 'cost' ? c.meso : undefined
}

/**
 * De goedkoopste gratis instellingen voor dit level, in rondes tot er niets meer verandert (hoogstens MAX_ROUNDS). Elke ronde:
 * de mob uit mobAdvice, de potions uit potionAdvice, de skillpunten die nog te zetten zijn (elk het punt van skillPointAdvice,
 * dezelfde stap als "Punt zetten") en de base AP van Auto assign. Zonder profiel dat de app kan doorrekenen verandert er niets.
 */
export function cheapestSettings(input: CheapestInput): CheapestResult {
  const { job, equipment } = input
  let s = input
  const costBefore = costOf(input)
  const points = new Map<string, number>()
  const mobs: string[] = []
  let rounds = 0
  let capped = false
  // De goedkoopste stand na een ronde (of de beginstand): wordt een ronde duurder, dan blijft de knop daar niet in hangen.
  let best = { s, cost: costBefore, points: new Map(points), mobs: [...mobs] }

  while (rounds < MAX_ROUNDS) {
    let changed = false
    const profile = profileOf(s)
    if (!profile) break

    // De mob: mobAdvice heeft de vergelijking al gedaan; de beste staat erin, of je blijft.
    const mob = mobAdvice(s.drafts, profile)
    if (mob.kind === 'advice' && !mob.stay && mob.best !== null) {
      const next = mobDraft(mob.best)
      if (next) {
        if (mobs.length === 0) mobs.push(mob.hunted)
        mobs.push(mob.best)
        s = { ...s, drafts: [next] }
        changed = true
      }
    }

    // De potions: per soort de goedkopere, als er een is.
    const potions = potionAdvice(s.drafts, profileOf(s))
    if (potions.kind === 'advice') {
      const used = resolvePotions(job, s.potionChoice)
      let choice = s.potionChoice
      for (const kind of POTION_KINDS) {
        const better = potions.switchTo.find((p) => p[kind] > 0 && p.name !== used[kind].name)
        if (better) choice = pickPotion(choice, kind, better.name)
      }
      if (choice !== s.potionChoice) {
        s = { ...s, potionChoice: choice }
        changed = true
      }
    }

    // De skillpunten: elk punt in de skill die het meeste bespaart, tot de pot leeg is.
    for (let i = 0; i < MAX_POINTS; i++) {
      const advice = skillPointAdvice(s.drafts, profileOf(s))
      if (advice.kind !== 'advice' || advice.left <= 0 || advice.winner === null) break
      // Zonder gender: een punt raakt alleen de skillvelden en gender heeft op geen enkele skill invloed (net als bij "Punt zetten").
      const profileDraft = applySkillPoint(s.profileDraft, advice.winner, job)
      if (profileDraft === s.profileDraft) break
      const name = advice.choices.find((c) => c.id === advice.winner)?.name ?? advice.winner
      points.set(name, (points.get(name) ?? 0) + 1)
      s = { ...s, profileDraft }
      changed = true
    }

    // De base AP: Auto assign, alleen als hij iets invult dat er nog niet staat.
    const ap = autoFillAp(job, s.profileDraft.level, equipment)
    if (ap.ok) {
      const patch = autoFillPatch(ap.base)
      if ((Object.keys(patch) as (keyof ProfileDraft)[]).some((k) => patch[k] !== s.profileDraft[k])) {
        s = { ...s, profileDraft: { ...s.profileDraft, ...patch } }
        changed = true
      }
    }

    if (!changed) break
    rounds++
    capped = rounds === MAX_ROUNDS
    const cost = costOf(s)
    // Een getal dat lager is wint; zonder getal naast een getal blijft de stand die er was.
    if (typeof cost === 'number' ? typeof best.cost !== 'number' || cost < best.cost : typeof best.cost !== 'number') {
      best = { s, cost, points: new Map(points), mobs: [...mobs] }
    }
  }

  s = best.s
  const costAfter = best.cost
  return {
    drafts: s.drafts,
    profileDraft: s.profileDraft,
    potionChoice: s.potionChoice,
    changes: describe(input, s, best.mobs, best.points),
    potions: potionNames(s),
    costBefore,
    costAfter,
    saving: typeof costBefore === 'number' && typeof costAfter === 'number' ? costBefore - costAfter : null,
    rounds,
    capped,
  }
}

/** De namen van de HP- en MP-potion die een stand gebruikt. */
function potionNames(s: CheapestInput): Record<'hp' | 'mp', string> {
  const p = resolvePotions(s.job, s.potionChoice)
  return { hp: p.hp.name, mp: p.mp.name }
}

/** Wat er per kaart veranderde, van de stand voor de knop naar de stand erna. */
function describe(before: CheapestInput, after: CheapestInput, mobs: readonly string[], points: ReadonlyMap<string, number>): Change[] {
  const out: Change[] = []
  // Een mob die weer terugkwam waar hij begon, is geen wijziging.
  if (mobs.length > 1 && mobs[0] !== mobs[mobs.length - 1]) out.push({ kind: 'mob', text: `${mobs[0]} → ${mobs[mobs.length - 1]}` })
  const was = resolvePotions(before.job, before.potionChoice)
  const now = resolvePotions(after.job, after.potionChoice)
  // Per soort een eigen regel (Dave, #183): HP en MP los.
  for (const k of POTION_KINDS) if (was[k].name !== now[k].name) out.push({ kind: k, text: `${was[k].name} → ${now[k].name}` })
  if (points.size > 0) out.push({ kind: 'skills', text: [...points].map(([name, n]) => `${name} +${n}`).join(', ') })
  const ap = STATS.filter((k) => before.profileDraft[k] !== after.profileDraft[k]).map(
    (k) => `${STAT_LABEL[k]} ${before.profileDraft[k].trim() || '0'} → ${after.profileDraft[k]}`,
  )
  if (ap.length > 0) out.push({ kind: 'ap', text: ap.join(', ') })
  return out
}
