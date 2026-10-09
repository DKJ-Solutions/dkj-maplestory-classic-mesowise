## app/level-cost-why

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

Dave (October 9, 2026): "zet een vraagteken icoon achter de berekende mesos bij cheapest en profile". A visible result,
so the branch stops for Dave's look before the merge.

### CREATE

- [x] Cody + Gwen: each Level cost part is a `.level-cost-part`, with the open button stretched across it and the text on top, so the question mark after the amount is a button of its own rather than a button inside a button
- [x] Cody: short explanations behind the question mark, CHEAPEST_TOTAL_WHY and WORN_TOTAL_WHY

### TEST

- [x] Tycho: the existing Level cost tests follow the new structure; a new test checks the question mark sits right after the amount, outside the open button, and opens its explanation without opening the bill
- [x] `npm run lint` and the app suite green (333 tests)
- [x] Victor and Edith read the diff: the help popup inherited `pointer-events: none` from the part (fixed in the CSS), and the Profile explanation no longer promises a percentage that is not always there
- [ ] Dave looks at it at phone width

### DEPLOY: app/level-cost-why

On the Level cost card a question mark now sits right after the Cheapest and Profile amounts. Tapping it explains in a
short popup how that amount is calculated: the potions and ammo for 0 to 100% of the level, plus, for Cheapest, part of
the price of the equipment it buys. For Profile it also explains the percentage underneath. Tapping anywhere else on the
part still opens the bill, as before.

**Score:** 2

#### What makes this deploy extra special

You can see what the number on the home screen stands for without having to open and read the whole bill.

**Score:** 2

#### Pull Request

a question mark behind the Cheapest and Profile amounts in Level cost explains how each is calculated

