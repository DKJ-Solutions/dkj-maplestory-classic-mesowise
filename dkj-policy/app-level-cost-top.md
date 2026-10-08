## app/level-cost-top

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

Dave, October 8, 2026, given in steps during the session:

- a new `card level-cost` section under the app question, with a spot-head "Level cost" and a gold meso coin with a maple
  leaf, and two buttons side by side -- left the level cost of the cheapest (computed) setup, right that of the profile in
  game -- that open the same popup as the two buttons on the Equip card;
- the label "Advised" becomes "Cheapest" and "Wearing" becomes "Profile" everywhere in the app (reversing #192's
  "never call it Cheapest");
- both Equip popups are titled "Level cost", and the Profile one loses its Report button;
- `data-sheet` reads `cheapest` or `profile`; each "Based on:" box has its own attribute (`data-based-on-character`,
  `data-based-on-monster`, `data-based-on-equip`), and the popup itself carries the same attributes;
- `data-based-on-equip` lists the item id of every piece worn.
- the popup label "actual" becomes "profile" (and the `actual-toggle` class `profile-toggle`).
- the popup label "edit" becomes "edit profile".
- the buttons in the "Based on:" boxes (Char, Mob, Equip) show the plain eye of the card buttons, no circle.
- the Profile character popup behind that eye gets a pencil in the last column of every row, as on the cards, and no question marks there.
- behind Accuracy and Evasion in that popup an info button explains the calculation: what goes in, the breakdown with your numbers, and the formula's source.
- every skill in that popup gets an info button too: your level of the maximum, passive or costing MP, what this and the next level do, whether the skill-point advice skips it, and its skill page as source; Nimble Body also says what it adds to Accuracy and Evasion.
- the Mob and Equip popups behind the eyes get the Char popup's design: the same `expected`/`profile` label, and a `char-table` with a head and `stat-line` rows; the Equip popup splits into an ATT table (weapon, ammo) and a DEF table (armor), each with the columns Slot, Item and the stat the piece gives.

### CREATE

- [x] `LevelCostButtons` in `src/app.tsx`, right under `.app-question`; totals come from the same invoices as the Level cost card
- [x] The buttons open the Equip card's Cheapest / Profile popup through `CardViewContext`; Cheapest is disabled exactly when the Equip card has no Cheapest
- [x] `MesoIcon`: an own drawing of a gold coin with a plain maple leaf (no Nexon sprite or logo, #14)
- [x] Visible labels renamed (Advised -> Cheapest, Wearing -> Profile, actual -> profile, edit -> edit profile, popup tags and the toggle class too); internal identifiers unchanged
- [x] Equip popup title "Level cost" in both views; the Equip report is gone, and with it the ATT/DEF advice components it alone rendered (`ClawQuestion`, `ArmorQuestion` and their helpers)
- [x] Data attributes as above, on the boxes and on the popup body; `data-based-on-mob` is now `data-based-on-monster` everywhere
- [x] `src/itemIds.ts`: item name to its MeowDB item-db id, read from the source URL every item row already carries (the app holds no other id); an own item reads `own`
- [x] Head coin class renamed to `level-cost-icon`: `meso-icon` already sized the small coins next to amounts
- [x] Styles in `src/style.css`, mobile-first: two equal columns at any width
- [x] Mob popup: `char-table-monster` with Level and the mob fields; Equip popup: one `char-table-equip` per stat (ATT, M.ATT for a Magician, DEF), columns Slot / Item / stat from `wornStat`
- [x] `SkillLine` takes `info`: every skill shows `SkillInfoText`; the rule hiding a skill's effects in that compact popup now targets only the row's own effects, so the popup's effects show
- [x] `StatLine` takes an `info` popup after the name; `StatFormula` fills it for Accuracy and Evasion, with `statFormulaSource` in `src/expectedStats.ts` naming the MeowDB page per job
- [x] `AdvisedCharacter` takes an optional `onChange`: in Profile the rows are editable (pencils, writing the profile), in Cheapest read-only; CSS gives the pencil column its own width in that compact popup
- [x] Based-on boxes use `EyeIcon`; the `≈` and person badges (`EXPECTED_ICON`, `ACTUAL_ICON`) had no other user and are removed

### TEST

- [x] `src/app.test.tsx`: the new card (placement, head, icon, totals, same popups as Equip), the renamed labels and attributes, and the naming test inverted to "no Advised anywhere"
- [x] Tests that covered only the ATT/DEF report removed; the report tests now expect Skill, Mob and Potions
- [x] `src/itemIds.test.ts`, and the equip-row test now expects the ids
- [x] Full suite (1953 tests), typecheck and `scripts/lint/lint.ps1` green
- [x] Code review (Victor): Cheapest disables on the same condition as the Equip card; indentation and CSS comment tidied
- [ ] Dave looks at the result in the preview before the merge (visible result)

### DEPLOY: app/level-cost-top

The home screen answers its own question right under it: a Level cost card with what the level costs with the cheapest
setup and with your profile, each opening the matching Equip popup. "Advised" is now called "Cheapest" and "Wearing"
"Profile" throughout; the Equip popup no longer carries the ATT/DEF report.

**Score:** 3

#### What makes this deploy extra special

Players see at a glance, at the top of the screen, how many mesos the level costs with their profile and with the cheapest
setup, under names that say what they are.

**Score:** 3

#### Pull Request

Level cost card at the top; Advised becomes Cheapest, Wearing becomes Profile

