## app/43-magician-model

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

#### Status

Issue #43, step 2: the Magician data from step 1 (#62) drives the mob model, the advice and the screen,
following the Warrior's shape from #66. A visible result, so the branch is parked for Dave's look and no
pull request is opened before he has seen it.

### CREATE

- [x] Cody: Magician selectable and computed; spell damage from `MAGIC_DAMAGE`, 810 ms cast, MP cost via the cheapest MP potion, the shared hit check, INT/LUK gear advice (`src/magicianGear.ts`), skill-point advice for Energy Bolt and Magic Claw, level-up
- [x] Review fixes: monster DEF reduces spells by Raw x 100 / (DEF + 100) as the sourced comment says; the spell is chosen per monster on EXP per meso; Magic Claw needs Energy Bolt 1; (HP)/(MP) on the potion line; Edith's Dutch fixes
- [x] Out of this branch and filed: the physical defence formula (#89), Magic Claw per hit or per cast (#90), the naming debt sites (comment on #69)

### TEST

- [x] Tycho: hand-computed tests on `spellAttack`, INT boundaries, defence, spell choice and the Wind Shoes boundary; `npm test` and `npm run lint` green
- [x] Victor: code review, then a re-review of the fix delta
- [x] Edith: the Dutch UI text

### DEPLOY: app/43-magician-model

De Magician is nu te kiezen en wordt doorgerekend. De app kiest per monster de spreuk (Energy Bolt of Magic
Claw) die de minste potions per EXP kost, rekent met 810 ms per cast en met Orange als MP-potion, en trekt de
DEF van het monster van de spreukschade af volgens de damage-formule van NiaMeowDB. Wands, staffs en armor
worden geadviseerd op INT en LUK, en de skillpoint-adviezen gaan over Energy Bolt en Magic Claw. De
potionregel zegt voortaan bij elke job welke potion HP is en welke MP.

**Score:** 4

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Magician in the mob model and on the screen
