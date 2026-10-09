## app/free-job-weapons

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

Cheapest kept a Thief on the Fruit Knife at lv 10+: wearableSetup gives free gear only up to lv 9. Add Beginner's Garnier (Thief, Dave's word + MeowDB thief guide) and Beginner's Wooden Wand (Magician, MeowDB magician guide) as free from lv 10. Bowman/Warrior: no source, left out. Rebecca also found the repo's item ids (681, 664, 649, 561) may be stale COT1 ids; current are 2545, 2538, 2523, 2518 -- unverified, separate issue.

#### Findings not fixed here

- The repo's item ids for the beginner weapons (681, 664, 649, 561) may be the old COT1 ids; MeowDB now shows 2545, 2538, 2523, 2518 (Rebecca, 2026-10-09, unverified mapping). Not filed: `gh` is not installed on this machine.
- At lv 10 to 15 on a fixed mob such as Snail, the Fruit Knife stays cheaper than the free Garnier (no star recharge), so Cheapest keeps it there; that is the model's answer, not a missing option.

### CREATE

- [x] Cody: `src/freeJobWeapon.ts`, free weapon in `wearableSetup`, the Cheapest-only weapon shop and `preferFreeWeapon`; Magician wand data with its source
- [x] Cody: review round -- a higher typed attack is kept, the LUK 25 / INT 20 requirement is checked

### TEST

- [x] Tycho: `src/freeJobWeapon.test.ts` (level 9/10 boundary per job, invoice never charges the free weapon, fixed point after Overnemen, better claw or real dagger kept, both directions of `preferFreeWeapon`)
- [x] Victor re-review and Edith text read: Edith's four comment fixes applied; Victor's preferFreeWeapon requirement check removed (it read freshStart's default AP)
- [x] Lint gate green
- [ ] Dave has looked at the preview

### DEPLOY: app/free-job-weapons

From level 10 the app knows the weapon you get for free at your first job advancement: a Beginner's Garnier for a Thief (Dave, October 9, 2026, and the MeowDB Thief guide) and a Beginner's Wooden Wand for a Magician (the MeowDB Magician guide). An empty weapon slot is that weapon, unless you typed a higher attack or miss its LUK or INT requirement. Cheapest can switch a Thief from a beginner weapon such as the Fruit Knife to the Garnier without putting 5,000 mesos on the invoice, and does so where it makes the level cheaper. Warrior and Bowman are unchanged: no source says they get a weapon.

**Score:** 3

#### What makes this deploy extra special

A Thief or Magician from level 10 no longer sees Cheapest pay for a weapon they got for free at their job advancement.

**Score:** 3

#### Pull Request

Free job-advancement weapons for Thief and Magician

