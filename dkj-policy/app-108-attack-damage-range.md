## app/108-attack-damage-range

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

#### Reason verified

Issue #108 says the total attack ignores the ability points. The calculation already used them (`damageRange` in
`src/calc/mobModel.ts`); only the Attack line on the Total stats card showed bare weapon attack (`totalAttack`).
MeowDB's damage guide states what the stat window shows: "the character stat window's damage range ... predicts the
lowest and highest damage from one ordinary basic physical attack", with its own example of 60-172.

- [x] Read the issue, verify the reason against the code and the source

### CREATE

- [x] Cody: `statWindowRange` in `src/suggest.ts` -- the job's basic attack without a skill, truncated like the guide
- [x] Cody: the Attack line on Total stats shows `min – max`; a Magician (not yet computed) keeps the weapon attack

### TEST

- [x] Tycho: the guide's worked example (Warrior 132 STR, 30 DEX, 47 ATT, 1.8 -> 60 – 172), ability points move the range, a skill does not, Magician is null
- [ ] Lint gate and the full suite green
- [ ] Victor: code review of the diff
- [ ] Edith: the Dutch hint text
- [ ] Dave looks at the preview (visible result)

### DEPLOY: app/108-attack-damage-range

On the Total stats card, Attack now shows the damage range of one ordinary attack (min – max), just like the in-game
stat window: your ability points count, not only the weapon attack from your equipment. Source: the MeowDB damage
guide, whose own example (60 – 172) is pinned in a test.

**Score:** 3

#### What makes this deploy extra special

Dave and his friends see the same Attack in the app as in their stat window, so they can check their profile at a glance.

**Score:** 3

#### Pull Request

Attack on Total stats shows the stat window's damage range, from your ability points and weapon attack

