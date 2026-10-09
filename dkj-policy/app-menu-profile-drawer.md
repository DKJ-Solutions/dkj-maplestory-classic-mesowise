## app/menu-profile-drawer

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

- [x] Drawer rebuilt into three rows (Profile, Instellingen, Help) with icons; Profile and Instellingen open a second drawer with a back arrow

### TEST

- [x] `npm test` and `npm run lint` green; drawer tests updated and two added
- [x] Dave looked at the live preview and approved it
- [x] Victor (code) and Edith (UI text) reviewed the diff

### DEPLOY: app/menu-profile-drawer

The hamburger menu now shows three rows: Profile, Instellingen and Help, each with an icon on the left. The
"Instellingen" heading at the top of the drawer is gone; the hamburger button and the drawer are now named "Menu".
Profile opens a second drawer, with a back arrow, where Job and Gender are chosen as before. Instellingen opens an
empty second drawer, to be filled later. Help expands in place and now always shows, not only once an estimate
exists. New components `MenuDrawerItem` and `MenuIcon` in `src/app.tsx`; `StatDialog` gained `hideTitle` and `back`.

**Score:** 2

#### What makes this deploy extra special

The player finds Job and Gender under one Profile row instead of at the top of the menu, and Help is always
reachable. They notice it the next time they open the menu, but nothing about the calculation changes.

**Score:** 2

#### Pull Request

Menu shows Profile, Instellingen and Help; Job and Gender move into a Profile drawer

