## app/profile-stats-pencil

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

Dave, October 4, 2026: the stats on the character card change only through the pencil, as on the equipment
card; name and value share one row to save height; level, max HP, weapon attack and WDEF leave this card.
Later the same day: accuracy and avoid get an expected value, struck through beside the number when it was
corrected, as on the equipment card. The attack time briefly moved to the equipment card and, on Dave's word, back to the character card.

### CREATE

- [x] ProfileCard: one row per stat (name, value, pencil), editing only in the StatDialog popup with a draft
- [x] Level, Max HP, weapon attack and WDEF removed from the card (level and HP rise via Level up, the other two follow equipment)
- [x] Styling for the stat row and the popup without -/+ for the decimal attack time
- [x] `expectedStats.ts`: expected accuracy (stat part from the Thief guide + Nimble Body) and avoid (`baseAvoid`, floor(LUK/3) + floor(DEX/6) + 5 from the damage-formula guide, "Derived combat stats", checked against its own example) + Nimble Body
- [x] `StatLine`: the stat row with its popup as one component, shared by the character card (the equipment card's own popup body stays separate, #63)
- [x] Character card: the expectation struck through when the number differs, and in the popup the expectation and Reset

### TEST

- [x] Component tests updated and added: save only after Opslaan/Enter, discard on close, + steps, no inputs outside the popup, the four stats absent
- [x] `npx vitest run` (603 green), `npm run lint`, `scripts/lint/lint.ps1` clean
- [x] Code review (Victor) and proofread of the UI text (Edith): shared `stepValue` helper, typed hidden-stat set, an attackMs test and neutral popup comments taken in; merging the duplicated popup body filed as #63
- [x] Code review of the expected-value step (Victor): the error of weapon attack and WDEF now shows on the equipment card, where those stats come from; ranged ammo filed as #65
- [ ] Dave looks at the result at phone width before the merge

### DEPLOY: app/profile-stats-pencil

The character card is now read-only at a glance: each stat sits on one row with its value and a pencil, and a
change goes through the same popup as on the equipment card, saved only with Opslaan or Enter. Accuracy and avoid show the value the formulas expect, struck through beside the
number when your game differs, with Reset in the popup. Level, Max HP,
weapon attack and WDEF are no longer on this card.

**Score:** 2

#### What makes this deploy extra special

A player can no longer change a stat by an accidental tap or scroll, and the card takes far less height on a
phone; level, max HP, weapon attack and WDEF are set where they belong (Level up and the equipment card).

**Score:** 3

#### Pull Request

Character stats editable only via the pencil, like equipment

