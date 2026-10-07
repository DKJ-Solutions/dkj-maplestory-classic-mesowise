## app/compact-total-stats-popup

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

Dave, October 7, 2026: the popup behind the character under Based on: (e.g. "Lv. 20 Thief") as compact as the Total cost: Equip table, with the expected label and the character as its title; three tables (Ability points, Skillpoints, Total stats); Total stats purely from level, base AP and skill points, no equipment; a ? behind Lucky Seven and Nimble Body; no Beginner skills and no SP count; a reserved ? column and centered value columns so the tables line up.

### CREATE

- [x] `AdvisedCharacter`: three read-only tables (Ability points, Skillpoints (1e job), Total stats) in the character popup; `PopupButton` takes a `tag` ("expected"), titled after the character
- [x] `BaseStats`: Max HP, Max MP, Accuracy and Evasion from `expectedStat` with base AP only (and M.ATT from INT for a Magician); nothing from equipment
- [x] `SkillGroups` (shared with the Skillpoints card) with `inCharacter`: first-job skills only, no group header or SP count, a ? behind each skill with points that says why; `SkillEffects` and `AbilityHead` extracted
- [x] `style.css`: compact rows in the info popups, a reserved ? column in every table, values centered in one 3rem column; Base and Extra in plain grey, the total bold

### TEST

- [x] `app.test.tsx`: the popup's tag, title and three tables; Ability points and Skillpoints rows equal the Advised popups; Total stats equals the formula without item AP; the ? per skill with points and its popup
- [x] Dave looked at the preview and said ship it (October 7, 2026)
- [x] `npm test` (1937) and `npm run lint` green

### DEPLOY: app/compact-total-stats-popup

The info button after the character under **Based on:** (Total cost: Equip and Useable) now opens a compact popup titled after the character (e.g. "Lv. 20 Thief") with the label **expected**, in three tables: **Ability points** (Base + Extra = Totaal), **Skillpoints (1e job)** with a ? behind each skill the advice put points in, explaining why, and **Total stats** from level, base AP and skill points alone, without equipment. The values of all three tables line up in one column.

**Score:** 2

#### What makes this deploy extra special

A player sees at a glance which AP and skill points the cost advice assumes, and why a skill sits at its level, without the equipment muddying the base stats.

**Score:** 2

#### Pull Request

Character popup under Based on: three compact tables, base stats without equipment
