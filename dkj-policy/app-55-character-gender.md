## app/55-character-gender

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

Issue #55, decision 2 (Dave, 2026-10-04): the app asks the character's gender, so gender-locked shop items count.
Until a gender is chosen, only items both genders can wear count, which is the app's behaviour before this branch.
Scope: the Thief and the Warrior, the two jobs the app calculates. The Magician and Bowman female-only rows follow
with their models (#43, #44), which are held by other sessions.

#### Visible result

The job card gets a "Geslacht" row (Man / Vrouw). Dave looks before the merge, so the branch parks without a PR.

### CREATE

- [x] Vera: every Warrior top, bottom and overall Harry (Perion, npc 508) sells, plus the level-12 T-shirts and the
  Red Qi Pao Skirt, read from the raw MeowDB item page on 2026-10-04 (requirements, gender, W.DEF, shop price).
- [x] Cody: `gender.ts`, `gender` on shop armor and the profile, the advice filters by gender (candidates and
  horizon), the Geslacht row on the job card. The equipment catalog stays unfiltered: you state what you wear.
- [x] Data: Thief +3 rows, Warrior +23 rows (one colour per level and gender), the other colours in wornWarrior.ts.

### TEST

- [ ] Tycho: existing tests updated to the new data, gender tests added, `vitest` and `lint` green.
- [ ] Victor: code review of the diff.
- [ ] Edith: the Dutch UI text and comments.

### DEPLOY: app/55-character-gender

The app now asks whether your character is a man or a woman. A Warrior then gets advice on tops, bottoms and
overalls (Perion's armor shop), and a Thief on the level-12 T-shirts and, as a woman, the Red Qi Pao Skirt. Until
you choose, the advice only counts armor both can wear.

**Score:** 4

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Ask the character's gender, so gender-locked shop items count

