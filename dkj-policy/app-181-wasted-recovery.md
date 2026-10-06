## app/181-wasted-recovery

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

- [x] Cap a potion's restore at what is missing when you drink, with the drink moment as a stated assumption
  (half a bar, `ASSUMPTIONS.drinkAtPct = 0.5`, to be measured in #20).

### CREATE

- [x] `effectiveRestore` in `src/calc/mobModel.ts`, used through `potionRestore` in `src/suggest.ts` by the hour plan
  and the invoice, and in `src/potions.ts` by the potion info and the advice ranking (Cody).
- [x] Invoice and potion info lines say when the cap applies (Cody, wording by Edith).

### TEST

- [x] Dedicated tests on the cap in the model, hour plan, advice, invoice and app wording; re-pinned armor and claw
  values verified by hand from the raw inputs (Tycho). Code review (Victor) and text review (Edith), findings applied;
  the default potion per raw point filed as #185, the drink moment added to #20.

### DEPLOY: app/181-wasted-recovery

A potion that restores more than you are missing no longer counts as fully used. The app now assumes you drink at half
a bar, so a potion counts for at most half your Max HP or Max MP: at Max HP 444 a potion counts for at most 222 HP, and
the rest is paid for and lost. Potion counts, the level's meso cost, the potion advice ("cheapest per point") and the
upgrade and skill-point savings all use what you actually restore; a big potion that overfills your bar is no longer
called the cheapest. The Total cost card's "Hoezo?" explanation and the potion's meso per point on the Potions card say
when this applies. Without a Max HP or Max MP in your profile nothing is capped, as before.

**Score:** 3

#### What makes this deploy extra special

The cost of a level no longer flatters large potions on a small bar, which is where low-level players lose mesos.

**Score:** 2

#### Pull Request

Count wasted recovery when a potion restores more than you are missing

