## app/bill-table

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

Dave, October 8, 2026, in three steps: put the advised rows in a table; give that table its own section like Based on;
then make Level cost one bill, grouped into the equipment you buy and the useables you use from 0 to 100% of the level,
whose two subtotals add up to Total cost. Dave chose five columns with a useable's quantity under Shop.

### CREATE

- [x] Bill components (BillHead, BillRow, totals) render table rows; BillTable wraps them in thead/tbody/tfoot inside `section.bill`
- [x] Level cost popup (Cheapest and Profile): one LevelBill with an Equip and a Useable group, each with a subtotal, and Total cost as their sum
- [x] CSS from grid columns to a fixed table layout, plus category and subtotal rows
- [x] Level cost bill without the Slot column (the slot stays in the row header for screen readers); quantities compact like amounts (12.2k)
- [x] One set of columns for both groups, an invoice's Item, Price, Qty, Level: a useable's unit price and count, an equip piece's shop price and the share of it this level pays; Level = Price × Qty
- [x] Qty column dropped again: the count (× 1.6k) or the share (13%) sits right behind the item name, columns Item, Price, Level
- [x] Price column dropped, the shop price stays in an item's info popup; Level renamed Mesos; Useable on top (it always costs mesos); a row with nothing in it is left out
- [x] The question mark sits right behind the amount behind the item name (and behind the Equip subtotal label); no column for question marks left
- [x] A Bill heading above the Level cost bill, styled like Based on:
- [x] The table head names the first cost group (Useable, or Equip without useables) instead of Item; that group drops its own category row

### TEST

- [x] Existing bill tests rescoped to the Equip group; new test: one table, two groups, subtotals sum to Total cost, equal to the Level cost button (Cheapest and Profile)
- [x] Full suite and lint gate green
- [ ] Dave has looked at the preview at phone width

### DEPLOY: app/bill-table

The advised bills are real tables now (thead, tbody, tfoot), each in its own section. The Level cost popup holds one bill, headed Bill like the Based on: section above it,
with two cost groups, Useable on top and Equip below, each with its own subtotal; the table head reads Useable and Mesos.
Behind the item name sits how much of it the level pays, a useable's count (written short, × 12.2k) or the share of an
equipment piece's price (13%), with the question mark that explains it right after. The shop price lives in the item's info popup, and a slot with nothing in it is left out.

**Score:** 2

#### What makes this deploy extra special

Level cost now shows the whole level on one bill: the equipment you buy and the potions and ammo you use from 0 to 100%,
each with a subtotal, adding up to the Total cost on the Level cost button. Before, the popup showed only the equipment,
so its total did not match the button.

**Score:** 4

#### Pull Request

Level cost as one bill, grouped into Equip and Useable

