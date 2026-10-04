## app/skillpoints-section

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

Dave (4 oktober 2026): een sectie over skillpunten, met de punten die de speler op dat moment heeft gezet.
Eerste versie toonde alleen Lucky Seven en Nimble Body, de twee die het model doorrekent; Dave: "thief heeft
veel meer skills dan dit". Dus alle skills van een Thief tot de 2e job (3 Beginner, 6 van de 1e job), met
hun maximum van NiaMeowDB, en de kaart is de plek waar je ze invult. Hoeveel SP je per level krijgt, staat
niet eenduidig op MeowDB, dus de kaart toont wat je gezet hebt, geen "punten over".

### CREATE

- [x] Cody: skillLevels en pointsPlaced in src/skillPoint.ts, puur en zonder UI-import
- [x] Cody + Gwen: inklapbare kaart "Je skillpunten" op het beginscherm en boven de skillvraag in "Wat nu?"
- [x] Tycho: tests voor skillLevels en pointsPlaced, typecheck groen
- [x] Victor en Edith: review ronde 1; twee weggevallen spaties hersteld, "Niet doorgerekend:" zoals elders, hints samengevoegd, CSS gedeeld met .equipment
- [x] Rebecca + Vera: de 9 skills en hun maxima op NiaMeowDB (skill-index en klassenpagina's geven dezelfde maxima)
- [x] Cody: src/data/skills.ts; skillvelden in het profiel uit die data, verhuisd van Je karakter en het controlescherm naar de skillkaart, die nu invulbaar is; foutmelding bij de kaart van het foute veld
- [x] Tycho: tests voor de data, de nieuwe skillvelden en een bewaard profiel van vóór de wijziging (424 groen)
- [x] Victor en Edith: review ronde 2; skillkaart ook op het controlescherm (anders liep je vast op een fout skillveld), één geëxporteerde STAT_FIELDS, Lucky Seven uit de samenvatting van je karakter, "0 is nog niet geleerd", een datum per bron
- [x] Dave: de Beginner-skills helemaal onderin de kaart
- [x] Dave: de uitleg en de bronregel onder de skills weg; de naamsvermelding van NiaMeowDB staat onderaan de app, de bron per skill in src/data/skills.ts
- [x] Dave: de kaart heet Skillpoints, zonder onderschrift (pointsPlaced viel daarmee weg), met een boek-icoon links van de kop
- [x] Dave: onderaan de open kaart een knop Inklappen, want het pijltje in de kop is na het scrollen uit beeld; de focus gaat daarna terug naar de kop
- [x] Dave: per skill grote − en + (44×44) rond het getal, voor een duim op de telefoon; Tycho testte stepSkill (425 groen), Victor las mee, focusrand toegevoegd; past op 360px
- [x] Dave kijkt naar het scherm vóór de merge: akkoord ("ja goed", 4 oktober 2026)

### TEST

### DEPLOY: app/skillpoints-section

Onder je karakter staat nu een inklapbare kaart "Skillpoints", met een boekje in de kop. Daarin staan alle
skills van een Thief tot de 2e job: eerst de zes van de 1e job (Nimble Body, Keen Eyes, Double Stab,
Disorder, Dark Sight, Lucky Seven), helemaal onderin de drie van de Beginner (Three Snails, Nimble Feet,
Recovery), elk met het maximum van NiaMeowDB. Met grote − en + per skill zet je een level lager of hoger, of je typt het getal; ze staan niet meer bij je
karakter. De kaart staat ook in het controlescherm na een level-up en in "Wat nu?" boven de skillvraag,
zodat een punt dat je met "Punt zetten" zet daar meteen te zien is. Onderaan de open kaart klap je hem
weer in, zonder terug te scrollen naar de kop. In het advies rekenen nog steeds
alleen Lucky Seven en Nimble Body mee.

**Score:** 3

#### What makes this deploy extra special

Al je skillpunten staan op één plek, ook de skills die het advies (nog) niet doorrekent.

**Score:** 3

#### Pull Request

Sectie Skillpoints: alle skills van een Thief met de punten die je hebt gezet
