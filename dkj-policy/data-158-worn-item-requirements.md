## data/158-worn-item-requirements

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

Issue #158: the no-price items (worn items, Warrior colours, Bowman skirts, accessories) carry no stat requirements, so
the base-AP auto-fill (#157) treats them as having none. Give each its requirements from its own MeowDB item page.

### CREATE

- [x] Read the requirements block of all 236 item pages on 2026-10-05 (Rebecca, three batches); 12 unusual rows re-read independently and confirmed
- [x] `WornArmor` and `WornClaw` carry optional str/dex/int/luk, as `ArmorPiece` does; every row filled, only non-zero values (Vera)
- [x] `itemRequirements` (`src/equipment.ts`) also searches the no-price lists, the shop row first
- [x] The Warrior's no-price weapons carry STR and DEX too, so a row added later cannot lose them (found by Victor)

### TEST

- [x] Every row machine-compared with the MeowDB reads: 236 ids, 0 mismatches
- [x] A sample per list pinned in `src/autoFillAp.test.ts`; the two tests that used a no-price item as "unknown" now use an own item
- [x] Code review (Victor)

### DEPLOY: data/158-worn-item-requirements

The change is in the game data and the app; no repo tooling changed.

**Score:** 1

#### What makes this deploy extra special

Auto assign now knows the stat requirements of the items no NPC sells: the worn items, the other colours of the
Warrior armour, the Bowman's Able skirts, and the shields, gloves, capes and earrings. Each comes from that item's
own MeowDB page. So the secondary stat is set from everything you wear, and only an item you typed in yourself
counts as unknown.

**Score:** 3

#### Pull Request

Stat requirements for the no-price items

