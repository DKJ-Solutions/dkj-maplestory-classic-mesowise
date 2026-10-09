## app/level-cost-why

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

Dave (October 9, 2026): "zet een vraagteken icoon achter de berekende mesos bij cheapest en profile". After two looks
(behind the amount, then in the top-right corner) Dave dropped the question mark: "haal maar weg dit is lelijk. het
probleem is vooral dat het voor de gebruiker niet heel duidelijk is dat je op deze kaart kan klikken voor meer info.
Maak dat duidelijker". A chevron followed; then Dave: "probeer eens een lees meer knop helemaal onder te zetten". A visible result, so the branch stops for Dave's look before the merge.

### CREATE

- [~] The question mark behind the amount, then in the top-right corner of each part: dropped at Dave's look, reverted to main
- [~] A chevron on the right of each part: replaced at Dave's next look by a "Read more" line
- [~] "Read more" as small underlined accent text: Dave asked for "echt een knop"
- [x] Gwen + Cody: "Read more" at the bottom of Cheapest, Profile and Difference, drawn as a filled accent button; it is the visible part of the existing button around it, since a button cannot hold a button, so the whole part still opens the bill

- [x] Gwen: Read more flat, without its shadow, and with more padding (Dave: "maak de read more knop meer flat", "en geef de knop meer padding")
- [x] Gwen: the amount larger (1.5rem) and centred in the part, with the label at the top and Read more at the bottom (Dave: "maak de fontsize van de x mesos groter en geef het meer ruimte")

### TEST

- [x] Tycho: a test checks that all three tappable parts end on "Read more", hidden from screen readers since the button's own label already says it
- [x] `npm run lint` and the app suite green (333 tests)
- [ ] Dave looks at it at phone width

### DEPLOY: app/level-cost-why

On the Level cost card, Cheapest, Profile and Difference now each end on a "Read more" button, so you can see that
tapping them opens the bill. It is missing only on a part that has nothing to open.

**Score:** 2

#### What makes this deploy extra special

On the home screen you can now see that the three Level cost parts open something; before, nothing told you that you could tap them for the bill.

**Score:** 2

#### Pull Request

a "Read more" button on the Level cost parts shows they open the bill
