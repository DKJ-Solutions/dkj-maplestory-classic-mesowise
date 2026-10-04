## app/64-helpful-stranger-arrows

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

Dave (October 4, 2026, #64): bronze arrows count behind a switch the player turns on ("I have Helpful
Stranger"); with the switch off, only the plain arrows count. The data (`HELPFUL_STRANGER_ARROWS`) landed in
#75; this branch adds the switch and wires it into the Bowman calculation.

### CREATE

- [x] Cody: profile draft fields `helpfulStranger` and `bronzeArrows` ('0'/'1', default off, so an old saved
  profile loads as off); `arrowFor` in `bowmanGear.ts` gives bronze only with the switch on and bronze picked,
  and feeds `starWatk`/`starRecharge` in `parseProfile` and `totalAttack`
- [x] Cody: `catalogItems`/`searchCatalog` offer the bronze arrows only with the switch on;
  `setHelpfulStranger` swaps a worn bronze arrow back to the plain one of the same kind when the switch goes
  off; `syncArrow` clears the flag when the bronze arrow leaves the ammo slot on a job change
- [x] Cody: the checkbox "Ik heb Helpful Stranger" under the Ammo row of "Je equipment" (Bowman only), a
  `.switch` style on the existing tokens, and the bronze sources in the card's source line while it is on
- [x] Cody: tests for switch off (plain numbers unchanged), switch on with bronze (W.ATT +1, 2 mesos per
  arrow), an old profile loading as off, the fallback for bow and crossbow, and the app flow

### TEST

- [ ] `npm test` and `npm run lint` green
- [ ] Victor (code) and Edith (Dutch) reviewed the diff

### DEPLOY: app/64-helpful-stranger-arrows

A Bowman who has the Helpful Stranger citizenship rank can turn on "Ik heb Helpful Stranger" under the Ammo
row of the equipment card. The bronze arrows (+1 W.ATT, 2 mesos per arrow, Raymond's shop) then appear in the
ammo list, and picking one makes the EXP per meso and the upgrade advice count with it. Switched off, the app
counts with the plain arrow, as before.

**Score:** 2

#### What makes this deploy extra special

A Bowman with the rank can now see whether bronze arrows pay for themselves in mesos, which was the open
question of #64.

**Score:** 2

#### Pull Request

Bowman: a Helpful Stranger switch that lets bronze arrows count

