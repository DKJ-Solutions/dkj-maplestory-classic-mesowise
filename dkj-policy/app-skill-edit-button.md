## app/skill-edit-button

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

Dave, October 5, 2026: every row in the Skillpoints popup was far too full. The `−`, input and `+` (`.skill-input`) are
replaced by an edit button, as on Equip; left of it only the level the skill has now.

- [x] Decide the editor: the existing `StatEditor` in its own popup, capped at the skill's maximum and at what the pool leaves, with the SP left shown above it

### CREATE

- [x] `src/app.tsx`: `SkillLine` -- the name with its cost and gain lines, a value box with the level, and the pencil; the popup clamps a typed level to 0 .. the allowed maximum on save
- [x] `src/app.tsx`: the line "Passief, kost geen MP" removed under a passive skill; one with an effect shows only what it gives (Dave, October 5, 2026)
- [x] `src/style.css`: everything in an Equip row (`.equip-row`) centred vertically, the bottom margins that aligned it to the bottom edge removed (Dave, October 5, 2026)
- [x] `src/style.css`: `.skill-row` laid out like `.stat-line` (name, value, pencil, 0.75rem apart); the stepper styles (`.skill-input`) removed

### TEST

- [x] `src/app.test.tsx`: skills are set through the pencil and the popup; the pool tests read the popup's maximum instead of a disabled `+`; new tests for the row (only the level and the pencil) and the popup (SP left, a too-high level clamped)
- [x] `npx vitest run`: 1418 passed; `scripts/lint/lint.ps1`: clean
- [~] The look: CSS only, which jsdom does not compute -- Dave judges it by eye

### DEPLOY: app/skill-edit-button

The change is in the app UI only; no repo tooling or data changed.

**Score:** 1

#### What makes this deploy extra special

A row in the Skillpoints popup now shows only the skill's level and a pencil, as on Equip, instead of a minus, a box
and a plus. The pencil opens a small popup to change the level, which shows how many SP are left and does not go past
what the pool allows. A passive skill no longer carries the line "Passief, kost geen MP". In the Equip popup everything in a row now sits
in the middle of that row.

**Score:** 3

#### Pull Request

A skill's level behind an edit button, like Equip

