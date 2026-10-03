## app/15-exp-per-uur

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

Issue #15, stap 3 van 3. Daves besluit van 3 oktober 2026 was optie c: de app stelt kills per uur voor met
het mob-advies-model uit life-hub, en de speler kan dat getal overschrijven. Eerst alleen voor de Thief,
met een karakterprofiel. De aannames zonder bron staan met een naam in de code, en de app zegt dat het
voorstel een schatting is. Dit is een zichtbare wijziging, dus de branch wordt geparkeerd tot Dave kijkt.

### CREATE

- [x] Vera: per monster WDEF, avoid, accuracy en touch uit de ruwe MeowDB-pagina's; de potions met HP/MP-herstel en de Blue Potion (220); Subi (W.ATK 15, herladen 0,3 meso per ster); Lucky Seven per level, multiplier 3,0, mastery 50% en de aanvalstijd (750 ms bij Fast (5)) van de skillpagina
- [x] Cody: `src/calc/mobModel.ts` (het model, puur), `src/calc/expPerHour.ts` (`expPerHour`, `potionCostPerHour`), `src/profile.ts` (het profiel, met opslag), `src/suggest.ts` (voorstel, verbruik per uur, een leeg veld = het voorstel)
- [x] Cody: op het scherm de kaart "Je karakter (Thief)", per bekende plek het monster, kills per uur met het voorstel, de voorstellen als placeholder, en waarschuwingen
- [x] Victor, Sebastian, Marlowe en Edith: verwerkt; wat een ontwerpkeuze of een meting vraagt staat in #20 en #21

#### Wat anders is dan het model in life-hub

- Lucky Seven komt nu uit de tabel op de skillpagina van MeowDB in plaats van een interpolatie: lv 3 kost 8 MP (was 9), lv 20 doet 140%.
- De aanvalstijd, de Subi-stars en de potionprijzen hebben nu een bron; alleen `timeEfficiency` (0,6) en `contactsPerKill` (0,3) blijven aannames zonder bron, net als de Spadow-raakkans en de demping per level.
- Het verbruik wordt per kill gerekend, zodat het meeschaalt als de speler zelf kills per uur invult.

### TEST

- [x] `npm test`: 145 tests groen; de handmatige gevallen uit de regressietests van het model (schade, raakkans, WDEF, waarschuwingen) zitten erin, plus een test van begin tot eind van bekende plek naar rangschikking
- [x] `npm run build`: groen, JS 12,6 kB gzip (was 9,5 kB)
- [ ] Dave bekijkt het op zijn telefoon

### DEPLOY: app/15-exp-per-uur

Bij een bekende plek stelt Mesowise nu zelf voor hoeveel kills per uur je haalt. Dat voorstel volgt uit je
karakter (level, stats, Lucky Seven) en het monster waarop je traint. Daarmee rekent de app EXP per uur,
potions en het herladen van stars uit. Klopt het voorstel niet, dan vul je zelf je kills per uur in. De
app zegt erbij dat het een schatting is, en waarschuwt als een monster gevaarlijk is of als je vaak mist.

**Score:** 4

#### What makes this deploy extra special

Je hoeft niets meer te raden. Kies een plek, vul één keer je karakter in, en de app laat zien waar je de
meeste EXP per meso haalt.

**Score:** 4

#### Pull Request

EXP per uur uitrekenen uit kills per uur, met de spelgegevens

