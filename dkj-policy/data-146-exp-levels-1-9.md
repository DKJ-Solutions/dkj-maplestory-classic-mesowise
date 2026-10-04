## data/146-exp-levels-1-9

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

- [x] Issue #146: below level 10 every advice that needs the cost of the level fell back to "niet uit te rekenen", because the EXP table started at level 10.
- [x] Source: NiaMeowDB, exp-table-level-1-to-100 (retrieved 2026-10-04); the page lists levels 1-49 as confirmed in the current game.

### CREATE

- [x] `src/data/expTable.ts`: levels 1-9 added (15, 34, 57, 92, 135, 372, 560, 840, 1,242), `FIRST_LEVEL` is now 1.
- [x] Tests that used level 9 as "outside the table" now assert that level 9 gets advice; level 31 stays the upper edge.

### TEST

- [x] Vera: levels 1-9 sum to 3,347, the page's cumulative EXP before level 10 (now a test).
- [x] `npx vitest run`: 1,410 passed.

### DEPLOY: data/146-exp-levels-1-9

The EXP table now starts at level 1 instead of level 10 (#146), so the level cost and the ATT, DEF, Skill and Mob advice work for a character below level 10 instead of saying "niet uit te rekenen". Levels 1-9 come from NiaMeowDB's EXP table and add up to the 3,347 EXP the page lists before level 10.

**Score:** 3

#### What makes this deploy extra special

A friend opening the app at a level below 10 now gets an answer: Dave hit the empty weapon advice at level 9.

**Score:** 3

#### Pull Request

EXP table: add levels 1-9
