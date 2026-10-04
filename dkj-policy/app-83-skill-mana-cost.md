## app/83-skill-mana-cost

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

#### Scope

Issue #83 ("Toon bij elke skillpoint de mana cost"): under every skill in the Skillpoints card, the MP that skill
costs per use at the level you have set. A visible result, so the branch parks for Dave's look and opens no PR.

### CREATE

- [x] Read the MP per level of the six skills the model does not calculate (Three Snails, Nimble Feet,
  Recovery, Double Stab, Disorder, Dark Sight) from the table on each raw MeowDB skill page (October 4, 2026);
  the WebFetch summaries disagreed on Double Stab and Disorder, the raw HTML settled both
- [x] `src/data/skills.ts`: an `mp` array per active skill (the four the model calculates reuse its own
  data), none for the five passives; `skillMpAt` reads it
- [x] `src/app.tsx` + `src/style.css`: a small muted line under each skill name

### TEST

- [x] `skills.test.ts`: every active skill has `max` MP values, every passive none, the six arrays match the
  pages, the modelled four match the model data, `skillMpAt` at 0, mid, max and passive
- [x] `app.test.tsx`: the card shows "12 MP per keer" for Slash Blast 20, "15 MP per keer op level 1" for Iron
  Body 0 and "Passief, kost geen MP" for Precise Strikes, and no MP line for an empty field (Victor's review)
- [x] `npm run lint` clean, 911 of 911 tests pass

### DEPLOY: app/83-skill-mana-cost

The Skillpoints card now shows under every skill what it costs in MP per use at the level you have set, for
example "12 MP per keer" under Slash Blast 20; a skill still at 0 shows the cost of level 1, and a passive skill
says it costs nothing. The MP comes from the skill pages on MeowDB.

**Score:** 2

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Show the mana cost per skill point
