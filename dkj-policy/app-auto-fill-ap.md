## app/auto-fill-ap

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

- [x] Rule for #157 set: the secondary stat on the highest requirement of the worn equipment, the rest to the main stat, the others 4

### CREATE

- [x] Cody: autoFillAp (pure module) and the Auto assign button in the Ability points popup
- [x] Cody: review fixes (stale message, the 999 cap, a third stat, one main-stat table)
- [x] Dave's look rounds: the AP left always behind Ability points, (n) behind the popup titles, 73 / 80 BASE AP with Auto assign on one row aligned right, no sentence after success, the changed boxes light up, popup titles as h2, the close button in the body

### TEST

- [x] Tycho: tests across jobs, the catalogue and the boundaries (1500 tests green)
- [x] Victor: code review; Edith: Dutch text
- [x] Dave looked at the preview on his phone and said ship it

### DEPLOY: app/auto-fill-ap

The change is in the app only; no repo tooling or data changed.

**Score:** 1

#### What makes this deploy extra special

The Ability points popup has an Auto assign button: it puts the secondary stat exactly on the highest requirement of the
equipment you wear (DEX for a Thief or Warrior, STR for a Bowman, LUK for a Magician), the rest of your level's AP in
the main stat and leaves the others at 4. The boxes it changes light up briefly; when it cannot fill anything in, it
says why. The AP still free now always stand behind Ability points, also (0) or below zero in red when more is placed
than the level gives, and behind the titles of the Ability points and Skillpoints popups. Beside the button the popup
shows how many base AP are placed of what the level gives, such as 73 / 80 BASE AP. Popup titles are now h2 headings.

**Score:** 3

#### Pull Request

Fill in your base AP automatically from the equipment you wear

