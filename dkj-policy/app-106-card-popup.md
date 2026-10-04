## app/106-card-popup

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

Dave (October 4, 2026, #106): the cards stop being dropdowns. The chevron becomes an eye icon, and tapping
it shows what the dropdown used to show, in a popup.

- [x] Scope: Ability points, Total stats, Je equipment, Skillpoints and every spot card. The equipment card on
  the level-up check screen was open by default there; it now shows its content directly on the card, since a
  popup that opens by itself would cover the "Alles klopt" button.

### CREATE

- [x] Cody: `CardHead` (eye icon, `aria-haspopup="dialog"`) and `CardPopup` (on the existing `StatDialog`);
  `Collapse`, `CollapseFoot` and their CSS removed
- [x] Cody: `StatDialog` takes `focusInput` (off for card popups, so a search box does not open its list on its
  own) and `className`; the card's error message also shows inside the popup
- [x] Tycho: tests updated for content that only exists while the popup is open; new tests for the eye and
  popup, closing and focus return, a kept pick after reopening, a new spot opening in its popup, and the
  inline equipment on the check screen
- [x] Cody: the explanation texts under the stats cards are gone (Dave, October 4, 2026: "Dit gaat de speler
  toch niet lezen"): the Attack/Weapon Def line, and the Thief, Bowman, Magician and Warrior texts under Total stats,
  including the weapon multiplier per kind of weapon; `WEAPON_MULT_BY_KIND` went with them, unused
- [x] Tycho: the tests on those texts now assert that they are gone

### TEST

- [x] `npm test`: 982 green; `scripts/lint/lint.ps1` clean; `npm run build` green
- [x] Victor (code) and Edith (Dutch) reviewed the diff

### DEPLOY: app/106-card-popup

The cards no longer fold open. Each card head ends in an eye icon, and tapping it shows the card's content
in a popup (a bottom sheet on a phone); the cross closes it and puts the focus back on the card. A new spot
opens straight into its popup. On the level-up check screen the equipment stays directly on the card.
The explanation texts under Ability points and Total stats are gone.

**Score:** 2

#### What makes this deploy extra special

Dave and his friends see the cards change: the content opens in a popup behind an eye icon instead of
folding open under the card, and the stats popups no longer end in a block of explanation.

**Score:** 3

#### Pull Request

Cards open their content in a popup behind an eye icon

