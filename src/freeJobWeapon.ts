// Het wapen dat je gratis krijgt bij je 1e jobkeuze op level 10 (Dave, 9 oktober 2026). Alleen voor de Thief en de Magician: voor de Warrior en de
// Bowman is er geen bron, dus die krijgen er geen.
// - Thief: Beginner's Garnier (data/wornItems.ts). Bron: Dave, 9 oktober 2026, en https://meowdb.com/msclassic/guides/thief-class-guide
//   ("After becoming a Thief, equip Beginner's Garnier and Subi Throwing-Stars", gelezen 2026-10-09).
// - Magician: Beginner's Wooden Wand (data/magician.ts, FREE_MAGICIAN_WEAPON). Bron: https://meowdb.com/msclassic/guides/magician-class-guide
//   ("You receive the Beginner's Wooden Wand for free when you become a Magician.", gelezen 2026-10-09).
// Het is geen winkelitem: Cheapest telt het als gratis in je hand (wearableSetup) en als wapen met prijs 0 in het wapenadvies (clawUpgrade.ts).
// Puur, zonder UI-import.
import { FIRST_JOB_LEVEL } from './data/skillPoints'
import type { Weapon, WornClaw } from './data/types'
import { WORN_CLAWS } from './data/wornItems'
import type { Job } from './job'
import { FREE_MAGICIAN_WORN_WEAPON } from './magicianGear'

const FREE_THIEF_WEAPON: WornClaw = WORN_CLAWS.find((c) => c.name === "Beginner's Garnier")!

const FREE_WEAPON: Partial<Record<Job, WornClaw>> = { thief: FREE_THIEF_WEAPON, magician: FREE_MAGICIAN_WORN_WEAPON }

/** Het level waarop je het gratis wapen van je job krijgt: je 1e jobkeuze. */
export const FREE_WEAPON_LEVEL = FIRST_JOB_LEVEL

/** De naam van het gratis wapen van een job; null als je job er geen heeft (Warrior, Bowman). */
export const freeJobWeaponName = (job: Job): string | null => FREE_WEAPON[job]?.name ?? null

/** Het gratis wapen van een job met prijs 0, zoals het wapenadvies een winkelwapen leest; null zonder gratis wapen. */
export const freeJobWeapon = (job: Job): Weapon | null => {
  const w = FREE_WEAPON[job]
  return w ? { ...w, price: 0 } : null
}
