## fix/101-one-skill-mp-helper

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

Issue #101: a skill's MP per use lived in three places: `skillMpAt` (#83, `src/data/skills.ts`), and
`luckySevenMp`, `powerStrikeMp`, `arrowBlowMp` in `src/levelUp.ts`, which the skill-point advice line in
`src/app.tsx` used. Since the issue was filed, main dropped `MP_PER_USE` for `ATTACK_SKILLS`; `energyBoltMp` and
`magicClawMp` exist only on #43's branch, and that branch picks this helper up when it merges main.

### CREATE

- [x] `src/data/skills.ts`: `mpPerUse(key, level)` with an explicit level 0: 0 while the skill is unlearned (or
  passive), otherwise `skillMpAt`, so one array per skill feeds both the Skillpoints card and the advice
- [x] `src/levelUp.ts`: the three copies removed; `src/app.tsx`: `ATTACK_SKILLS` keeps only the noun and the
  advice line calls `mpPerUse`

### TEST

- [x] The helper tests moved from `levelUp.test.ts` to `skills.test.ts` on `mpPerUse`: per-level values for
  Lucky Seven, Power Strike and Arrow Blow, 0 at level 0 (next to `skillMpAt`'s level-1 value), the clamp above the
  maximum, 0 for a passive
- [x] `npm run lint` clean, 978 of 978 tests pass; the advice-line tests in `app.test.tsx` pass unchanged

### DEPLOY: fix/101-one-skill-mp-helper

Nothing changes on screen. The MP a skill costs per use now comes from one table per skill, the same one the
Skillpoints card reads, so the advice line and the card can no longer disagree.

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Skill MP cost comes from one helper
