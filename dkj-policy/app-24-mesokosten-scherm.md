## app/24-mesokosten-scherm

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

#### Tweede stap van #24: het scherm

De gegevens en `mesoCostOfLevel` staan op main (#28). Deze branch zet het antwoord op het scherm. Het
is een zichtbaar resultaat, dus de branch wacht op Daves blik voordat er een PR komt.

- Een kaart "Je volgende level" onder het karakter. Hij toont de EXP van je huidige level naar het
  volgende, en wat dat kost op de plek met het label "Beste".
- De kaart volgt "Beste" (`bestVerdict`), niet de bovenste plek in de lijst. Dezelfde regels gelden
  dus: een gevaarlijke plek of een plek met te weinig EXP per uur telt niet mee.
- Randgevallen krijgen een zin in plaats van een getal: geen profiel, een level buiten de tabel (lv
  10–20), nog geen "Beste", een plek die niets kost (gratis), een plek zonder EXP (onhaalbaar), en een
  winnaar die van de aannames afhangt.

### CREATE

- [x] `src/levelCost.ts`: de pure stap van profiel en "Beste" naar de mesokosten, met de randgevallen als soorten
- [x] `src/levelCost.test.ts`: de tests van Tycho
- [x] `LevelCostCard` in `src/app.tsx` en de stijl in `src/style.css`, op telefoonbreedte bekeken

### TEST

- [x] Alle tests (182) en de typecheck zijn groen, `npm run build` slaagt
- [x] In de browser bekeken: voorbeeldplek als "Beste" (4 EXP per meso) geeft ± 429 meso voor lv 10 → 11
- [x] Review door Victor, tekst door Edith

### DEPLOY: app/24-mesokosten-scherm

Onder je karakter staat nu wat je volgende level kost: de EXP tot het volgende level, omgerekend naar
mesos op de plek met het label "Beste". Kost die plek niets, dan staat er "Gratis". Hangt de winnaar af
van de aannames, dan zegt de kaart dat erbij. Voorlopig werkt dit voor lv 10 tot en met 20.

**Score:** 4

#### What makes this deploy extra special

Dit is de centrale vraag van de app: hoeveel mesos kost mijn nieuwe level? Je ziet het antwoord direct
na een level-up.

**Score:** 4

#### Pull Request

De mesokosten van je volgende level op het scherm (#24)

