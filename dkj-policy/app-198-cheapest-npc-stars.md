## app/198-cheapest-npc-stars

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

#### Decision (#198)

Option (a), given on October 7, 2026: Advised compares only the NPC stars, Subi and Wolbi, and writes the set's buy price
off like equipment, over the levels until the next better weapon.

#### Data

The buy prices come from NiaMeowDB, retrieved October 7, 2026: Subi costs 500 mesos per set
([item 294](https://meowdb.com/msclassic/item-db/294)) and Wolbi 1,000 mesos per set, from Max only
([item 295](https://meowdb.com/msclassic/item-db/295)). Rebecca read them through a summarising fetch. MeowDB answers a
direct request with 403, so Vera could not read the raw HTML. She accepted the figures for two reasons: the watk and
recharge read from the same pages match the repo's existing values, and the inferred set size (500) does not enter a
one-off write-off.

#### Finding for Dave

With the current mob model, a Thief who holds Subi is never advised Wolbi. Cody scanned 13 mobs, levels 10 to 26 and
several claws: Wolbi's +2 ATT loses to its higher recharge (0.4 against 0.3 per star). The advice shows up when you hold
another star, for example Wolbi bought from a held Mokbi, or Subi bought back from a held Wolbi.

### CREATE

- [x] `src/data/types.ts` and `src/data/thief.ts`: an optional `buy` (price and source) on a throwing star. Subi and Wolbi have one; Mokbi to Ilbi do not (Cody).
- [x] `src/starUpgrade.ts` (new): `starUpgradeAdvice` compares the NPC stars you do not hold over the claw's horizon. It picks the largest saving net of the set price, and only a net above 0 (Cody).
- [x] `src/cheapestEquip.ts` and `src/advisedSetup.ts`: the star pick fills the Ammo slot as a normal purchase inside the existing `settle` loop. Overnemen writes it through `applyEquipChange` (Cody).
- [x] Review follow-ups: comment wording for a held non-NPC star and for the round-1 baseline; `ownAmount` is exported from `levelInvoice.ts` and reused instead of repeated (Victor's review).

### TEST

- [x] `src/starUpgrade.test.ts`: the guards (non-Thief, dagger, below level 10, own ammo amount, unknown recharge), Wolbi winning, Subi staying, Subi bought back, and the fixed point after Overnemen over 5 mobs × 4 levels × 3 claws × 3 held stars (Cody).
- [x] The number itself: saving and net computed by hand over the claw horizon and the end-of-table horizon, the beyond-table case, and the invoice write-off pinned at 24 meso (Tycho).
- [x] Victor's review: no correctness bugs. Over 680 setups in which Advised bought a star, it paid for itself every time against the final profile and claw.
- [x] `npx vitest run` and `npm run lint` are green.

### DEPLOY: app/198-cheapest-npc-stars

Advised now chooses a Thief's throwing stars between the two that an NPC sells, Subi and Wolbi. It buys the other set when
that saves more mesos before your next weapon upgrade than the set costs (500 for Subi, 1,000 for Wolbi), and the price is
written off on the invoice like equipment. With the current numbers Subi stays the cheapest when you already have it, so
the advice mainly shows up when you hold a different star.

**Score:** 2

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Advised picks the cheaper NPC star per level

