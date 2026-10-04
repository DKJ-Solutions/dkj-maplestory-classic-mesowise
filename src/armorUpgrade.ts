// Loont een nieuw stuk armor nu? (Dave, 3 oktober 2026, issue #36) Per slot (hoed, bovenstuk, broek,
// overall, schoenen) het stuk uit de NPC-winkel dat je kunt dragen en het meeste netto oplevert: wat bespaart het in
// mesos tot je volgende upgrade in dat slot, min zijn prijs. Elk draagbaar stuk wordt doorgerekend, want een
// goedkoper stuk met minder WDEF kan zich terugverdienen terwijl het topstuk dat niet doet. Puur, zonder UI-import.
// Weet de app wat je in een slot draagt (het scherm "Je equipment"), dan telt alleen een stuk met meer WDEF
// dan dat, en komt het erbij als `wdef - gedragen + stuk.wdef`. Weet de app het niet, dan is de standaard:
// een stuk wordt gerekend als `wdef + stuk.wdef`, alsof dat slot nu leeg is. Dat is de grootst mogelijke
// besparing: een "nee" is daarmee zeker, een "ja" geldt onder die voorwaarde. Verder dezelfde standaarden als bij de claw:
// je stats van nu blijven gelden over de hele horizon, de verkoopwaarde van je oude stuk telt niet mee en
// het huidige level telt vol mee. Voor een Warrior (issue #42) is de winkel die van warriorGear.ts (alleen hats
// en shoes) en is de eis in de hoofdstat zijn STR. Voor een Magician (issue #43) is het die van magicianGear.ts (hats, tops, bottoms en
// shoes), met INT als hoofdstat en LUK als tweede eis.
//
// De overall (issue #50) beslaat top en bottom. Wat een stuk in slot X vervangt: een overall vervangt wat je draagt
// op top en bottom samen (of een overall die je al draagt); een top of bottom vervangt een overall die je draagt
// (de andere helft is dan leeg), anders het stuk in dat slot. Dezelfde standaard als altijd: een slot waarvan de app
// de WDEF niet weet telt als leeg, dus van top en bottom telt alleen de bekende helft mee, en weet de app van geen
// van beide iets, dan is het "onbekend" (gerekend alsof het niets geeft). De horizon blijft per slot: tot het
// volgende stuk met meer WDEF in hetzelfde slot (voor een overall de volgende overall).
import { ASSUMPTION_VARIANTS } from './best'
import { ASSUMPTIONS, type Assumptions } from './calc/mobModel'
import { NPC_ARMOR } from './data/armor'
import { EXP_TABLE_LEVELS, expToNextLevel } from './data/expTable'
import type { ArmorPiece, ArmorSlot } from './data/types'
import { byNet, horizonCost } from './horizonCost'
import { bestExpPerMeso } from './mesoCostAt'
import { MAGICIAN_ARMOR } from './magicianGear'
import { shortfall, type Profile, type StatNeed } from './profile'
import type { SpotDraft } from './spotDraft'
import { WARRIOR_ARMOR } from './warriorGear'

const LAST_TABLE_LEVEL = EXP_TABLE_LEVELS[EXP_TABLE_LEVELS.length - 1]

export interface ArmorChoice {
  armor: ArmorPiece
  /** Het eerste en het laatste level van de horizon ("tot je volgende upgrade in dit slot"). */
  from: number
  to: number
  /** True als de horizon verder loopt dan de EXP-tabel, en de app hem daar afkapt. */
  truncated: boolean
  /** Wat het stuk over de horizon bespaart, of null als dat niet uit te rekenen valt. */
  saving: number | null
  /** De besparing min de prijs (negatief: verdient zich niet terug), of null zonder besparing. */
  net: number | null
  /** De WDEF van wat je in dit slot draagt; undefined = onbekend, en dan is gerekend alsof het slot leeg is. */
  replaces: number | undefined
}

/** Wat je per slot aan WDEF draagt; een slot dat ontbreekt is onbekend. */
export type WornWdef = Partial<Record<ArmorSlot, number>>

/** Een stuk dat je level wel toestaat, maar waar je stats nog tekortschieten. */
export interface UnwearableArmor {
  armor: ArmorPiece
  /** Per stat wat je tekortkomt, de hoofdstat van je job eerst; nooit leeg. */
  needs: StatNeed[]
}

export type ArmorUpgradeAdvice =
  /** Niet uit te rekenen: geen profiel, level buiten de tabel, of geen "Beste". */
  | { kind: 'none' }
  | {
      kind: 'advice'
      /** Het level waarvandaan gerekend wordt: je huidige, dat vol meetelt. */
      level: number
      /** Per slot het stuk dat je kunt dragen met de meeste netto besparing, van meeste naar minste netto besparing. */
      choices: ArmorChoice[]
      /** Per slot het beste stuk dat je nog niet kunt dragen (en beter is dan wat je wel kunt). */
      notWearable: UnwearableArmor[]
      /** Het stuk met de grootste netto besparing boven 0, of null als geen stuk zich terugverdient. */
      winner: ArmorPiece | null
      /** False als een ander stuk wint (of geen) zodra één aanname naar de rand gaat. */
      robust: boolean
    }

/**
 * De WDEF die een nieuw stuk in `slot` vervangt, of undefined als de app dat niet weet (zie de kop voor de overall-regel).
 * Een overall zonder bekende top of bottom is onbekend; met alleen een bekende helft telt die helft.
 */
export function replacedWdef(slot: ArmorSlot, worn: WornWdef): number | undefined {
  if (slot === 'overall') {
    const halves = [worn.top, worn.bottom].filter((w): w is number => w !== undefined)
    return worn.overall ?? (halves.length === 0 ? undefined : halves.reduce((a, b) => a + b, 0))
  }
  return slot === 'top' || slot === 'bottom' ? (worn.overall ?? worn[slot]) : worn[slot]
}

/** Het profiel met dit stuk erbij: het stuk dat je in dat slot droeg (`replaced`, standaard niets) gaat eraf. */
export const withArmor = (p: Profile, a: ArmorPiece, replaced = 0): Profile => ({ ...p, wdef: Math.max(0, p.wdef - replaced) + a.wdef })

/** Het stuk met de hoogste WDEF, bij gelijkspel het goedkoopste (voor het stuk dat je nog niet kunt dragen). */
const bestOf = (list: readonly ArmorPiece[]): ArmorPiece | undefined => list.reduce<ArmorPiece | undefined>((best, a) => (!best || a.wdef > best.wdef || (a.wdef === best.wdef && a.price < best.price) ? a : best), undefined)

/** De winkelarmor van de job van dit profiel. */
const shopOf = (profile: Profile): readonly ArmorPiece[] => (profile.job === 'warrior' ? WARRIOR_ARMOR : profile.job === 'magician' ? MAGICIAN_ARMOR : NPC_ARMOR)

/** De horizon van een stuk: van je level tot net vóór het volgende stuk met meer WDEF in hetzelfde slot, hoogstens de hele tabel. */
function horizon(profile: Profile, armor: ArmorPiece): { from: number; to: number; truncated: boolean } {
  const next = shopOf(profile).find((a) => a.slot === armor.slot && a.level > profile.level && a.wdef > armor.wdef)
  const end = next ? next.level - 1 : Infinity
  return { from: profile.level, to: Math.min(end, LAST_TABLE_LEVEL), truncated: end > LAST_TABLE_LEVEL }
}

function adviseUnder(drafts: readonly SpotDraft[], profile: Profile, candidates: readonly ArmorPiece[], worn: WornWdef, a: Assumptions) {
  const baseEpm = bestExpPerMeso(drafts, profile, a)
  if (baseEpm === undefined) return null
  const all = candidates
    .map((armor): ArmorChoice => {
      const h = horizon(profile, armor)
      const replaces = replacedWdef(armor.slot, worn)
      const epm = bestExpPerMeso(drafts, withArmor(profile, armor, replaces), a)
      const without = horizonCost(h.from, h.to, baseEpm)
      const withIt = epm === undefined ? null : horizonCost(h.from, h.to, epm)
      // Is een level zonder stuk onhaalbaar (basiskosten null), dan is elk stuk bewust "niet uit te rekenen" (zie issue #25).
      const saving = without === null || withIt === null ? null : without - withIt
      return { armor, ...h, saving, net: saving === null ? null : saving - armor.price, replaces }
    })
    .sort(byNet)
  // Per slot de keuze met de hoogste netto besparing: `all` is al gesorteerd, dus de eerste per slot wint.
  const choices = all.filter((c, i) => all.findIndex((o) => o.armor.slot === c.armor.slot) === i)
  const top = choices[0]
  return { choices, winner: top && top.net !== null && top.net > 0 ? top.armor : null }
}

export function armorUpgradeAdvice(drafts: readonly SpotDraft[], profile: Profile | null, worn: WornWdef = {}): ArmorUpgradeAdvice {
  if (!profile || expToNextLevel(profile.level) === undefined) return { kind: 'none' }
  const canWear = (a: ArmorPiece) => shortfall(a, profile).length === 0
  const available = shopOf(profile).filter((a) => a.level <= profile.level)
  // Een stuk dat niet meer WDEF geeft dan wat je in dat slot draagt, is geen upgrade.
  const betterThanWorn = (a: ArmorPiece) => a.wdef > (replacedWdef(a.slot, worn) ?? -Infinity)
  const wearable = available.filter((a) => canWear(a) && betterThanWorn(a))
  const notWearable: UnwearableArmor[] = []
  for (const slot of new Set(available.map((a) => a.slot))) {
    const inSlot = available.filter((a) => a.slot === slot)
    const mine = bestOf(inSlot.filter(canWear))
    const blocked = bestOf(inSlot.filter((a) => !canWear(a)))
    if (blocked && blocked.wdef > Math.max(mine?.wdef ?? -Infinity, replacedWdef(slot, worn) ?? -Infinity)) {
      notWearable.push({ armor: blocked, needs: shortfall(blocked, profile) })
    }
  }
  const main = adviseUnder(drafts, profile, wearable, worn, ASSUMPTIONS)
  if (!main) return { kind: 'none' }
  const robust = ASSUMPTION_VARIANTS.every((v) => (adviseUnder(drafts, profile, wearable, worn, v)?.winner ?? null) === main.winner)
  return { kind: 'advice', level: profile.level, ...main, notWearable, robust }
}
