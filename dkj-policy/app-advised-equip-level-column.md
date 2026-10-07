## app/advised-equip-level-column

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

Dave, October 7, 2026: Advised: Equip gets a second amount column. The first (renamed from Mesos to Shop) is what you pay in the shop; the second (Level) is the share of that price this level pays, because you wear the piece until your next upgrade -- the existing write-off (writeOff.ts), which is the piece's line on the Advised invoice.

### CREATE

- [x] Equip card receives the Advised invoice lines; CheapestRows matches each bought piece to its shop line by familyName, as the invoice writes it
- [x] BillHead/BillRow/BillTotal: a with-level variant -- Shop and Level columns, two totals; Useable keeps Mesos
- [x] The ? popup of a bought piece shows the write-off steps (ShopSteps); the header help names Shop and Level
- [x] CSS grid for the with-level rows, slot column narrowed so the name stays readable at 360px

### TEST

- [x] New app test: headers Shop and Level, Level equals the invoice line per bought piece, empty for the rest, both totals, the ? popup
- [x] Typecheck and full suite green (1893 tests)
- [ ] Dave looks at the result (visible result)

### DEPLOY: app/advised-equip-level-column

Advised: Equip now shows two amounts per piece: Shop, what it costs in the shop, and Level, the part of that price this level pays because you wear it until your next upgrade. The Level total is what the Advised invoice counts for equipment.

**Score:** 3

#### What makes this deploy extra special

A player sees at a glance what a piece costs in the shop and what it costs this level, without opening the ? popup.

**Score:** 3

#### Pull Request

Advised: Equip shows the shop price and this level's share in two columns

