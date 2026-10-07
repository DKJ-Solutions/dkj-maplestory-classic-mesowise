## app/216-remove-own-amounts

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

Dave's decision on #216 (October 7, 2026): remove the own potion and ammo amounts as dead code. No screen sets them and
`initialDrafts()` clears them on load, so no reachable path changes a number. The no-plan invoice fallback and the
`SpotDraft.potions/ammo` fields stay; review found them unreachable too, and that is #222.

### CREATE

- [x] Cody: drop `ownAmount` (levelInvoice, starUpgrade), the draft override of potions and ammo in `resolveSpot`, `OWN_AMMO` and the `ownCost` parameter of `countedAmmo`, and the "Eigen bedrag" handling in `UseableRows` and `cheapestWhy`
- [x] Comments and the lumped-potions help text no longer speak of amounts the player typed in (Edith's and Victor's points)

### TEST

- [x] Tycho: own-amount tests removed; the end-to-end `resolveSpot` into `rankSpots` test restored without own amounts; a test for the kept lumped-potions fallback added. `npm test` green (1910), `npm run lint` clean
- [x] Victor: no correctness finding; stored drafts with own amounts are neutralised at load, so numbers are unchanged

### DEPLOY: app/216-remove-own-amounts

The own potion and ammo amounts are gone from the calculation: the level invoice, the star-upgrade advice and the spot ranking always count potions and ammo from the app's own estimate, and the "Eigen bedrag" ammo verdict is removed. No screen could set an own amount any more, so no number in the app changes. The failure it prevents: old stored spots carrying an amount reviving a path no test covered and no popup explained.

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Remove the unreachable own potion and ammo amounts

