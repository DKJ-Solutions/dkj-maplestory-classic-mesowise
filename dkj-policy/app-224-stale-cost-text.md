## app/224-stale-cost-text

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

Decision on #224 (2026-10-07): reword the mana help text, remove the `rankSpots` potion/ammo messages
if no screen can show them, otherwise reword them; tidy the "eigen plek" comments.

The "fill" messages cannot be removed: `rankSpots` is a pure module and must still reject a NaN. They
are unreachable in the app today (a spot without a plan fails on EXP per hour first), so they are
reworded instead. The EXP-per-hour and travel "Vul ... in" messages have the same defect, since the
player enters neither, so all four are reworded together.

### CREATE

- [x] `rankSpots.ts`: the four "fill" messages say the value is unknown instead of asking the player to fill it in
- [x] `app.tsx`: the mana help text says the extra mana is always in the potion costs
- [x] `best.ts`, `spotDraft.ts`, `suggest.ts`: "eigen plek" comments say "zonder bekende plek (alleen in tests)"

### TEST

- [x] `rankSpots.test.ts` pins the new messages; full suite green (1939 tests), lint clean
- [x] Dave looked at the mana help text and the messages before the merge (visible result): "ship it"

### DEPLOY: app/224-stale-cost-text

The app no longer asks the player to fill in potion, ammo, EXP-per-hour or travel values it does not
let them enter. The skill help text says the extra mana is always included in the potion costs, and
an invalid spot says which value is unknown.

**Score:** 2

#### What makes this deploy extra special

A player no longer reads a help line or an error that points at a field that does not exist.

**Score:** 2

#### Pull Request

Stop asking the player for potion and ammo costs they can no longer enter

