## data/64-bronze-arrows

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

Issue #64, decided by Dave on October 4, 2026: bronze arrows count behind a switch the player turns on ("I have
Helpful Stranger"); with the switch off only the plain arrows count. This branch is step 1, the data. The switch
itself belongs on the screen once the Bowman is computed (#44, parked with `awaiting-pull`), so #64 stays open.

### CREATE

- [x] Rebecca checked the raw pages: items 210 and 214 (W.ATK+1, 2 mesos, only Raymond), Raymond's shop
  (npcs/232, "(Helpful Stranger+)" on both rows) and the Bowman class guide (level 22, 2,000 contribution)
- [x] `HELPFUL_STRANGER_ARROWS` and `HELPFUL_STRANGER_SOURCES` in `src/data/bowman.ts`, apart from
  `NPC_ARROWS`, which stays the switched-off list; the header says why

### TEST

- [x] Tycho: two tests pin the bronze rows and the rank's sources; the test that keeps bronze out of
  `NPC_ARROWS` stays; typecheck clean, vitest 718 of 718 green

### DEPLOY: data/64-bronze-arrows

The Bowman data now holds the bronze arrows (+1 W.ATT for 2 mesos an arrow), each with its source, in a list of
their own: Raymond sells them only from the "Helpful Stranger" citizenship rank, so they count only once the
player says they have it. Nothing changes in the app yet; the switch comes with the Bowman calculation (#44).

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Bronze arrows in the Bowman data, behind the Helpful Stranger rank
