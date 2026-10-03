## app/25-equipment-upgrade

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

#### Wat er gerekend wordt

Per claw die je nu kunt dragen en die meer weapon attack heeft dan de jouwe: de mesokosten van elk level
in de horizon, met en zonder die claw, elk op de beste plek. De besparing min de prijs is wat de claw
oplevert. De grootste opbrengst boven 0 wint. Dezelfde vier randwaarden van de aannames als bij "Beste"
(#21) toetsen of de winnaar overeind blijft.

**De horizon loopt tot je volgende upgrade** (Dave, #25): van je level tot het levelvereiste van de
eerstvolgende NPC-claw met meer weapon attack. Is er geen volgende, dan loopt hij tot lv 30, het einde
van de EXP-tabel, en zegt de kaart dat.

#### De uitwerkkeuzes (het label `awaiting-decision` is van #25 gehaald: de bouwer kiest)

- **Je stats van nu blijven staan** over de hele horizon. Het profiel kent alleen je huidige stats, dus
  laten meegroeien zou een tweede gok op de eerste stapelen.
- **De verkoopwaarde van je oude claw telt niet mee.** De app weet niet welke claw je hebt. Zo
  onderschat de kaart de opbrengst eerder dan dat hij hem overschat: "Kopen" zegt hij alleen als het ook
  zonder die verkoop loont.
- **Je huidige level telt volledig mee**, want de app weet niet hoe ver je erin bent.
- **Alleen claws met een NPC-prijs.** Gemaakte claws (Mithril/Gold Titans, Bronze/Adamantium Igor,
  Mithril Guards) hebben op MeowDB geen vaste prijs. De kaart noemt dat in plaats van een prijs te gokken.

#### De gegevens

Zes NPC-claws (Garnier, Steel Titans, Steel Igor, Meba, Steel Guards, Adamantium Guards), elk met
levelvereiste, weapon attack, snelheid, LUK/DEX-vereiste en NPC-prijs, en per rij de MeowDB-pagina en de
datum. De EXP-tabel loopt nu tot lv 30, omdat de horizon die levels nodig heeft. Uitgezocht door Rebecca.

### CREATE

- [x] `src/data/claws.ts` en het type `Claw` in `src/data/types.ts`, met bron en datum per rij
- [x] De EXP-tabel in `src/data/expTable.ts` uitgebreid met lv 21–30
- [x] `src/mesoCostAt.ts` uit `skillPoint.ts` gehaald, zonder gedragswijziging
- [x] `src/clawUpgrade.ts` met de tests van Tycho in `src/clawUpgrade.test.ts` en `src/data/claws.test.ts`
- [x] `ClawUpgradeCard` in `src/app.tsx`, met de bestaande stijl van de kaarten

### TEST

- [x] Alle tests (229) en de typecheck zijn groen, `npm run build` slaagt
- [x] De besparing in de tests is nagerekend met een eigen som over de EXP-tabel, niet met de module
- [x] Review door Victor (niets blokkerends; de sorteerfunctie is aangescherpt), tekst door Edith (de
  winnende zin toonde de bruto besparing als netto; nu de opbrengst na de prijs)
- [x] Bevinding: de aanvalssnelheid van een claw verandert de EXP per meso nooit, dus Meba's snelheid
  is in deze kaart geen voordeel. Apart gemeld in #34.

### DEPLOY: app/25-equipment-upgrade

Onder "Waar zet je je skillpunt?" staat nu of een nieuwe claw loont: "Kopen" als een claw die je nu kunt
dragen zichzelf terugverdient vóór je volgende upgrade, met wat hij na zijn prijs oplevert, en anders
"Nog niet". De kaart noemt de claws waarvoor je LUK of DEX nog tekortschiet, en zegt waarmee hij rekent.
Hij rekent met je stats van nu, zonder de verkoop van je oude claw, en alleen met claws die je bij een
NPC koopt. De app kent de EXP nu tot lv 30.

**Score:** 4

#### What makes this deploy extra special

Bij elke level-up zie je of een nieuwe claw zichzelf terugverdient, in plaats van te gokken of hij
zijn prijs waard is.

**Score:** 4

#### Pull Request

Loont een nieuwe claw bij een level-up? (#25)

