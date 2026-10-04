## app/130-level-up-row

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

Issue #130: three elements side by side at the very top of the home screen. The "previous level" button
lowers only the level (stats stay put): the app cannot know what the player did with their AP since, and
undoing a fresh level-up stays on the check screen.

### CREATE

- [x] `applyLevelDown` in `src/levelUp.ts` (pure, level -1, bounded by the level field's min/max)
- [x] `.level-row` at the top of panel 0 in `src/app.tsx`: small back button, visible h1 (takes over the
      slide flow's focus ref from the sr-only "Mesowise" h1), green Level up; the bottom level-up bar goes
- [x] Green gradient tokens (`--levelup-hi`, `--levelup-lo`, `--on-levelup`), light and dark, in `src/style.css`
- [x] Dave's look, round 1: job removed from under the level; the level sits exactly mid-screen (grid with
      two equal side columns); Level up keeps only a green gradient (a livelier version was tried
      and dropped as overdone); Level up no bigger than the level (1rem, 44px tall, 6rem side columns, h1 up to 2.5rem); heading reads LV. 10; button reads LEVEL UP (CSS uppercase), no border, small radius (a plus icon was tried and dropped), 1rem side padding; back button restyled to match (grey fill, SVG chevron, no border); the subtitle moved into the top bar, right of Mesowise; both buttons fill their side column, so they are equally wide

### TEST

- [x] Vitest: `applyLevelDown` cases, the row's order and roles, back button lowers only the level
- [x] Lint gate clean
- [x] Victor's review: no bugs; focus-ring selector, a stale comment and `aria-describedby` on the disabled reason, all applied
- [ ] Dave looks at the preview at phone width (visible result)

### DEPLOY: app/130-level-up-row

The home screen opens with a level row: a small button back to the previous level, the current level as a
big heading, and a green Level up button. The Level up button moved up from the bottom of the page.

**Score:** 3

#### What makes this deploy extra special

Dave and his friends see their level and the Level up button right at the top, and can step a level back
after a mis-tap.

**Score:** 3

#### Pull Request

Level-up row at the top: previous level, current level, level up

