## data/76-magician-robes

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

#### Read the robes raw

#76 had the robe numbers only through a summarizer, because a plain `curl` was blocked. With a browser user
agent the raw pages load now (item pages are `/msclassic/item-db/<id>`), so all seven robe pages and Serabi's
shop page (NPC 311) were read raw on 2026-10-04. The summarized table was right on every row.

### CREATE

- [x] `src/data/magician.ts`: one overall row, Doros Robe / Doroness Robe (1098, level 25, INT 40, LUK 15, WDEF 40, MDEF 49, 13,500 mesos): a male/female pair with identical stats, the rule from `armor.ts`
- [x] The header records the raw numbers of the male-only Plain Robe and Wizard Robe, which wait on the gender question (#55)
- [x] The review notes from #50 about weighing an overall against a top+bottom pair moved to #87, since the Magician armor does not feed the advice yet (#43)

### TEST

- [x] `src/data/magician.test.ts`: 15 rows, five pairs, the robe as the only overall, Plain and Wizard Robe absent, slot order with the overall
- [x] `npm run lint` and `npx vitest run` green locally (906 tests)

### DEPLOY: data/76-magician-robes

The Magician data gains its first robe: the Doros Robe (for women, the Doroness Robe) from Serabi in Ellinia,
level 25, 40 DEF and 49 magic DEF for 13,500 mesos, read from the raw MeowDB pages. The app does not
calculate with the Magician's gear yet, so nothing changes on screen until #43 wires it in.

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Magician robes from Serabi's shop (Doros and Doroness)

