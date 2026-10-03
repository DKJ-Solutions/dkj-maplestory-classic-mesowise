# Changelog

## [Unreleased]

**6 / 12 minor entries** <!-- pending-tally -->

### DEPLOY: app/21-beste-robuuster · 20261003-125333Z

Het label "Beste" is voorzichtiger geworden. Een plek die minder dan de helft van de EXP per uur van de
beste veilige plek oplevert, krijgt het niet meer, net als een plek waar één tik 25% of meer van je HP kost.
De kaart zegt waarom. Wisselt de winnaar als de aannames van het model anders uitvallen, dan staat er
"Hangt af van de aannames". En bij een bekende plek staat erbij dat het monster op EXP per uur gekozen is
en dat reiskosten niet zijn meegerekend.

**Score:** 3

#### What makes this deploy extra special

Een Snail wint niet meer omdat hij niets kost, en de app zegt eerlijk wanneer een winnaar alleen een gok is.

**Score:** 3

#### Pull Request

Beste robuuster maken: gevaar, aannames en lage EXP per uur

[PR #23](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/23)

---

### DEPLOY: app/15-exp-per-uur · 20261003-123815Z

Bij een bekende plek stelt Mesowise nu zelf voor hoeveel kills per uur je haalt. Dat voorstel volgt uit je
karakter (level, stats, Lucky Seven) en het monster waarop je traint. Daarmee rekent de app EXP per uur,
potions en het herladen van stars uit. Klopt het voorstel niet, dan vul je zelf je kills per uur in. De
app zegt erbij dat het een schatting is, en waarschuwt als een monster gevaarlijk is of als je vaak mist.

**Score:** 4

#### What makes this deploy extra special

Je hoeft niets meer te raden. Kies een plek, vul één keer je karakter in, en de app laat zien waar je de
meeste EXP per meso haalt.

**Score:** 4

#### Pull Request

EXP per uur uitrekenen uit kills per uur, met de spelgegevens

[PR #22](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/22)

---

### DEPLOY: data/14-trainingsplekken · 20261003-121633Z

Bij een plek in de vergelijker kun je nu een bekende trainingsplek kiezen, voor lv 1 tot 23: de
Rain-Forest bij Henesys, Line 1 in de Kerning-subway, Middle Forest III en de twee Domains bij Perion.
De naam wordt ingevuld en je ziet de monsters met hun level, HP en EXP, elk met een link naar de bron op
NiaMeowDB. Onderaan staat de bronvermelding.

**Score:** 3

#### What makes this deploy extra special

Voor het eerst staan er echte spelgegevens in de app, met hun bron, naast wat je zelf invult.

**Score:** 3

#### Pull Request

Eerste spelgegevens: de trainingsplekken die we echt gebruiken, met bron

[PR #19](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/19)

---

### DEPLOY: app/16-pwa · 20261003-114105Z

Je kunt Mesowise nu op je telefoon aan het beginscherm toevoegen. Hij opent dan als een eigen app,
zonder adresbalk en met een eigen icoon. Na de eerste keer laden werkt de app ook offline, en een
nieuwe versie komt vanzelf binnen.

**Score:** 3

#### What makes this deploy extra special

Tijdens het spelen tik je de app gewoon open vanaf je beginscherm, ook als je even geen bereik hebt.

**Score:** 3

#### Pull Request

De app installeerbaar maken als PWA

[PR #18](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/18)

---

### DEPLOY: app/13-vergelijker · 20261003-113101Z

Mesowise vergelijkt nu trainingsplekken: je zet er meerdere naast elkaar, met per plek de EXP per
uur en de kosten. De app zet ze op volgorde van EXP per meso en laat zien welke plek de beste is.
De plekken blijven bewaard op je telefoon.

**Score:** 4

#### What makes this deploy extra special

Dit is de eerste versie waarmee je echt kunt kiezen waar je gaat trainen, in plaats van één plek
door te rekenen.

**Score:** 4

#### Pull Request

Van rekenmachine naar vergelijker: meerdere trainingsplekken naast elkaar

[PR #17](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/17)

---

### DEPLOY: claude/3-powershell-denies · 20261003-100905Z

De deny-regels (force-push, `--force-with-lease`, `reset --hard`, `rebase`, `rm -rf`) gelden nu
ook voor het PowerShell-tool, dat ze eerder om kon lopen.

**Score:** 2

#### What makes this deploy extra special

De vrienden die de app gebruiken merken hier niets van.

**Score:** N/A

#### Pull Request

De deny-regels gelden nu ook voor het PowerShell-tool

[PR #12](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/12)

---

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

