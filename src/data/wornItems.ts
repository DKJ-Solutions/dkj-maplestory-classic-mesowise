// Items die een Thief kan dragen maar die geen NPC verkoopt (drops, quests, gemaakte items). Ze staan in de
// zoekbalk van "Je equipment", zodat je kunt zoeken wat je draagt; ze hebben geen prijs en komen dus nooit
// in het upgrade-advies (dat gebruikt alleen NPC_ARMOR en NPC_CLAWS). Per item een bron: de MeowDB-itempagina
// (NiaMeowDB, meowdb.com) met de datum van ophalen, en alleen items die echt gebruikt worden, nooit een hele
// tabel (zie .claude/rules/this-repo.md). Staat de naam ook in de NPC-lijst, dan wint de NPC-regel.
import type { WornArmor, WornClaw } from './types'

/** Niet-winkel armor, per slot (hat, top, bottom, shoes). Nog leeg: wordt per item gevuld. */
export const WORN_ARMOR: readonly WornArmor[] = []

/** Niet-winkel claws. Nog leeg: wordt per item gevuld. */
export const WORN_CLAWS: readonly WornClaw[] = []
