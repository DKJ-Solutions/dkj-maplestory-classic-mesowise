## app/card-report-icon

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

Dave, October 5, 2026: every card has an eye; the cards where you make a choice get a second icon beside it,
a report with the extended advice. Not on Total stats and Ability points: nothing to choose there.

- [x] Map each card to its advice: Equip -> ATT + DEF, Skillpoints -> Skill, Monster -> Mob

### CREATE

- [x] `CardReport` in `src/app.tsx`: its own button beside the eye (a button cannot sit inside the head button), opening a popup with the advice
- [x] `CardHead` takes an optional `report`; Equip, Skillpoints and Monster pass it on the home screen only
- [x] Stats group (Ability points, Total stats) moved to the top, so the three report cards sit together (Dave, October 5, 2026)
- [x] The "Stats" heading removed (the group keeps the name as `aria-label`) and 1rem more space between Total stats and Equip (Dave, October 5, 2026)
- [x] The summary line under the level ("Op <mob> · lv N: kost ± ... meso") removed: the Report card already shows that cost (Dave, October 5, 2026); tests that read the cost there now read it from the Report card
- [x] Popup titles (card and report) at `--fs-h2`, so the sizes run large to small: title, advice part, verdict, hint, source (Dave, October 5, 2026)
- [x] No dotted underline under ATT and DEF: the browser's default for `<abbr title>`, which a phone cannot hover; the `<abbr>` stays for screen readers (Dave, October 5, 2026)
- [x] Styling in `src/style.css`: 44px button in the eye's colour; the popup reuses the Report card's advice rules

### TEST

- [x] Tests in `src/app.test.tsx`: the icon sits on exactly those three cards, beside the eye, and each popup shows its own advice; card-name lookups anchored so they no longer also match the report button
- [x] Test that the Stats group comes first and Equip, Skillpoints and Monster follow each other
- [x] `npx vitest run`: 1415 passed; `scripts/lint/lint.ps1`: clean
- [~] Font sizes: CSS only, which jsdom does not compute -- no automated test; Dave judges it by eye
- [~] Browser check at phone width -- dropped: two Chrome browsers connected and none selected; Dave looks before the merge anyway (visible result)

### DEPLOY: app/card-report-icon

The change is in the app UI only; no repo tooling or data changed.

**Score:** 1

#### What makes this deploy extra special

The Equip, Skillpoints and Monster cards now have a report icon beside the eye. It opens the advice for that card
on its own: the weapon and armor advice for Equip, the skill advice for Skillpoints and the mob advice for Monster.
Ability points and Total stats get no icon, because there is nothing to choose there; they now sit at the top, without the "Stats" heading and with a little more space above Equip, so the three cards with a report stand together. The summary line under the level is gone, because the Report card already shows what the level costs.

**Score:** 3

#### Pull Request

A report icon beside the eye on the Equip, Skillpoints and Monster cards

