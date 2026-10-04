## app/117-shield-cape-earrings

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

Dave (October 4, 2026, #117): add shield, cape and earrings to the equipment card; then gloves, and drop the "(optioneel)" label because every slot is optional.

### CREATE

- [x] `ArmorSlot` gains `shield`, `gloves`, `cape` and `earrings`; the equipment card shows them
- [x] No slot says "(optioneel)" any more and every search box reads "Zoek wat je draagt"; `isOptionalSlot` is gone
- [x] Shield only for the Warrior and the Magician (claws, bows and crossbows take both hands)
- [x] No catalog for the new slots (no sourced item data yet): you fill them as a custom item with its DEF
- [x] A slot without items still opens its list on a tap, with a line saying to type the name (Dave: "gloves geeft nu nog geen optie")

### TEST

- [x] Tests for the slots per job, the empty catalog, the WDEF shift, Magic Def and storage; `npm run lint` and Vitest green (1160)
- [ ] Dave looks at the preview before the merge (visible result)

### DEPLOY: app/117-shield-cape-earrings

The equipment card has four new slots: Shield (Warrior and Magician only), Gloves, Cape and Earrings, and no slot is labelled "(optioneel)" any more, because every slot may stay empty. What you
wear there counts toward your WDEF like the other armor. The app has no items for them yet, so a tap on the search box says to type the name, and you
fill in the DEF as a custom item. Magic Def still counts hat, body and shoes, because a custom item carries no MDEF.

**Score:** 2

#### What makes this deploy extra special

You can now describe your full gear; a shield, gloves, cape or earrings with DEF no longer goes missing from the card.

**Score:** 3

#### Pull Request

Shield, Gloves, Cape and Earrings slots on the equipment card

