## app/menu-drawer

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

The hamburger menu opened a centred popup. Dave (October 5, 2026): it should swipe in from right to left
instead. Read as a side drawer that slides in from the right edge, closable by swiping it back to the right.

### CREATE

- [x] `StatDialog` gains a `drawer` mode: full-height panel anchored right, slide-in animation, slide-out before closing (instant under reduced motion)
- [x] Swipe to close: a sideways drag to the right moves the panel with the finger; past a third of its width (at most 80px) it closes, otherwise it springs back; vertical drags stay scrolling
- [x] The settings menu in `TopBar` uses the drawer mode
- [x] Dave (October 5, 2026): a chosen job card is headed just "Character"; the job and gender show behind the pencil (a line with "Warrior (m)" under the heading was tried and removed)
- [x] Dave (October 5, 2026): in the menu the job sits without a card around it (no `.card` class, so no border); on the home screen it stays a card
- [x] Dave (October 5, 2026): in the menu the pencil lines up right under the close cross
- [x] Dave (October 5, 2026): the job pencil looks exactly like every other pencil in the app (`.equip-edit`: light fill, border, same icon and size), checked in the preview: its right edge sits on the close cross's
- [x] Dave (October 5, 2026): in the menu the job heading has no card icon (the shield); the home-screen card keeps it
- [x] Dave (October 5, 2026): the title "Instellingen" sits in the panel's header, in the type of the app name in the top bar (removing it was tried and reverted)
- [x] Dave (October 5, 2026): in the menu the job is a list item (`ul.menu-list > li.job`), its title "Character" a plain label instead of an `h2`; the home-screen card keeps its `h2`
- [x] Dave (October 5, 2026): with the close cross borderless, the pencil is centred under it (3px in from the right edge) instead of edge-aligned
- [x] Dave (October 5, 2026): in the menu "Job:" and "Gender:" share one style (both plain `.job-title` labels)
- [x] Dave (October 5, 2026): the panel's head row is a header as tall as the top bar, with a line under it across the full width; the close cross is centred in it, without a border

### TEST

- [x] Tests: drawer class, swipe-right closes and returns focus, short swipe / scroll / swipe-left keep it open; the close-button test waits for the slide-out
- [x] Typecheck and full suite green (1519 tests)
- [ ] Dave looks at the preview on his phone before the merge (visible result)

### DEPLOY: app/menu-drawer

The settings menu is no longer a popup in the middle of the screen: it slides in from the right edge as a
full-height panel, and slides back out when closed. On a phone you can swipe it away to the right; a short
swipe springs back, and scrolling up and down inside it still works. Once you have chosen a job, its card
is headed "Character"; in the menu it sits without a card around it, under a header with a line.

**Score:** 2

#### What makes this deploy extra special

A player opening the menu sees a side panel that slides in, and can swipe it shut instead of reaching for
the close button.

**Score:** 2

#### Pull Request

The settings menu slides in from the right and swipes away

