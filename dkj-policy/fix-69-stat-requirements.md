## fix/69-stat-requirements

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

#### The debt from #56

`src/warriorGear.ts` copied a Warrior item's STR requirement into the field `luk`, because the claw and
armor advice read `.luk` as "the main stat". The fix is to let the advice read each requirement in its own
stat, so the adapter no longer has to rename anything and the Magician (INT) and Bowman (DEX) can reuse it.

### CREATE

- [x] `src/data/types.ts`: `Stat`, plus `Weapon` and `ArmorPiece` (requirements as `Partial<Requires<Stat>>`); `Claw` and `Armor` are those with LUK and DEX required
- [x] `src/profile.ts`: `shortfall(reqs, profile)` returns what you lack per stat, your job's main stat first
- [x] `clawUpgrade.ts` and `armorUpgrade.ts` report `needs: StatNeed[]` instead of `needLuk`/`needDex`; `warriorGear.ts` writes `str`; `app.tsx` renders `needs`

### TEST

- [x] Existing advice tests moved to `needs`; new tests for `shortfall` and for Warrior gear carrying `str` and no `luk`
- [x] `npm run lint` and `npx vitest run` green locally (906 tests)

### DEPLOY: fix/69-stat-requirements

Nothing changes on screen: the advice still says, for example, "je hebt nog 5 STR en 10 DEX nodig". Behind
it, a Warrior weapon's STR requirement is now stored as STR instead of being filed under LUK, so the Magician
and Bowman can use the same advice without another rename.

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Upgrade advice reads each stat requirement in its own stat

