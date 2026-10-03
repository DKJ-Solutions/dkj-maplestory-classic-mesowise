## data/14-trainingsplekken

> **How this file is read.** A step is `- [ ]` until it is resolved -- `- [x]` done, or
> `- [~]` dropped with the reason, which exists so nobody ticks a box for work they did not do.
> open-pr and ship-pr both refuse while one is still open, and there is no `-Force`.
>
> **FOUR `###` HEADINGS, AND NEVER A FIFTH** -- PLAN, CREATE, TEST, DEPLOY are the whole top
> level. A section needing its own heading goes in as a `####` UNDER whichever of the four owns
> it. No gate in YOUR repo reads a heading, so this half is on you -- only the repo that authors
> this workflow refuses a fifth (Dave, August 26, 2026).
>
> **AND NOTHING BRANCH-SPECIFIC ABOVE THE FIRST OF THOSE FOUR HEADINGS** -- everything between the
> title and it is this guidance, which is identical in every branch document. A status line, a note about
> THIS branch or an instruction to a session belongs under one of the four, normally as a `####`
> in PLAN. THIS half open-pr refuses, in every repo, before the push -- it reads the shape, so a
> guidance block in your own language passes and your own paragraph here does not (Dave,
> August 26, 2026; refused since #1650).
>
> **DEPLOY takes no steps of its own, and it is WRITTEN LAST** -- it is what the branch DID, once
> TEST says so. Written while steps above it are still open it states an INTENTION, and no gate
> holds it against what landed: the step gate splits this file at that heading and counts only
> above it. The PR title is the one exception -- new-branch -Title writes it at creation, because
> open-pr composes the PR title from it. It is the one part of this file that travels verbatim
> into `CHANGELOG.md` at the merge. In each tier, write the reason
> ABOVE the Score line -- anything below it is discarded.
>
> Relative links in that text resolve FROM THIS DIRECTORY -- `CHANGELOG.md` sits here too, so
> write each path exactly as it reads in this file.
>
> For tier 2 audiences: the user who relies on what this repo ships, and decides whether to take the next version -- a subscriber of a service, or the user of a tool, its own maintainer included. That reader and nobody else -- what matters only
> inside this repo belongs under the first `**Score:**`. If the change reaches that reader
> not at all, N/A is a complete answer and the common one. **One hop and no further:** where that
> reader is itself a business, ITS own customers sit one hop past this repo and are never the reader
> here -- they take nothing this repo ships. Name the party that runs the upgrade, and score
> against them.
>
> The phase arc, the marks and the whole form: `DEVELOPMENT-portable.md`, which ships
> with this workflow.

### PLAN

Issue #14, stap 2 van 3. Daves besluiten van 3 oktober 2026: de plekken komen uit het levelplan voor
lv 10–20 (Pigs rond Henesys, Kerning City Subway, Kerning Middle Forest, de Dark Stumps bij Perion), met
White en Orange Potions. Map- en monsternamen mogen erin als gewone tekst (optie a). Dit is een
zichtbare wijziging, dus de branch wordt geparkeerd: geen PR tot Dave gekeken heeft.

### CREATE

- [x] Tessa: de naamregel in `.claude/rules/this-repo.md` aangescherpt (namen mogen, sprites, iconen en merk niet)
- [x] Cody: `src/data/types.ts` en `src/data/spots.ts` (bron per rij), het optionele veld `known` op een plek, met opslag
- [x] Cody: de keuzelijst "Bekende plek", de monsters met hun bronlink en de bronvermelding "NiaMeowDB (meowdb.com)"
- [x] Rebecca: per plek de map, de monsters en de potionprijzen bij MeowDB, met URL en datum
- [x] Vera: elk getal tegen de ruwe pagina gecontroleerd (niet tegen een samenvatting) en in `src/data/spots.ts` gezet
- [x] Victor en Edith: review en tekstlezing verwerkt (elk monster één keer, Nederlandse datum, "EXP per monster", geen datumtest die rond middernacht faalt)

#### Wat de gegevens anders maakten dan het plan

De levelbereiken uit het levelplan zijn niet te onderbouwen: de Pigs gaan tot lv 10, Dark Stump is lv 11 en
Kerning City Middle Forest III heeft monsters tot lv 14, terwijl het plan voor die plekken lv 10–13 en
15–20 noemt. Daarom staat er geen levelbereik per plek in de gegevens. De keuzelijst toont het bereik van
de monsters zelf, en dat staat wel op MeowDB. Per regel van het plan staat de echte map erin:

- Pigs rond Henesys → The Rain-Forest East of Henesys (alleen Pig en Ribbon Pig). De MeowDB-maps met
  "Pig Park" in de naam zijn Iron Hog-maps voor lv 25+, en die vallen buiten het plan.
- Kerning City Subway → Line 1 <Area 1> (Bubbling, lv 15).
- Kerning Middle Forest → Kerning City Middle Forest III (lv 1–14).
- Dark Stumps bij Perion → West Domain of Perion (de meeste Dark Stumps) en East Domain of Perion (de
  enige map met ook Axe Stumps, lv 17).

`POTIONS` (White 350, Orange 150 bij Dr. Faymus) staat er al in, maar staat nog niet op het scherm:
het issue vraagt om de prijzen, en #15 rekent ermee. Alle getallen zijn COT2-waarden.

### TEST

- [x] `npm test`: 94 tests groen, waaronder een test die elke rij langsloopt (bron op meowdb.com, geldige datum, eindige getallen ≥ 0) en de keuze van een plek
- [x] `npm run build`: groen
- [~] Blik op telefoonbreedte in de browser: de Chrome-sessie viel weg; Dave kijkt vóór de merge zelf
- [x] Dave heeft de app bekeken en goedgekeurd (3 oktober 2026)

### DEPLOY: data/14-trainingsplekken

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

