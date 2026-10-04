## app/141-potion-recovery-skill

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

#### The issue's open questions, answered

- **Does the bonus apply to every potion?** Both MeowDB skill pages say "HP/MP recovered from items", with no
  potion named, so it is applied to every potion the app picks (Orange, Blue, the Magician's Orange and Lemon).
  Because it is the same percentage on every potion, the cheapest potion per point stays the same.
- **The per-10-seconds recovery** stays out: the HP page gives no number, and the MP one is a share of Max MP,
  which the profile does not have.

### CREATE

- [x] Cody: `potionFactorOf` in `src/suggest.ts` turns the skill level into a factor (1 at level 0, 1.05 at 1, 1.2 at 15); `MonsterSuggestion.potionFactor` carries it and `hourPlan` divides HP and MP potions by heal x factor
- [x] Cody: Improved HP Recovery joins `WARRIOR_MODELLED` and Improved MP Recovery joins `MAGICIAN_MODELLED` in `src/skillPoint.ts`, so the skill advice can recommend them; both leave the "Niet doorgerekend" lists

### TEST

- [x] Tycho: the factor table by hand (levels 0, 1, 14, 15, above max, HP and MP apart), `hourPlan` with factor 1.2 (a sixth fewer potions, EXP and ammo unchanged), a Warrior with the skill on 15, a point in either skill saving mesos; the lists and choices in the existing tests updated; vitest 1272/1272 green, typecheck clean
- [x] Victor: no blocking findings; his readability point taken (`itemRecoveryFactor` with an early return). Edith: the only UI text change is two names leaving the "Niet doorgerekend" list
- [x] Lint gate clean
- [ ] Dave looked at the skill advice and the "Niet doorgerekend" line

### DEPLOY: app/141-potion-recovery-skill

A point in Improved HP Recovery (Warrior) or Improved MP Recovery (Magician) now counts in the potion cost:
each potion heals 5% to 20% more, so the model needs that many fewer potions per hour. Both skills are now
options in the skill advice and no longer listed under "Niet doorgerekend". The per-10-seconds recovery is
still not counted.

**Score:** 3

#### What makes this deploy extra special

A Warrior or Magician sees what a point in their recovery skill saves on potions, and the advice can now
recommend it when it beats a damage skill.

**Score:** 3

#### Pull Request

Count Improved HP/MP Recovery's potion bonus in the potion cost

