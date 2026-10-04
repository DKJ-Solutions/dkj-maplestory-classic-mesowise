## app/kaarten-zelfde-design

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

Dave (4 oktober 2026): alle inklapbare kaarten rechttrekken met het design van Skillpoints (#51). Gekozen
onderdelen: een icoon links van de kop, geen onderschrift, en onderaan een knop Inklappen. De grote − en +
bij getallen niet. Bij een plek blijft het getal "EXP per meso" in de kop: dat is de uitkomst, geen onderschrift.

### CREATE

- [x] Gwen + Cody: gedeelde CardIcon (boek, zwaard, poppetje, kaartspeld) en CollapseFoot; Je equipment, Je karakter, Skillpoints en elke plek gebruiken ze
- [x] Cody: onderschriften weg; isDefaultProfile en wornSummary werden daardoor nergens meer gebruikt en zijn met hun tests verwijderd, net als de CSS van het onderschrift
- [x] Tycho: 462 groen, typecheck en lint schoon
- [x] Victor: review van de diff; geen bugs. De focus na Inklappen gaat nu pas na de render naar de kop, omdat een plek bij het inklappen kan verschuiven
- [x] Dave kijkt naar het scherm vóór de merge: akkoord ("ja mooi merge", 4 oktober 2026)

### TEST

### DEPLOY: app/kaarten-zelfde-design

Alle inklapbare kaarten zien er nu hetzelfde uit als Skillpoints: links van de titel een icoon (een zwaard
bij Je equipment, een poppetje bij Je karakter, een boek bij Skillpoints, een kaartspeld bij elke plek), in
de kop alleen de titel zonder regel eronder, en onderaan een open kaart een knop Inklappen, zodat je niet
terug hoeft te scrollen naar het pijltje. Bij een plek staat het getal EXP per meso nog in de kop.

**Score:** 2

#### What makes this deploy extra special

Een lange open kaart klap je op je telefoon in waar je duim al is, en de kaarten zijn in één oogopslag
uit elkaar te houden.

**Score:** 2

#### Pull Request

Alle inklapbare kaarten in het design van Skillpoints
