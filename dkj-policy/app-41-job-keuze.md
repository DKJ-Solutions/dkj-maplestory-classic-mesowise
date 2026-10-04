## app/41-job-keuze

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

Issue #41 (Dave, 4 oktober 2026): de app is niet alleen voor Thieves. Een sectie "Je job" bij de
equipment, wapen- en armorlijsten gefilterd op job, en voor een job die nog niet is doorgerekend bij elk
advies "Nog niet doorgerekend voor <job>" in plaats van een getal. De rekenkern is alleen voor de Thief
gemaakt; een Thief-formule op een andere job geeft een fout getal. De standaardjob is Thief, zodat wie de
app al gebruikte niets ziet veranderen. De winkeldata is alleen Thief; andere jobs krijgen pas data in
#42 tot #45. Zichtbaar resultaat: Dave kijkt voor de merge.

### CREATE

- [x] Cody: `src/job.ts`, de job-sectie, gefilterde lijsten, de "nog niet doorgerekend"-gate en het job-afhankelijke profiel
- [x] Cody: reviewronde. `parseProfile(d, job)` controleert alleen de getoonde velden (Victor: een verborgen,
  leeg Lucky Seven-veld blokkeerde anders "Alles klopt, toon advies" voor een andere job), `applyLevelUp`
  vraagt de job verplicht, de vraagtitels zijn gedeeld, de job-kaart staat vóór de equipment, en Ediths
  tekstpunten zijn verwerkt.
- [x] Gwen: de job-kaart is niet inklapbaar en heeft geen keuzelijst. Het is één vraag, dus hij staat
  altijd open, met de vijf jobs als knoppen (Dave, 4 oktober 2026).
- [x] Cody: de job ligt vast zodra je kiest (Dave, 4 oktober 2026). Daarna toont de kaart alleen je job.
  Uitzondering uit het spel: een Beginner ziet de vier jobs van de job advancement. `jobChoices` en
  `isJobStored` in `src/job.ts`, met tests van Tycho.
- [x] Gwen: een potlood helemaal rechts in de job-kaart herstelt een vergissing: het toont weer alle vijf
  jobs, met je huidige job omlijnd (Dave, 4 oktober 2026).
- [x] Cody: de Beginner is geen keuze meer, want niemand speelt hem (Dave, 4 oktober 2026). Daarmee is ook
  de job advancement uit de kaart; een bewaarde Beginner telt niet als keuze en wordt de Thief.

#### Ontwerpkeuzes

- Eén gate in `App()`: voor een job die niet is doorgerekend krijgt de rekenkern geen profiel, dus er
  draait geen Thief-formule en er verschijnt geen modelgetal. De EXP per meso die je zelf bij een plek
  invult, blijft zichtbaar: die komt niet uit het model.
- Een jobwissel zet een winkelitem dat de nieuwe job niet heeft op "Weet ik niet", en laat WDEF en WATK
  in het profiel staan.
- Bij een level-up krijgt een andere job alleen level +1: de HP- en AP-gegevens zijn van de Thief.

### TEST

- [x] Tycho: `src/job.test.ts` (nieuw), en uitbreidingen in `equipment.test.ts`, `profile.test.ts` en
  `levelUp.test.ts`. 435 tests groen, `tsc` schoon.
- [x] Victor: code-review. Eén blokkerend punt (verborgen velden), opgelost. Geen modelgetal dat bij een
  andere job op het scherm komt.
- [x] Edith: de Nederlandse tekst. Vijf punten, verwerkt.
- [~] Component-tests van `app.tsx`: die bestaan nog niet (#40). De render-paden zijn door Victor gelezen,
  niet gedraaid.

### DEPLOY: app/41-job-keuze

Je kiest nu je job (Warrior, Magician, Bowman of Thief) in een eigen kaart boven "Je equipment".
Je kiest één keer; een vergissing herstel je met het potlood. De Thief werkt zoals altijd. Voor een andere job zegt de app eerlijk "Nog niet doorgerekend
voor <job>" en geeft hij geen getal, want een Thief-formule op een Warrior geeft een fout getal. De wapen-
en armorlijsten tonen alleen wat jouw job kan kopen. Voor de andere jobs zijn dat er nog geen, dus daar
kies je "Ander item" of "Weet ik niet". Lucky Seven en Nimble Body staan alleen bij de Thief.

**Score:** 3

#### What makes this deploy extra special

Vrienden die geen Thief spelen, krijgen geen Thief-advies meer dat op hen niet klopt. De Warrior,
Magician en Bowman volgen in #42 tot #44.

**Score:** 3

#### Pull Request

Job-keuze: wapens en equipment per job, eerlijk 'nog niet doorgerekend' buiten Thief

