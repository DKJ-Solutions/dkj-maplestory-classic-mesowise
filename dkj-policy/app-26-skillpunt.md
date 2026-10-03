## app/26-skillpunt

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

#### Gestapeld op `app/24-mesokosten-scherm`

Deze branch bouwt op `levelCost` en de kaart "Wat kost dit level?" van de #24-branch. Die branch
wacht nog op Daves blik. Volgorde van mergen: eerst #24, dan deze. Het is een zichtbaar resultaat,
dus ook deze branch wacht op Dave voordat er een PR komt.

#### Wat het model kan doorrekenen

Op lv 10–20 (de EXP-tabel) heeft een Thief alleen skills van de 1e job. Twee daarvan raken het
mob-model: **Lucky Seven** (schade en MP) en **Nimble Body** (+1 accuracy en +1 avoid per level, max 15,
MeowDB, COT2). Keen Eyes (bereik), Disorder, Dark Sight en Double Stab (een dolkaanval) raken het model
niet. De app noemt ze "niet doorgerekend". Claw Mastery en Critical Throw horen bij de 2e job (lv 30),
buiten de EXP-tabel.

- **Profiel:** een veld voor het Nimble Body-level (standaard 0). Accuracy en avoid in het profiel zijn
  de totalen uit je statvenster, dus een punt in Nimble Body telt er +1 bij op.
- **Een bestaand profiel** krijgt Nimble Body 0, want het veld is nieuw. Wie de skill al heeft, vult
  hem één keer in; tot dan noemt de kaart het verkeerde doellevel (de +1 accuracy en avoid klopt wel).
- **Rekenen:** per skill het profiel met één punt erbij door "Beste" halen en de mesokosten van je level
  vergelijken. De grootste besparing boven 0 wint. De beste plek mag daarbij wisselen.
- **Robuustheid:** dezelfde vier randwaarden van de aannames als bij "Beste" (#21). Wisselt de winnende
  skill bij één ervan, dan zegt de kaart "Hangt af van de aannames". Daarvoor is de binnenste functie van `bestVerdict`
  als `pickUnder` geëxporteerd.

### CREATE

- [x] `NIMBLE_BODY` in `src/data/thief.ts`, met bron en datum
- [x] Het profielveld `nimbleBody` in `src/profile.ts`
- [x] `pickUnder` uit `bestVerdict` gehaald in `src/best.ts`, zonder gedragswijziging
- [x] `src/skillPoint.ts` met de tests van Tycho in `src/skillPoint.test.ts`
- [x] `SkillPointCard` in `src/app.tsx` en de stijl in `src/style.css`

### TEST

- [x] Alle tests (191) en de typecheck zijn groen, `npm run build` slaagt
- [x] In de browser: voorbeeld-Thief lv 10 op de Rain-Forest: Lucky Seven → 2 bespaart ± 169 meso,
  Nimble Body bespaart niets (je raakt al 100%, en de monsters raken jou ook altijd)
- [x] Review door Victor, tekst door Edith
- [x] Dave heeft gekeken: gezien en akkoord (3 oktober 2026)

### DEPLOY: app/26-skillpunt

Onder "Wat kost dit level?" staat nu waar je je skillpunt het beste kunt zetten: in Lucky Seven of in
Nimble Body, met hoeveel meso dat op dit level bespaart. Wisselt het antwoord als de aannames anders
uitvallen, dan zegt de kaart dat erbij. De skills die de app niet doorrekent, staan erbij. In je karakter
vul je nu ook je Nimble Body-level in.

**Score:** 4

#### What makes this deploy extra special

Na elke level-up zie je direct waar je punt de meeste mesos bespaart, in plaats van te gokken.

**Score:** 4

#### Pull Request

Waar je skillpunt de meeste mesos bespaart (#26)

