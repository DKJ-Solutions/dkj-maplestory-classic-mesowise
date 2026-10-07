## app/advised-popup-titles

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

Dave, October 7, 2026: the six popups behind the Advised block all had the title "Advised". Clicking the sword icon should show
"Advised: Equip", and so on for each card. Also rename the Item column of the Advised equip bill to Equip. Then: the Potions card's Advised popup becomes "Advised: Useable"
and shows the ammo next to the potions.

### CREATE

- [x] Every Advised popup shows "Advised: <card>" as its title (Equip, Skillpoints, Monster, Potions, Ability points, Total stats), also when opened from the card itself
- [x] The `ariaLabel` prop of `CardPopup` and `StatDialog` is gone: the visible title now carries the card name
- [x] The Item column header of the Advised equip bill reads Equip
- [x] The Potions card's Advised popup is "Advised: Useable" and shows the ammo the advice counts (Throwing stars or Arrows: name, ATT, price per piece; only the name for an own amount) (Dave, October 7, 2026)

### TEST

- [x] Tests: the title of each Advised popup starts with "Advised: <card>"
- [ ] Victor: review of the Useable change
- [x] Victor: code review, no findings (all seven Advised call sites carry the new title; a long title wraps beside the close button)
- [ ] Dave looks at it on a phone before the merge

### DEPLOY: app/advised-popup-titles

Every Advised popup now names its card in the title, such as "Advised: Equip" or "Advised: Skillpoints", so you can see which part
of the advice you are reading. The potions popup is now "Advised: Useable" and also shows the stars or arrows the advice
counts, with their ATT and price per piece. The middle column of the Advised equip bill is called Equip.

**Score:** 2

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Advised popups name their card in the title

