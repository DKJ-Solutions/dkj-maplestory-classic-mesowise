## app/118-overall-unknown-wdef-pair

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

Issue #118, Victor's finding on #87, which merged in PR #121 before this fix could join it. The armor advice
keyed the top + bottom pair and the bare half on a KNOWN overall WDEF, so an overall worn with an unknown DEF
(a custom item without a stat) never opened the pair.

- `WornWdef` gets `overallWorn`; `wornWdef` sets it whenever an overall is filled in, and `wearsOverall` is the one gate.
- `replacedWdef` ignores top and bottom while an overall is worn: what a top, bottom or overall replaces is then
  the worn overall, unknown if its WDEF is.
- Point 2 decided: a bare half's horizon against a later overall keeps counting the best other half of that level
  (you buy the bare half separately, and the advice offers it), pinned by a test.

#### Visible result

The verdict now reads "Koop A (Top) en B (Bottom)" or "Je Bottom is dan leeg." also with an overall of unknown DEF.
Dave looked at the preview and said "ship it" (October 4, 2026).

### CREATE

- [x] `src/armorUpgrade.ts`: `WornWdef.overallWorn`, `wearsOverall`, `replacedWdef`, the pair and `bare` gates, the point 2 note in the header
- [x] `src/equipment.ts`: `wornWdef` reports a filled-in overall
- [x] `src/app.tsx`: `replaceClause` reads `win.bare` only; the fallback for an unknown overall is gone

### TEST

- [x] `src/armorUpgrade.test.ts`: `replacedWdef` with `overallWorn`; a new describe for #118 (Thief pair and bare halves
  without a shop overall, equal to an empty worn apart from those, and the point 2 horizon by hand with an injected overall)
- [x] `src/equipment.test.ts`: `wornWdef` reports `overallWorn`, also with unknown DEF
- [x] Victor's review: clean, no blocking findings
- [x] `npx vitest run`: 1183 passed; `npm run lint`: clean

### DEPLOY: app/118-overall-unknown-wdef-pair

The Defense advice now also offers a top and bottom bought together when you wear an overall whose DEF the app
does not know (an item of your own without a number). A single top or bottom then says that the other half is
left bare, as it already did for an overall with a known DEF.

**Score:** 2

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Armor advice: an overall with unknown DEF opens the top + bottom pair
