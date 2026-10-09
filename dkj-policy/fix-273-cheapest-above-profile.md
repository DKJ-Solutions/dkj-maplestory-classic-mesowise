## fix/273-cheapest-above-profile

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

#### Why this branch was reworked

Cut by a sweep with option A (leave a point unspent when it raises the cost). Dave chose **option B** on
#273 (October 9, 2026): Cheapest always spends every skill point, and the player's own setup is a
candidate when it is cheaper. His correction on the same thread: "Cheapest total <= Profile total" holds
in full, also for a player who keeps their own gear and buys nothing. The mob case (Cheapest ranked mobs
on EXP per meso, not on the invoice) is fixed here too. The branch was resumed by `maikel-bwj` after the
sweep released the issue for pickup, and `main` was merged in (no rebase) because the branch predated
#271 and #275.

#### What was found along the way

The reason a point can raise the cost at all is that the attack model always fires a levelled attack skill
(Arrow Blow at level 20 cost a level-19 Bowman 18,920 meso in Blue Potions). Filed as #276, out of scope
here: option B makes the rule hold, and #276 is what would make Cheapest's own build cheaper.

### CREATE

- [x] Option A's line removed: Cheapest spends every skill point again (`src/cheapestSettings.ts`).
- [x] `cheapestFor` takes the player's own setup as Cheapest when it is legal for the level (no more base
  AP or skill points than the level gives) and cheaper than Cheapest's invoice total including the share
  of the shop price (`src/advisedSetup.ts`).
- [x] Cheapest picks its mob on the invoice total among the mobs that may be Best (`eligibleMobs`,
  `src/mobAdvice.ts`); a self-made spot without a mob stays.

### TEST

- [x] New #273 block in `src/advisedSetup.test.ts`: the Bowman level 10 case, Cheapest <= Profile for a
  player with Cheapest's weapon and for a player who keeps their own gear (4 jobs x 6 levels x 3 mobs),
  an illegal own setup is never adopted, and no eligible mob makes Cheapest's result cheaper.
- [x] The #263 test now holds the build (`advisedSetup(freshStart(...))`), since `cheapestFor` may now
  return the player's own setup.
- [x] Full suite 1,980 passed; `scripts/lint/lint.ps1` clean.

### DEPLOY: fix/273-cheapest-above-profile

Cheapest is never more expensive than your own setup. It still spends every skill point in the setup it
builds, but when your own setup is cheaper on the invoice and fits your level, Cheapest is your own
setup, with nothing to change or buy. Cheapest now also picks its mob on the invoice total rather than
on EXP per meso, so a mob that is cheaper on the bill (Snail for a level-15 Warrior) is no longer passed
over.

**Score:** 2

#### What makes this deploy extra special

The Level cost card no longer tells a player to switch to a setup that costs more than the one they
have: in 97 of 312 measured setups it did.

**Score:** 2

#### Pull Request

Cheapest is never more expensive than your own setup

