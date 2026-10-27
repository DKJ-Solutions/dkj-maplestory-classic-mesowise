## tooling/288-dev-preview-hub

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

This repo's row of the hub roll-out (DKJ-Solutions/dkj-claude-plugins#3464), done the way the update
comment on #288 prescribes. Plugins in this checkout are already on v5.35.0, so its step 1 holds.

### CREATE

- [x] `Get-DevPreview` in `scripts/repo-config.ps1`: Vite on 127.0.0.1, ports 5181-5188, `Path` set to
  Vite's base, `Requires = 'node_modules'`, `OpenInVsCode`; no `Name`, `OwnHub` or `DefaultTheme`
- [x] `.vscode/settings.json`: route the hub's ports 4890-4899 and the product's 5181-5188 to the Simple
  Browser

### TEST

- [x] Ran `dev-preview-sessionstart.ps1` by hand: `Hub: http://localhost:4897/ (opened in VS Code) --
  product: http://localhost:5181/dkj-maplestory-classic-mesowise/ (started)`; the product URL answers
  200 and the hub's home page carries the product card

### DEPLOY: tooling/288-dev-preview-hub

The session start now also starts MesoWise's own Vite dev server on 5181-5188 and puts it on the
plugin's hub as the product card, and the hub and the app open in VS Code's Simple Browser rather than
the system browser. The hub itself stays the plugin's, so a later hub change reaches this repo with a
plugin update alone.

**Score:** 2

#### What makes this deploy extra special

N/A: only a developer's local session changes; the app on GitHub Pages is untouched.

**Score:** N/A

#### Pull Request

State the Vite product for the plugin hub and open the hub in VS Code

