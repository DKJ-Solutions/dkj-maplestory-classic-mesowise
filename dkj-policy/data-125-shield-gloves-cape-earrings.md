## data/125-shield-gloves-cape-earrings

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

Scope: every shield, glove, cape and earring up to level 30, the same bound as the other worn-item catalogs.
The set comes from MeowDB's `/msclassic/item-db/all` overview (the per-subtype listings render client-side
and could not be read), and every value from the item's own page.

### CREATE

- [x] Rebecca: source the four slots from NiaMeowDB, item page by item page
- [x] Vera: check completeness against `/item-db/all`, spot-check the doubtful rows, write `src/data/accessories.ts`
- [x] Cody: give each job's catalog the items it may wear; count catalog MDEF of these slots in the Magic Def
- [x] Filed #133: the Thief has a Shield slot (wristguards) that the app hides

### TEST

- [x] Tycho: `src/data/accessories.test.ts`, and the #117 tests in `equipment.test.ts` and `app.test.tsx` updated
- [x] Victor: code review of the diff
- [x] Lint gate and the full suite green

### DEPLOY: data/125-shield-gloves-cape-earrings

The Shield, Gloves, Cape and Earrings slots now have sourced items: 62 items up to level 30 from NiaMeowDB
(11 shields, 40 gloves, 1 cape, 10 earrings), each with its own item page and job line. A job only sees
what it may wear. A catalog item in these slots adds its MDEF to the Magic Def; an empty slot or an own
item still counts as nothing there.

**Score:** 3

#### What makes this deploy extra special

Dave and his friends pick their gloves, shield, cape and earrings from the list instead of typing the DEF,
and their earrings now show up in their Magic Def.

**Score:** 3

#### Pull Request

Sourced items for the Shield, Gloves, Cape and Earrings slots

