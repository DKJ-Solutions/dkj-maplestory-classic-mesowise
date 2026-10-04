## app/equipment-section

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

Dave (4 oktober 2026): onder de Level up-knop een sectie met alle equipment die je na een level-up nog
draagt. Wat in het vorige level veranderde (bijvoorbeeld iets geloot), werk je in het volgende level
meteen bij. Dave koos ervoor dat de equipment meerekent en niet alleen wordt bijgehouden.

### CREATE

- [x] `src/equipment.ts`: per slot (Weapon, Hat, Top, Bottom, Shoes) "Weet ik niet", "Niets",
  een winkelitem of "Ander item" met eigen WATK/WDEF, bewaard in localStorage
- [x] Een keuze past het profiel aan: de claw zet je weapon attack (en bij een winkelclaw je
  aanvalssnelheid), armor past je totale WDEF aan met het verschil tussen het oude en het nieuwe stuk
- [x] `armorUpgradeAdvice` rekent met wat je in een slot draagt; alleen bij "Weet ik niet" nog alsof
  het slot leeg is
- [x] Scherm: kaart "Je equipment" onder de Level up-knop, en dezelfde kaart in stap 1 van de
  level-up-flow met een "was"-badge; ongedaan maken zet ook de equipment terug
- [x] Na review (Victor): het getal bij "Ander item" wordt pas bij vastleggen toegepast, tegen de
  laatst toegepaste stand; bewaard en meegerekend wordt alleen de toegepaste stand
- [x] Dave (4 oktober 2026): de kaart is inklapbaar, zoals "Je karakter". Op het thuisscherm staat hij
  dicht met in de kop wat je draagt; in het controlescherm na een level-up staat hij open
- [x] Dave (4 oktober 2026): het pijltje van een keuzelijst zat tegen de rand. Alle keuzelijsten
  krijgen een eigen pijltje met ruimte tot de rand, in de gedempte tekstkleur
- [x] Dave (4 oktober 2026): de eerste hint in de open kaart zat tegen de bovenrand; nu dezelfde ruimte
  als bij "Je karakter"
- [x] Dave (4 oktober 2026): de slots heten zoals in het spel (Weapon, Hat, Top, Bottom, Shoes), ook in
  het defense-advies; het wapenslot heet algemeen Weapon (de job-keuze in #41 bepaalt straks welk wapen)
- [x] Dave (4 oktober 2026): een zichtbare aanwijzing dat een kaart inklapbaar is. Elke inklapbare kaart
  (karakter, equipment, plekken) krijgt een pijltje achter de titel: omlaag = dicht, omhoog = open

### TEST

- [x] `src/equipment.test.ts` (nieuw) en het worn-pad in `src/armorUpgrade.test.ts`, met
  handberekeningen; `npm test` 403 groen, lint en build groen
- [x] Review: Victor (drie rondes), Sebastian (geen bevindingen), Edith (zes tekstpunten verwerkt)
- [x] Bevinding: het scherm zelf heeft geen component-tests. Apart gemeld in #40.
- [ ] Dave heeft het scherm bekeken en akkoord gegeven

### DEPLOY: app/equipment-section

Onder de **Level up**-knop staat nu een inklapbare kaart "Je equipment"; ingeklapt zie je in de kop wat
je draagt. Per slot (Weapon, Hat, Top, Bottom, Shoes) kies je wat je draagt: een winkelitem, "Niets", "Ander item" met eigen WATK of WDEF, of "Weet
ik niet". De keuze rekent mee. Een claw vult je weapon attack in (en bij een winkelclaw je
aanvalssnelheid), armor past je WDEF aan, en het defense-advies rekent met wat je in dat slot al draagt
in plaats van alsof het leeg is. Na een level-up staat dezelfde kaart in het controlescherm, zodat je
iets wat je in je vorige level hebt geloot of gekocht meteen bijwerkt.

**Score:** 3

#### What makes this deploy extra special

Het defense-advies weet nu wat je draagt. Een "Koop" geldt daardoor niet meer alleen "als dat slot leeg
is", en je hoeft na een loot je WDEF en weapon attack niet meer zelf uit te rekenen.

**Score:** 3

#### Pull Request

equipment-sectie onder de Level up-knop, die meerekent
