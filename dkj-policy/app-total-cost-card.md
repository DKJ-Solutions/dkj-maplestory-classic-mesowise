## app/total-cost-card

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

- [x] Dave (October 6, 2026): a Total cost card, subtitle "This is how much mesos you need to level", with an invoice of
  the potions a level needs and the total price. Ammo and travel are lines too when they cost anything, so the total
  matches the level cost on the Report card.

### CREATE

- [x] Cody: `resolvePlan` out of `resolveSpot` (one source for the hour plan), `src/levelInvoice.ts`, the TotalCostCard
  above Report
- [x] Gwen: invoice layout (amounts right-aligned, red with a minus, total under a line), duration in minutes under an
  hour; checked at 360 px
- [x] Victor and Edith: review; no calculation findings. "Ammo" for jobs that throw nothing, "0 meso" for a free level, a duration of 59.5+ minutes reads "1 uur", doc comment back on the card

### TEST

- [x] Tycho: `src/levelInvoice.test.ts` (total matches the level cost up to rounding each line up, chosen potions, ammo per
  job, own potion costs) and app tests for the card; 1660 tests green, lint clean
- [ ] Dave looks at the card before the merge

### DEPLOY: app/total-cost-card

A new Total cost card above the Report card shows, as an invoice, what your current level costs: how many of each potion
you need (the potions you picked on the Potions card), the stars or arrows, and travel when it costs anything, each with
its price, and the total underneath. It calculates with the same mob, kills and potions as the Report card, so the total
is the same amount, give or take rounding each count up to whole potions. A line above the invoice says which level, on
which mob, and roughly how long it takes.

**Score:** 3

#### What makes this deploy extra special

A player sees before levelling exactly what to buy and what it costs in total.

**Score:** 3

#### Pull Request

Total cost card: an invoice of the potions and mesos a level needs
