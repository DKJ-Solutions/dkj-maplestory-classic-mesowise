## fix/296-source-branch-prefixes

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

Issue #296: every DKJ repo uses the source's branch-prefix table (DKJ-Solutions/dkj-marketplace#3886,
Dave, November 7, 2026). This repo's own taxonomy (app, data, tooling, fix, docs, claude) is retired:
`feat/` -> `feature`, `fix/` -> `bug`, `docs/` -> no label, `chore/` refused.

#### Entry retype mapping

Every pending entry in `CHANGELOG.md` sits under `## [Unreleased]`, and under the new table its old
prefix would fall back to Chore. Each one now carries a `#### Branch type` section after its Pull
Request section, so the type is stated by meaning while the heading keeps the branch's real name:

- `tooling/288-dev-preview-hub` -> Feat (tooling)
- `claude/enable-dkj-solutions` -> Feat (config)
- `app/271-defense-minimum-hit-note` -> Fix (the formula did not add up to its own result)
- `app/250-no-double-tap-zoom` -> Fix (an accidental zoom with no way back out)
- the other 26 `app/` entries -> Feat (app behaviour, content and its code)

No `data/` entry was pending. Released history is untouched.

### CREATE

- [x] Replace the prefix table, `$script:BranchTypeOrder`, `Get-BranchTypes`, `Get-BranchPrefix`, `Get-BranchInfo` and `Test-BranchName` in `scripts/lib/branch-info.ps1` with the source's text; the header says it follows the source table (#3886)
- [x] Retype the 30 pending entries with a retired prefix (mapping above)
- [~] Docs and rules naming the old prefixes -- none found in `.claude/`, `CLAUDE.md`, `scripts/` or the README, and no `enhancement` reference
- [~] Create the `feature` label -- it already exists on the tracker

### TEST

- [x] `branch-info.ps1` loads; `Get-BranchTypes` returns Feat, Fix, Docs, Chore; feat/fix/docs resolve to feature/bug/no label; `chore/x` is refused; `app/x` is unknown
- [x] `Resolve-EntryType` from the dkj-policy 6.10.0 lib reads every pending entry as Feat or Fix with no error, and `Get-EntryPrTitle` still reads each title
- [~] Repo tests touching branch-info -- none exist (`npm test` is the app's vitest suite and does not read it)
- [x] Lint gate (`scripts/lint/lint.ps1`): every `.ps1` parses and is ASCII, `tsc --noEmit` passes

### DEPLOY: fix/296-source-branch-prefixes

Branches here now use the same prefixes as every DKJ repo, taken from the source's `scripts/lib/branch-info.ps1` (DKJ-Solutions/dkj-marketplace#3886): `feat/` for a feature, `fix/` for a repair, `docs/` for documentation, and `chore/` is refused. The repo's own `app/`, `data/`, `tooling/` and `claude/` prefixes are retired, and the 30 pending changelog entries that carried them now state Feat or Fix, so none is filed as Chore at the next release.

**Score:** 2

#### What makes this deploy extra special

N/A: the app on GitHub Pages is untouched; only how branches here are named and labelled changes.

**Score:** N/A

#### Pull Request

Use the source's branch prefixes
