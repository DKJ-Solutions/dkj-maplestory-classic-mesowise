## app/8-app-opzetten

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

De eerste, lege app volgens de stackkeuze van 3 oktober 2026 (#8). Zichtbaar resultaat: de branch
stopt vóór de pull request, zodat Dave hem op telefoonbreedte bekijkt. Daarna volgt #6 (de
test-seams en de CI-floor).

#### Voor de merge (Dave)

- GitHub Pages aanzetten met als bron *GitHub Actions* (Settings → Pages), anders faalt de
  deploy-job op `main`.

### CREATE

- [x] Cody: Vite + TypeScript + Preact, Node 22 (`.nvmrc`), gecommitte `package-lock.json`
- [x] Cody: de rekenkern `src/calc/expPerMeso.ts`, pure TypeScript zonder UI-import
- [x] Cody: een eerste scherm, mobile-first: EXP per uur en de kosten per uur in, EXP per meso uit
- [x] Tycho: Vitest, `npm test` = `vitest run`, zeven tests op de rekenkern
- [x] Cody: `.github/workflows/test.yml` (job `test` op pull requests) en `deploy.yml` (Pages op `main`)
- [x] Cody: `scripts/lint/lint.ps1` roept `npm run lint` (de TypeScript-typecheck) aan

### TEST

- [x] `npm test`: 7 van 7 groen
- [x] `npm run build`: typecheck schoon, bundel 6,4 kB gzip
- [x] `scripts/lint/lint.ps1`: schoon
- [ ] Dave bekijkt de app op telefoonbreedte (`npm run dev -- --host`)

### DEPLOY: app/8-app-opzetten

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
