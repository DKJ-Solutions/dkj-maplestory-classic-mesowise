## app/183-cheapest-settings-button

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

- [x] Dave's answers to the four open questions (October 6, 2026, on #183): apply in capped rounds until nothing
  changes, free settings only (no gear bought), one-tap undo through a snapshot, and show the saving plus what changed.

### CREATE

- [x] `cheapestSettings` in `src/cheapestSettings.ts`, a pure module that applies the existing mob, potion,
  skill-point and AP advice in rounds (at most 5) and keeps the cheapest state seen (Cody).
- [x] "Goedkoopste instellingen" button, summary and "Ongedaan maken" in `src/app.tsx`; the summary and undo disappear
  as soon as you edit anything yourself (Cody).
- [x] Reworked after Dave's look (October 6, 2026): two Total cost cards, "(in game)" and "(cheapest)", with
  "Overnemen" on the second; the loose button is gone (Cody).
- [x] Reworked again after Dave's look: one Total cost card with two columns, "In game" and "Cheapest", rows aligned
  by what they are (HP potion, MP potion, stars, travel) and the other item named in its cell (Cody).
- [x] Table cleaned up after Dave's look: each thing in its own column (name, count once, "?", the two amounts on one
  line), a different potion under the name, and narrow enough for 360px (Gwen, Cody).
- [x] Final shape after Dave's look: one Total cost card (h2) with three tinted panels under an h3, "Your character" and
  "Cheapest" as full invoices and "Difference" with what each setup pays per kind of cost and the difference, the
  changes and "Overnemen" (Gwen, Cody).

### TEST

- [x] Unit tests on the module and app tests on apply, undo, the "already cheapest" message, the three parts and the
  difference rows adding up to the difference of the two invoices (Tycho). Code review (Victor, findings applied and
  re-reviewed on each design) and text review (Edith).

### DEPLOY: app/183-cheapest-settings-button

The Total cost card now compares your setup with the cheapest one, in three tinted panels. "Your character" is the
level's invoice as you play it now. "Cheapest" is the invoice of the same level with the cheapest settings that cost
nothing: the cheapest safe mob, the cheapest potion per point, your skill points where they save the most and your AP
filled in. Because those choices affect each other, the cheapest setup is found in rounds until nothing changes (at most
five), and it never costs more than yours. "Difference" shows per kind of cost (HP Potions, MP Potions, Ammo, and travel
when it costs anything) what your character pays, what the cheapest setup pays, and what you leave on the table, in red.

Below that, the card lists the monster when it changes, your HP Potion, MP Potion and skill points (the change, or what
stays), and under ATT and DEF what the Equip advice says about your weapon and armor. Equipment is never bought: that
stays advice. "Overnemen" applies the cheapest setup and "Ongedaan maken" puts everything back in one tap, until you
change something yourself. When your setup already is the cheapest, the card says so in one line.

**Score:** 4

#### What makes this deploy extra special

At every level-up you see at once what your setup costs against the cheapest one, and one tap does what used to be four
cards of reading and applying advice by hand.

**Score:** 4

#### Pull Request

Compare your setup with the cheapest one on the Total cost card

