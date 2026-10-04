## app/139-skill-stat-effects

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

Stacked on PR #140 (app/138-skill-next-level-mp, merged in, not rebased): the card lines this branch extends live there
(Dave chose stacking, October 4, 2026). #140 has to merge first.

#### Decisions

- **Buffs (Iron Body, Magic Armor, Focus) count as always on, with their upkeep MP counted** (Dave, October 4, 2026):
  MP per cast x 3600 / duration in seconds, added to the MP potions per hour.
- **The profile is entered WITHOUT buffs; passives are already in it.** The stat window includes passives (the
  Nimble Body precedent), so Nimble Body, Precise Strikes and Max HP Increase are not added again; buffs are added
  in `toCharacter`.
- **Iron Body is a percent of the stat-window DEF**, rounded down. The skill page says "+5% Weapon Def." and does not
  say of what; total DEF is the assumption.
- **Max HP Increase is a percent of base HP** (the data comment); a point scales the stat-window HP by
  (100 + new%) / (100 + old%). It counts through the "dangerous" check, which steers the best spot.
- **Card: cost with a − in red, gain with a + in green** (the requester, mid-build): "Nu: −15 MP per keer, +10 DEF (5%)".
  New tokens `--cost` and `--gain`, light and dark.
- **Max HP Increase scales the whole stat-window Max HP** (equipment and AP included); the page does not say of what.
  It only reaches the "dangerous" check, so an overstatement there is small (Victor).
- **Attack skills show their damage per use as the gain** (the requester, after the first look: "Double Stab only
  shows the MP"): "+2 × 80% schade", with "tot N monsters" for Slash Blast and Double Shot. Double Stab's damage
  was added to `data/thief.ts` from its skill page; Three Snails' flat damage and shell, and Slash Blast's HP, show
  too (the shell and the HP in red, as costs). Double Stab stays out of the advice: it needs a dagger, and the model
  knows the Thief with a claw. Disorder weakens the monster rather than giving you a stat, so it shows nothing.
- **Out of scope:** crit (Precise Strikes, Critical Shot): there is no crit damage in the damage guide, so it is only
  shown. Improved HP/MP Recovery's potion bonus is not a total: filed as #141.

### CREATE

- [x] `src/skillEffects.ts`: buff bonus with upkeep MP, effect text per skill, Max HP after a point
- [x] `toCharacter` adds the buffs; `hourPlan` adds the buffs' upkeep MP
- [x] Advice weighs Max HP Increase, Iron Body, Magic Armor and Focus, each behind its prerequisite level
- [x] Prerequisite levels in the data files, checked against the four skill pages (Vera, October 4, 2026)
- [x] Skillpoints card shows the effect now and at the next level, cost with − in red and gain with + in green
- [x] Attack skills show their damage per use; Double Stab and Three Snails damage added from their skill pages

### TEST

- [x] Tycho: 10 tests updated, 38 added (1263 to 1301); lint gate and vitest green
- [x] Victor: no blockers; max-level guard on `maxHpAfterPoint` and the HP assumption written down, taken along
- [x] Edith: no blockers; five comment wordings taken along
- [ ] Dave looks at the card at phone width (visible result)

### DEPLOY: app/139-skill-stat-effects

Skills that change a total now count in the calculation. Iron Body, Magic Armor and Focus are buffs: the model
assumes they are always on, adds their DEF, accuracy and evasion to the character, and charges the MP to keep them
up to the MP potions. Max HP Increase counts as Max HP. The skill-point advice weighs all four, each behind the skill
level it requires. The Skillpoints card shows what a skill gives next to its MP, now and at the next level, with the
cost as a red − and the gain as a green +; an attack skill shows its damage per use, and Slash Blast's HP and Three
Snails' shell show as costs. New module `src/skillEffects.ts`.

**Score:** 3

#### What makes this deploy extra special

The skill-point advice now weighs the defensive skills too. Magic Armor can be the best point for a Magician, and
the card shows what each point costs and what it gives back, in red and green.

**Score:** 3

#### Pull Request

Skill points count a skill's effect on the stat totals

