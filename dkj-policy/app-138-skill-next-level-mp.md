## app/138-skill-next-level-mp

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

- [x] Cody: each skill row shows "Nu: <n> MP per keer" and "Volgend level: <n> MP"; at level 0 "Nu: niet geleerd", at the maximum no next line, passive unchanged
- [x] Cody: drop the "Skillpunten per level" source line from the Skillpoints card and the skill advice (Dave: adds nothing for the user); the sources stay in `src/data/skillPoints.ts`

### TEST

- [x] Tycho: the #83 test now pins both lines (Slash Blast 4 -> 5 MP, the maximum, level 0, passive, empty field), plus a test that the source line is gone; vitest 1263/1263 green
- [x] Lint gate clean
- [x] Victor: no findings; Edith: UI text reads right
- [x] Dave looked at the Skillpoints card and said "ship it" (October 4, 2026)

### DEPLOY: app/138-skill-next-level-mp

Each skill in the Skillpoints card now shows the MP it costs at your level and, on a second line, at the next
level (e.g. "Nu: 4 MP per keer" / "Volgend level: 5 MP"). A skill at level 0 reads "Nu: niet geleerd" with the
cost of level 1; at the maximum there is no next line. The "Skillpunten per level" source line is gone from the
card and the skill advice; the sources stay with the data.

**Score:** 2

#### What makes this deploy extra special

Before spending a skill point you see what it does to the skill's MP cost, and the card is one line of
source text shorter.

**Score:** 2

#### Pull Request

Skillpoints: show the next level's MP, drop the SP source line

