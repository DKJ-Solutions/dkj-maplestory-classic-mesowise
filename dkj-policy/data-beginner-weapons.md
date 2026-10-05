## data/beginner-weapons

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

Dave, October 5, 2026: "als ik nog lv. 9 ben, zorg dan dat ik ook beginner wapens kan kiezen. want nu beginnen de wapens pas bij lv 10". Rebecca read MeowDB: five weapons below level 10, none with a job rule or stat requirement (Sword 541, Hand Axe 576, Wooden Club 585, Razor 558, Fruit Knife 559).

### CREATE

- [x] `src/data/beginnerWeapons.ts`: the five weapons with level, W.ATK, speed and item page (retrieved 2026-10-05)
- [x] `src/equipment.ts`: price-less weapons for Thief and Bowman (all five) and Warrior (no daggers: no dagger multiplier known); not for the Magician (his weapon number is M.ATT, these have none)
- [x] `src/equipment.ts`: the weapon list sorted by level, lowest first, so the 8-result search shows them without typing
- [x] `src/app.tsx`: an item without a level requirement (level 0) shows no "lv 0" in the search list
- [x] Header of `beginnerWeapons.ts`: below level 10 the model stays the job's own (#171)

### TEST

- [x] `src/data/beginnerWeapons.test.ts`: the data, the multipliers, which job gets which, the sort, same item across jobs, stats and profile change
- [x] The two pinned weapon-list tests in `src/equipment.test.ts` updated
- [x] `npx vitest run` (1535 green) and `npm run lint`
- [x] Victor's review: no correctness bug; the model limit filed as #171, the Bowman shield slot as #172, "lv 0" fixed
- [~] Edith: no new UI text, only "lv 0" left out

### DEPLOY: data/beginner-weapons

Internal: a new data file with five MeowDB weapons and the weapon catalog sorted by level.

**Score:** 2

#### What makes this deploy extra special

A Beginner (level 1 to 9) can now pick the weapon in their hand: Sword, Hand Axe, Wooden Club, Razor and Fruit Knife, at the top of the weapon list for Thief, Warrior (no daggers) and Bowman. They have no price, so they are not in the weapon advice. An item without a level requirement no longer shows "lv 0" in the search list.

**Score:** 3

#### Pull Request

Beginner weapons below level 10 in the weapon list
