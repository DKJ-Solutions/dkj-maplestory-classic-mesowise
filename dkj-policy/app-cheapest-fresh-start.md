## app/cheapest-fresh-start

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

Dave, October 8, 2026 (#263): Cheapest should work out by itself which setup gives the lowest cost, taking only job and
level from the profile. Then, for the Overnemen part: compare the player's setup with Cheapest's, and say "al de
goedkoopste" when the player's level is not dearer than Cheapest.

### CREATE

- [x] `freshStart`: Cheapest's input from job, level, gender and a valid Max HP only (empty equipment, no mob, no potion choice, default stats, no skill points)
- [x] `cheapestFor`: runs the setup from that start, with the changes (`changesBetween`) and the saving measured against the player's own setup
- [x] "Je setup is al de goedkoopste" when the player's level is not dearer than Cheapest; the Cheapest help text says it builds from job and level alone

### TEST

- [x] Unit tests: the fresh start keeps only job, level, gender and Max HP; the same setup comes out for a filled-in and a clean profile, also one with too many skill points, for all four jobs; the changes are measured against the player's setup
- [x] App tests updated: Cheapest buys its own weapon even when you wear one; after Overnemen your level is not dearer than Cheapest
- [x] Full suite and lint gate green
- [x] Victor's review: fixed the 1st-job skill point below level 10 in the fresh start, Double Stab missing from the change list, a guard so Overnemen never writes a profile the app cannot compute, and the help text; dead code noted on #260
- [x] Marlowe's second read: the framing points (saving and "al de goedkoopste" compare a from-scratch build with owned gear; Overnemen overwrites SP, AP and equipment) are handed to Dave as one decision
- [ ] Dave has looked at the preview

### DEPLOY: app/cheapest-fresh-start

Cheapest's input is built by `freshStart` from job, level, gender and Max HP only, and `cheapestFor` measures its changes and
saving against the player's own setup. "Al de goedkoopste" now means the player's level is not dearer than Cheapest.

**Score:** 2

#### What makes this deploy extra special

Cheapest now works out the whole setup by itself from your job and level: skill points, AP, equipment, mob and potions. What
you filled in no longer gets in the way, so a profile with a mistake (more skill points than your level allows) no longer
leaves Cheapest with only a question mark. Overnemen lists what changes from your own setup to Cheapest's.

**Score:** 4

#### Pull Request

Cheapest builds its setup from job and level alone
