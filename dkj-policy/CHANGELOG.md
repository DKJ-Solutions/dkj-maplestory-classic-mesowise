# Changelog

## [Unreleased]

**1 / 6 minor entries** <!-- pending-tally -->

### DEPLOY: tooling/6-vereiste-test-check · 20261003-100419Z

`main` vereist nu de check `test`, dus de staleness-guard van ship-pr staat aan. De ruleset is
vastgelegd in `Get-ExpectedRepoSettings`, zodat `repo-settings.yml` elke dag meldt als hij verschuift.

**Score:** 2

#### What makes this deploy extra special

De vrienden die de app gebruiken merken hier niets van.

**Score:** N/A

#### Pull Request

De vereiste test-check op main vastgelegd

[PR #11](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/11)

---

### DEPLOY: tooling/6-test-seams-ci-floor · 20261003-095547Z

De lokale gate draait nu ook de tests van de app (`npm test`). De CI-floor staat: een merge die
via de knop van GitHub binnenkomt, krijgt zijn fold en zijn resolves-controle alsnog, en een
gearmde PR wordt gemerged zodra `test` groen is.

**Score:** 2

#### What makes this deploy extra special

De vrienden die de app gebruiken merken hier niets van.

**Score:** N/A

#### Pull Request

De test-seams en de CI-floor

[PR #10](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/10)

---

### DEPLOY: app/8-app-opzetten · 20261003-094911Z

Er staat een eerste app: één scherm waarin je de EXP per uur en de kosten per uur (potions, ammo,
reizen) invult en de EXP per meso terugkrijgt. De rekenkern is los getest, en op `main` zet GitHub
Actions de app op GitHub Pages.

**Score:** 4

#### What makes this deploy extra special

Dit is het eerste wat Dave en zijn vrienden kunnen openen: de app staat online, al kent hij nog geen
trainingsplekken.

**Score:** 3

#### Pull Request

De app opzetten: Vite + TypeScript + Preact, met Vitest en de Pages-deploy

[PR #9](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/9)

---

### DEPLOY: docs/stackkeuze · 20261003-094126Z

De stack staat vast: Vite + TypeScript + Preact, op GitHub Pages en gedeployd via Actions, met de berekening als pure, met Vitest geteste module. De spelgegevens komen er alleen selectief in, met een bron per rij en de vermelding van MeowDB, en nooit als hele tabel.

**Score:** 3

#### What makes this deploy extra special

Nog geen gebruiker merkt hier iets van; de app bestaat nog niet.

**Score:** N/A

#### Pull Request

De stackkeuze vastgelegd: Vite, TypeScript en Preact op GitHub Pages

[PR #7](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/7)

---

### DEPLOY: chore/1-decide-seams · 20261003-093155Z

#### What does the change on this branch deploy to main?

##### Tier 0

De shared scripts draaien hier nu op antwoorden die Dave koos in plaats van op fallbacks: releases zijn voor de gebruikers (tier 2), minor en major krijgen een release note, een major komt wanneer de developer het zegt, en de statusLine is afgeslagen. Drie seams wachten op de stackkeuze.

**Score:** 2

##### Tier 1

Alleen de werkwijze verandert; de app zelf bestaat nog niet.

**Score:** N/A

##### Tier 2

Geen gebruiker merkt hier iets van.

**Score:** N/A

#### Pull Request

De decide-seams beantwoord die niet op de stack wachten

[PR #5](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/5)

---

### DEPLOY: claude/specialisten-inrichten-v1 · 20261003-091958Z

#### What does the change on this branch deploy to main?

##### Tier 0

De repo heeft nu een werkende werkwijze: een roster van 19 specialisten met hun routes, een
branch-taxonomie, de CI-gates en een lint-poort. Zonder deze branch weigerde open-pr te draaien.

**Score:** 4

##### Tier 1

Alleen de werkwijze verandert; de app zelf bestaat nog niet.

**Score:** N/A

##### Tier 2

Geen abonnee merkt hier iets van.

**Score:** N/A

#### Pull Request

Specialisten en workflow inrichten voor de app

[PR #4](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/4)

---

