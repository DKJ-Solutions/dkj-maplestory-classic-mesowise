## app/123-remove-map-data

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

Issue #123: the app has only used mobs since October 4, 2026, so the five maps in `src/data/spots.ts` (`KNOWN_SPOTS`, with
`knownSpotPatch` and `monsterLevels`) are data the app no longer uses. Move the test fixtures that still build on them to
`mobDraft(...)` and delete the map data. Saved map drafts are already dropped at load (`src/app.tsx`), so nothing visible changes.

### CREATE

- [x] Delete `KNOWN_SPOTS`, `knownSpotPatch` and `monsterLevels` from `src/data/spots.ts`; `findKnownSpot` now looks up mobs only
- [x] Drafts in the tests use `mobDraft(...)`: the Rain-Forest map becomes the Ribbon Pig (the monster the model already picked there), the subway map the Bubbling
- [x] Tests that run the model over several monsters at once get `mobGroup(...)` (`src/testing/mobGroup.ts`), names only, no map data
- [x] `spots.test.ts` checks the mobs themselves (sources, finite numbers) instead of the maps

### TEST

- [x] Claw and Warrior upgrade scenarios that leaned on the switch between Pig and Ribbon Pig are re-set on one mob: claw on the Pig (the "no winner" case on Bubblings, the "not robust" case with an own spot just below the Pig), Warrior on the Stump, with the Dark Stump where damage has to count
- [x] `npm run lint` clean, `vitest run`: 51 files, 1614 tests green

### DEPLOY: app/123-remove-map-data

The five training maps are gone from the app's data (#123). The app has only calculated with the mob you hunt since
October 4, and a saved map was already dropped when the app loads, so nothing changes on screen. The repo now carries
only the game data the app actually uses, and the tests that were built on the maps now run on single mobs, the way
the app itself calculates.

**Score:** 2

#### What makes this deploy extra special

Nothing a player notices: the maps had already left the screen on October 4.

**Score:** N/A

#### Pull Request

Remove the map data (KNOWN_SPOTS) now that the app only uses mobs
