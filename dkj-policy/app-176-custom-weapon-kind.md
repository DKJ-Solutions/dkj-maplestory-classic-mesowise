## app/176-custom-weapon-kind

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

Resolves #176. Dave chose "ask for the kind" (October 6, 2026, comment on #176).

- [x] Model: `EquipEntry.weaponKind` (`'dagger' | 'claw'`, absent = claw) for a custom weapon in the claw slot, driving the profile's `dagger` flag

### CREATE

- [x] Cody: `weaponKind` stored and loaded only for a Thief's custom weapon; `applyEquipChange` and `syncWithEquipment` read it, and a kind-only toggle updates the flag
- [x] Cody: "Soort wapen" Dagger/Claw toggle in the equipment card, shown only for a Thief with a custom weapon
- [x] Victor's finding fixed: a job switch or a load under another job drops the kind, so a Bowman is never calculated with a dagger

### TEST

- [x] Tycho: persistence, the calculation end to end (Double Stab versus Lucky Seven and stars), the toggle in the UI, and the job switch; `npm run lint` clean, vitest 1623 passed
- [x] Victor (code review) and Edith (Dutch text) read the diff; findings fixed
- [x] Dave looks at the toggle at phone width (visible result): approved, October 6, 2026

### DEPLOY: app/176-custom-weapon-kind

A Thief who wears a weapon the app does not know (a custom item) now chooses whether it is a dagger or a claw. Until now the app silently treated it as a claw, so after a dagger the player got Lucky Seven with stars added on top of the dagger's attack. The choice is saved with the equipment, and it is dropped when the character switches to another job.

**Score:** 2

#### What makes this deploy extra special

A Thief with an unlisted dagger now gets an honest EXP per meso number, calculated with Double Stab and no star costs, instead of an overstated one.

**Score:** 3

#### Pull Request

A Thief's custom weapon asks whether it is a dagger or a claw

