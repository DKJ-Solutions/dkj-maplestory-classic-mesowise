## app/boxed-formulas

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

Dave, October 8, 2026: from now on every formula is built like the stat factor popup -- each step in its own box, a
larger box around a smaller one, and only `=` and the result below it.

### CREATE

- [x] `MulCalc` draws the boxes itself: one around every step, consecutive × included (Dave: the skill percentage goes outside W.ATT × stat factor); the result has no label
- [x] Every sum behind a "?" in the potion, ammo and shop explanations is a `MulCalc`; a rounded-up result gets one line under it
- [x] The "Schade per aanval" popup is itself a formula (stars per attack × damage per star × hit chance); min and max per star each carry their whole chain, level difference and defense included, so the separate table rows are gone
- [x] The ammo popup ("Waarom 429?") is one formula, attacks per kill × stars per attack × kills, with each computed number opening its own formula; the one-line summary and the tables are gone, and the cost sits under Kosten as its own formula
- [x] The rule is in Gwen's lens, so the next formula follows it
- [x] Edith's wording points and Victor's review applied: rounding note uses the model's 1e-9 margin, the shop amount is computed from the EXP itself; the minimum-damage gap is #271

### TEST

- [x] `npx vitest run`: 1970 tests pass, three new ones pin the box rule; `scripts/lint/lint.ps1` is clean
- [ ] Dave looks at the popups in the preview before the merge

### DEPLOY: app/boxed-formulas

Every calculation behind a question mark in the Level cost explanations is now a stacked formula: one line per number with
what it is, each calculation step in its own box, and only the result below it. A result that was rounded up says so on one
line under the formula. `MulCalc` places the boxes itself, so a new formula only passes its numbers.

**Score:** 2

#### What makes this deploy extra special

Every "?" in the explanation of a potion, ammo or shop amount now shows its sum the same way: each number named, each step
boxed, so you can see what was divided by what.

**Score:** 2

#### Pull Request

Every formula in the explanations is built step by step in boxes

