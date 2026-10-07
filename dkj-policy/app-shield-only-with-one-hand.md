## app/shield-only-with-one-hand

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

Dave, October 7, 2026: show the shield row only when a one-handed weapon is selected. Until now a Warrior and a Magician
always had it, and a Thief also with an empty weapon slot; only the Bowman's shield already depended on his weapon (#172).
One-handed: the weapons under level 10, daggers, the Warrior's 1H Sword, Axe and Blunt, and wands. Two-handed or unknown:
an empty weapon slot, staffs, 2H weapons, spears, polearms, claws, bows and crossbows, and a custom weapon unless a Thief
marked it a dagger (#176). A hidden shield slot counts nowhere (WDEF, MDEF, AP, advice), and picking a weapon that hides
it takes the shield off, as #172 already did for the Bowman.

### CREATE

- [x] `ONE_HANDED`, `holdsOneHanded` and `wearsSlot` in `src/equipment.ts`; `hasSlotFor`, `slotsFor` and `changeEquipment` use them. The catalogue keeps the job-level `hasSlot`, so a lookup by name still works without a weapon
- [x] `autoFillAp` passes the custom weapon's kind to `slotsFor`
- [x] Shoes sits directly under Hat in `EQUIP_SLOTS` (Dave, October 7, 2026)

### TEST

- [ ] Tycho: existing tests on the new rule, plus tests per job (1H against 2H, wand against staff, empty slot, custom dagger, a shield dropped on a switch)
- [ ] Victor: code review
- [ ] Dave looks at it on a phone before the merge

### DEPLOY: app/shield-only-with-one-hand

The Shield row now appears only next to a one-handed weapon: a weapon under level 10, a dagger, a 1H sword, axe or blunt
weapon, or a wand. With an empty weapon slot or a two-handed weapon (staff, 2H weapon, spear, polearm, claw, bow) it is
gone, and picking such a weapon takes a worn shield off, with its defence. Shoes now sits directly under Hat.

**Score:** 3

#### What makes this deploy extra special

The screen no longer offers a slot you cannot use in the game, and a shield you could not wear no longer counts in your
defence or the advice.

**Score:** 2

#### Pull Request

Shield row only next to a one-handed weapon

