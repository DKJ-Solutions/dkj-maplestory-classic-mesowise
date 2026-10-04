## data/56-shared-speed-and-item-types

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

Issue #56 (uit Victors review van #42): vóór de Magician (#43) en Bowman (#44) dezelfde vorm kopiëren, één
gedeelde tabel voor de aanvalssnelheden en één basistype voor winkelitems. Geen getal of bron verandert.

### CREATE

- [x] Ravi: `src/data/attackSpeed.ts` met `ATTACK_MS` (label → ms, 660 tot 900) en `SPEED` (label + ms);
  `claws.ts` en `warrior.ts` gebruiken die, `thief.ts` exporteert `ATTACK_MS` door voor de bestaande importers.
- [x] Ravi: `ShopItem`, `Requires<Stat>` en `ShopArmor` in `types.ts`; `Claw`, `Armor`, `WarriorWeapon` en
  `WarriorArmor` bouwen daarop, met dezelfde velden.
- [x] Victors review verwerkt: het commentaar zegt nu dat Normal (6) tot Slow (8) alleen van de itempagina's
  komen, en de steekcycli komen uit `SPEED`.

### TEST

- [x] Tycho: `src/data/attackSpeed.test.ts` pint de zes waarden en labels, de volgorde, dat `SPEED` en
  `ATTACK_MS` overeenkomen, en dat elke claw en elk Warrior-wapen een snelheid uit de tabel draagt.
- [x] Victor: geen bugs; alle waarden voor en na gelijk, geen importer gemist.

### DEPLOY: data/56-shared-speed-and-item-types

Intern opgeruimd: de aanvalssnelheden staan voor alle klassen in één tabel en de winkelitems delen één
basistype, zodat de Magician en Bowman ze niet opnieuw kopiëren. In de app verandert niets; geen getal of
bron is gewijzigd. Het voorkomt dat één snelheidslabel bij twee klassen een andere aanvalstijd krijgt, en
daarmee een andere EXP per uur.

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Eén tabel voor de aanvalssnelheden en één basistype voor winkelitems (#56)

