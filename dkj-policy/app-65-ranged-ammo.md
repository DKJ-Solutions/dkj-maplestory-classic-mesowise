## app/65-ranged-ammo

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

Dave, October 4, 2026 (#65): let the player pick their ranged ammo for the extra weapon attack: throwing stars
for a Thief (Subi or another), arrows when the job is Bowman.

Design: the chosen star writes its weapon attack and recharge price into the profile (`starWatk`,
`starRecharge`, default Subi), the way the claw writes `clawWatk`, so every calculation that reads the profile
counts the star without a new parameter. Arrows are offered for the Bowman but change nothing yet, because the
Bowman is not computed.

### CREATE

- [x] Data (Rebecca → Vera): `THROWING_STARS` in `src/data/thief.ts`, items 294-300 on NiaMeowDB, each with
  weapon attack, recharge per star, level 10 and whether an NPC sells it (only Subi and Wolbi); Subi's existing
  values re-checked
- [x] Profile: `starWatk` and `starRecharge` (`AMMO_FIELDS`), on no card; `toCharacter` adds `starWatk`, and
  `hourPlan` takes the recharge price from the suggestion instead of Subi
- [x] Equipment: an `ammo` slot ("Stars", or "Arrows" for a Bowman), stars for the Thief and the NPC arrows for
  the Bowman; picking a star sets its weapon attack and recharge price in the profile
- [x] Screen: the slot under the Weapon, the stars' source in the card's source line, the character card's hint updated

### TEST

- [x] Tests for the slot, the catalogue per job, the profile update (star, corrected star, own item, arrows),
  loading old storage, the weapon attack in the mob model, the recharge cost per hour and the screen
- [x] `npx vitest run` (712 green), `npm run lint`, `scripts/lint/lint.ps1` clean
- [ ] Code review (Victor) and proofread (Edith)
- [ ] Dave looks at the result at phone width before the merge

### DEPLOY: app/65-ranged-ammo

The equipment card gets a slot for your ranged ammo. A Thief picks their throwing stars (Subi, Wolbi, Mokbi,
Kumbi, Tobi, Steely or Ilbi), and the advice counts their weapon attack and their recharge price. A Bowman picks
arrows there, which the app shows but does not count yet. Without a choice the app still counts with Subi.

**Score:** 3

#### What makes this deploy extra special

A Thief who uses better stars than Subi now sees advice that counts them: more damage per throw, and the
recharge price of those stars in the cost per hour.

**Score:** 4

#### Pull Request

Choose your ranged ammo on the equipment card: throwing stars (Thief) and arrows (Bowman)

