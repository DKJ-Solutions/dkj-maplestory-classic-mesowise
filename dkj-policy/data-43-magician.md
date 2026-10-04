## data/43-magician

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

Stap 1 van #43, zoals stap 1 van #42 voor de Warrior: de Magician-gegevens met bronnen, nog niet aangesloten
op het mob-model of de app. Dezelfde regels als `warrior.ts` en `armor.ts`; wat daar onder #55 valt (geen
jobregel, alleen voor één geslacht) blijft eruit tot Dave beslist.

### CREATE

- [x] Rebecca: wapens, armor, skills, damage-formule, accuracy, HP/MP en MP-potions van NiaMeowDB, met een
  tweede lezing van Magic Claw, de staf-snelheid en Magic Guard.
- [x] Vera: `src/data/magician.ts` en de typen `MagicianWeapon`, `MagicianArmor`, `SpellLevel` en
  `MagicArmorLevel` in `types.ts`, gebouwd op `ShopItem`, `ShopArmor` en `Requires` uit #56.

### TEST

- [x] Tycho: `src/data/magician.test.ts` (46 tests) pint elk getal tegen het onderzoek, de uitsluitingen, de
  staf-snelheid zoals gedrukt en `magicianAccuracy` met randgevallen en een rooster tegen de formule.
- [x] Victor: geen bugs; elk getal klopt met het onderzoek en de inclusieregel volgt `warrior.ts` en `armor.ts`.

### DEPLOY: data/43-magician

De Magician heeft nu eigen spelgegevens, elk met zijn bron: de staffen en wands en de armor uit de NPC-winkels
voor level 10 tot 30, Energy Bolt en Magic Claw per level, Magic Guard, Magic Armor en de MP-passieven, HP en
MP per level, de accuracy-formule en de Orange en Lemon als goedkoopste MP. In de app verandert nog niets: de
Magician blijft "Nog niet doorgerekend" tot het mob-model deze gegevens gebruikt. De drie goedkoopste wands
(geen jobregel) en de tops, broeken en robes voor één geslacht ontbreken nog (#55, #50).

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Magician-gegevens met bronnen: wapens, armor, skills en HP/MP (stap 1 van #43)

