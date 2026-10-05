## app/monster-save-button

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

### CREATE

- [x] Monster popup: the mob select is a draft; Opslaan (always shown, disabled until another mob is chosen) commits it and closes the popup, closing without it discards it
- [x] Every popup with a draft (Monster, a stat, an ability point, a skill, an equipment correction): once something changed, the top-right ✕ becomes a ✓ that saves and closes, with a ✕ Annuleren beside it that discards; Escape and a tap outside still discard
- [x] The buttons keep their place in the tree, so the input below is not rebuilt and keeps its focus while typing
- [x] While a draft mob is shown, its database stats are read-only (corrections apply after Opslaan, since a new mob resets them)

### TEST

- [x] app.test.tsx: existing mob tests save via Opslaan; new test for draft, disabled button and discard on close that Opslaan closes the popup, the ✓ and Annuleren buttons, and that the input survives the button swap (1516 green)
- [x] Lint gate clean
- [ ] Dave looks at the popup on his phone before the merge (visible result)

### DEPLOY: app/monster-save-button

Choosing a mob in the Monster popup no longer applies at once: the choice is a draft until you tap Opslaan, which closes the popup like the other popups do, and closing the popup keeps the mob you had. In every popup with a change pending, the close button turns into a save tick with a cancel cross beside it.

**Score:** 2

#### What makes this deploy extra special

A player switching mobs now confirms the switch, so a slip in the list no longer throws away their own corrections to the old mob.

**Score:** 2

#### Pull Request

the Monster popup gets an Opslaan button for the chosen mob

