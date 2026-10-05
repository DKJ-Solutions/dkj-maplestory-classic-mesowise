## app/171-beginner-attack

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

Issue #171. The issue's reason was checked first and holds only in part: a Thief below level 10 cannot carry Lucky
Seven points (`skillPointCap` gives the job pool 0, and `parseProfile` refuses more), so he was calculated with the
**plain claw throw** (LUK primary, multiplier 2.5, the stars' W.ATT added and their recharge charged), not Lucky Seven.
A Bowman shot his bow and paid for arrows. Both are wrong for someone holding a Sword or a Razor. The Warrior was
already right (his `meleeAttack` without Power Strike is the Beginner swing), and the Magician has no attack below
10 (no suggestion, which is honest), so both stay as they are.

The facts (Rebecca, checked against the raw page by Vera, 2026-10-05,
[the damage guide](https://meowdb.com/msclassic/guides/explaining-the-damage-formula)): the stats are given per
weapon family, "Dagger, Claw: LUK, STR + DEX" and "Sword, Axe, Blunt...: STR, DEX"; "Dagger 1.0 2.0" (swing, stab),
and the guide's own expected multiplier "1.40 for Dagger" matches the repo's 60/40 split. That the per-family stats
hold for a Beginner is inferred (the guide never mentions a Beginner's attack), and the code says so.

### CREATE

- [x] `data/beginnerWeapons.ts`: `DAGGER` (multipliers + source), every weapon below level 10 carries its expected
  multiplier (daggers 1.4), `isBeginnerDagger`; the Warrior's list still leaves the daggers out.
- [x] `calc/mobModel.ts`: `beginnerAttack` (STR/DEX, or LUK/STR+DEX with a dagger; no skill, no ammo, no MP).
- [x] `profile.ts`: hidden 0/1 field `dagger` (like `bronzeArrows`), `attacksAsBeginner`, `weaponMult` and `dagger`
  read from the draft for a Thief or Bowman, and no star or arrow W.ATT below level 10 (`toCharacter`, `totalAttack`).
- [x] `equipment.ts`: a weapon pick sets `dagger`.
- [x] `suggest.ts`: `attacksOf`, the ammo cost and `statWindowRange` use the Beginner attack below level 10.

### TEST

- [x] Tycho: `src/beginnerAttack.test.ts` (the formula per weapon family with hand-derived values, who attacks as a
  Beginner, W.ATT without ammo, no ammo or MP cost, the stat-window range, the dagger/LUK switch, and that a level-10
  Thief and a level-9 Warrior are unchanged); `beginnerWeapons.test.ts` updated for the dagger multiplier and flag.
- [x] Victor's review: no formula or attack-path bug. Fixed: a stale `dagger` flag after switching to an own ("other")
  weapon, now cleared on any new pick (tested). Not taken: Auto assign still follows the job's main stat below level
  10, which is how a future Thief or Bowman builds and matches a dagger; a level-9 profile without a picked weapon
  counts as a sword (documented on the field).
- [~] Edith: no UI text added (the `dagger` field has no input), so there was nothing for her to read.

### DEPLOY: app/171-beginner-attack

Internal: `beginnerAttack` in the mob model, a hidden `dagger` profile field set by the weapon pick, the dagger
multiplier with its source, and `attacksAsBeginner` used by the attack, the ammo cost and the W.ATT.

**Score:** 2

#### What makes this deploy extra special

Below level 10 a Thief or Bowman is calculated as the Beginner he still is: he swings the weapon in his hand, with
no stars or arrows to pay for. A Sword, Hand Axe or Wooden Club hits with STR, a Razor or Fruit Knife with LUK
(NiaMeowDB's damage guide). Before, the app had him throw stars or shoot arrows he could not use yet, which made
EXP per meso below level 10 look better than it is. From level 10 nothing changes.

**Score:** 3

#### Pull Request

Below level 10 a Thief or Bowman attacks as a Beginner

