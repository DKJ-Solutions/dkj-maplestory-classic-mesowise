// Loont een nieuw stuk armor nu? (Dave, 3 oktober 2026, issue #36) Per slot (hoed, bovenstuk, broek,
// overall, schoenen) het stuk uit de NPC-winkel dat je kunt dragen en het meeste netto oplevert: wat bespaart het in
// mesos tot je volgende upgrade in dat slot, min zijn prijs. Elk draagbaar stuk wordt doorgerekend, want een
// goedkoper stuk met minder WDEF kan zich terugverdienen terwijl het topstuk dat niet doet. Puur, zonder UI-import.
// Weet de app wat je in een slot draagt (het scherm "Je equipment"), dan telt alleen een stuk met meer WDEF
// dan dat, en komt het erbij als `wdef - gedragen + stuk.wdef`. Weet de app het niet, dan is de standaard:
// een stuk wordt gerekend als `wdef + stuk.wdef`, alsof dat slot nu leeg is. Dat is de grootst mogelijke
// besparing: een "nee" is daarmee zeker, een "ja" geldt onder die voorwaarde. Verder dezelfde standaarden als bij de claw:
// je stats van nu blijven gelden over de hele horizon, de verkoopwaarde van je oude stuk telt niet mee en
// het huidige level telt vol mee. Voor een Warrior (issue #42) is de winkel die van warriorGear.ts en is de eis naast DEX zijn STR; voor een Bowman (issue #44) is het die van bowmanGear.ts, ook met STR.
// Voor een Magician (issue #43) is het die van magicianGear.ts, met INT en LUK als eisen.
// Een stuk voor één geslacht (issue #55) telt alleen als je dat geslacht hebt gekozen.
//
// De overall (issue #50) beslaat top en bottom. Wat een stuk in slot X vervangt: een overall vervangt wat je draagt
// op top en bottom samen (of een overall die je al draagt); een top of bottom vervangt een overall die je draagt
// (de andere helft is dan leeg), anders het stuk in dat slot. Dezelfde standaard als altijd: een slot waarvan de app
// de WDEF niet weet telt als leeg, dus van top en bottom telt alleen de bekende helft mee, en weet de app van geen
// van beide iets, dan is het "onbekend" (gerekend alsof het niets geeft).
//
// Het lijf (issue #87): {overall} en {top + bottom} zijn de twee alternatieven. Staat er een overall op tafel (de winkel
// heeft er een voor je level, of je draagt er een), dan is een top en een bottom samen ook een kandidaat, het "paar":
// het vervangt wat een overall vervangt en kost beide prijzen. Een losse top of bottom die een gedragen overall
// vervangt, meldt dat de andere helft dan leeg is (`bare`). De horizon loopt tot de volgende upgrade van het lijf, niet
// alleen van het slot: een top of bottom stopt ook vóór de eerste latere overall die meer WDEF geeft dan het stuk
// samen met de beste andere helft van dat level, een overall ook vóór de eerste latere top of bottom die met de beste
// andere helft van dat level meer geeft dan hij, en een paar vóór een betere top, een betere bottom of een overall die
// meer geeft dan het paar. Ook een losse top of bottom die de andere helft leeg laat, rekent tegen een latere overall
// met de beste andere helft van dat level (issue #118, een keuze): die lege helft koop je los bij, het advies biedt
// hem dan zelf aan, en pas een overall die meer geeft dan beide samen vervangt het stuk.
import { ASSUMPTION_VARIANTS } from './best'
import { BOWMAN_ARMOR } from './bowmanGear'
import { ASSUMPTIONS, type Assumptions } from './calc/mobModel'
import { NPC_ARMOR } from './data/armor'
import { EXP_TABLE_LEVELS, expToNextLevel } from './data/expTable'
import type { ArmorPiece, ArmorSlot } from './data/types'
import { byNet, horizonCost } from './horizonCost'
import { bestExpPerMeso } from './mesoCostAt'
import { MAGICIAN_ARMOR } from './magicianGear'
import { fitsGender } from './gender'
import { shortfall, type Profile, type StatNeed } from './profile'
import type { SpotDraft } from './spotDraft'
import { WARRIOR_ARMOR } from './warriorGear'

const LAST_TABLE_LEVEL = EXP_TABLE_LEVELS[EXP_TABLE_LEVELS.length - 1]

export interface ArmorChoice {
  /** Het stuk; bij een paar de top. */
  armor: ArmorPiece
  /** Bij een paar (issue #87) de bottom die je samen met de top koopt, als alternatief voor een overall. */
  with?: ArmorPiece
  /** Wat je betaalt: de prijs van het stuk, of van top en bottom samen. */
  price: number
  /** De helft die leeg raakt: een losse top of bottom die een gedragen overall vervangt (issue #87). */
  bare?: 'top' | 'bottom'
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

/**
 * Wat je per slot aan WDEF draagt; een slot dat ontbreekt is onbekend. `overallWorn` zegt dat je een overall draagt
 * ook als zijn WDEF onbekend is (issue #118): dan ontbreekt `overall`, maar vervangt een top of bottom hem toch.
 */
export type WornWdef = Partial<Record<ArmorSlot, number>> & { overallWorn?: boolean }

/** Of je een overall draagt, met bekende of onbekende WDEF. */
export const wearsOverall = (worn: WornWdef): boolean => worn.overall !== undefined || worn.overallWorn === true

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
      /** Het stuk met de grootste netto besparing boven 0 (bij een paar de top), of null als geen stuk zich terugverdient. Is er een, dan is het `choices[0]`. */
      winner: ArmorPiece | null
      /** False als een ander stuk wint (of geen) zodra één aanname naar de rand gaat. */
      robust: boolean
    }

/**
 * De WDEF die een nieuw stuk in `slot` vervangt, of undefined als de app dat niet weet (zie de kop voor de overall-regel).
 * Een overall zonder bekende top of bottom is onbekend; met alleen een bekende helft telt die helft. Draag je een overall
 * met onbekende WDEF, dan is wat een top, bottom of overall vervangt onbekend: top en bottom tellen dan niet (issue #118).
 */
export function replacedWdef(slot: ArmorSlot, worn: WornWdef): number | undefined {
  if (slot === 'overall') {
    if (wearsOverall(worn)) return worn.overall
    const halves = [worn.top, worn.bottom].filter((w): w is number => w !== undefined)
    return halves.length === 0 ? undefined : halves.reduce((a, b) => a + b, 0)
  }
  return isHalf(slot) ? (wearsOverall(worn) ? worn.overall : worn[slot]) : worn[slot]
}

/** Het profiel met dit stuk erbij: het stuk dat je in dat slot droeg (`replaced`, standaard niets) gaat eraf. */
export const withArmor = (p: Profile, a: ArmorPiece, replaced = 0): Profile => ({ ...p, wdef: Math.max(0, p.wdef - replaced) + a.wdef })

/** Het stuk met de hoogste WDEF, bij gelijkspel het goedkoopste (voor het stuk dat je nog niet kunt dragen). */
const bestOf = (list: readonly ArmorPiece[]): ArmorPiece | undefined => list.reduce<ArmorPiece | undefined>((best, a) => (!best || a.wdef > best.wdef || (a.wdef === best.wdef && a.price < best.price) ? a : best), undefined)

/** De winkelarmor van de job van dit profiel, voor zover hij past bij het geslacht (issue #55). */
const SHOP_BY_JOB: Partial<Record<Profile['job'], readonly ArmorPiece[]>> = { warrior: WARRIOR_ARMOR, bowman: BOWMAN_ARMOR, magician: MAGICIAN_ARMOR }
const shopOf = (profile: Profile): readonly ArmorPiece[] =>
  (SHOP_BY_JOB[profile.job] ?? NPC_ARMOR).filter((a) => fitsGender(a, profile.gender ?? null))

/** Een kandidaat: één stuk, of een top met een bottom (`with`) als paar. */
interface Candidate {
  armor: ArmorPiece
  with?: ArmorPiece
}

const isHalf = (slot: ArmorSlot): slot is 'top' | 'bottom' => slot === 'top' || slot === 'bottom'
const otherHalf = (slot: 'top' | 'bottom'): 'top' | 'bottom' => (slot === 'top' ? 'bottom' : 'top')

/** De horizon van een kandidaat: van je level tot net vóór de volgende upgrade van dat slot of van het lijf (zie de kop), hoogstens de hele tabel. */
function horizon(profile: Profile, c: Candidate): { from: number; to: number; truncated: boolean } {
  const shop = shopOf(profile)
  /** De hoogste WDEF in `slot` tot en met `level`, of 0 als de winkel daar niets heeft. */
  const bestUpTo = (slot: ArmorSlot, level: number) => Math.max(0, ...shop.filter((a) => a.slot === slot && a.level <= level).map((a) => a.wdef))
  const { armor } = c
  const beats = (n: ArmorPiece): boolean => {
    if (c.with) return n.slot === 'overall' ? n.wdef > armor.wdef + c.with.wdef : n.slot === 'top' ? n.wdef > armor.wdef : n.slot === 'bottom' && n.wdef > c.with.wdef
    if (n.slot === armor.slot) return n.wdef > armor.wdef
    if (armor.slot === 'overall' && isHalf(n.slot)) return n.wdef + bestUpTo(otherHalf(n.slot), n.level) > armor.wdef
    if (isHalf(armor.slot) && n.slot === 'overall') return n.wdef > armor.wdef + bestUpTo(otherHalf(armor.slot), n.level)
    return false
  }
  const end = Math.min(Infinity, ...shop.filter((n) => n.level > profile.level && beats(n)).map((n) => n.level - 1))
  return { from: profile.level, to: Math.min(end, LAST_TABLE_LEVEL), truncated: end > LAST_TABLE_LEVEL }
}

/** Twee keuzes zijn dezelfde als ze dezelfde stukken kopen (een paar is niet dezelfde keuze als zijn losse top). */
const sameChoice = (x: ArmorChoice | undefined, y: ArmorChoice | undefined) => x?.armor === y?.armor && x?.with === y?.with

function adviseUnder(drafts: readonly SpotDraft[], profile: Profile, candidates: readonly Candidate[], worn: WornWdef, a: Assumptions) {
  const baseEpm = bestExpPerMeso(drafts, profile, a)
  if (baseEpm === undefined) return null
  const all = candidates
    .map((c): ArmorChoice => {
      const h = horizon(profile, c)
      const replaces = replacedWdef(c.with ? 'overall' : c.armor.slot, worn)
      const added: ArmorPiece = c.with ? { ...c.armor, wdef: c.armor.wdef + c.with.wdef } : c.armor
      const epm = bestExpPerMeso(drafts, withArmor(profile, added, replaces), a)
      const without = horizonCost(h.from, h.to, baseEpm)
      const withIt = epm === undefined ? null : horizonCost(h.from, h.to, epm)
      // Is een level zonder stuk onhaalbaar (basiskosten null), dan is elk stuk bewust "niet uit te rekenen" (zie issue #25).
      const saving = without === null || withIt === null ? null : without - withIt
      const price = c.armor.price + (c.with?.price ?? 0)
      const bare = !c.with && isHalf(c.armor.slot) && wearsOverall(worn) ? otherHalf(c.armor.slot) : undefined
      return { ...c, price, ...(bare && { bare }), ...h, saving, net: saving === null ? null : saving - price, replaces }
    })
    .sort(byNet)
  // Per slot (een paar telt als eigen slot) de keuze met de hoogste netto besparing: `all` is al gesorteerd, dus de eerste per slot wint.
  const slotOf = (c: ArmorChoice) => (c.with ? 'pair' : c.armor.slot)
  const choices = all.filter((c, i) => all.findIndex((o) => slotOf(o) === slotOf(c)) === i)
  const top = choices[0]
  const win = top && top.net !== null && top.net > 0 ? top : undefined
  return { choices, win, winner: win?.armor ?? null }
}

export function armorUpgradeAdvice(drafts: readonly SpotDraft[], profile: Profile | null, worn: WornWdef = {}): ArmorUpgradeAdvice {
  if (!profile || expToNextLevel(profile.level) === undefined) return { kind: 'none' }
  const canWear = (a: ArmorPiece) => shortfall(a, profile).length === 0
  const available = shopOf(profile).filter((a) => a.level <= profile.level)
  // Een stuk dat niet meer WDEF geeft dan wat je in dat slot draagt, is geen upgrade.
  const betterThanWorn = (a: ArmorPiece) => a.wdef > (replacedWdef(a.slot, worn) ?? -Infinity)
  const wearable: Candidate[] = available.filter((a) => canWear(a) && betterThanWorn(a)).map((armor) => ({ armor }))
  // Het paar (issue #87), alleen als er een overall op tafel ligt: elke draagbare top met elke draagbare bottom, als
  // ze samen meer geven dan wat een overall zou vervangen.
  if (available.some((a) => a.slot === 'overall') || wearsOverall(worn)) {
    const halves = available.filter(canWear)
    const replaced = replacedWdef('overall', worn) ?? -Infinity
    for (const top of halves.filter((a) => a.slot === 'top')) {
      for (const bottom of halves.filter((a) => a.slot === 'bottom')) {
        if (top.wdef + bottom.wdef > replaced) wearable.push({ armor: top, with: bottom })
      }
    }
  }
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
  const robust = ASSUMPTION_VARIANTS.every((v) => sameChoice(adviseUnder(drafts, profile, wearable, worn, v)?.win, main.win))
  return { kind: 'advice', level: profile.level, choices: main.choices, notWearable, winner: main.winner, robust }
}
