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

Issue #126: one card on the home screen instead of three. "Wat kost dit level?" stays the card's `h2`;
the skill point and the weapon become `h3` sub-questions under it, because #25 and #26 are the
sub-questions of #24. Visible result, so Dave looks before the merge.

### CREATE

- [x] `LevelAdviceCard` in `src/app.tsx` wraps the three parts (`LevelCostPart`, `SkillPointPart`,
      `ClawUpgradePart`) in one `section.card.level-cost`; a job the app cannot compute shows only `NotComputed`
- [x] `src/style.css`: a rule between the parts and a smaller `h3`

### TEST

- [x] `src/app.test.tsx`: one `.level-cost` card on the home screen, holding both sub-headings (Magician)
- [x] `npx vitest run` (1180 passed) and `npm run lint` green
- [ ] Dave looks at the merged card at phone width

### DEPLOY: app/126-merge-home-cards

The home screen no longer shows three advice cards in a row. One card answers "Wat kost dit level?",
with the skill point and the new weapon below it as sub-questions, each under its own rule.

**Score:** 2

#### What makes this deploy extra special

The level-up question, the skill point and the weapon now read as one answer instead of three loose
cards, so the home screen is shorter on a phone.

**Score:** 3

#### Pull Request

Merge the level-cost, skill-point and weapon cards into one home card

