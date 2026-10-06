## app/189-advised-ammo-slot

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

#### Scope

#189: the Advised view of the Equip popup left the Ammo slot at "—" for a Thief or Bowman with nothing in it, while the Advised
invoice counts throwing stars or arrows. Built here: the slot names the ammo the invoice counts. Not built here: choosing a
cheaper ammo per level, which is a calculation of its own with an open question (which stars count as obtainable), filed as
#198. Hand-typed ammo prices where slot and invoice still disagree: #199.

### CREATE

- [x] `countedAmmo(profile, weapon)` in `src/cheapestEquip.ts`: a Thief's star from the recharge price in his profile, a Bowman's arrow from `arrowFor` for his bow or crossbow; null for whoever throws nothing.
- [x] `throwsNothing` moved from `suggest.ts` into `profile.ts`, so the invoice and the slot read one rule.
- [x] `advisedSetup` returns `ammo` from the same profile the Advised invoice uses; `CheapestRows` shows it in an empty Ammo slot, without "Koop voor" and without the buy accent, with "Per star herladen, op de factuur" (Bowman: "Per pijl gekocht, op de factuur") and a sentence in the hint.

### TEST

- [x] Unit tests for `countedAmmo` (Thief default and corrected star, unknown price, dagger, Beginner, Warrior, Magician, Bowman bow, crossbow, bronze, own weapon) and for `advisedSetup` against the real invoice ammo line; an app test for the popup row.
- [x] Victor reviewed the diff (no correctness finding on the main path; edge cases filed as #199), Edith the UI text (wording adopted).
- [x] Gates: `open-pr -GatesOnly` before the park (visible result, no PR).

### DEPLOY: app/189-advised-ammo-slot

The Advised view of the Equip popup now fills an empty Ammo slot with the throwing stars or arrows the Advised invoice
counts (Subi by default), so the popup and Total cost no longer disagree about what a Thief or Bowman uses. It is shown
without a price, with "Per star herladen, op de factuur", because ammo is paid per piece on the invoice and not bought once.
Resolves #189.

**Score:** 2

#### What makes this deploy extra special

A Thief or Bowman who opens Advised on Equip now sees which stars or arrows the Advised total counts, instead of an empty
slot next to a Total cost that charges for them; picking a cheaper star is left to #198.

**Score:** 2

#### Pull Request

Advised equip popup: fill the Ammo slot with the ammo the invoice counts

