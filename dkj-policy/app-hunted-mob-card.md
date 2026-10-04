## app/hunted-mob-card

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

Dave, October 4, 2026: remove the "Plek toevoegen" button and the example spot, and use no maps at all -- only the
mob you kill most while levelling, picked on one card.

- [x] Decide the model: one mob is the only spot; the calculation core keeps working on SpotDrafts

### CREATE

- [x] `src/data/spots.ts`: `MOBS` (every monster once), a spot per mob (`mob:<name>`, that monster only, its own source), `mobDraft`, `huntedMob`
- [x] `src/best.ts`: a single spot is the winner, even when dangerous; only an invalid one gives no number (`pickBest` needed two)
- [x] `src/app.tsx`: the "Laatst gejaagd op" card replaces the spot list, the add button and the example spot; old saved maps and own spots are dropped on load
- [x] `src/style.css`: the card's look; dead spot-list rules removed
- [x] The mob's HP, EXP per kill and touch damage on the card and in the picker (Dave, October 4, 2026)

### TEST

- [x] Tests: mob data and helpers, single-spot verdict (valid, dangerous, invalid), no-mob cases in the advisors, the card in the app (pick, replace, cost appears, no button or example spot)
- [x] `npm run lint` and `npx vitest run` green (1178 tests)
- [~] Screenshot at phone width: the browser extension was not connected; Dave looks at the preview before the merge

### DEPLOY: app/hunted-mob-card

The spot list is gone: no "Plek toevoegen" button, no example spot and no maps. One card, "Laatst gejaagd op", picks
the mob you kill most, with its HP, EXP and damage shown on the card and in the picker; the level cost, the skill-point advice and the upgrade advice are all computed at that mob,
also when it is dangerous (the warning stays on the card). Kills per hour can still be overridden in its popup. A
saved list of maps or own spots from before is dropped on load. Follow-ups: #122 (the hunting-ground question),
#123 (removing the now unused map data).

**Score:** 4

#### What makes this deploy extra special

A player no longer builds a list of spots: they pick the mob they hunt and get the cost of their level at once.
Their old spots are gone after updating.

**Score:** 4

#### Pull Request

Hunted-mob card replaces the spot list, the add-spot button and the example spot

