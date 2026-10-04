## app/ap-per-level

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

Dave asked (October 4, 2026) to show per level how many AP he has, apart from AP that equipment adds; then, after two
layouts, settled the shape: the pencil of each stat (STR, DEX, INT, LUK) opens two ways to add AP -- base AP, limited
by what the level still leaves, and the optional extra AP from items.

### CREATE

- [x] Cody: `apAtLevel` and `STARTING_AP` in `src/data/thief.ts`, from the MeowDB beginners guide (4 per stat, 9 at creation, 5 per level)
- [x] Cody: `strExtra`, `dexExtra`, `intExtra`, `lukExtra` in the profile; the stat fields themselves are now the base AP, and `parseProfile`, `expectedStat`, `totalMagicAttack` and the level-up accuracy count base plus extra
- [x] Cody: on the Ability points card each stat shows its base AP and, after a plus, its extra AP, and its pencil opens a popup with a Base AP field capped at what is left and a free "Extra AP van items" field, one Opslaan for both
- [x] Cody: a new player starts from `STARTER_PROFILE` (37 base + 3 extra LUK, so exactly the 70 base AP of level 10); a saved profile from before this change gets 0 extra AP, so its stats stay what the player entered
- [~] Gwen: the two-column layout of the second round, dropped when Dave clarified he wanted the two fields inside the popup

### TEST

- [x] Tycho: `apAtLevel` pinned at levels 1, 2, 10, 30 and 200; base plus extra in `parseProfile`, `toCharacter`, `shortfall` and the level-up accuracy; the starter profile spends exactly 70; an old saved profile gets 0 extra; Extra outside 0 to 999 and a base stat under 4 are refused
- [x] Tycho: the popup shows both fields, base cannot go past what is left, freeing base AP in one stat makes it available in another, Back to level 9 shows 5 too many; existing card tests moved to the new popup
- [x] Gwen: the popup no longer keeps an empty button row under each field, so Extra AP sits right under Base AP (Dave: too much space between them)
- [~] Gwen: the card showed a stat as "28 (25+3)", the game's stat window form -- replaced by the two columns below
- [x] Gwen and Cody: the card shows each stat as "Base", a plus and "Extra" (AP from items, always a field, 0 when there is none; an empty field is saved as 0), with the headings above them and no total (Dave: they need not be added up; base first)
- [x] Cody: the popup and the card count the base AP left the same way (one label helper, one sum); with too much base AP the popup said "over: 0" while the card said "te veel 3" (Dave: the two screens disagreed)
- [x] Gwen: the "Base AP over" line left the card; the popup already shows it (Dave: shown twice)
- [x] Gwen: the popup's Opslaan is always there, disabled and colourless while nothing has changed (Dave)
- [x] Gwen: 1rem between the Extra field and the pencil on the card instead of 0.375rem (Dave)
- [x] Gwen and Cody: the popup puts Base AP, Extra AP and Totaal (base plus extra, as typed) side by side, with − and + under each number so the three fit at phone width (Dave)
- [x] Gwen: hierarchy in the popup: the stat title (DEX) larger and bold, the column labels small, muted capitals (Dave: both looked the same)
- [x] Gwen: the popup in two columns instead of three: Base AP and Extra AP stacked on the left, each with − and + beside the number again, and Totaal on the right across both rows (Dave)
- [x] Gwen: the popup in one column after all: Base AP, Extra AP and Totaal stacked, the three numbers exactly above each other (Dave: the two-column version did not work)
- [x] Gwen: in the popup each label (Base AP, Extra AP, Totaal) sits to the left of its field, all with one label width so the numbers stay aligned (Dave)
- [x] Cody: a base stat cannot go below 4, the minimum every character starts with (same MeowDB source): the profile refuses it, the popup's minus stops at 4 and a lower typed number is saved as 4; the two Magician edge tests at INT 0 now feed the model directly
- [x] Victor and Edith: review and Dutch copy read; lint and all tests green

### DEPLOY: app/ap-per-level

STR, DEX, INT and LUK are now split into base AP and extra AP from items. The stat field is the base AP; four new profile fields hold the extra, and every calculation (damage, accuracy and evasion formulas, item requirements, M.ATT, the level-up accuracy) counts the total. The base AP a level gives is 25 at level 1 plus 5 per level, sourced from the MeowDB beginners guide.

**Score:** 3

#### What makes this deploy extra special

On the Ability points card each stat's pencil now offers two ways to add AP: base AP, which cannot go past what your level still leaves (the popup says how many are left), and the extra AP your items give, which is free. The card shows each stat as its base AP, then a plus and the extra AP from items (0 when there is none).

**Score:** 3

#### Pull Request

Ability points split into base AP, capped by your level, and extra AP from items

