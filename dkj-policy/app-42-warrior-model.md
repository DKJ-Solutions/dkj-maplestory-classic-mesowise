## app/42-warrior-model

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

Stap 2 van #42: het mob-model, het profiel, de level-up, de skillpunten, de equipment en het upgrade-advies
rekenen met de Warrior-gegevens uit stap 1 (#57). Zichtbaar resultaat: Dave kijkt vÃ³Ã³r de pull request.

#### Modelkeuzes

- Schade volgens de damage-gids: STR primair, DEX secundair, mastery 0,08, multiplier = 60/40 zwaai/steek.
- Power Strike op zijn skill-level, anders de basisaanval; Slash Blast niet (geen gegevens over hoeveel mobs je raakt).
- Geen munitie; MP van Power Strike in de potionkosten; accuracy uit `warriorAccuracy` plus Precise Strikes.
- Improved HP Recovery, Max HP Increase en Iron Body niet doorgerekend (staan onder "Niet doorgerekend").
- AP na een level-up niet verdeeld: geen bron voor de STR/DEX-verdeling; de hint vraagt het zelf te doen.
- Aanname zonder bron: dezelfde `contactsPerKill` 0,3 als de Thief (genoteerd op #20).

### CREATE

- [x] Mob-model, profiel (`job`, `weaponMult`), level-up, skillpunten, equipment en wapen-/armor-upgrade voor de Warrior (Cody)
- [x] #61 (een skillpunt wiste de velden van de andere job) gevonden en hier opgelost
- [x] Reviewbevindingen van Victor en Edith verwerkt (munitieveld verborgen voor de Warrior, Engelse wapensoorten, hints)

### TEST

- [x] Tests (Tycho): damage-gids-voorbeeld 60â€“172 en Power Strike 20 157â€“449, Thief ongewijzigd; `npx vitest run` 659 geslaagd, 1 verwacht gefaald (#52); `tsc --noEmit` schoon
- [x] Review door Victor (code) en Edith (tekst)
- [x] Dave kijkt naar het scherm op telefoonbreedte: "gezien en akkoord" (4 oktober 2026); na de merge met main (nieuwe equipmentkaart) opnieuw bekeken en goedgekeurd: "merge maar"

### DEPLOY: app/42-warrior-model

Een Warrior krijgt nu echte getallen in plaats van "Nog niet doorgerekend": kills en EXP per uur,
potionkosten, de beste plek, wat een level kost, of een nieuw wapen of een nieuwe hoed of schoenen loont,
en welk skillpunt (Power Strike of Precise Strikes) het meeste spaart. Je kiest je wapen uit de NPC-winkel,
en het vult je weapon attack, aanvalssnelheid en multiplier in. Voor Top en Bottom zijn er nog geen
winkelitems (#55). Magician en Bowman blijven "Nog niet doorgerekend".

**Score:** 4

#### What makes this deploy extra special

Vrienden die een Warrior spelen kunnen de app nu echt gebruiken.

**Score:** 3

#### Pull Request

De Warrior doorgerekend: mob-model en scherm

