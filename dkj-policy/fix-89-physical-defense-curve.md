## fix/89-physical-defense-curve

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

#### Scope

Issue #89: the mob model's step 2 subtracted a monster's WDEF from a physical hit (x 0.5 on the max, x 0.6 on
the min, marked as an assumption), while the damage guide the Magician data cites divides by (DEF + 100). One
of the two had to go. The 1% per level damping in the same step stays an assumption (#20).

### CREATE

- [x] Read the raw guide (meowdb.com/msclassic/guides/explaining-the-damage-formula, October 4, 2026), section
  "Defense": "Normal defended hit = Raw × 100 / (EffectiveDEF + 100)" and "Physical and magic defense use the
  same curve with different stats". So a physical hit uses that curve with the monster's WDEF
- [x] `src/calc/mobModel.ts`: `defended(raw, def)` with that source, used for step 2's min and max hit

### TEST

- [x] `mobModel.test.ts`: #89's own example (DEF 50, hit 100 → 66.7), DEF 0 leaves the hit whole, a full
  `estimateMob` on the curve, and the floor of 1 under an extreme WDEF (the old test relied on the subtraction
  going negative)
- [x] `npm run lint` clean, 923 of 923 tests pass

### DEPLOY: fix/89-physical-defense-curve

The app now lowers your hits on a monster with the defence formula from MeowDB's damage guide (your hit × 100 /
(the monster's WDEF + 100)) instead of an unsourced subtraction. Against a monster with 50 WDEF a 100-damage
hit now counts as 67 instead of 70 to 75, so spots with tougher monsters can rank a little lower.

**Score:** 2

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Physical damage uses the sourced defence curve, not a WDEF subtraction
