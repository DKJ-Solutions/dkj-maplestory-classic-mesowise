## app/advised-for-attr

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

- [x] `data-based-on-character` on the Char row under "Based on:" and on every Your character popup (`.spot-body`) (src/app.tsx)
- [x] `data-based-on-mob` on the Mob row, the mob's info popup and both Monster popups
- [x] `data-sheet="advised" | "actual"` beside them, and on every card popup's `.spot-body`
- [x] The "Based on:" classes follow its heading: `.advised-for` becomes `.based-on-container`, `-row` becomes `.based-on-label`, `-line`/`-value` become `.based-on-line`/`-value` (app.tsx, style.css, tests)
- [ ] Dave looked (visible in the inspector, like #245)

### TEST

- [x] Tests pin all three attributes (src/app.test.tsx); full suite and `npm run lint` green

### DEPLOY: app/advised-for-attr

The HTML now says which character or mob an element shows, the way `data-popup` does for popups (#245): `data-based-on-character="Lv. 21 Thief"` and `data-based-on-mob="Snail"`, with `data-sheet` beside them saying whose sheet it is: `advised` (what the app advises, under "Based on:" and in the Advised popups) or `actual` (the character as played in game, in every Your character popup). The classes inside the "Based on:" section are renamed after it, `.advised-for` to `.based-on-container` and `.advised-for-row`/`-line`/`-value` to `.based-on-label`/`.based-on-line`/`.based-on-value`.

**Score:** 1

#### What makes this deploy extra special

Not visible on screen; only someone reading the HTML sees it.

**Score:** N/A

#### Pull Request

data-based-on-character, data-based-on-mob and data-sheet say in the HTML which character or mob an element shows, on the advised or the actual sheet

