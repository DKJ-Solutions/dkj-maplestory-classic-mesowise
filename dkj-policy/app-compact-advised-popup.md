## app/compact-advised-popup

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

Dave, October 7, 2026: make the Advised equip popup compact. Each item slot gets at most one row, for example
"Weapon: Steel Igor (CLAW, LV 20, 17 ATT)", with a question-mark icon that explains why it pays to buy that piece.

### CREATE

- [x] `CheapestSlot.why` in `src/cheapestEquip.ts`: what a bought piece saves until your next upgrade, the piece it is bought with (a top and bottom replacing an overall), or that it is the required weapon for an empty weapon slot (#202)
- [x] `CheapestRow` in `src/app.tsx`: one line per slot with the slot, the name and "(type, LV, stat)"; the price and the reason sit behind a "?" per row (`cheapestWhy`); `weaponType` exported from `src/equipment.ts`
- [x] `.advised-*` styles in `src/style.css`: one line at 360px, the name truncates before the type, level and stat do
- [x] Three columns per row (slot, details, "?"), the slot column fixed so the details line up; a lower row with the "?" keeping its 44px tap target (Dave, October 7, 2026)
- [x] A fourth column with the shop price: of what you buy, and muted of a piece that does not pay (Dave, October 7, 2026)
- [x] No Report button in the Advised equip popup; Your character keeps it (Dave, October 7, 2026)

### TEST

- [ ] Tycho: existing tests on the new rows, plus tests for `why` and the row's "?"
- [x] Victor: code review, no correctness findings. Applied: the full name as a tooltip when it truncates, each row's "?" is labelled "Uitleg bij <slot>" for a screen reader. Left for Dave's look: the price per piece now sits only behind the "?", and an empty half next to an overall has no "?"
- [ ] Dave looks at it on a phone before the merge

### DEPLOY: app/compact-advised-popup

The Advised equip popup is compact: every slot is one line in four columns: the slot, the item such as "Steel Igor (CLAW,
LV 20, 17 ATT)", its shop price and a question mark. It has no Report button any more. What you buy
is in the accent colour. The price and why it pays off (what it saves until your next upgrade) sit behind a question mark at
the end of the line.

**Score:** 3

#### What makes this deploy extra special

The whole advice fits on a phone screen at a glance; the reasoning per piece is one tap away.

**Score:** 3

#### Pull Request

Advised popup: one row per item slot, the reason behind a question mark

