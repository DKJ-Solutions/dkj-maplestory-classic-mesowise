## app/21-beste-robuuster

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

Issue #21. Daves keuzes van 3 oktober 2026 (akkoord met alle vijf de voorstellen, zie het issue): een
ondergrens van 50% van de hoogste EXP per uur, geen "Beste" voor een plek waar één tik 25% of meer van je
HP kost, "Hangt af van de aannames" als de winnaar wisselt bij `contactsPerKill` 0,15 of 0,6 of
`timeEfficiency` 0,4 of 0,8, en op de kaart dat het monster op EXP per uur gekozen is en dat reiskosten
niet zijn meegerekend. Zichtbare wijziging: de branch wordt geparkeerd tot Dave kijkt.

#### Eén interpretatie voor Dave

De ondergrens van 50% wordt gemeten aan de hoogste EXP per uur onder de **veilige** plekken. Anders zou één
gevaarlijke plek met veel EXP per uur alle veilige plekken uitsluiten, zodat er geen "Beste" meer is
(Victor). Het label "Beste" ging een gevaarlijke plek toch al niet krijgen.

### CREATE

- [x] Cody: `DANGER_SHARE = 0.25` in `src/calc/mobModel.ts` (was 40%), voor de waarschuwing en het label tegelijk
- [x] Cody: `src/calc/pickBest.ts` (puur): de eerste plek in de rangschikking die veilig is en minstens de helft van de hoogste veilige EXP per uur haalt, met per uitgesloten plek de reden
- [x] Cody: `src/best.ts`: dezelfde keuze onder de vier varianten van de aannames; wisselt de winnaar, dan is hij niet robuust. `suggestMonsters` en `resolveSpot` nemen de aannames nu als parameter
- [x] Cody: op de kaart het label "Hangt af van de aannames", waarom een plek geen "Beste" is, dat het monster op de meeste EXP per uur gekozen is, en dat reiskosten niet zijn meegerekend
- [x] Victor en Edith: verwerkt (gevaar per variant, de ondergrens onder veilige plekken, de waarschuwing altijd bij een gevaarlijk monster, een test voor `timeEfficiency`, twee hints herschreven)

### TEST

- [x] `npm test`: 163 tests groen, met de grenzen (precies 50%, precies 25% HP), de Snail-val, een gevaarlijke uitschieter, en een niet-robuuste winnaar door `contactsPerKill` en door `timeEfficiency`
- [x] `npm run build`: groen, JS 13,3 kB gzip (was 12,6 kB)
- [x] Dave bekijkt het op zijn telefoon: gezien en akkoord (3 oktober 2026)

### DEPLOY: app/21-beste-robuuster

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
