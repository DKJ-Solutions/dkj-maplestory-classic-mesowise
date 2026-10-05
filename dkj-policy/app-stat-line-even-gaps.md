## app/stat-line-even-gaps

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

Dave, October 5, 2026: every column in a stat line should have exactly the same gap; the pencil felt much closer than
the rest. Measured: every grid gap was 0.75rem, but on an Ability points line the `+` and `=` columns sat between the
boxes, so box to box was 2.25rem while the last box to the pencil was 0.75rem.

- [x] Find the cause: the sign columns, not the gap value

### CREATE

- [x] `src/style.css`: on an Ability points line box to box is 1.5rem (0.375rem gap, 0.75rem sign, 0.375rem gap) and the last box to the pencil the same (0.375rem gap plus 1.125rem in the last column, pencil on the right). A first try at 0.75rem everywhere squeezed the `+` between its boxes (Dave, October 5, 2026)

### TEST

- [x] `npx vitest run`: 1416 passed; `scripts/lint/lint.ps1`: clean
- [~] The spacing: CSS only, which jsdom does not compute -- Dave judges it by eye

### DEPLOY: app/stat-line-even-gaps

The change is in the app UI only; no repo tooling or data changed.

**Score:** 1

#### What makes this deploy extra special

On an Ability points line the boxes and the pencil are now evenly spaced: the pencil no longer sits closer to the last
box than the boxes sit to each other.

**Score:** 2

#### Pull Request

Every gap in a stat line the same

