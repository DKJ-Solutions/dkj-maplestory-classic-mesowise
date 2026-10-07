## app/222-remove-no-plan-fallback

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

Follow-up of #216 (PR #223), found in its review. In production, a spot without a computed plan always has an empty EXP per
hour, so it ranks as invalid and `levelInvoice` returns `none` before its fallback runs. The `SpotDraft.potions/ammo` fields
have no screen that sets them. Both go. The text the player sees that still mentions potion costs is a visible result: #224.

### CREATE

- [x] Cody: `levelInvoice` returns `none` without a plan (the lumped `Potions` line and the no-`why` ammo line are gone), `UseableRows` loses the "Bedrag" row, and `SpotDraft.potions/ammo` are removed from the type, `mobDraft`, `toSpot` and storage. `toDraft` and `exampleSpot` are removed; `newDraft` stays as a test helper
- [x] Storage still loads old rows that carry `potions`/`ammo`, and drops those fields

### TEST

- [x] Tycho: the own-spot test helpers now put their cost in `travel` (same cost sum, same rankings), and a back-compat test for old stored rows was added. `npm test` green (1910), `npm run lint` clean
- [x] Victor: no number the app shows changes; the safety of the zero cost in `toSpot` now rests on the EXP per hour staying empty, and the `toSpot` comment says so

### DEPLOY: app/222-remove-no-plan-fallback

The level invoice no longer has a fallback for a spot without a computed plan, and saved spots no longer carry potion and ammo costs. Neither could be reached from the app any more, so no number changes. Spots saved by an older version still load; their old potion and ammo values are dropped. The failure it prevents: a stored cost that no screen shows quietly entering the ranking again.

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Remove the unreachable no-plan invoice fallback and the draft potion and ammo fields

