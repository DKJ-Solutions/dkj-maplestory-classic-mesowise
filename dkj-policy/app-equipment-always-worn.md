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
- [x] Cody: search bar per slot, own item when nothing matches, stat correction in a popup
- [x] Gwen: the look at phone width (one row per slot, outlined corrected value, bottom-sheet popup)

### TEST

- [x] `equipment.test.ts` updated; 404 tests green, typecheck green
- [x] Victor (code): no findings; Edith (UI text): two shorter phrasings adopted
- [x] Tycho: tests for the catalog, the override and the new data (437 green)
- [x] Victor (code) and Edith (UI text) on the second round: fixed a claw stat override resetting a hand-set attack speed, stored stats now saved as they count (clamped), Escape-then-arrow highlighting, own-item row offered unless the text is an exact name; "Ander item" renamed "eigen item" throughout (439 green)
- [x] Dave, October 4, 2026: expected (database) and in-game stat side by side, in-game always overrules
- [x] Victor (code) and Edith (UI text) on the final layout: fixed a tap on empty popup space discarding the draft, the iOS keyboard not opening from the item name, and stale comments and DEPLOY text (440 green)
- [x] Merged main (55 commits: job selection #41, Warrior data, one card design, component tests #40): the catalog follows the job (empty outside Thief, like shopItems did), equipmentForJob and loading per job kept without "Niets"; Tycho rewrote the equipment component tests for the search bar and the popup (577 green); the "was" badge naming a shop item fixes #52
- [x] Dave looked at the equipment card at phone width and approved the merge (October 4, 2026)

### DEPLOY: app/equipment-always-worn

The equipment card no longer offers "Weet ik niet" or "Niets": a player always wears something. Each
slot is now a search bar: type the name of what you wear and pick it from the list, which covers the
shop items plus the other hats, tops, bottoms, shoes and claws a Thief can wear up to level 30 (124
items, each read from its own NiaMeowDB page). If the list does not have it, use your own text as an
own item. Each slot is one row: the item name, the ATT (weapon) or DEF (armor) that counts, and a pencil,
with a line between the slots. The value comes from the database until you correct it: the pencil opens a
popup (a sheet at the bottom of a phone) that shows the expected value ("Verwacht volgens de database")
and the value in your game ("ATT in game" or "DEF in game") with − and + buttons (tap the number to type
over it). "Reset" puts the database value back, and an "Opslaan" button appears once the value differs;
closing without it discards the change. A corrected value is outlined, with the expected value small and
struck through beside it; the value from your game always overrules the expected one. A slot not filled
in yet shows a search prompt, and filling it in for the first time still leaves your WDEF as it was; a slot saved earlier as
"Niets" comes back as not filled in. Items without a shop price never enter the upgrade advice.

**Score:** 3

#### What makes this deploy extra special

A player finds what they wear by searching, among far more items than the shop sells, and can correct
the value when the database is off.

**Score:** 3

#### Pull Request

Equipment: search for what you wear, with a correctable stat and the Thief items up to level 30

