## app/185-default-potion-per-effective-point

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

#### The issue

#185: the default potion (nothing chosen) was picked per raw point at module load, while `potionAdvice` ranks per point
you actually use (#181). Rank the default with the same measure, for the profile.

#### What holds today

With the current database the two measures pick the same potion at every bar: the Orange Potion is both the cheapest per
raw point and the smaller potion, so it is never capped harder than the White Potion (and the Magician's Orange likewise
against the Lemon and the Blue Potion). The disagreement #185 describes appears only once a bigger potion that is cheaper
per raw point enters the data. So this changes no number today; it keeps the default and the advice on one measure.

### CREATE

- [x] `cheapestPotions(job, bar)` in `src/potions.ts` ranks per point you actually use (`perPoint`, the advice's own
  measure), first on a tie; without a bar it stays `HP_POTION` / `mpPotionFor`. `databasePotion`, `resolvePotions` and
  `fixPotion` take the bar too.
- [x] Callers pass the profile: the app (`usedPotions`, the Potions card, the correction), and `cheapestSettings` through
  `profileOf` and a new `usedPotions` helper. `potionFactorOf` now takes only the two recovery fields.
- [x] Comments in `potions.ts`, `suggest.ts` and `profile.ts` say which measure picks the default.

### TEST

- [x] `src/potions.test.ts`, "de keuze van de app per punt die je echt gebruikt (#185)": without a profile the old pick;
  with one a potion the job can buy; for every job and four bars (tiny, small, large, with Improved Recovery) the advice
  never tells a fresh profile to leave the app's default; a choice still wins over the bar.
- [x] Typecheck clean; potions and cheapestSettings suites green (the full gate runs in ship-pr).

### DEPLOY: app/185-default-potion-per-effective-point

Without a potion chosen, the app now picks its default potion the way the potion advice ranks potions: per point you
actually use, with your Max HP and MP and Improved HP and MP Recovery, rather than per point printed on the potion. The
default and the advice can therefore no longer disagree, which kept a fresh profile from being told to switch away from
the app's own pick. With today's potion data both measures pick the same potion, so no number changes; the guard matters
once a larger potion that is cheaper per point enters the data.

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Pick the default potion per effective point for the profile
