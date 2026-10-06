## app/188-equip-two-columns

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

- [x] Read the Equip card and the weapon and armor advice it can reuse (issue #188)

### CREATE

- [x] `src/cheapestEquip.ts`: per slot what you wear and the cheapest equip, from the existing advice (Cody)
- [x] `EquipColumns` in the Equip card, styled mobile-first (Cody, Gwen)

### TEST

- [x] `src/cheapestEquip.test.ts` and an app test for the two columns; full suite and lint gate green (Tycho)
- [x] Code review (Victor: a lone top and a lone bottom blocked each other, fixed with tests) and text read (Edith)
- [ ] Dave looks at the preview before the merge (visible result)

### DEPLOY: app/188-equip-two-columns

The Equip card now shows, without opening it, two columns per slot: **Your character** (what you wear in game) and
**Cheapest** (the equip that levels most cheaply). Cheapest takes the weapon the weapon advice says pays for itself, and
every armor slot whose best piece pays for itself, skipping a piece that would clash with a better one (an overall
against a top or bottom); a piece that differs from what you wear is shown in the accent color. A new pure module,
`src/cheapestEquip.ts`, does the work from the advice the app already computes.

**Score:** 2

#### What makes this deploy extra special

You see at a glance which equip to buy for the cheapest levelling, next to what you wear now.

**Score:** 3

#### Pull Request

Equip card shows what you wear and the cheapest equip side by side

