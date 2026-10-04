## app/skillpoint-always-placed

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

The skill question said "Nee" while the player still had a free skill point, because a winner
needed a saving above 0. A point has to be spent anyway, so the advice must always name where it goes.

### CREATE

- [x] `skillPoint.ts`: the best computable choice wins whenever a point is left, also at saving 0 or below; savings under 0.5 meso snap to 0; `robust` compares savings within 0.5 meso instead of winner ids
- [x] `app.tsx`: chip "Ja" with any winner, hints for saving 0 and below 0, and a list of every option with its saving or extra cost
- [x] Victor's review and Edith's text read applied
- [x] The question is "In welke skill zet ik mijn skillpunt?" (a point is always spent at a level-up); its chip names the chosen skill instead of Ja/Nee
- [x] After "Punt zetten" the confirmation says why it was the best choice and what the runner-up does
- [x] The advice card is "Report" (h2) with four parts ATT, DEF, Skill, Mob (h3), each with a lead line; ATT and DEF are separate again
- [x] Ability points and Total stats sit in their own "Stats" block
- [x] ATT always names the weapon you carry and the next better one with its level, also below lv 10 where the cost is unknown; fixed the Bowman weapon multiplier in that lookup
- [x] Chips say what to do: Upgraden / Niet upgraden / Upgrade complete, Wisselen / Blijven, the skill name, and with no point left Goed gezet / Beter in {skill}, with the closest alternative as the reason
- [x] Gwen: the chip sits right of its h3; type scale h2 1.5rem > h3 1.125rem > h4 0.9375rem; verdicts are h4
- [x] Victor and Edith read every round; their findings applied

### TEST

- [x] Tycho: 5 tests updated to the new rule, new tests for saving 0, negative saving, no point left, snapping and robustness; later rounds for every change above; 1405 tests green, typecheck clean
- [x] Dave looked at the result in the preview and approved it ("ship it")

### DEPLOY: app/skillpoint-always-placed

The advice card is now "Report", with four parts: ATT, DEF, Skill and Mob. Each part says in one line
what it weighs, and its chip says whether you still have to act ("Upgraden", "Upgrade complete",
"Blijven", the skill to raise, "Goed gezet"). The skill advice always names where a free point goes,
even when no skill saves mesos. It explains a placed point, and once all points are spent it checks
whether one point would have been cheaper in another skill. ATT names the weapon you carry and the
next better one with its level. Ability points and Total stats move into their own "Stats" block,
and the headings follow a clear size scale.

**Score:** 3

#### What makes this deploy extra special

A player now reads at a glance, per part, whether anything needs doing after a level-up. Where a
skill point goes is always answered and explained, and so is the weapon you carry.

**Score:** 4

#### Pull Request

The skill advice always names where a free skill point goes

