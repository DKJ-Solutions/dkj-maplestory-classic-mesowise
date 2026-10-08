## app/actual-icon

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

Dave (October 8, 2026): the toggle of a popup with your own data used the i, which is reserved for fixed game data. Give it its own icon, and tidy the Wearing side of Total cost: Equip on the way.

### CREATE

- [x] ACTUAL_ICON: a person (head and shoulders) in the filled circle, picked by Dave from seven candidates after sliders were rejected
- [x] The glyph of the Based on toggles is cut out in the blue box color in Wearing
- [x] Every pencil is the same `.equip-edit` button (Based on, the slot rows of the Wearing table)
- [x] Based on as a table: one row per box (Char, Mob), the pencil in its own column, equal 0.5rem padding, 1rem value text, a placeholder and min height for an empty Mob
- [x] The Wearing table gets the Level column of Advised instead of Stat; the unused `stat` props are gone

### TEST

- [x] Tests pin the actual-toggle class, the `.equip-edit` pencils, the pencil outside the box, the Mob placeholder and the empty Level column; 1960 pass, `tsc` green
- [x] Dave judged it in the preview

### DEPLOY: app/actual-icon

Code review by Victor: no defects; one stale comment fixed.

**Score:** 2

#### What makes this deploy extra special

A popup with your own numbers now shows a person icon instead of the i, which stays for fixed game info. In Wearing, Based on is a small table with the pencil beside each row and a placeholder until you pick a mob, every pencil looks the same, and the equipment table has the same columns as Advised.

**Score:** 2

#### Pull Request

Own icon for your own data, one pencil style, and Based on as a table
