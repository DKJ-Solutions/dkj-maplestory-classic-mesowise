## app/199-advised-ammo-typed-price

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

#199: two hand-typed cases where the Advised Ammo slot and the Advised invoice disagreed: an own ammo amount on the spot, and
a Thief star recharge price that matches no star. Review found a third: a best spot without a resolved plan (a custom spot),
where the invoice counts no star line but the slot still named one. Visible result, so the branch parks for Dave's look.

### CREATE

- [x] The Ammo slot is derived from the Advised invoice itself (`ammoOnInvoice` in `src/advisedSetup.ts`): star/arrow detail gives the named or generic ammo, an amount-only line gives "Eigen bedrag", no line gives nothing
- [x] Generic Thief label "Throwing stars, 0,35 meso per stuk", formatted with the shared `nf3` (new `src/numberFormat.ts`)
- [x] The Ammo hint gains one clause for "Eigen bedrag"; review follow-ups from Edith and Victor

### TEST

- [x] Slot and invoice agree for a typed amount, an unmatched star price, a custom spot without a plan (with and without typed ammo), and a Bowman with a typed price
- [x] `npm run lint` clean, `npx vitest run` 1856 passing

### DEPLOY: app/199-advised-ammo-typed-price

The Ammo slot in the Advised view of the Equip popup now always agrees with the Advised invoice. If you typed your own ammo
amount on the spot it shows "Eigen bedrag" instead of a star or arrow name; a Thief whose star recharge price matches no
known star sees "Throwing stars, 0,35 meso per stuk" instead of "—"; and a custom spot that the invoice counts no ammo for
leaves the slot empty. Resolves #199.

**Score:** 2

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Advised Ammo slot agrees with the invoice when the ammo price is typed in

