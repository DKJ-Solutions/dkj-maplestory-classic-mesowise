## data/90-magic-claw-per-hit

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

#### Scope

Issue #90: `MAGIC_CLAW_LEVELS` read Magic Claw's "Basic Attack 45 to 65" as per hit, with two hits per cast, and
its comment called that an inference. If it meant per cast, the Magician model would overstate Magic Claw 2x.

### CREATE

- [x] Read the raw skill page (meowdb.com/msclassic/skills/magician/magic-claw, October 4, 2026). Section "How
  output is calculated": "Magic Claw creates 2 magic hits using skill power 45 to 65. Each hit scales with INT,
  Magic Attack, and spell mastery"; the page data also gives "Hits Per Cast: 2". So per hit, as the code had it
- [x] `src/data/magician.ts`: the comment now quotes that statement instead of calling it derived; no value
  changes
- [x] The hint sentence about this assumption lives on #43's branch, not on main: noted on #43

### TEST

- [x] No value changed, so the existing `magician.test.ts` pins hold (`MAGIC_CLAW_HITS` 2, 45 to 65, 2 x 65 =
  Energy Bolt 20); `npm run lint` clean and the suite green

### DEPLOY: data/90-magic-claw-per-hit

Nothing changes on screen. Magic Claw's damage was already counted per hit, two hits per cast; MeowDB's skill
page turns out to say so in so many words, so the data now cites that sentence instead of calling it a guess.

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Magic Claw's damage is per hit, as its skill page states
