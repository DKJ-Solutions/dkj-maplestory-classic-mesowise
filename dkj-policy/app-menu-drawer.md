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
- [x] Dave (October 5, 2026): a chosen home-screen job card is headed just "Character"; the job and gender show behind the pencil (a line with "Warrior (m)" under the heading was tried and removed)
- [~] Dave (October 5, 2026): in the menu the job sits without a card around it -- superseded by the list of rows below
- [~] Dave (October 5, 2026): in the menu the pencil lines up right under the close cross -- superseded by the list of rows below
- [x] Dave (October 5, 2026): the job pencil looks exactly like every other pencil in the app (`.equip-edit`: light fill, border, same icon and size)
- [~] Dave (October 5, 2026): in the menu the job heading has no card icon -- superseded by the list of rows below
- [x] Dave (October 5, 2026): the title "Instellingen" sits in the panel's header, in the type of the app name in the top bar (removing it was tried and reverted)
- [~] Dave (October 5, 2026): in the menu the job is a list item (`ul.menu-list > li.job`) -- superseded by the list of rows below
- [~] Dave (October 5, 2026): with the close cross borderless, the pencil is centred under it -- superseded by the list of rows below, which keeps the centring
- [~] Dave (October 5, 2026): in the menu "Job:" and "Gender:" share one style -- superseded by the list of rows below
- [~] Dave (October 5, 2026): in the menu Job and Gender are open straight away, with Opslaan sliding the panel shut -- superseded by the second drawer below
- [~] Dave (October 5, 2026): in the menu each question is one row of buttons -- superseded by the list of rows below
- [x] Dave (October 5, 2026): the menu is a list, one row per setting ("Job: Thief", "Gender: Male") with a pencil like every other in the app; the pencil slides a second drawer over the menu with that setting's choices, where a change turns the cross into the save tick (plus the red undo and Opslaan at the bottom), and saving slides that drawer back to the menu. The home-screen job card is a plain card again, with its own pencil. Swipes on the second drawer no longer reach the menu under it
- [x] Dave (October 5, 2026): each pencil sits on its own row (the shared `.equip-edit` grid placement had pushed it below), centred under the close cross, with the value right-aligned against it; checked in the preview
- [x] Dave (October 5, 2026): the grey close cross loses its border in every popup, not just the menu; the save tick and the red undo keep theirs
- [x] Dave (October 5, 2026): the panel's head row is a header as tall as the top bar, with a line under it across the full width; the close cross is centred in it
- [x] Review (Victor): the slide-out finishes only on the panel's own transform transition, a save tapped during a slide-out still saves, the closing state resets afterwards; the unused `genderShort` is removed, and `JobCard` decides on a boolean instead of a second job list

### TEST

- [x] Tests: drawer class, swipe-right closes and returns focus, short swipe / scroll / swipe-left keep it open; the close-button test waits for the slide-out
- [x] Tests: the menu rows, the second drawer (save, tick, undo, picking back, a first pick), a save during the slide-out, Escape and swipes closing only the top drawer
- [x] Typecheck and full suite green
- [x] Dave looked at the preview before the merge (visible result): "ship it", October 5, 2026

### DEPLOY: app/menu-drawer

The settings menu is no longer a popup in the middle of the screen: it slides in from the right edge as a
full-height panel, and slides back out when closed. On a phone you can swipe it away to the right; a short
swipe springs back, and scrolling up and down inside it still works. The menu lists your job and gender,
each with a pencil; tapping it slides a second panel over the menu to pick a new one, and saving slides it
back. On the home screen, a chosen job card is now headed just "Character". The grey close cross in every
popup has lost its border.

**Score:** 2

#### What makes this deploy extra special

A player opening the menu sees a side panel that slides in, and can swipe it shut instead of reaching for
the close button.

**Score:** 2

#### Pull Request

The settings menu slides in from the right and swipes away

