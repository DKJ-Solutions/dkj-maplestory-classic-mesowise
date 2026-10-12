## app/house-style

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

Adopt the house style from dkj-claude-plugins (feat/house-style-app-components): vendor house-style.css and house-theme.js unchanged, map the app's own tokens onto the house tokens, move colliding components to house names, enable the dkj-solutions plugin, and add a theme picker to the menu.

#### Where it stands

Markup, tests, index.html, main.tsx, vite.config.ts and the theme picker are migrated; src/style.css is NOT, so the app is currently unstyled in places and will look broken. npm ci ran; lint, test and build have NOT been run. Not committed.

### CREATE
n- [ ] Run or discard `scripts/wip/house-css-transform.cjs` (the unrun style.css transform, parked in the branch so it survives) and delete `scripts/wip/` before the PR

- [x] Vendor house-style.css and house-theme.js unchanged into src/house/ (cp); house-theme.js is injected as an inline classic script in <head> by a small Vite plugin (vite.config.ts), so the offline single-file build works; the offline test now expects two scripts
- [x] index.html: data-theme-light="rust", data-theme-dark="orange", data-theme-key="mesowise" (the Pages origin is shared by all org apps), theme-color metas #f9f9f7 / #0d0d0d
- [x] src/main.tsx imports ./house/house-style.css before ./style.css, with a "copy, never edited" comment
- [x] src/app.tsx and the tests: markup moved to the house classes (dialog, dialog__*, dialog--drawer, --dialog-scale, icon-btn, action-row, topbar__*, menu-row__*, menu-item*, btn--touch/btn--primary/btn--block, main.narrow, h2 to h3 for dialog titles); app-own app-card, app-main, menu-entry, equip-more
- [x] Theme picker: "Thema" menu item with a ThemePicker panel calling window.DKJTheme.picker (palette icon, global type declared); menu test now expects four rows
- [ ] src/style.css: NOT rewritten yet. Only the class renames were applied by sed, so it still holds the old tokens (--bg, --card, --text, --accent, --cost, --gain), the old dialog/topbar/menu/card-action/field/btn rules and the prefers-color-scheme dark blocks. A prepared transform script exists in the session scratchpad but was never run
- [ ] style.css: domain tokens (--tint, --on-tint, --panel, --warn-ink, levelup/advised/worn) with dark values keyed on the dark themes; delete duplicates of house rules; .app-card/.app-main deltas; --cost to --down, --gain to --up
- [ ] .claude/settings.json: enable dkj-solutions@dkj-claude-plugins, remove stale dkj-policy-bwj if present; CLAUDE.md import line (the plugin CLAUDE.md exists under the marketplace path)
- [ ] npm run lint, npm test, npm run build (and the offline build), fix what breaks

### TEST

### DEPLOY: app/house-style

**Score:**

#### What makes this deploy extra special

**Score:**

#### Pull Request

The DKJ-Solutions house style, with a theme picker

