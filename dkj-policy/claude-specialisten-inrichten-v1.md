## claude/specialisten-inrichten-v1

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
> The phase arc, the marks and the whole form: `DEVELOPMENT-portable.md`, which ships
> with this workflow.

### PLAN

De vier openstaande stappen na `specialists-init`: roster en lens van Chris, de prefix-tabel,
`adopt-dkj-policy`, en de Shopify-sjablonen opruimen.

### CREATE

- [x] Sylvester: de prefix-tabel in `scripts/lib/branch-info.ps1` (app, data, tooling, fix, docs, claude)
- [x] Sylvester: `adopt-dkj-policy` Part 1 en 2 -- `.github/` (twee CI-gates, PR-template), `dkj-policy/CHANGELOG.md`, 13 config-functies, de constitutie-import in `CLAUDE.md`
- [x] Sylvester: `dkj-policy/releases/history.md` met een `0.x`-sectie, zoals in de zusterrepo
- [x] Cody: `scripts/lint/lint.ps1` als lint-poort (parse + ASCII van de .ps1-scripts), want open-pr weigert op VUL-IN
- [x] Sylvester: de drie Shopify-lenzen weg, `dkj-subagents-shopify` en `dkj-policy-bwj` uit in `.claude/settings.json`
- [x] Tessa: de roster in `SPECIALISTS.md`, de lens van Chris, de repofeiten in `.claude/rules/this-repo.md`
- [~] Part 3 (CI-floor), 4 (reach-label) en 5 (statusLine) van `adopt-dkj-policy`: niet in deze branch -- de 20 open `decide`-seams en deze drie delen staan in #1 en #2

### TEST

- [x] `scripts/lint/lint.ps1` is groen
- [x] `check-script-contract.ps1`: 0 errors
- [x] `check-roster-sync.ps1`: 0 errors, geen wezen

### DEPLOY: claude/specialisten-inrichten-v1

#### What does the change on this branch deploy to main?

##### Tier 0

De repo heeft nu een werkende werkwijze: een roster van 19 specialisten met hun routes, een
branch-taxonomie, de CI-gates en een lint-poort. Zonder deze branch weigerde open-pr te draaien.

**Score:** 4

<!--
     Is this change also relevant to management and the employer/commissioner? Then continue to Tier 1.
     If not, say so there in one line and put N/A in its Score.
-->

##### Tier 1

Alleen de werkwijze verandert; de app zelf bestaat nog niet.

**Score:** N/A

<!--
     Is this change also relevant to a subscriber of the service? Then continue to Tier 2.
     If not, say so there in one line and put N/A in its Score.
-->

##### Tier 2

Geen abonnee merkt hier iets van.

**Score:** N/A

#### Pull Request

Specialisten en workflow inrichten voor de app

