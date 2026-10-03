## app/level-up-flow

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

Dave (3 oktober 2026): een speler die in het spel een level omhoog gaat, moet in de app meteen een knop **Level up** zien. Het scherm schuift naar links, de stats zijn al aangepast en de speler loopt na wat niet klopt. Daarna toont de app het advies op vier vragen: attack, defense, skillpunt (dat extra mana kost) en hunting ground.

#### Keuzes

- **Alleen het level gaat automatisch +1.** De repo heeft geen bron voor HP- en AP-groei per level, dus de app verzint die niet. Dat staat in #33.
- **Attack** rekent met de claw-upgrade uit #25 (PR #35, tijdens deze branch op `main` gekomen en ingemerged). **Defense** heeft nog geen berekening en toont "Nog niet uitgerekend". Dat staat in #36.
- **De knop staat sticky bovenaan**, direct onder de titel, niet onderaan. `position: fixed` breekt in de verschoven baan, en bovenaan ontloopt hij de iOS-balk. Daar staat tegenover dat hij niet in de duimzone zit. Dave beoordeelt dat.
- **De hunting-ground-vraag** vergelijkt de beste plek van vóór de level-up met de beste plek na het nalopen van je stats.

### CREATE

- [x] `src/levelUp.ts`: pure functies voor de flow (level +1, skillpunt zetten, MP van Lucky Seven, het hunting-ground-advies) (Cody)
- [x] `src/app.tsx` en `src/style.css`: drie panelen die naar links schuiven (Home, "Klopt dit met je spel?", "Wat nu?"), met `inert` en focus op de kop, en geen animatie bij `prefers-reduced-motion` (Cody, met Gwens mobile-first eisen)
- [x] Review-ronde verwerkt: lv 200 of een ongeldig level opent de flow niet meer, het advies verspringt niet tijdens het schuiven, "Punt zetten" geeft een bevestiging, en Ediths tekstpunten zijn doorgevoerd (Victor, Edith → Cody)
- [x] `origin/main` (#35) ingemerged; de attack-vraag gebruikt `clawUpgradeAdvice`, en de kosten op een plek lopen via `mesoCostAt.ts` (`expPerMesoOf`) in plaats van een eigen kopie (Cody)

### TEST

- [x] `src/levelUp.test.ts`: 22 tests op de contracten van `levelUp.ts`; de mesokosten worden onafhankelijk nagerekend (Tycho)
- [x] `npm run lint`, `npm test` (251 groen) en `npm run build` zijn groen
- [~] Het schuiven, de focus en `inert` zijn niet als unit-test te dekken: de repo heeft geen DOM-testopzet. Dave bekijkt het op telefoonbreedte vóór de merge.

### DEPLOY: app/level-up-flow

Een level-up in de app is nu één knop. Je loopt je stats na en krijgt antwoord op vier vragen: loont een nieuwe claw, loont betere defense (nog niet uitgerekend), waar zet je je skillpunt, en moet je naar een andere plek.

**Score:** 4

#### What makes this deploy extra special

De speler hoeft na een level-up niet meer zelf door de kaarten te zoeken. Eén knop leidt naar het advies voor het nieuwe level, en dat merk je bij de eerstvolgende level-up.

**Score:** 4

#### Pull Request

Level-up-flow: één knop, je stats nalopen, dan het advies

