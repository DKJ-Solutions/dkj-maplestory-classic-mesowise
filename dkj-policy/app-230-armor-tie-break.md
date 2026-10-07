## app/230-armor-tie-break

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

### CREATE

- [x] Measured on main across every monster, job, gender and level 8 to 30: real ties within half a meso occur for a Warrior (e.g. lv 25 on Bubbling, two body pairs at 13,500 and 9,100 mesos, 0.47 meso apart, with the dearer one first). None of them flipped the piece shown per slot in today's data
- [x] `armorUpgrade.ts`: sort the choices by net saving rounded to whole mesos, then the lower price, then the higher WDEF (top and bottom together for a pair) (`byChoice`, as in `clawUpgrade.ts`)

### TEST

- [x] New test in `armorUpgrade.test.ts`: an injected twin of the best piece with 1 WDEF more, priced to give 0.1 meso more net, loses to the cheaper original (fails on the old sort, passes now)
- [x] New test: every equal rounded net in the advice is ordered by price, then WDEF, for levels 10 to 30
- [x] `armorUpgrade.test.ts` green (112 tests)
- [x] Code review (Victor)

### DEPLOY: app/230-armor-tie-break

When two armor choices save the same to the whole meso, the armor advice now puts the cheaper one first, and at the same price the one with more WDEF. Before, shop order or rounding noise decided, so a tiny model change could flip the pick (#230).

**Score:** 2

#### What makes this deploy extra special

In today's data no slot's advice changes. Where two pieces save within half a meso of each other, the app now steadily advises the cheaper one.

**Score:** 1

#### Pull Request

Break an equal-saving armor tie on price, then defence

