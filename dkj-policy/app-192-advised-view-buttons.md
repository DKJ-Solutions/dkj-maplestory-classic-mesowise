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
- [x] Total cost: six card icon buttons under both invoices with one sentence above them, set apart from the invoice total by a thin line, opening the card's own popup (state lifted into `CardViewContext`); icons in a button follow the button colour; a "Setup" heading was tried and removed (Dave, October 6, 2026)
- [x] Invoice: a question mark behind the ammo count (`AmmoWhy`), and every explanation as a calculation table (`WhyTable`) that goes from EXP to the next level via EXP per kill to the kills needed, with the damage formula (max, min, level difference, mob defence, average) behind the stars
- [x] Advised buys: `advisedEquipment` in `src/cheapestEquip.ts`, `cheapestSettings` run on that equip, one invoice line per purchased piece in `levelInvoice` (summed as Shop in Difference), Overnemen writes the equip and Ongedaan maken restores it (Dave chose this option, October 6, 2026)
- [x] Victor's review of the numbers (a sweep of 1144 cases, no wrong number) and the leftovers it found
- [x] One invoice row per purchased piece; write-off over the horizon up to the next upgrade (`writeOff`, `ShopWhy`), Dave's choice; the advised setup as a fixed point of equip and settings (`advisedSetup`), so Overnemen leaves nothing to buy; honest text when Advised costs more this level

### TEST

- [x] Tycho: coverage for button order, read-only Advised popups per card, report placement, focus return, no-advice case (mocked), no visible "Cheapest" label, the six Total cost buttons and the sentence above them, the ammo explanation and the calculation tables, the Shop line, advisedEquipment and Overnemen/Ongedaan maken with equipment; Victor's test findings fixed (setup helper left the Monster popup open, a tautological test replaced); `npm test` (1803) and `npm run lint` green
- [x] Dave looked at the preview and approved ("ship it", October 6, 2026)

### DEPLOY: app/192-advised-view-buttons

Every card with a choice in it now works like Equip: no eye in its head, but two buttons under it, **Advised** first and
then **Your character**. Advised opens the card's popup read-only, filled in with the advised setup (the live result of
the cheapest free settings from #183): its monster on Monster, its potions on Potions, its skill points on Skillpoints,
its base AP on Ability points, and the stats that follow from that AP on Total stats. Your character opens the popup as
before, to change your own setup. The card's Report button moved into the popup, at its bottom, in both views. The label
**Cheapest** is now **Advised** everywhere it meant that setup: the Equip button, the Total cost heading and the
Difference column. Under both invoices in Total cost one sentence says the total is calculated with this setup, above
six icon buttons, one per card, each opening that card's popup for that part. A shared `ViewButtons` component and a
`CardViewContext` that holds which card popup is open replace the Equip-only buttons.

The Advised setup now buys equipment as well: it wears the pieces that save more than they cost up to the next upgrade
in that slot (the horizon the Equip Report already uses), and its mob, potions, skill points and base AP are the
cheapest with that gear; equip and settings are worked out in turn until neither changes, so after **Overnemen** there
is nothing left to buy. A piece is worn for several levels, so the Advised invoice writes it off: each piece it buys is a
row of its own, with its name, × 1 and only this level's share of the price (price × EXP of this level / EXP up to the
next upgrade), and its question mark shows that sum. Difference adds the pieces up in one **Shop** row; Your character
never has them. When a piece only pays for itself after this level, the text under Difference says so. **Overnemen**
now also puts the advised equip in your setup, and **Ongedaan maken** puts your old equip back.

The question mark behind an amount on the invoice now also sits behind the throwing stars or arrows, and every
explanation is a table: one row per step, with the sum in small print under it and the outcome on the right, the count
on the invoice as the bold last row. The count goes from the EXP to the next level, via the EXP per kill, to the kills
you need, so it no longer passes through how long the level takes (only MP buffs still depend on time). Behind the stars
the table shows where the damage comes from: the max and min of the damage formula with your own numbers, the level
difference when the mob is higher, the mob's defence, and the average the app counts with (± 76 out of 57 – 95).

**Score:** 3

#### What makes this deploy extra special

On every card you first see what the app advises and then compare it with your own setup, before you decide to copy it,
Total cost shows which six cards its numbers come from, and the Advised invoice includes the upgrades worth buying, written off fairly over the levels you wear them.

**Score:** 3

#### Pull Request

Advised and Your character buttons on every card, a Shop row for advised upgrades, and calculation tables behind the invoice

