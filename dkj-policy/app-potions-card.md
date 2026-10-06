## app/potions-card

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

- [x] Decided with Dave (October 6, 2026): potions have no level requirement in Classic (MeowDB "Lv 0"), so the card
  shows every potion the job can buy; Max MP becomes a field that rises on Level up.

### CREATE

- [x] Vera: the Thief's MP per level (+17, advancement +250) from the HP/MP guide the other jobs already cite
- [x] Cody + Gwen: Max MP profile field, Level up raises it, `src/potions.ts`, the Potions card and its styles
- [x] Victor: code review; tie-break order, Max MP bound and dead error routing fixed
- [x] Edith: final read of the Dutch UI text and comments; four stale comments fixed
- [x] Dave (October 6, 2026): Max HP and Max MP move to the top of Total stats
- [x] Dave (October 6, 2026): the price gets its own line under the name ("Prijs: 150 meso")
- [x] Dave (October 6, 2026): pick the HP and MP potion you use, like the mob; the calculation uses it, a report compares it with the cheapest, and the card moves up with the other report cards. Wasted recovery split off as #181
- [x] Victor and Edith: review of the potion choice; equally cheap potions count as cheapest (Magician Lemon), equal-cost hint reworded
- [x] Dave (October 6, 2026): the Potions card had extra padding; it now gets padding 0 like every other card with an eye
- [x] Dave (October 6, 2026): price in red with a minus, recovery in green with a plus (the Skillpoints cost/gain colours)
- [x] Dave (October 6, 2026): styled like Monster: pick a potion (a draft until Opslaan), its price and recovery below, correctable with the pencil; the list of all potions goes
- [x] Victor and Edith: review of the Monster-style card; a correction is tied to its potion name (no longer follows a job switch), the advice weighs the cheapest other potion against a corrected one, labels "Prijs" and "Herstel HP"

### TEST

- [x] Tycho: `src/potions.test.ts`, Max MP in the level-up, profile and app tests; 1651 tests green, lint clean
- [ ] Dave looks at the card at phone width before the merge

### DEPLOY: app/potions-card

A new Potions card, under Monster, lets you pick the HP and MP potion you actually use, the way you pick your mob. The
level's meso cost is calculated with your choice, and its report (also on the Report card) says how much the cheapest
potion per point would save. Like the Monster card, the chosen potion's price and recovery from the database show below
the choice, and the pencil corrects them when the shop or the game says otherwise; the calculation then uses your
number. A line under each potion says what it costs per HP or MP and how much of your bar one fills. Potions have no level requirement in Classic, so they are
all there at every level. Without a choice the app keeps using the cheapest. Max HP and Max MP now head the Total stats card. Max MP
is a new field: Level up raises it by your job's fixed MP per level ([`src/levelUp.ts`](../src/levelUp.ts)), and a profile saved
before it starts empty until you fill it in. It is shown only and never blocks the calculation.

**Score:** 4

#### What makes this deploy extra special

A player tells the app which potions they really buy, so the level's cost matches how they play, and sees what switching would save, and now keeps Max HP and
Max MP on Total stats, as in the game's stat window.

**Score:** 3

#### Pull Request

Potions card with Max HP and Max MP
