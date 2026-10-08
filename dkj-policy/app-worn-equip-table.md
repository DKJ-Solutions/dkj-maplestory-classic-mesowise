## app/worn-equip-table

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

- [x] Cody: the Equip popup "Your character" as the same compact table as Advised (BillHead/BillRow/BillTotal), tag "wearing", blue worn tokens, a pencil per row opening a slot popup with search, stat correction, dagger/claw and Helpful Stranger
- [x] Cody: `shopItem`/`shopPrice` in `src/equipment.ts`
- [x] Cody: no horizontal scroll, measured at 360 and 320 px (Chrome); no `overflow-x` guard needed
- [x] Victor and Edith review findings applied
- [x] Cody: the wearing popup is titled "Total cost: Equip" too, with "Based on:" Char and Mob from your own setup, each with a pencil to Ability points and Monster; editable popups carry the tag "edit"
- [x] "Your character" renamed to "Wearing" on the buttons and in Total cost

### TEST

- [x] Tycho: tests for `shopPrice` and the worn table (rows, total, slot popup, stat commit/discard); `npm run lint` clean, `npx vitest run` 1957/1957
- [x] Dave looked at the preview and approved it (October 8, 2026), with "Your character" renamed to "Wearing"

### DEPLOY: app/worn-equip-table

Internal: the Equip table parts (`BillHead`, `BillRow`, `BillTotal`) now serve both popups, and a shared `shopItem` lookup feeds the shop price and the stat requirements.

**Score:** 2

#### What makes this deploy extra special

"Your character" is now called "Wearing". In the Equip card it shows what you wear as "Total cost: Equip" in the same compact table as Advised, in blue: per slot the item, its shop price and its ATT or DEF, with the total below, and "Based on:" your own character and mob, each with a pencil to change them right there. A pencil per row opens that slot to change the item or correct its stat, and every popup where you change something says "edit" above its title. Neither popup scrolls sideways on a phone.

**Score:** 3

#### Pull Request

Equip popup Your character as the same compact table as Advised, labelled wearing, without horizontal scroll

