## app/50-overall-slot

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

Dave decided on October 4, 2026 (#50): the equipment card gets an overall option that fills top and bottom at once.

**In scope:** the slot itself, plus the Thief's Sauna Robe in the worn items. Its numbers were measured on the raw page in #50.

**Out of scope:**
- The Magician robes: their numbers were read only through a summarizer. They are filed as #76.
- The Warrior overalls: they wait on #42 (held by another machine) and on #55. The stale `warrior.ts` line is noted on #42.

#### Visible result: Dave looks before the merge

The equipment card gets an Overall row. This branch is parked without a PR until Dave has looked at it at phone width.

### CREATE

- [x] Cody: `ArmorSlot` gains `'overall'`, and `EQUIP_SLOTS` gains the Overall row.
- [x] Cody: `changeEquipment` handles the swaps, with the WDEF arithmetic shared through `shiftWdef`. An overall clears top and bottom. A top or bottom clears the overall, and the other half becomes known-empty (`empty`, 0 WDEF).
- [x] Cody: in the upgrade advice, `replacedWdef` compares an overall with the worn overall, or with top + bottom.
- [x] Cody: the Blue Sauna Robe (1105, lv 30, WDEF 75) is in `wornItems.ts`.
- [x] Cody: stale "no overall slot" text is updated in `magician.ts`, `armor.ts` and `wornItems.ts`.
- [x] Cody, after the merge with main (#42, #55, #58, #64):
  - Conflicts resolved in `app.tsx`, `armorUpgrade.ts` and `wornItems.test.ts`.
  - The Warrior path handles `'overall'`: `SLOT_RANK` in `wornWarrior.ts`, and the stale line in `warrior.ts`.
  - The Sauna Robe (no job line, per #55) is in `COMMON_WORN_IDS`, so every class can enter it.
  - 904 tests pass and lint is clean.

### TEST

- [x] Tycho: 16 tests for edge cases: the swap chain 60 â†’ 80 â†’ 37 â†’ 80, old stored profiles, and an overall injected into the advice. `npm test` passes 749 tests, and `npm run lint` is clean.
- [x] Victor's review found nothing that blocks. The duplicate WDEF logic was merged into `shiftWdef`, and the unknown-vs-empty rule is documented. His two points for later went to #76.
- [x] Edith found no spelling errors. Her stale-text findings are fixed.
- [x] Dave looked at the equipment card on localhost and approved the merge (October 4, 2026).

### DEPLOY: app/50-overall-slot

Players can now enter an overall (such as the Sauna Robe) on the equipment card. Their WDEF stays correct when they switch between an overall and a separate top and bottom.

**Score:** 3

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Overall slot on the equipment card

