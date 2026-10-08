## app/home-only-level-cost

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

Step 1 of a no-scroll home screen: hide every card except Level cost; their popups must keep working.

### CREATE

- [x] Home screen hides every card except Level cost; their popups keep working, and the estimate note moves to Help in the settings menu
- [x] Equip labels renamed to No upgrades, items equipped and Upgrades subtotal; the ammo the bill uses counts among your equipped items
- [x] Ammo explanation ("Hoezo 429?") rebuilt: end formula on top (attacks per kill × stars per attack × kills), two sub-questions with a highlighted answer each, then the costs
- [x] Every computed number in the explanations gets a question mark with its own popup; fixed data gets none
- [x] Damage worked out in its own popup as a stacked formula (skill damage × W.ATT × stat factor), the stat factor stacked again in its own popup, with nested boxes showing what goes through 100
- [x] Stacked formulas in the font of the skill rows, numbers and operators lined up across the boxes, fitting a 360px screen

### TEST

- [x] `npx vitest run`: 1967 tests pass; `npm run lint` (tsc) is clean
- [x] The stat factor popup checked at 208px (its width on a 360px screen) in headless Chromium against a static copy of the markup and CSS
- [x] Dave reviewed the visible steps in the preview and said to ship it (October 8, 2026)

### DEPLOY: app/home-only-level-cost

The home screen shows only the Level cost card. Behind the number of throwing stars on the bill, the explanation now reads top
down: attacks per kill × stars per attack × kills, then why that many attacks on this mob, why that many kills, and what
recharging costs. The damage per attack opens as a stacked formula, and the stat factor in it opens as its own stacked sum, with
boxes around what is divided by 100.

**Score:** 3

#### What makes this deploy extra special

Opening the app now lands straight on what a level costs, and every number in the throwing-stars explanation can be tapped to
see where it comes from, down to your own LUK and STR + DEX.

**Score:** 3

#### Pull Request

Home screen shows only Level cost, with the ammo bill explained step by step
