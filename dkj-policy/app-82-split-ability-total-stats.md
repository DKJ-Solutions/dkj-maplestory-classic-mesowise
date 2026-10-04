## app/82-split-ability-total-stats

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

Dave chose: regroup only, no new calculation fields. Then, on the preview: add INT after all ("vergeet INT niet"), and give Total stats its own collapsible card ("TOTAL STATS krijgt gewoon zijn eigen dropdown").

### CREATE

- [x] Cody: the "Je karakter" card becomes "Ability points (<job>)" with STR, DEX, INT, LUK (`ABILITY_KEYS` in `src/profile.ts`)
- [x] Cody: new collapsible "Total stats" card with Accuracy, Evasion, time per attack and the Warrior weapon multiplier, plus the hints that belong to them; both cards share `StatsCard`
- [x] Cody: new profile field `int` (default 4, stored, used in no calculation); the "Avoid" label and hints say "Evasion"
- [x] Cody: a character error shows on the card that holds the offending field
- [x] Cody: the full in-game Total stats block (Dave: "waar is de rest van de total stats?"): new informative fields Attack, Magic, Magic Def, Crit. Rate, Crit. Damage, Speed, Jump (stored, never block the calculation, kept out of the level-up check panel); Weapon Def shows the existing `wdef` read-only
- [x] Cody: Attack is read-only and comes from the equipment (Dave: "waarom staat attack nu op 0?"): weapon attack, plus the stars for a Thief, through the same helper `toCharacter` uses; the stored `attack` field is dropped

### TEST

- [x] Tycho/Cody: two-card tests for Thief and Warrior, error-routing tests per card, and an older stored profile without `int` loading INT 4, in `src/app.test.tsx` and `src/profile.test.ts`; plus the full Total stats order and informative fields that never block the calculation; and Attack from the equipment for Thief and Warrior; `npm test` 914/914, `npm run lint` clean
- [x] Victor (code review, four times; `toCharacter`'s weapon attack unchanged for every job) and Edith (UI text): no blocking findings

### DEPLOY: app/82-split-ability-total-stats

The "Je karakter" card is split into the two blocks of the in-game stat window, each its own collapsible card: **Ability points** (STR, DEX, INT, LUK) and **Total stats** (Attack, Weapon Def, Magic, Magic Def, Accuracy, Evasion, Crit. Rate, Crit. Damage, Speed, Jump, then time per attack and, for a Warrior, the weapon multiplier). INT, Magic, Magic Def, Crit., Speed and Jump are new: they are stored with your profile but not used in any calculation yet, and leaving one blank never blocks it. Attack and Weapon Def come from your equipment: Attack is your weapon's attack, plus your stars for a Thief. "Avoid" is now called "Evasion", as in the game. An error now shows on the card that holds the field (#82).

**Score:** 2

#### What makes this deploy extra special

The character cards read like the stat window in the game, so filling in your stats means copying block by block.

**Score:** 2

#### Pull Request

Split the character card into Ability points and Total stats
