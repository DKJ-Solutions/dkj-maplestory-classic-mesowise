## app/difference-summary-color

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

- [x] Iterated with Dave on the Difference card (colour, amount only, share under it, same layout, no minus, plain Profile colour, label, table column order)
- [x] Cody + Gwen: the Difference card is removed; Cheapest and Profile each become a card with a "Read more" button (the invoice), with one outlined "Difference" button (the table per kind of cost) in its own row between them, and a wider gap
- [x] Cody: both cards say how much cheaper or more expensive they are than the other (share of the other card's total), green or red; the totals stay neutral and carry no minus
- [x] Gwen: the Difference table's columns follow the cards: Cheapest, Profile, Difference
- [x] Tycho: the Level cost tests cover the two cards, the Difference row (and that it stays empty without a comparison), both shares and their colours, both buttons and the Difference popup

### TEST

- [x] Full Vitest suite and `npm run lint` green
- [x] Owner looked at the live preview and said "ship it" (visible result)
- [x] Victor (code review): no correctness bugs; three cleanups applied (share colour follows the rounded text, Difference popup closes when an invoice drops away, profileShare doc)
- [x] Edith (text): stale comments fixed in profileTone.ts, style.css and the tests; changelog sentence reworded

### DEPLOY: app/difference-summary-color

The Level cost section on the home screen no longer has a separate Difference card. Cheapest and Profile are now two cards, each showing what the level costs (without a minus sign) and, underneath, how much cheaper or more expensive it is than the other card, in green or red. Each card has a "Read more" button that opens the invoice behind the amount. Between the two cards sits one outlined "Difference" button that opens the table per kind of cost, whose columns now read Cheapest, Profile, Difference.

**Score:** 3

#### What makes this deploy extra special

A player sees at a glance, on the cards themselves, which setup is cheaper and by how much, in green or red.

**Score:** 3

#### Pull Request

Level cost as two cards, Cheapest vs Profile, each with Read more and Difference
