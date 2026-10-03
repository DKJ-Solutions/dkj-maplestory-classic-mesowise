## app/36-armor-upgrade

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

Issue #36: de defense-kaart in de level-up-flow krijgt een oordeel, net als de claw-kaart (#25, `clawUpgrade.ts`).
Keten: Rebecca (bron) → Vera (`src/data/armor.ts`) → Tycho (tests) → Cody (+ Gwen) (`armorUpgrade.ts` en de
kaart) → Victor → Edith. Zichtbaar resultaat, dus geparkeerd zonder PR tot Dave heeft gekeken.

#### Gekozen standaard: welk stuk je nu draagt, weet de app niet

Het profiel kent alleen je totale WDEF, niet wat je per slot draagt. De app rekent daarom met **je WDEF + de
WDEF van het nieuwe stuk** (alsof dat slot nu leeg is). Dat is de grootst mogelijke besparing: een **Nee** is
daarmee zeker, een **Ja** zegt de app met die voorwaarde erbij. Dezelfde standaarden als bij de claw: je stats
blijven gelijk over de horizon, de verkoopwaarde van je oude stuk telt niet mee. Dave kan dit bij het kijken
omgooien (bijvoorbeeld een veld per slot in het profiel).

Per slot telt het stuk met de grootste netto besparing, niet het stuk met de meeste WDEF (Victors review:
anders klopt een **Nee** niet). Gevolg om bij het kijken op te letten: met een lege slot als aanname wint op
lv 25 een goedkoop lv-10-stuk (Red Cloth Vest, ongeveer +1.900 meso). Dat klopt binnen het model, maar wie al
iets draagt, heeft er weinig aan. De Qi Pao Skirt staat er niet in: hij is alleen voor vrouwen en de app kent
het geslacht van je karakter niet.

### CREATE

- [x] De armor-gegevens, met bron per rij (Rebecca → Vera): 16 Thief-stukken uit de NPC-winkel, lv 10–30,
  elke pagina twee keer nagelezen; wat is weggelaten en waarom staat bovenaan `src/data/armor.ts`
- [x] `armorUpgrade.ts`: besparing tot je volgende upgrade per slot, min de prijs (Cody); `horizonCost` en
  `byNet` zijn uit `clawUpgrade.ts` naar `src/horizonCost.ts` verhuisd, de claw rekent ongewijzigd
- [x] De tests (Tycho): `armor.test.ts`, `horizonCost.test.ts`, `armorUpgrade.test.ts`, met handsommen en een
  brute-force-controle dat een **Nee** klopt over alle stukken
- [x] De defense-kaart in de level-up-flow (Cody)
- [~] Gwen: niet ingezet, de kaart gebruikt alleen de bestaande stijl van de claw-kaart; Dave kijkt naar het scherm

### TEST

- [x] Review: Victor (code), Edith (tekst in de app). Victors blokkerende bevinding (per slot het stuk met de
  meeste WDEF in plaats van de grootste netto besparing) is opgelost en vastgezet; Ediths teksten staan erin
- [x] `npx vitest run`: 311 tests groen; `npm run lint` schoon
- [~] De tie-break van `bestOf` (gelijke WDEF, goedkoopste wint) is niet getest: geen twee stukken in één slot
  hebben dezelfde WDEF, dus zonder mock is hij onbereikbaar

### DEPLOY: app/36-armor-upgrade

In de level-up-flow beantwoordt de defense-kaart nu "Moet ik mijn defense nu upgraden?": "Koop" met het
stuk (hoed, bovenstuk, broek of schoenen) dat zich het meest terugverdient vóór je volgende upgrade, en
anders "Nee". De app weet niet wat je nu draagt, dus hij rekent alsof dat slot leeg is en zegt dat erbij:
een "Nee" is zeker, een "Koop" geldt onder die voorwaarde. De kaart noemt de stukken waarvoor je LUK of
DEX nog tekortschiet, en rekent alleen met Thief-armor die je bij een NPC koopt.

**Score:** 3

#### What makes this deploy extra special

Bij een level-up zie je nu ook voor je armor of hij zichzelf terugverdient, en niet alleen voor je claw.

**Score:** 3

#### Pull Request

Bij een level-up: loont betere armor (WDEF) nu? (#36)

