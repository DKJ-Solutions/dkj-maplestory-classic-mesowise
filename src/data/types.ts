// De vorm van de spelgegevens. Elk feit draagt zijn bron: de pagina waar het staat en de dag
// waarop het is opgehaald. Alleen de plekken die echt gebruikt worden, nooit een hele tabel
// (zie .claude/rules/this-repo.md).

/** Waar een feit vandaan komt: een MeowDB-pagina en de datum (JJJJ-MM-DD) van ophalen. */
export interface Source {
  url: string
  retrieved: string
}

/** Een monster op een plek, met wat je nodig hebt om EXP per uur te schatten. */
export interface Monster {
  name: string
  level: number
  hp: number
  expPerKill: number
  source: Source
}

/** Een potion uit een NPC-winkel, met de winkelprijs in meso. */
export interface Potion {
  name: string
  price: number
  source: Source
}

/** Een bekende trainingsplek: een map (naam en pagina) en zijn monsters. */
export interface KnownSpot {
  id: string
  name: string
  source: Source
  monsters: readonly Monster[]
}
