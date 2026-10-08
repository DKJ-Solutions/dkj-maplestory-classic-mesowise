## app/260-cheapest-row-reachable

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

#### #260

The Level cost bill shows only rows that cost mesos this level, and a `CheapestRow` gets an amount only for a piece Cheapest
buys (`c.changed && c.cheapest !== null` with a matching shop line). Verified on the current trunk: `advisedSetup.ts` also
sets `option` to null whenever a slot changes, so on the one visible path `option` is always empty. The kept, skipped,
counted-ammo and empty-slot verdicts are unreachable. Removed rather than kept: git history keeps them as a starting point,
and since `app/cheapest-fresh-start` a future "why not" view would be rebuilt on the new setup anyway.

### CREATE

- [x] `cheapestRows` passes only the bought pieces with a shop line to `CheapestRow`; `CheapestRow` takes the shop name and
  the line as required props and always uses the `buy` tone.
- [x] `cheapestWhy` keeps only the "Kopen" verdicts; `isCounted`, `slotCovers`, the `ammo`/`covered`/`worn` props, the
  `'option'` tone of `BillRow` and the Equip card's `advisedAmmo` prop are gone (the latter fed only that row).
- [x] Comments that listed the removed verdicts (test helper `verdictOf`, the `.item-verdict` CSS comment) updated.

### TEST

- [x] `npm run lint` (tsc with `noUnusedLocals`) clean. No new test: the remaining "Kopen" path is covered (`verdictOf(weapon)`
  in `app.test.tsx`), and the removed branches could not render. The full suite runs in `ship-pr`.

### DEPLOY: app/260-cheapest-row-reachable

The Level cost bill's Cheapest equipment rows are built only for the pieces Cheapest buys, and `cheapestWhy` keeps only the
"Kopen" verdicts. The unreachable verdicts for kept, skipped, empty and counted-ammo slots are removed with the props that fed
them (`isCounted`, `slotCovers`, `advisedAmmo` on the Equip card, the `'option'` tone) (#260).

**Score:** 1

#### What makes this deploy extra special

N/A: the bill already showed only bought pieces; nothing on the screen changes.

**Score:** N/A

#### Pull Request

Cheapest's bill row keeps only what the bill can show

