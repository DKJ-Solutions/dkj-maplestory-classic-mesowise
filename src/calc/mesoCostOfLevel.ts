// De mesokosten van een level: de teller bij de EXP per meso (Dave, 3 oktober 2026, issue #24).
// Pure TypeScript, zonder UI-import; de EXP tot het volgende level komt uit data/expTable.

/**
 * Hoeveel meso het kost om een level vol te maken: de EXP tot het volgende level gedeeld door de
 * EXP per meso op de plek waar je traint. Kost de plek niets (Infinity EXP per meso), dan is dat 0.
 * Levert de plek geen EXP op (0 EXP per meso), dan is het level daar onhaalbaar: null, geen getal.
 */
export function mesoCostOfLevel(expToNext: number, expPerMeso: number): number | null {
  if (!Number.isFinite(expToNext) || expToNext <= 0) {
    throw new RangeError(`EXP tot het volgende level moet een getal groter dan 0 zijn, niet ${expToNext}`)
  }
  if (Number.isNaN(expPerMeso) || expPerMeso < 0) {
    throw new RangeError(`EXP per meso moet een getal van 0 of meer zijn, niet ${expPerMeso}`)
  }
  if (expPerMeso === 0) return null
  return expToNext / expPerMeso
}
