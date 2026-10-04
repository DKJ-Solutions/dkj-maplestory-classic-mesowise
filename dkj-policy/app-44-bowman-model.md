## app/44-bowman-model

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

Issue #44: the Bowman becomes a computed job, like the Thief and the Warrior. The data (`src/data/bowman.ts`:
weapons, armor, arrows, skills, accuracy, with MeowDB sources) is already on `main`; this branch puts it to work.
The damage is the shared formula with DEX as the main stat and STR as the secondary one. Arrow Blow is the one
skill the model computes; Double Shot, Critical Shot, The Eye of Amazon and Focus are listed as not computed, with
the reason. The app uses the plain arrow (1 meso, 0 W.ATT); bronze arrows are #64. The session was interrupted
after the code and tests were written, and this was picked up from the working copy on October 4, 2026.

### CREATE

- [x] `bowAttack` in the mob model: DEX main stat, STR secondary, one hit and one arrow per attack
- [x] `src/bowmanGear.ts`: bows, crossbows and Bowman armor in the shared shop shapes, plus the plain arrow
- [x] Bowman skills, profile fields and expected accuracy/avoid; `isComputed` includes the Bowman
- [x] Skill-point, weapon and armor advice and the level-up question handle the Bowman
- [x] Screen: Bowman texts, hints and sources on the profile, equipment and skill cards

### TEST

- [x] `src/bowmanUpgrade.test.ts` and updates to the mob-model, equipment, profile, job, level-up, skill-point and
  app tests; typecheck and 954 tests green
- [x] Victor's code review and Edith's text read: no blocking findings; `mainStat` in `src/app.tsx` renamed to
  `requirementStat` (Victor), the SkillsCard comment names the Magician (Edith)
- [x] `main` merged in after Dave's approval: #69 keeps each stat requirement in its own stat, so the Bowman gear
  carries `str` instead of `luk`, `requirementStatOf` is gone in favour of `shortfall`, and the Bowman's main stat
  is DEX (listed first in what he lacks); `src/bowmanUpgrade.test.ts` and `src/profile.test.ts` follow; 956 tests green

### DEPLOY: app/44-bowman-model

A player can now choose Bowman and get real advice: the best training spot, what a level costs in mesos, whether a
new bow or crossbow or a piece of armor pays off, and where a skill point saves the most (Arrow Blow). The app counts
the plain arrow as ammo, and lists the Bowman skills it does not compute yet.

**Score:** 3

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Bowman in the mob model and on the screen

