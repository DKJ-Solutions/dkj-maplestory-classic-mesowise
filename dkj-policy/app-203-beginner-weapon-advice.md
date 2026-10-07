## app/203-beginner-weapon-advice

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

#203: below level 10 Advised had no priced weapon to buy. Game data chain: Rebecca read the NPC shop buy prices of the five
beginner weapons on MeowDB (item pages, cross-checked against the Sid and Silver shop pages; Garnier's 5,000 as calibration for
the field), Vera accepted them, Cody wired them into the Advised path only, Tycho pinned it, Victor reviewed. The Home Attack card
below level 10 stays as it was; whether it should advise these weapons too is Dave's call in #209.

### CREATE

- [x] Shop buy prices with a per-row `priceSource` (2026-10-07) in `src/data/beginnerWeapons.ts`; the stats keep their 2026-10-05 source (#210)
- [x] Below level 10, Advised buys from the priced beginner weapons (Warrior: no daggers; Magician: none sold below 10); horizon capped at level 9
- [x] `withClaw` sets the dagger flag for Razor and Fruit Knife below level 10, untouched from level 10 (#170)
- [x] Review follow-ups: the shop resolved once and shared with `requiredWeapon`, `morePower`, early return for an empty shop

### TEST

- [x] Prices and sources pinned; exact horizons; Warrior without daggers; Magician null; dagger flag; Attack card unchanged below 10 for all jobs; no change from level 10 with or without the flag; the Advised invoice counts the price
- [x] `npm run lint` clean, `npx vitest run` 1854 passing

### DEPLOY: app/203-beginner-weapon-advice

Below level 10, Advised now gives a Thief, Warrior or Bowman with an empty weapon slot a weapon from the shop: the Sword, Hand
Axe or Wooden Club (50 mesos) or, for a Thief or Bowman, the Razor (500) or Fruit Knife (1,500), counted on the Advised invoice
up to level 9. A Magician still gets none, because no shop sells a wand or staff below level 10. The Attack card on Home is
unchanged (#209). The prices carry their own source date. Resolves #203, resolves #210.

**Score:** 2

#### What makes this deploy extra special

A brand-new character now sees a weapon in Advised from level 1, not only from level 10.

**Score:** 2

#### Pull Request

Advised gives a weapon below level 10

