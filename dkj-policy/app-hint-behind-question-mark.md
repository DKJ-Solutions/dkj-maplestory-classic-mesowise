## app/hint-behind-question-mark

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

Dave, October 7, 2026: long explanatory text in the app is unwieldy on a phone and he does not want to see it; at the least it
sits behind a question-mark icon. Results, statuses and prompts stay visible; explanations of how a screen or the calculation
works move behind the "?". The rule is recorded in Gwen's lens.

### CREATE

- [x] `Help` component in `src/app.tsx` (44px tap target, `aria-expanded`/`aria-controls`, collapsed by default) and its styles
- [x] Applied to the Advised Equip popup paragraph and the other explanatory hints (gender, offline file, AP, weapon and armor notes, unknown-job items, contact assumption, the extra-mana clause)
- [x] Rule in `.claude/specialists/lenses/specialist-04-12-lens.md`
- [x] In the Advised Equip popup the "?" sits next to the "Advised" heading, the text opens under it (Dave, October 7, 2026; `StatDialog` `help`)

### TEST

- [x] Tests: the "?" is collapsed by default and opens and closes on tap; existing tests tap it first
- [x] Victor: code review (the unknown-job instruction stays visible; spacing and clipping fixed)
- [x] Edith: final read
- [x] Dave looks at it on a phone before the merge (approved October 7, 2026)

### DEPLOY: app/hint-behind-question-mark

Long explanations no longer fill the screen: the paragraph in the Advised Equip popup (its "?" next to the "Advised" heading) and the other hints that explain how a
screen or the calculation works now sit behind a "?" icon, collapsed until you tap it. Results, statuses and prompts stay
visible as before. Every new screen follows the same rule.

**Score:** 3

#### What makes this deploy extra special

On a phone the cards are shorter and the answer is what you see first; the explanation is one tap away instead of a block of
text you scroll past every time.

**Score:** 3

#### Pull Request

Long explanations in the app sit behind a question-mark icon instead of on screen
