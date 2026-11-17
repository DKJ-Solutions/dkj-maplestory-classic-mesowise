## fix/migrate-dkj-marketplace-v7

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
> Relative links in that text resolve FROM `.dkj/dkj-repo-workflow/`, where `CHANGELOG.md` sits --
> not from this directory.
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

Move this repo to dkj-marketplace v7.0.0, following the dkj-recipes pilot (DKJ-Solutions/dkj-recipes#129) and its findings DKJ-Solutions/dkj-marketplace#4251, #4252 and #4253.

### CREATE

- [x] `.claude/settings.json`: `dkj-policy` -> `dkj-repo-workflow`, `dkj-solutions` -> `dkj-repo-workflow-dkj`, `dkj-subagents-developers` enabled, `*dkj-policy*` allow patterns -> `*dkj-repo-workflow*`; plugins installed/updated at project scope
- [x] Part 1 of adopt-dkj-repo-workflow with -Apply (the #4251 workaround): `.dkj/dkj-policy/` -> `.dkj/dkj-repo-workflow/`, `CLAUDE.md` imports and `scripts/repo-config.ps1` seams repointed
- [x] `Get-MojibakePaths` re-adopted from the blueprint, so the moved folder stays covered
- [x] CI floor re-adopted (runners deleted, `adopt-ci-floor -Apply`, diffed against the old files: nothing repo-specific lost); `branch-entry.yml` and `always-on-budget.yml` pinned to `@v7.0.0` with `scripts-ref: v7.0.0`
- [~] Statusline shim (#4252): dropped, this repo never adopted one, so there is nothing stale to replace
- [x] Derek's and Rendall's lenses point at `dkj-subagents-developers/personas/`
- [x] Present-tense `dkj-policy` mentions renamed (rules, lenses, PR template, lint script header)

### TEST

- [x] Every persona path the lenses name resolves in the marketplace clone
- [x] `git grep` finds no `dkj-policy`, `dkj-solutions@` or `bwj-development@` outside dated comments, the changelog and `always-on-baseline.json` (harmless, per #4253)
- [x] Lint gate green

### DEPLOY: fix/migrate-dkj-marketplace-v7

The repo now runs on dkj-marketplace v7.0.0: the workflow plugin is `dkj-repo-workflow` with its `dkj-repo-workflow-dkj` extension, the developers team (`dkj-subagents-developers`) is enabled, and the workflow folder is `.dkj/dkj-repo-workflow/`. The CI runners fetch the shared scripts at v7.0.0, and the two reusable gates are pinned to that release instead of `@main`.

**Score:** 2

#### What makes this deploy extra special

N/A: the app on GitHub Pages is untouched; only the workflow tooling around it moves.

**Score:** N/A

#### Pull Request

Migrate to dkj-marketplace v7.0.0
