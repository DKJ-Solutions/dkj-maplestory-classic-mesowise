## app/based-on-char-stats

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

Dave, October 7, 2026: an info button after "Lv. 20" under Based on: that opens the Total stats of a Lv 20 Thief with the ideal AP and skill points; also an info button after the mob, and the mob's ? outside its label box, beside it.

### CREATE

- [x] `BasedOn`: info button after the character, opening the Advised Total stats (same `StatRows` as Advised: Total stats)
- [x] `BasedOn`: info button after the mob, opening the mob's lines as Advised: Monster shows them; the ? moved outside the box
- [x] `style.css`: the mob row as a flex line so the ? stays beside the box at phone width

### TEST

- [x] `app.test.tsx`: both buttons exist, their popups equal the Advised views, focus returns; the ? sits outside the box
- [x] Dave looked at the preview and approved the look (October 7, 2026)
- [x] `npm test` and `npm run lint` green

### DEPLOY: app/based-on-char-stats

Under **Based on:** in Total cost: Equip and Total cost: Useable, an info button after the character (e.g. "Lv. 20 Thief") opens the Total stats Advised computes for that character, with the ability points and skill points it places, and an info button after the mob opens that mob's stats. The mob's ? now sits beside its box instead of inside it.

**Score:** 2

#### What makes this deploy extra special

A player can see which stats and which mob the cost advice assumes without leaving the popup.

**Score:** 2

#### Pull Request

Based on: an info button after the character and the mob, and the mob's ? beside its box

