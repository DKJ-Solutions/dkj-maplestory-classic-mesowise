## app/87-overall-vs-pair

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

Issue #87. The armor advice treats the body as two alternatives: {overall} and {top + bottom}.

- A **pair** (one wearable top with one wearable bottom) is a candidate of its own, but only when an overall
  is in play (the shop has one for your level, or you wear one). So the Thief and Bowman advice stays as it was.
- The **horizon** runs to the next upgrade of the body: a top or bottom also stops before a later overall
  that beats it together with the best other half at that level, and an overall also stops before a later
  top or bottom that beats it the same way.
- A top or bottom alone that replaces a worn overall says that the other half is then **bare**.

#### Visible result

The verdict line can now read "Koop A (Top) en B (Bottom)", with the price "voor beide samen", and
"Je Bottom is dan leeg." when a single half replaces an overall. Dave looks before the merge (CLAUDE.md
lens: a visible result).

### CREATE

- [x] `src/armorUpgrade.ts`: `Candidate` with an optional `with`, `ArmorChoice.price`/`with`/`bare`, the
  body horizon, pair candidates, `robust` compares the whole choice (a pair is not its own top)
- [x] `src/app.tsx`: the verdict names both pieces of a pair, the total price, and the bare half; the
  winner is `choices[0]` instead of a lookup by piece

### TEST

- [x] `src/armorUpgrade.test.ts`: a new describe for #87, with the Magician at level 25 (the Doros Robe
  and every top + bottom pair, recomputed by hand), pair `replaces`, no pair without an overall (Thief, every
  level), the bare half, and both horizon directions (Magician level 20, male Warrior level 20)
- [x] Changed by the new rule and recomputed by hand: the injected Thief overall now runs to 29 (on level 30
  Dark Silver Stealer + Red Stealer Pants give 69 > 60), and the female Warrior's top on level 10 to 14 (Steel
  Fitted Mail 75 > 35 + 25)
- [x] `src/magicianModel.test.ts`: one choice per slot, plus the pair as a choice of its own
- [x] `npx vitest run`: 1162 passed; `npm run lint`: clean

### DEPLOY: app/87-overall-vs-pair

The Defense advice now weighs an overall against a top and bottom bought together. When an overall is in
play (the shop has one for your level, or you wear one), a pair of top + bottom is a candidate of its own,
with both prices added up. "Until your next upgrade" now also sees an overall coming for a top or bottom,
and a better top + bottom coming for an overall. If a single top or bottom wins over an overall you wear,
the advice says that the other half is then empty. Thief and Bowman shops have no overall, so their advice
does not change.

**Score:** 3

#### What makes this deploy extra special

A Magician (from level 25) or a Warrior no longer gets an overall advice that only looks at one half. The
advice can now say "buy this top and these pants together", and a top's payback no longer runs past the
level where the robe would replace it.

**Score:** 3

#### Pull Request

Armor advice: weigh an overall against a top+bottom pair

