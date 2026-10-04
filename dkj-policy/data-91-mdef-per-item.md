## data/91-mdef-per-item

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

Issue #91: source the MDEF of every item the app already contains, and make Magic Def on the Total stats card a
read-only line derived from the chosen equipment. Visible result, so the branch is parked for Dave's look, with no PR.

### CREATE

- [x] Rebecca: every item page in the app read on MeowDB for an M.DEF line on 2026-10-04 (261 rows, four parallel
  batches). Outside the Magician armor, which already had it, only the Bronze Pride (809) has one: M.DEF+18. No weapon has any.
- [x] Vera: spot-checked the one positive (809) and the one weakly worded answer (War Bow, 663) again; both hold.
  A reported level mismatch on three level-0 tops collapsed on re-reading (the pages show no REQ LEV), so it was not filed.
- [x] Cody: optional `mdef` on `ShopArmor` (absent = 0), Bronze Pride row, `mdef` in the armor catalog,
  `wornMdef` in `src/equipment.ts`, and the Magic Def line on the Total stats card as read-only via `derived`;
  while a slot is open or holds a custom item, the line stays the hand-entered field (a Magician has no catalog yet, #43).
- [x] Victor: an empty overall now reads top and bottom (`isEmptyEntry`), and the hand-entered fallback above. Edith: hint and wording.

### TEST

- [x] Tycho: `wornMdef` (sum, overall against top + bottom, the known-empty half, unknown and custom slots, a corrected
  DEF, an empty overall), a data pin (only the Bronze Pride in the Thief, Warrior and Bowman armor) and an app test on the card
  (hand-entered until the last slot, then derived). Full suite 988/988, typecheck clean.

### DEPLOY: data/91-mdef-per-item

The Total stats card now fills in Magic Def itself from your equipment, as it already did for Attack and Weapon Def: the MDEF
of your hat, top and bottom (or overall) and shoes, read-only once all of those are picked from the list; until then, or with
a custom item, you still fill it in yourself. Every item
page was checked: of the items the app knows outside the Magician's, only the Bronze Pride gives MDEF (18).

**Score:** 2

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Source MDEF per item and derive Magic Def from the equipment

