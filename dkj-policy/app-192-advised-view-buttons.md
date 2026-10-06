## app/192-advised-view-buttons

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

- [x] Cody: shared `ViewButtons` (Advised first, then Your character) on Equip, Skillpoints, Monster, Potions, Ability points and Total stats; Advised popups read-only from the live `cheapestSettings` result; report inside the popup; Cheapest renamed to Advised
- [x] Review fixes from Victor and Edith (no card error in Advised, accessible name `Advised: <card>`, "Advised equip", stale comments, small cleanups)
- [x] Total cost: a Setup block with six card icon buttons under both invoices, opening the card's own popup (state lifted into `CardViewContext`); icons in a button follow the button colour; Setup styled as a muted section label apart from the invoice total (Dave, October 6, 2026)

### TEST

- [x] Tycho: coverage for button order, read-only Advised popups per card, report placement, focus return, no-advice case (mocked), no visible "Cheapest" label, the six Total cost buttons and the Setup heading; Victor's test findings fixed (setup helper left the Monster popup open, a tautological test replaced); `npm test` (1776) and `npm run lint` green
- [ ] Dave looks at the preview at phone width before the merge (visible result)

### DEPLOY: app/192-advised-view-buttons

Every card with a choice in it now works like Equip: no eye in its head, but two buttons under it, **Advised** first and
then **Your character**. Advised opens the card's popup read-only, filled in with the advised setup (the live result of
the cheapest free settings from #183): its monster on Monster, its potions on Potions, its skill points on Skillpoints,
its base AP on Ability points, and the stats that follow from that AP on Total stats. Your character opens the popup as
before, to change your own setup. The card's Report button moved into the popup, at its bottom, in both views. The label
**Cheapest** is now **Advised** everywhere it meant that setup: the Equip button, the Total cost heading and the
Difference column. Under both invoices in Total cost a **Setup** block says the total is calculated with this setup and
holds six icon buttons, one per card, each opening that card's popup for that part; the Advised part's Equip button
shows the equip that invoice uses (what you wear, as **Advised equip**). A shared `ViewButtons` component and a
`CardViewContext` that holds which card popup is open replace the Equip-only buttons.

**Score:** 3

#### What makes this deploy extra special

On every card you first see what the app advises and then compare it with your own setup, before you decide to copy it,
and Total cost shows which six cards its numbers come from.

**Score:** 3

#### Pull Request

Advised and Your character buttons on every card

