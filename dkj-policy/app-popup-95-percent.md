## app/popup-95-percent

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

#### Decisions

- "The screen" under the first popup is the app column: the phone width, on a computer 32rem like `main`.
- Only the width scales; the height still follows the content, capped at the screen minus 2rem.
- The menu drawer keeps its own width and does not count as a layer.
- This replaces the 1rem minimum margin of October 5, 2026: at 390px a first popup now leaves about 10px per side.

### CREATE

- [x] `src/style.css`: `.stat-dialog` width is `min(100vw, 32rem) * --popup-scale`; the fixed `.item-dialog` width is gone
- [x] `src/app.tsx`: `StatDialog` sets `--popup-scale` to `0.95^(depth + 1)`, with depth counted over enclosing popups except the menu drawer

### TEST

- [x] `src/app.test.tsx`: an info popup on top of the Advised popup has a scale of 0.95 times the popup below it, down to the app; vitest 1946/1946 green, lint clean

### DEPLOY: app/popup-95-percent

Every popup is 95% as wide as whatever lies below it: the first one 95% of the app column, a popup on top of it 95% of that. A stacked popup is visibly a second layer without shrinking by a fixed amount.

**Score:** 2

#### What makes this deploy extra special

Popups use almost the full phone width, so more fits on a line, and a popup opened from another popup stays recognisable as one layer up.

**Score:** 3

#### Pull Request

Every popup is 95% as wide as the screen below it

