// De aanvalssnelheden zoals het spel ze noemt, met de "Attack cycle" in ms per snelheid, zonder Booster.
// Eén tabel voor alle klassen, zodat Thief en Warrior (en straks de rest) niet uit elkaar lopen.

/**
 * Milliseconden per aanval, per snelheidslabel. Faster (3) tot Fast (5) staan op de skillpagina van Lucky Seven
 * (zonder Claw Booster) en de itempagina's geven voor die labels dezelfde cyclus; Normal (6) tot Slow (8) komen
 * alleen van de itempagina's (de Warrior-wapens).
 * Welke snelheid jouw wapen heeft, staat in het spel; het Thief-profiel begint bij "Fast (5)".
 */
export const ATTACK_MS = { faster3: 660, fast4: 720, fast5: 750, normal6: 810, slow7: 870, slow8: 900 } as const

/** De snelheid zoals een wapen hem draagt: het label uit het spel en de bijbehorende cyclus in ms. */
export const SPEED = {
  faster3: { label: 'Faster (3)', attackMs: ATTACK_MS.faster3 },
  fast4: { label: 'Fast (4)', attackMs: ATTACK_MS.fast4 },
  fast5: { label: 'Fast (5)', attackMs: ATTACK_MS.fast5 },
  normal6: { label: 'Normal (6)', attackMs: ATTACK_MS.normal6 },
  slow7: { label: 'Slow (7)', attackMs: ATTACK_MS.slow7 },
  slow8: { label: 'Slow (8)', attackMs: ATTACK_MS.slow8 },
} as const
