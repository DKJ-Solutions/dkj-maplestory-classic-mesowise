## app/advised-equip-mob-subtitle

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

Dave, October 7, 2026: under Advised: Equip, next to the level and job, show the mob the advice is computed on, with a ? explaining why that mob; two rows, and the ? keeps its size.

### CREATE

- [x] Cody: `AdvisedFor` subtitle (Char / Mob rows, ? after the mob) via a new `subtitle` prop on `CardPopup`; mob = `huntedMob(cheapestLive.drafts[0])`, the same read as Advised: Monster
- [x] Gwen: two-row grid, small uppercase labels, value at title size with a 24px line so it lines up with the unchanged ? icon
- [x] Cody + Gwen: title Advised: Equip renamed to Total cost: Equip with a small grey ADVISED tag, at h3 size so title, tag and ? fit one row at 360px (checked in headless Chrome); accessible name Total cost: Equip (advised)
- [x] Edith: explanation cut to one sentence (EXP per meso); Victor: no bugs

### TEST

- [x] Tycho: subtitle test extended for Equip (same mob as Advised: Monster), new test for the ? popup; 1899 tests green, lint clean
- [ ] Dave looks at the preview (visible result)

### DEPLOY: app/advised-equip-mob-subtitle

The Advised: Equip popup is now titled **Total cost: Equip** with a small ADVISED tag, on one row on a phone, and says on two rows who and what its advice is computed for: **Char** (level and job) and **Mob** (the mob Advised: Monster also shows), with a ? after the mob that explains in one sentence why that mob: of the mobs that are not dangerous for you, it gives the most EXP per meso at this level.

**Score:** 2

#### What makes this deploy extra special

A player sees at a glance which mob the equipment advice assumes, so an advice that looks odd can be traced to the mob it was computed for.

**Score:** 2

#### Pull Request

Advised: Equip names the mob its advice is based on, with a ? explaining why that mob

