// EXP per uur en potionkosten per uur uit de onderdelen. Puur, zonder UI-import. Ongeldige invoer
// (negatief, NaN of oneindig) geeft een RangeError, net als bij expPerMeso.

function amount(value: number, what: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${what} moet een getal van 0 of meer zijn, niet ${value}`)
  }
  return value
}

/**
 * EXP per uur: EXP per kill × kills per uur × een vermenigvuldiger. De vermenigvuldiger is 1 tenzij
 * er een factor met bron is (een event, een bonus); die zit er nu nog niet in.
 */
export function expPerHour(expPerKill: number, killsPerHour: number, multiplier = 1): number {
  return amount(expPerKill, 'EXP per kill') * amount(killsPerHour, 'kills per uur') * amount(multiplier, 'de vermenigvuldiger')
}

/** Potionkosten per uur: potions per uur × de prijs van één potion. */
export function potionCostPerHour(potionsPerHour: number, pricePerPotion: number): number {
  return amount(potionsPerHour, 'potions per uur') * amount(pricePerPotion, 'de prijs per potion')
}
