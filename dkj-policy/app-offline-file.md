## app/offline-file

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

Browser offline already exists (PWA, #16). Add a single-file build (JS+CSS inlined, relative base, no service worker) that works when opened from disk via file://, publish it on Pages as a download, and link it from the menu.

### CREATE

- [x] `singleFile()` Vite plugin in `vite.config.ts`: `--mode offline` inlines the JS and CSS into one `mesowise-offline.html` (relative base, favicon as data URI, no manifest), and fails the build loudly when an external asset reference survives
- [x] `npm run build` also builds the offline file into `dist/`, so the Pages deploy publishes it; `build:offline` builds it alone into `dist-offline/`
- [x] No service worker registration in the offline file (`src/main.tsx`)
- [x] Settings menu: an "Offlineversie downloaden" link with a short hint, hidden inside the offline file itself

### TEST

- [x] `src/offlineBuild.test.ts` runs the real offline build in-process and checks a single self-contained file; `src/app.test.tsx` checks that the menu link is there and is absent in offline mode
- [x] `npm run lint`, `npm test` (46 files, 1529 tests), `npm run build` and `scripts/lint/lint.ps1` green
- [x] The built file renders the app when opened from disk (`file://`) in headless Chrome
- [x] Review: Victor (code), Tycho (tests), Edith (Dutch text); findings applied

### DEPLOY: app/offline-file

The build gains a second output, `mesowise-offline.html`: the whole app in one HTML file, with no external requests and no service worker, built by a small handwritten Vite plugin and checked by a test that runs the real offline build.

**Score:** 2

#### What makes this deploy extra special

Mesowise can now be downloaded from the settings menu as a single file that opens in a browser on a PC without internet. What is saved in that file stays separate from the web version, which already worked offline as an installable app.

**Score:** 3

#### Pull Request

Offline version as a single HTML file for use on a PC

