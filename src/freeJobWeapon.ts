// Het wapen dat je gratis krijgt bij je 1e jobkeuze op level 10 (Dave, 9 oktober 2026). Alleen voor de Thief en de Magician: voor de Warrior en de
// Bowman is er geen bron, dus die krijgen er geen.
// - Thief: Beginner's Garnier (data/wornItems.ts). Bron: Dave, 9 oktober 2026, en https://meowdb.com/msclassic/guides/thief-class-guide
//   ("After becoming a Thief, equip Beginner's Garnier and Subi Throwing-Stars", gelezen 2026-10-09).
// - Magician: Beginner's Wooden Wand (data/magician.ts, FREE_MAGICIAN_WEAPON). Bron: https://meowdb.com/msclassic/guides/magician-class-guide
//   ("You receive the Beginner's Wooden Wand for free when you become a Magician.", gelezen 2026-10-09).
// Het is geen winkelitem: Cheapest telt het als gratis in je hand (wearableSetup) en als wapen met prijs 0 in het wapenadvies (clawUpgrade.ts).
// Puur, zonder UI-import.
import { FIRST_JOB_LEVEL } from './data/skillPoints'
import type { Stat, Weapon } from './data/types'
import { WORN_CLAWS } from './data/wornItems'
import type { Job } from './job'
import { FREE_MAGICIAN_WORN_WEAPON } from './magicianGear'
import type { ProfileDraft } from './profile'

/**
 * Het gratis wapen per job, met prijs 0 zoals het wapenadvies een winkelwapen leest: één keer gebouwd bij het eerste gebruik (niet bij het laden van de module: profile.ts en
 * equipment.ts importeren elkaar, dus de data is er bij het laden nog niet altijd). Valt luid om als de Garnier uit de data verdwijnt.
 */
let built: Partial<Record<Job, Weapon>> | undefined
const freeWeapons = (): Partial<Record<Job, Weapon>> => {
  if (built) return built
  const garnier = WORN_CLAWS.find((c) => c.name === "Beginner's Garnier")
  if (!garnier) throw new Error("Beginner's Garnier ontbreekt in WORN_CLAWS (data/wornItems.ts)")
  return (built = { thief: { ...garnier, price: 0 }, magician: { ...FREE_MAGICIAN_WORN_WEAPON, price: 0 } })
}

/** Het level waarop je het gratis wapen van je job krijgt: je 1e jobkeuze. */
export const FREE_WEAPON_LEVEL = FIRST_JOB_LEVEL

/** De naam van het gratis wapen van een job; null als je job er geen heeft (Warrior, Bowman). */
export const freeJobWeaponName = (job: Job): string | null => freeWeapons()[job]?.name ?? null

/** Het gratis wapen van een job met prijs 0, zoals het wapenadvies een winkelwapen leest; null zonder gratis wapen. */
export const freeJobWeapon = (job: Job): Weapon | null => freeWeapons()[job] ?? null

// Je totale stat uit het concept (base AP plus items, zoals draftStatTotal in profile.ts); hier zelf gelezen, want profile.ts importeert equipment.ts en dit bestand hoort daaronder.
const EXTRA = { str: 'strExtra', dex: 'dexExtra', int: 'intExtra', luk: 'lukExtra' } as const
const whole = (text: string): number | null => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : null)
const statTotal = (d: ProfileDraft, s: Stat): number | null => {
  const base = whole(d[s])
  return base === null ? null : base + (whole(d[EXTRA[s]]) ?? 0)
}

/**
 * Of je character het gratis wapen kan dragen (Dave, 9 oktober 2026): je totale stats (base AP plus items) halen zijn eis (Garnier LUK 25, Wand INT 20), zoals het
 * wapenadvies de winkelwapens op shortfall() filtert. Is een stat in het concept onleesbaar, dan weten we het niet en telt het als genoeg. Zonder gratis wapen: false.
 */
export function meetsFreeWeaponRequirements(job: Job, draft: ProfileDraft): boolean {
  const w = freeWeapons()[job]
  if (!w) return false
  return (['str', 'dex', 'int', 'luk'] as const satisfies readonly Stat[]).every((s) => {
    const need = w[s] ?? 0
    const have = statTotal(draft, s)
    return need === 0 || have === null || have >= need
  })
}

/**
 * Of een getypte weapon attack (M.ATT bij een Magician) hoger is dan die van het gratis wapen. Dan weet de app dat je iets beters draagt dan het gratis wapen,
 * ook als je wapenslot nog leeg is: het gratis wapen vult dan niets in. Een leeg of onleesbaar veld is niet hoger.
 */
export function typedAttackBeatsFreeWeapon(job: Job, draft: ProfileDraft): boolean {
  const w = freeWeapons()[job]
  const text = draft.clawWatk.trim()
  return w !== undefined && text !== '' && Number.isFinite(Number(text)) && Number(text) > w.watk
}
