## app/auto-assign-future-items

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

Dave, October 5, 2026: Auto assign put every AP but the worn requirements on LUK, so a Thief without a DEX item kept DEX 4.
The secondary stat must also cover items still to be worn. Chosen horizon (menu): every catalog item of the job that the
current level allows, worn or not. Custom ("Anders") items keep counting as no requirement; no requirement fields added.

### CREATE

- [x] `src/autoFillAp.ts`: `catalogNeed` takes the highest secondary requirement of every catalog item at or below the level; capped so the main stat still meets what is worn; a tie goes to the worn item
- [x] `src/app.tsx`: the comment above the button describes the new rule

### TEST

- [x] `src/autoFillAp.test.ts`: new cases for unworn items, the level limit, the tie and the cap; worn-item cases moved to levels where the catalog does not ask more
- [x] `src/autoFillAp.items.test.ts`: the whole-catalog property now includes the catalog floor on the secondary stat; level 199/200 now fit under 999
- [x] `npm run lint` and the full Vitest suite green (1513 tests)
- [ ] Victor's review

### DEPLOY: app/auto-assign-future-items

`autoFillAp` now also reads the job's catalog up to the entered level for the secondary stat, not only the equipment slots.

**Score:** 2

#### What makes this deploy extra special

Auto assign now sets the secondary stat (DEX for a Thief) high enough for every item your level lets you wear, not just what you have on, so the next claw or armor piece fits without redistributing AP.

**Score:** 3

#### Pull Request

Auto assign sets the secondary stat for every item your level allows, not only what you wear

