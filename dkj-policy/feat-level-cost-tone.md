## feat/level-cost-tone

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

Dave (October 9, 2026): the red on both Level cost totals reads as "bad", but a level always costs something.
Cheapest is the floor, so it goes neutral. Profile is judged against Cheapest: close is green, far above is red.
Chosen bands: up to 10% above Cheapest is green, 25% or more is red, neutral in between.

### CREATE

- [x] `src/profileTone.ts`: pure `profileTone(cheapest, profile)` with the two thresholds
- [x] `LevelCostButtons`: Cheapest total uncoloured, Profile total gets `tone-close` / `tone-far` (nothing in between)
- [x] `style.css`: `.tone-close` green (`--gain`), `.tone-far` red (`--cost`)
- [x] Dave (same day): under the Profile total, how far it sits from Cheapest as a share of Cheapest ("+57% more expensive", "5% cheaper", "Same cost"),
      in the same tone; `profileShare` and `formatShare` beside `profileTone`, which now reads its share from `profileShare`

### TEST

- [x] `profileTone.test.ts`: the bands and their edges, Profile cheaper, Cheapest at 0
- [x] `profileTone.test.ts`: the share against Cheapest, none when Cheapest is 0, and its sign and rounding as text
- [x] `app.test.tsx`: Cheapest has no colour class and no share, Profile carries the tone and the share of its two totals
- [x] Typecheck and the full suite green
- [x] Dave looks at the colours on the phone before the merge (visible result): "ship it", October 9, 2026

### DEPLOY: feat/level-cost-tone

The two Level cost totals no longer share one alarming red. Cheapest is neutral, since a level always costs something and
Cheapest is the least it can cost. Profile is coloured against Cheapest: green up to 10% above it, red from 25% above it,
neutral in between. Under the Profile total the same share is written out, as in "+57% more expensive" or "5% cheaper".

**Score:** 2

#### What makes this deploy extra special

On the home screen you now see at a glance whether your own setup is close to the cheapest one, instead of two red numbers
that both look like a warning, and the percentage under Profile says exactly how far off it is.

**Score:** 3

#### Pull Request

Level cost: Cheapest neutral, Profile coloured by how far it sits above Cheapest

