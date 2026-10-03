## chore/1-decide-seams

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

Dave beantwoordde op 3 oktober 2026 de decide-seams van #1 in een vragenronde. Drie wachten op de stackkeuze: Get-TestCommands, Get-CiTestCheckName en Get-ExpectedRepoSettings.

### CREATE

- [x] De zeventien antwoorden als functies in scripts/repo-config.ps1 gezet (Sylvester)

### TEST

- [x] check-script-contract: 0 errors; nog 3 UNANSWERED, alle drie bewust open tot de stackkeuze
- [x] Get-ReleaseMajorMinMinors 0 gecontroleerd tegen release-lib: de poort weigert alleen bij minors < drempel

### DEPLOY: chore/1-decide-seams

#### What does the change on this branch deploy to main?

##### Tier 0

De shared scripts draaien hier nu op antwoorden die Dave koos in plaats van op fallbacks: releases zijn voor de gebruikers (tier 2), minor en major krijgen een release note, een major komt wanneer de developer het zegt, en de statusLine is afgeslagen. Drie seams wachten op de stackkeuze.

**Score:** 2

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

Geen gebruiker merkt hier iets van.

**Score:** N/A

#### Pull Request

De decide-seams beantwoord die niet op de stack wachten

