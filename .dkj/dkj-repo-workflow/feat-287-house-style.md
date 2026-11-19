## feat/287-house-style

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

Issues #287 and #289: adopt the brand book at dkj-marketplace v7.2.0 (the house style issue #287 named
house-style-v3 from the archived dkj-brandbook repo; v7.2.0 is where it lives now), with its settings
button, and declare the repo's default theme `yellow`. Started fresh: the parked `origin/app/house-style`
(October 12) migrated to an older house and is far behind main, so it was only read for its Vite wiring.

### CREATE

- [x] Vendored `house-style.css`, `house-product.css`, `house-theme.js`, `InterVariable.woff2` and
      `LICENSE-Inter.txt` into `src/house/`, unchanged; sha256 checked against the pin table.
- [x] `src/style.css` rewritten as the app's domain layer: house tokens, `--mw-*` domain tokens for the
      advised (orange) and worn (blue) popups and level-up, the house type scale and weights.
- [x] `house-theme.js` inlined into `<head>` by a Vite plugin (dev, build and offline build);
      `<html data-theme-default="yellow" data-theme-key="mesowise">`.
- [x] Round settings button (`DKJTheme.settings`, without the width group) beside the menu button.
- [x] `check-house-style` CI caller at v7.2.0 (`.github/workflows/house-style.yml`).
- [ ] Dave looks at the app on the preview before the merge (visible result).

### TEST

- [x] `check-house-style`: 0 findings (was 301), all four house files pinned at v7.2.0.
- [x] `npm run lint` clean; `npm test` 1987 tests pass; `npm run build` and `npm run build:offline` succeed.
- [x] Screenshot at 375px: settings and menu button in the top bar, no horizontal overflow.

### DEPLOY: feat/287-house-style

Mesowise now renders in the DKJ-Solutions brand book: Inter, the house tokens and components, the
default theme Geel (yellow), and a round settings button in the top bar to pick another theme. The app's
own colours (the orange Cheapest and blue Profile popups, level-up) stay as its own domain layer (#287, #289).

**Score:** 3

#### What makes this deploy extra special

Every screen of the app changes look at once; a player notices it the moment they open it.

**Score:** 3

#### Pull Request

Adopt the DKJ-Solutions brand book, its settings button and the default theme yellow

