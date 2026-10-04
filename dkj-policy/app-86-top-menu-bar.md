## app/86-top-menu-bar

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

#### What "the settings" are

The app has no settings screen yet. The one real setting on the home screen is the job choice, so the
hamburger menu holds that (`JobCard`). On the home screen the job card stays only until a job is chosen;
after that you change it through the menu. Dave judges this by eye before anything merges.

### CREATE

- [x] `TopBar` in `src/app.tsx`: a sticky bar outside `main`, full width, with "Mesowise" and a hamburger button that opens "Instellingen" (the existing `StatDialog`) with the job card
- [x] The home `h1` is kept for screen readers and focus, but hidden (`sr-only`): the bar carries the name
- [x] The Level-up bar sticks below the menu bar (`--topbar-h`)

### TEST

- [x] `src/app.test.tsx`: the bar is outside `main` with the name and menu button; the job card leaves the home screen once a job is chosen; the job changes through the menu
- [x] `npm run lint` and `npx vitest run` green locally

### DEPLOY: app/86-top-menu-bar

A white menu bar now runs across the top of the screen, with the app name and a menu button on the right.
The menu holds your job: once you have picked one, the job card no longer takes up space on the home
screen, and you change your job through the menu.

**Score:** 3

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

White top menu bar with the app name and a settings menu

