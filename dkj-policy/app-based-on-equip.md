## app/based-on-equip

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

Dave (October 8, 2026): Based on gets a third row, Equip, whose pencil opens a popup to select what you wear; the Wearing table then says per slot whether to upgrade now. The app gives the verdict (no player toggle); Advised shows the row read-only.

### CREATE

- [x] Third Based on row Equip in both sheets (`data-based-on-equip`): Wearing with an ACTUAL_ICON list of what you wear and a pencil that opens a pick popup hosting the existing slot popups; Advised read-only with EXPECTED_ICON
- [x] The Wearing table loses its per-row pencil; per slot a question mark gives Upgraden or Houden from the existing `cheapestWhy`, and an upgrade shows "Upgrade" in the Level column with the accent
- [x] `slotCovers` shared between Advised and Wearing; closing the Equip popup closes its nested popups; WORN_HELP describes the new flow

### TEST

- [x] Tests for the Equip row in both sheets, the pick popup (nested slot popup, Escape, focus return) and verdicts matching Advised's buy per slot; 1964 pass, `tsc` green
- [x] Code review by Victor
- [x] Dave judged it in the preview

### DEPLOY: app/based-on-equip

Slot selection in Wearing moved from the table rows to the popup behind the Equip pencil; the verdict reuses Advised's own reasoning, so the two tables cannot disagree.

**Score:** 2

#### What makes this deploy extra special

Level cost: Equip now shows under Based on which equipment it counts, and in Wearing you pick what you wear from that row. The table of what you wear tells you per slot whether to upgrade it now or keep it, with the reason behind a question mark.

**Score:** 4

#### Pull Request

Based on gets an Equip row, and Wearing says per slot whether to upgrade
