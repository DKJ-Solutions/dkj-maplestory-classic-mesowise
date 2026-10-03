## data/24-exp-tabel

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

#### Eerste stap van #24: de teller

Deze branch levert de gegevens en de rekenkern van #24, niet het scherm. Het scherm is een zichtbaar
resultaat en komt op een eigen branch, die Dave eerst bekijkt. Het issue blijft dus open (`-NoResolves`).

- **Gegevens (Rebecca → Vera):** de EXP van level N naar N+1, alleen voor lv 10–20 (het levelplan waar de
  bekende plekken op rusten). Bron: de MeowDB-guide "EXP Table Lv 1-100", die lv 1–49 bevestigd noemt in
  het huidige spel. Cloudflare blokkeert de ruwe pagina voor curl, dus de waarden komen uit de opgehaalde
  pagina. Ze zijn op twee manieren nagekeken: elke stap telt op tot de cumulatieve kolom van dezelfde
  pagina, en ze zijn gelijk aan de historische GMS-tabel.
- **Rekenen (Cody, Tycho):** `mesoCostOfLevel(expToNext, expPerMeso)`. De functie krijgt de EXP tot het
  volgende level mee en niet het level zelf, omdat `src/calc/` geen gegevens importeert (zo werkt
  `mobModel` ook). Een plek die niets kost, geeft 0. Een plek zonder EXP geeft `null` (onhaalbaar).

### CREATE

- [x] `src/data/expTable.ts`: de EXP tot het volgende level voor lv 10–20, met bron en datum
- [x] `src/calc/mesoCostOfLevel.ts`: de mesokosten van een level, met 0 en onhaalbaar als randgevallen
- [x] Tests voor beide, waaronder de som tegen de cumulatieve kolom van de bron

### TEST

- [x] De nieuwe tests (12) en de typecheck zijn groen; de volledige gate draait in `ship-pr`
- [x] Review door Victor

### DEPLOY: data/24-exp-tabel

De app kent nu de EXP die je nodig hebt van lv 10 tot en met lv 21, met MeowDB als bron. Daarmee kan
ze uitrekenen wat een level je in mesos kost op de plek waar je traint. Op het scherm zie je dat nog
niet: dit is de rekenkern onder de centrale vraag (#24).

**Score:** 2

#### What makes this deploy extra special

Nog niets zichtbaar voor de speler. Het scherm met de mesokosten van je volgende level volgt apart.

**Score:** N/A

#### Pull Request

De EXP-tabel en de mesokosten van een level (#24)

