## app/126-merge-home-cards

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

Issue #126: one card on the home screen instead of three. After the first preview Dave named what the card is
for (issue comment, October 4, 2026): three advices, each lowering the cost of the level. Does an equipment
upgrade pay off, does switching mob pay off, does a skill point pay off with its extra mana counted. On the
mob question he chose the mob over the spot (#122: "mob is het belangrijkste omdat dit hp, exp etc heeft"), so
#122 is absorbed here. Visible result, so Dave looks before the merge.

### CREATE

- [x] Brought the branch up to date with `main` (it was cut before #124 replaced the spot list with the Monster card)
- [x] `src/mobAdvice.ts`: the hunted mob, with your own corrections, next to every other mob in `MOBS`; the cheapest
      safe one wins, a dangerous mob is never advised
- [x] `LevelAdviceCard` in `src/app.tsx`: "Wat kost dit level?" with the amount, then three questions with a chip,
      each under a rule: equipment (weapon and armor in `EquipQuestion`), mob (`MobQuestion`) and skill point
      (`SkillQuestion`, with its MP line and the "Punt zetten" button); a job the app cannot compute shows only `NotComputed`
- [x] `Question` takes `part`, to render as a block in the card instead of a card of its own
- [x] The advice screen after a level-up asks "Moet ik van mob wisselen?" instead of the hunting-ground question;
      `huntingGroundAdvice`, `bestSpotOf` and the best spot kept for undo are removed with their tests
- [x] Removed what only the old home parts used: three weapon sentences and the `.choices` style

### TEST

- [x] `src/mobAdvice.test.ts`: none without profile, mob or table level; stay on the winner; switch from a dearer
      safe mob; never a dangerous mob; your own numbers count
- [x] `src/app.test.tsx`: one card with the three questions in order, three chips and an MP line (Magician);
      equipment names wands and staffs; the advice screen asks the mob question; "gezet" shows on the screen you are on
- [x] `npx vitest run` (1208 passed), `npm run lint` and `scripts/lint/lint.ps1` green
- [x] Dave looked at the card and approved it ("ship it")

### DEPLOY: app/126-merge-home-cards

The home screen has one card instead of three. It answers "Wat kost dit level?" and then the three questions
that make the level cheaper, each with a Ja/Nee chip: equipment (weapon and armor together), switching mob,
and a skill point, with the extra MP of an attack skill named. The mob question compares the mob you hunt
with every other mob in the data and never advises a dangerous one. It also replaces the hunting-ground
question on the advice screen after a level-up, which could only ever answer "stay" since #124.

**Score:** 3

#### What makes this deploy extra special

At every level the player sees on one card whether to buy equipment, switch mob or place a skill point,
instead of a level cost and two loose cards that disappeared when there was nothing to say.

**Score:** 4

#### Pull Request

Merge the level cost and the equipment, mob and skill-point advice into one home card
