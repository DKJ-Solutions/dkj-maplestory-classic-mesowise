## app/145-skill-horizon

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

- [x] Horizon set by the owner on #145: 5 levels (current plus 4), summed like horizonCost, cut off at the end of the EXP table
- [x] Each level of the horizon is evaluated at that level (the mob model depends on the level difference with the monster), other stats as now; with one EXP per meso for all five levels the saving would only scale and the ranking could never change

### CREATE

- [x] Cody: the horizon in `src/skillPoint.ts` (`skillHorizon`, `SKILL_HORIZON_LEVELS`), `mesoCostAt` removed now that it has no caller
- [x] Cody: the Skill card and the placed confirmation say "van lv X tot en met lv Y" instead of "op dit level", with a hint when the EXP table cuts the horizon off
- [x] Cody: review fixes: `horizonCost` takes an EXP per meso per level so the skill advice shares its loop, the placement check in the conditional ("zou ... besparen") because the levels lie ahead, stale comments; the stale file name `mesoCostAt.ts` is #161

### TEST

- [x] Tycho: horizon boundaries, the per-level evaluation, the cut-off at lv 30, the UI sentences (1507 tests green)
- [x] Victor: code review (no correctness findings); Edith: Dutch text
- [x] Dave looked at the preview and said ship it

### DEPLOY: app/145-skill-horizon

The change is in the app only; no repo tooling or data changed.

**Score:** 1

#### What makes this deploy extra special

The skill-point advice now weighs a point over 5 levels, your current level plus the 4 after it, instead of the current
level alone. Each of those levels is calculated at that level, so a skill that saves little now but more once the level
difference with the monster shifts can win. The Skill card says over which levels it counts ("van lv 10 tot en met lv
14"), and says so when the EXP table (up to lv 30) cuts that horizon short.

**Score:** 3

#### Pull Request

Skill points: weigh a skill's saving over the coming 5 levels

