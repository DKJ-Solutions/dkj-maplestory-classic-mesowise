## app/equipment-always-worn

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

Dave, October 4, 2026: a player always knows what they wear, and always wears something, so the
equipment dropdown loses "Weet ik niet" and "Niets". The internal not-yet-filled-in state stays (shown
as a disabled "Kies wat je draagt"), because filling a slot in for the first time must leave the
profile WDEF alone: that piece is already in the stat window total.

#### Second round: a search bar instead of the dropdown

Dave, October 4, 2026, before he had looked at the first round: the player searches for the item they
wear instead of picking from a dropdown, and can adjust the stat when the database differs from the
in-game value. What is searchable: the list is extended per item (Dave's choice), with items a Thief can
wear up to level 30, each with its MeowDB page and date, never a whole table. Items without a shop price
never enter the upgrade advice.

### CREATE

- [x] `equipment.ts`: drop `NONE`; a stored `none` loads as not filled in
- [x] `app.tsx`: dropdown without both options, disabled placeholder while a slot is unfilled; armor-advice texts no longer name "Weet ik niet"
- [x] "was" badge shows a shop item's own name (it fell through to "Ander item")
- [x] Rebecca: wearable Thief items lv 0-30 per slot, each with its MeowDB page
- [x] Vera: those items into `src/data/wornItems.ts`, each with source and date (118 armor, 6 claws, read from the raw item pages; Rebecca's summaries disagreed in places)
- [x] Cody: search bar per slot, own item when nothing matches, stat override with the database value beside it
- [x] Gwen: the look at phone width (two-line rows, tinted active row, dashed own-item row, amber override note)

### TEST

- [x] `equipment.test.ts` updated; 404 tests green, typecheck green
- [x] Victor (code): no findings; Edith (UI text): two shorter phrasings adopted
- [x] Tycho: tests for the catalog, the override and the new data (437 green)
- [ ] Victor (code) and Edith (UI text) on the second round
- [ ] Dave looks at the equipment card at phone width before the merge

### DEPLOY: app/equipment-always-worn

The equipment card no longer offers "Weet ik niet" or "Niets": every slot is either a shop item or
"Ander item". A slot that has not been filled in yet shows a disabled "Kies wat je draagt" until you
pick, and filling it in for the first time still leaves your WDEF as it was. A slot saved earlier as
"Niets" comes back as not filled in. The "was" badge now names the shop item you wore instead of
"Ander item".

**Score:** 2

#### What makes this deploy extra special

A player picks what they actually wear and is never offered a choice that cannot be true.

**Score:** 2

#### Pull Request

Equipment: no 'Weet ik niet' or 'Niets' choice, a player always wears something

