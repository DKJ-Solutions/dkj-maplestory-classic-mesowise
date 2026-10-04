## app/63-stat-editor

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

- [x] `StatEditor` in `src/app.tsx`: the popup body (expected line, "<stat> in game", −/+ and the number, Reset and
  Opslaan) shared by `StatLine` (character card) and `EquipmentCard`; each card passes its own labels, bounds,
  step fallback, Reset target and what Opslaan does.
- [x] The one deliberate difference: integer fields on the character card now also carry `pattern="[0-9]*"`, as the
  equipment field already did (on iOS that opens the plain number pad).
- [x] Review: the equipment card's inline comment no longer repeats what `StatEditor`'s doc says.

#### For Dave's look

Open a stat popup on both cards at phone width: it should look and behave as before. Parked without a PR (visible
result).

### TEST

- [x] `npm run lint` (typecheck) clean; Vitest 696/696 green. The existing app tests already cover both popups
  (−/+ on both cards, the decimal attack time without −/+, the expected line, Reset, Opslaan only when changed,
  Enter saves), so no new test was added.

### DEPLOY: app/63-stat-editor

The stat popups of the character card and the equipment card are now built from one shared piece, so the two can
no longer drift apart. Nothing changes in what you see, except that integer stats on the character card open the
plain number pad on an iPhone, as the equipment stats already did.

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Shared StatEditor for the character and equipment stat popups

