## app/13-vergelijker

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

Stap 1 van het plan #13 → #14 → #15: de app wordt een vergelijker van trainingsplekken met
cijfers die je zelf invult. Dit is een zichtbaar resultaat, dus de branch stopt vóór de pull
request tot Dave hem op telefoonbreedte heeft bekeken.

#### Voor de merge (Dave)

- Op 360 px bekijken: de kaarten, open- en dichtklappen, toevoegen en verwijderen, de
  foutmelding op één kaart en de dark mode. Ook proberen of een komma in een getalveld werkt
  op een NL-toetsenbord (Victor).

### CREATE

- [x] Cody: `src/calc/rankSpots.ts`: `Spot`, `rankSpots`, `spotError`. Ongeldige plekken komen onderaan met een Nederlandse melding per veld.
- [x] Cody: `src/storage/spots.ts`: invoer per plek als tekst in `localStorage` (`mesowise.spots.v1`), mild laden, ontdubbelen op id, max. 200 plekken en namen van max. 100 tekens. Een geblokkeerde opslag breekt niets.
- [x] Cody: `src/spotDraft.ts` en `src/app.tsx`: kaarten met naam, EXP per meso en EXP per uur, het label "Beste", bewerken, toevoegen en verwijderen. De volgorde staat vast terwijl een kaart open is.
- [x] Victor, Sebastian, Edith: review. Alle bevindingen zijn verwerkt (dataverlies bij een half ingevulde kaart, verspringen tijdens typen, foutteksten zonder "NaN", labels, `aria-live`, ontdubbelen).

### TEST

- [x] Tycho: 57 tests groen (`rankSpots`, `spotError`, opslag, `spotDraft`)
- [x] `npm run lint` schoon, `npm run build` 8,1 kB JS gzip, geen nieuwe runtime-dependencies
- [~] De UI zelf is niet automatisch getest: er is geen componenttest-opzet. Dave beoordeelt het scherm vóór de merge.

### DEPLOY: app/13-vergelijker

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

