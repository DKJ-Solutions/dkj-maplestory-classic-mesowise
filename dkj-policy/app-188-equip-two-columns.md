## app/188-equip-two-columns

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

- [x] Read the Equip card and the weapon and armor advice it can reuse (issue #188)

### CREATE

- [x] `src/cheapestEquip.ts`: per slot what you wear and the cheapest equip, from the existing advice (Cody)
- [x] `EquipColumns` in the Equip card, styled mobile-first (Cody, Gwen)
- [x] The table left the card (Dave): two labelled buttons, Your character and Cheapest, both open the Equip popup; Cheapest shows the cheapest equip read-only with shop prices and what it all costs (Dave, #188)
- [x] Cheapest counts this level only (Dave): `HorizonScope` 'this-level' in the weapon and armor advice, the Report advice keeps 'next-upgrade' (#25); tests in both suites (Tycho)
- [x] A slot that stays empty shows the best piece you can wear, its price and what it saves this level, marked "Loont niet" (Dave)
- [x] The Ammo slot only shows next to a ranged weapon (a claw, a bow or crossbow): `hasRangedWeapon` and `shownSlots` in equipment.ts, with tests (Dave)
- [x] No shield next to a claw (Dave): the Thief's shield slot only with a dagger, a weapon under level 10 or an empty weapon slot; `noShield` keeps wristguards out of the armor advice; tests updated (#133's "one-handed claw" is not on NiaMeowDB)
- [x] An "Equip bekijken" button under the Cheapest invoice in Total cost shows, read-only, the equip that invoice uses: what you wear (Dave)
- [x] Every catalog item shows the level it needs, "Steel Titans (Lv. 15)", in all equip views (Dave); `nameWithLevel` in equipment.ts
- [x] The equip search only lists items your character's level can wear (Dave); `searchCatalog(..., maxLevel)`; tests raised to the level their items need (Tycho)
- [x] Equip search: hides items for the other gender (63 worn tops, bottoms and the overall got their gender from NiaMeowDB, read 2026-10-06 by Rebecca), shows colour variants with the same level, DEF and MDEF once under their colourless name (also when their stat requirement differs, Dave), shows lv 0, and lists the highest level first (Dave); tests (Tycho)
- [x] The search list shows a weapon's type, level, ATT and speed, "(CLAW, LV 15, ATT 13, FAST)", and armor as "(LV 0, DEF 2)" (Dave)
- [x] "Empty" at the top of the search empties a slot again: armor becomes known empty (0 DEF), a weapon or ammo not entered yet (Dave)
- [x] The NiaMeowDB source lines left the Equip popup (Dave); the footer credit stays
- [x] The eye left the Equip card's head (Dave): the two buttons open the popup, the report button moves into that popup, at the bottom (Dave)

### TEST

- [x] `src/cheapestEquip.test.ts` and an app test for the two columns; full suite and lint gate green (Tycho)
- [x] Code review (Victor: a lone top and a lone bottom blocked each other, fixed with tests) and text read (Edith)
- [x] Dave looked at the preview and said "ship it" (visible result)

### DEPLOY: app/188-equip-two-columns

The Equip card has two buttons, **Your character** and **Cheapest**, in place of the eye in its head; both open the Equip
popup, which carries the Report button at its bottom. Your character shows what you wear in game, to change it. Cheapest
shows the same rows read-only, filled in with the equip that takes you one level up most cheaply: what you wear is free,
and a piece is bought only when it saves more than it costs on this level alone (the Report advice still counts the
saving until your next upgrade). A piece to buy shows its shop price; a slot that stays empty shows the best piece you
could wear there, with its price and what it would save, marked as not paying for itself. A new pure module,
`src/cheapestEquip.ts`, does this from the advice the app already computes. Under the Cheapest invoice in Total cost, an
**Equip bekijken** button shows the equip that invoice uses: what you wear, since the cheapest free settings never buy
equipment.

The equip search lists only what your level and gender can wear, highest level first, and shows colours of one piece
once ("Rubber Boots"). Each row says what the piece is, as in "Steel Titans (CLAW, LV 15, ATT 13, FAST)", and **Empty**
at the top empties a slot again. Every item shows the level it needs, as in "Steel Titans (Lv. 15)". A Thief holding a
claw has no Shield slot (a claw takes both hands), and the Ammo slot only shows next to a claw, bow or crossbow. 63 worn
tops, bottoms and an overall got their gender from NiaMeowDB, and the per-shop source lines left the popup; the footer
still credits NiaMeowDB.

**Score:** 3

#### What makes this deploy extra special

One tap shows which equip to buy for the cheapest level, next to what you wear, and the equip search only offers what
your character can actually wear.

**Score:** 3

#### Pull Request

Equip card: Your character and Cheapest views, and an equip search that only offers what you can wear
