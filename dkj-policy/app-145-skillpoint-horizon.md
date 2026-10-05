## app/145-skillpoint-horizon

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

Issue #145, decided by the owner on October 4, 2026: the skill-point advice weighs a point over a fixed horizon of 5
levels (the current level plus the 4 after it), cut off where the EXP table ends, as the upgrade advice does.

#### Design choice

A sum with one fixed EXP per meso (as `horizonCost` does for equipment) would only rescale the saving and never change
which skill wins. So each level of the horizon is evaluated with the profile at that level (`profileAfterLevelUp`:
level +1, Max HP per job and the level part of accuracy, the same source rules as `applyLevelUp`), because the mob
model depends on the character level. AP and skill points the player places stay as they are.

### CREATE

- [x] `src/profileLevelUp.ts`: `profileAfterLevelUp` on a numeric profile; `OWN_AP` moved here from `levelUp.ts` (Cody)
- [x] `src/skillPoint.ts`: `SKILL_HORIZON_LEVELS`, `skillHorizon`, horizon cost for base, choices, placement and robustness (Cody)
- [x] `src/app.tsx`: the skill advice speaks of "over lv X t/m Y" and names the EXP-table cut-off (Cody)
- [x] Guard: a level outside the table gives no advice instead of throwing (found by Tycho)

### TEST

- [x] Horizon tests: bounds and cut-off, `profileAfterLevelUp` against `applyLevelUp` for all four jobs, an independently summed base, a real ranking that flips with the horizon (Magician on Dark Axe Stump), app wording at lv 11, 26, 27 and 30 (Tycho)
- [x] Code review (Victor)
- [x] Dutch UI text (Edith)

### DEPLOY: app/145-skillpoint-horizon

The change is in the app only; no repo tooling or data changed.

**Score:** 1

#### What makes this deploy extra special

The skill-point advice now weighs a point over the coming 5 levels (your level and the 4 after it) instead of the
current level alone, because a skill point stays forever. Each of those levels is calculated with your character at
that level, so a skill that pays off a little later can win now. The advice says which levels it counts, such as
"Bespaart 4.606 meso over lv 14 t/m 18", and from level 27 on it says the EXP table stops at level 30.

**Score:** 3

#### Pull Request

Skill points: weigh a skill's saving over the coming 5 levels

