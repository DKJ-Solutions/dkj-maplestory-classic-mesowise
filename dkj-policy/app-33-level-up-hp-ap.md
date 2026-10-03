## app/33-level-up-hp-ap

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

Issue #33: bij **Level up** past de app naast het level ook Max HP, de AP en de accuracy die daaruit volgt
aan. Keten: Rebecca (bron) → Vera (nagelezen op de pagina zelf) → Cody → Tycho → Victor + Edith. Zichtbaar
resultaat (de tekst op het controlescherm), dus geparkeerd zonder PR tot Dave heeft gekeken.

#### De bronnen (NiaMeowDB, 3 oktober 2026)

- Max HP per level is vast, geen bereik ("Sampled level-ups showed zero variance"): Beginner +16, Thief +22
  ([hp-mp-gain-explained](https://meowdb.com/msclassic/guides/hp-mp-gain-explained)). Omdat het een vast
  getal is, past de app het direct aan in plaats van een voorstel te tonen.
- 5 AP per level ([beginners-guide](https://meowdb.com/msclassic/guides/beginners-guide-first-steps-in-maple-world)).
- Accuracy = floor((1.2 × DEX + 2 × level + 0.6 × LUK) × 0.25 + 15), en "Raise DEX only when the next claw
  needs it, then put the rest into LUK" ([thief-class-guide](https://meowdb.com/msclassic/guides/thief-class-guide)).

#### Gekozen standaarden

- De 5 AP gaan standaard in LUK (de Thief-gids); wie DEX nodig heeft voor een claw, verschuift ze op het
  controlescherm.
- Een level-up vanaf lv < 10 geeft de Beginner-waarde, vanaf lv 10 de Thief-waarde. De eenmalige +250 HP
  van de job-advancement zit er niet in.
- Avoid past de app niet aan: de Thief-gids geeft er geen formule voor.
- Accuracy krijgt alleen het verschil van het stat-deel erbij, want het profiel bevat het totaal uit het
  statvenster (met Nimble Body en items).

### CREATE

- [x] Bronnen gezocht (Rebecca) en op de pagina zelf nagelezen (Vera): drie feiten, elk met bron in `src/data/thief.ts`
- [x] `applyLevelUp` in `src/levelUp.ts`: level, Max HP, LUK en accuracy; een veld dat geen heel getal is, blijft zoals getypt (Cody)
- [x] De tekst op het controlescherm noemt alleen wat de level-up zelf aanpaste (`levelUpChanges`, `levelUpSummary`), niet wat de speler daarna verschuift (Cody)
- [~] Gwen: niet ingezet, alleen de tekst van een bestaande hint verandert; Dave kijkt naar het scherm

### TEST

- [x] De tests (Tycho): `src/data/thief.test.ts` en `src/levelUp.test.ts`, met de grens lv 9 → 10, accuracy +1 en +2, en velden die geen heel getal zijn
- [x] Review: Victor (code), Edith (tekst in de app). Victors blokkerende bevinding (`baseAccuracy` rondde door floating point soms 1 te laag af, bijvoorbeeld 49 in plaats van 50 bij DEX 1, lv 1, LUK 228) is opgelost met gehele getallen en vastgezet; Ediths teksten staan erin
- [x] `npx vitest run` groen; `npm run lint` schoon
- [x] Dave heeft het controlescherm bekeken en akkoord gegeven (3 oktober 2026)

### DEPLOY: app/33-level-up-hp-ap

Bij **Level up** zet de app nu meer dan alleen je level goed. Je Max HP gaat omhoog met de vaste waarde
voor je klasse (+22 als Thief, +16 als Beginner onder level 10). De 5 nieuwe AP gaan in LUK, en je accuracy
gaat mee omhoog. Het controlescherm noemt wat er is aangepast. Je controleert daar zelf nog je avoid, en
zet AP in DEX als je claw dat nodig heeft. Alle waarden komen van NiaMeowDB.

**Score:** 3

#### What makes this deploy extra special

Na een level-up hoef je HP, LUK en accuracy niet meer zelf over te typen uit je statvenster.

**Score:** 3

#### Pull Request

Bij een level-up ook HP en AP automatisch aanpassen (met bron) (#33)

