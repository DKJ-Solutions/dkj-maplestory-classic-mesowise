## app/242-unique-element-hooks

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

- [x] Survey the generic elements in `src/app.tsx`: elements that share one class while doing different things

### CREATE

- [x] View buttons: `view-advised` / `view-worn`; card popups: `card-dialog-<card>` plus `advised-dialog` / `worn-dialog`
- [x] Total cost buttons: `cost-card cost-card-<card>`; steppers: `step-down` / `step-up`; character tables: `char-table-ap/-skills/-total`; `skill-apply`, `cheapest-apply`, `cheapest-undo`

### TEST

- [x] New test in `src/app.test.tsx` pins the view-button, popup and Total cost classes
- [x] `npm run lint` clean, full suite green (1947 tests)

### DEPLOY: app/242-unique-element-hooks

Buttons and popups that do different things no longer share one bare class, so each can be named and found in the HTML. The Advised and Your character buttons carry `view-advised` and `view-worn`, and every card popup says which card and which view it belongs to (`card-dialog-equip`, `advised-dialog`). The six Total cost buttons, the −/+ steppers, the three character tables and the apply/undo buttons each carry a class naming their function as well. Nothing changes on screen.

**Score:** 2

#### What makes this deploy extra special

Nothing a player sees changes: the classes only make the markup easier to point at.

**Score:** N/A

#### Pull Request

every element names what it is, so two buttons that do different things no longer look identical in the markup

