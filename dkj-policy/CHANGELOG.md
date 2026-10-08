# Changelog

## [Unreleased]

**15 / 22 minor entries** <!-- pending-tally -->

### DEPLOY: app/271-defense-minimum-hit-note · 20261008-214028Z

The hit formula in the ammo explanation now reproduces its own result: when the damage per hit comes out
below 1, a note under the formula shows the unclamped value and that a hit always does at least 1 damage.

**Score:** 1

#### What makes this deploy extra special

A player who opens the min or max damage formula against a mob with very high WDEF no longer sees a
product that does not add up to its result.

**Score:** 1

#### Pull Request

Defense explanation shows the minimum of 1 damage per hit

[PR #275](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/275)

---

### DEPLOY: app/level-cost-difference-row · 20261008-202602Z

The Level cost card on the home screen stacks its Cheapest and Profile buttons and adds a third row that shows what Cheapest saves against your own setup, in meso and as a percentage; tapping it opens the per-cost Difference table in a popup. The card fills the free height of the screen.

**Score:** 2

#### What makes this deploy extra special

Players see at a glance how much they leave on the table at this level, without scrolling.

**Score:** 3

#### Pull Request

Level cost stacks its buttons and shows the difference underneath

[PR #274](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/274)

---

### DEPLOY: app/boxed-formulas · 20261008-201040Z

Every calculation behind a question mark in the Level cost explanations is now a stacked formula: one line per number with
what it is, each calculation step in its own box, and only the result below it. A result that was rounded up says so on one
line under the formula. The potion and ammo explanations are each one formula now (HP or MP this level / restore per
potion; attacks per kill × stars per attack × kills), with every computed number opening its own formula, down to your own
stats. The one-line summary, the tables and the cost section are gone. `MulCalc` places the boxes itself, so a new formula
only passes its numbers.

**Score:** 2

#### What makes this deploy extra special

Tapping the number of potions or stars now opens a single formula, and every number in it can be tapped again to see where
it comes from, down to your own LUK and STR + DEX. Each step is boxed, so you can see what was divided by what.

**Score:** 3

#### Pull Request

Every formula in the explanations is built step by step in boxes

[PR #272](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/272)

---

### DEPLOY: app/home-only-level-cost · 20261008-192942Z

The home screen shows only the Level cost card. Behind the number of throwing stars on the bill, the explanation now reads top
down: attacks per kill × stars per attack × kills, then why that many attacks on this mob, why that many kills, and what
recharging costs. The damage per attack opens as a stacked formula, and the stat factor in it opens as its own stacked sum, with
boxes around what is divided by 100.

**Score:** 3

#### What makes this deploy extra special

Opening the app now lands straight on what a level costs, and every number in the throwing-stars explanation can be tapped to
see where it comes from, down to your own LUK and STR + DEX.

**Score:** 3

#### Pull Request

Home screen shows only Level cost, with the ammo bill explained step by step

[PR #270](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/270)

---

### DEPLOY: app/262-profile-cost-reason · 20261008-152130Z

When Profile has no level cost, a line under the Level cost buttons says why, and every Level cost text names the field that
is wrong ("Je hebt 32 skillpunten …") instead of "Je karakter is niet volledig ingevuld." (#262).

**Score:** 2

#### What makes this deploy extra special

A question mark on Profile at the top now comes with the reason right under it, such as too many skill points for your level,
so you no longer have to search the cards for what is wrong.

**Score:** 3

#### Pull Request

Level cost says why Profile shows a question mark

[PR #268](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/268)

---

### DEPLOY: app/260-cheapest-row-reachable · 20261008-151109Z

The Level cost bill's Cheapest equipment rows are built only for the pieces Cheapest buys, and `cheapestWhy` keeps only the
"Kopen" verdicts. The unreachable verdicts for kept, skipped, empty and counted-ammo slots are removed with the props that fed
them (`isCounted`, `slotCovers`, `advisedAmmo` on the Equip card, the `'option'` tone) (#260).

**Score:** 1

#### What makes this deploy extra special

N/A: the bill already showed only bought pieces; nothing on the screen changes.

**Score:** N/A

#### Pull Request

Cheapest's bill row keeps only what the bill can show

[PR #267](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/267)

---

### DEPLOY: app/258-cheapest-profile-comments · 20261008-150530Z

The comments and test titles in `src/` call the two views Cheapest and Profile, as the screen does. The internal identifiers
(`advised`, `worn`, `advisedSetup`) keep their names, and the `CardView` doc comment maps them to the visible ones (#258).

**Score:** 1

#### What makes this deploy extra special

N/A: nothing changes on the screen.

**Score:** N/A

#### Pull Request

Comments and test titles call the views Cheapest and Profile

[PR #266](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/266)

---

### DEPLOY: app/cheapest-fresh-start · 20261008-144817Z

Cheapest's input is built by `freshStart` from job, level, gender, Max HP and the worn equipment, and `cheapestFor` measures its changes and
saving against the player's own setup. "Al de goedkoopste" now means the player's level is not dearer than Cheapest, and
Overnemen writes only the mob and the potions. `wearableSetup` is the setup as every calculation sees it: equipment above the
character's level left out (it stays stored), and the free starting items in an empty slot.

**Score:** 2

#### What makes this deploy extra special

Cheapest now works out your setup by itself from your job and level: skill points, AP, mob and potions, starting from the
equipment you already wear and buying only what pays off on top. What you filled in no longer gets in the way, so a profile
with a mistake (more skill points than your level allows) no longer leaves Cheapest with only a question mark. "Based on:"
shows the equipment you wear ("3 items (free)") and the new equipment Cheapest buys ("1 item (upgrade)"). Equipment above your
level no longer counts: it stays saved, shows grey with the level it needs, and counts again once you reach that level.
An empty slot counts as what every character gets at the start: the starter clothes, from level 5 the quest hat, and on
level 8 and 9 the Fruit Knife. Overnemen lists what differs from your own setup and takes over only the mob and
the potions, which you can change freely in the game; your skill points, AP and equipment stay as they are.

**Score:** 4

#### Pull Request

Cheapest builds its own setup from your level and gear; starting items count as free

[PR #265](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/265)

---

### DEPLOY: app/bill-table · 20261008-122735Z

The advised bills are real tables now (thead, tbody, tfoot), each in its own section. The Level cost popup holds one bill
under a single head, Items and Mesos, with two cost groups that each end in a subtotal. Only what costs mesos this level is
listed, so Profile shows no equipment and its per-slot Upgrade verdict is removed. The shop price moved to the item's info
popup.

**Score:** 2

#### What makes this deploy extra special

Level cost now shows the whole level on one bill: the potions and ammo you use from 0 to 100% on top, then the equipment
you buy, each with a subtotal, adding up to the Total cost on the Level cost button. Before, the popup showed only the
equipment, so its total did not match the button. Behind each item sits how much of it this level pays (× 1.6k, or 13% of
an equipment price), and its question mark says why you buy it.

**Score:** 4

#### Pull Request

Level cost as one bill, grouped into Useable and Equip

[PR #261](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/261)

---

### DEPLOY: app/level-cost-top · 20261008-101927Z

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

[PR #259](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/259)

---

### DEPLOY: app/based-on-equip · 20261008-084404Z

Slot selection in Wearing moved from the table rows to the popup behind the Equip pencil; the verdict reuses Advised's own reasoning, so the two tables cannot disagree.

**Score:** 2

#### What makes this deploy extra special

Level cost: Equip now shows under Based on which equipment it counts, and in Wearing you pick what you wear from that row. The table of what you wear tells you per slot whether to upgrade it now or keep it, with the reason behind a question mark.

**Score:** 4

#### Pull Request

Based on gets an Equip row, and Wearing says per slot whether to upgrade

[PR #257](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/257)

---

### DEPLOY: app/level-cost-title · 20261008-082509Z

Comments and test names follow the new card name; Dave's own quoted words keep "Total cost".

**Score:** 1

#### What makes this deploy extra special

The card that shows what your current level costs is now called Level cost instead of Total cost, so it no longer reads as the price of your equipment.

**Score:** 2

#### Pull Request

Total cost is called Level cost

[PR #256](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/256)

---

### DEPLOY: app/actual-icon · 20261008-081936Z

Code review by Victor: no defects; one stale comment fixed.

**Score:** 2

#### What makes this deploy extra special

A popup with your own numbers now shows a person icon instead of the i, which stays for fixed game info. In Wearing, Based on is a small table with the pencil beside each row and a placeholder until you pick a mob, every pencil looks the same, and the equipment table has the same columns as Advised.

**Score:** 2

#### Pull Request

Own icon for your own data, one pencil style, and Based on as a table

[PR #255](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/255)

---

### DEPLOY: app/worn-equip-table · 20261008-074325Z

Internal: the Equip table parts (`BillHead`, `BillRow`, `BillTotal`) now serve both popups, and a shared `shopItem` lookup feeds the shop price and the stat requirements.

**Score:** 2

#### What makes this deploy extra special

"Your character" is now called "Wearing". In the Equip card it shows what you wear as "Total cost: Equip" in the same compact table as Advised, in blue: per slot the item, its shop price and its ATT or DEF, with the total below, and "Based on:" your own character and mob, each with a pencil to change them right there. A pencil per row opens that slot to change the item or correct its stat, and every popup where you change something says "edit" above its title. Neither popup scrolls sideways on a phone.

**Score:** 3

#### Pull Request

Equip popup Your character as the same compact table as Advised, labelled wearing, without horizontal scroll

[PR #254](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/254)

---

### DEPLOY: app/remove-report-card · 20261008-073655Z

The home screen no longer shows the separate Report card below Total cost. Its five pieces of advice (ATT, DEF, Skill, Mob, Potions) remain in the report behind each card, and the EXP-table source line now sits at the bottom of Total cost. The tests that read the advice through the Report card now read it from the per-card reports.

**Score:** 2

#### What makes this deploy extra special

A player sees one card fewer on the home screen: what a level costs is read from Total cost, and the advice from the report on each card.

**Score:** 3

#### Pull Request

Remove the Report card from the home screen

[PR #253](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/253)

---

### DEPLOY: app/info-popup-tag · 20261008-072815Z

Every popup now says what kind of content it holds: `info` for fixed facts (a mob, an item, what a Total cost popup is), `expected` for the app's predictions, with a ≈ icon instead of the i, and `why` for every popup behind a question mark. Under "Based on:" the whole name opens its popup, the mob's question mark sits inside its label, and the mob popup shows its level as a row instead of in the title. The info icon is now a solid circle in the text colour with the i in the background colour, and behind the title of Total cost: Equip and Useable it replaces the question mark.

**Score:** 3

#### What makes this deploy extra special

Dave and his friends see at a glance whether a number is fixed or predicted, and can tap the name rather than aiming for a small icon on a phone.

**Score:** 3

#### Pull Request

Popup labels info, expected and why, clickable names under Based on, and a level row in the mob popup

[PR #252](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/252)

---

### DEPLOY: app/250-no-double-tap-zoom · 20261008-071029Z

The whole page now carries `touch-action: manipulation`, so a double-tap on text or background no longer zooms in; before, only the buttons had it. Pinch zoom stays available.

**Score:** 2

#### What makes this deploy extra special

On a phone, a double-tap no longer zooms the app in by accident, with no obvious way back out.

**Score:** 3

#### Pull Request

Double-tap no longer zooms the page in on a phone; pinch zoom still works

[PR #251](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/251)

---

### DEPLOY: app/card-popup-data-on-body · 20261007-213638Z

In the card popups (Advised and Your character), `data-sheet`, `data-based-on-character` and `data-based-on-mob` moved from `.spot-body` to `.stat-dialog-body`, beside `data-popup`, so every popup carries its attributes on the same element (#247, #248).

**Score:** 1

#### What makes this deploy extra special

Not visible on screen; only someone reading the HTML sees it.

**Score:** N/A

#### Pull Request

card popups carry data-sheet and data-based-on-* on .stat-dialog-body, beside data-popup, like every other popup

[PR #249](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/249)

---

### DEPLOY: app/char-popup-based-on · 20261007-212755Z

The advised character's stats popup, behind the info button on the Char label under "Based on:", now carries `data-based-on-character="Lv. 10 Thief"` and `data-sheet="advised"` beside its `data-popup`, the way the mob's info popup already carried `data-based-on-mob` (#247).

**Score:** 1

#### What makes this deploy extra special

Not visible on screen; only someone reading the HTML sees it.

**Score:** N/A

#### Pull Request

the advised character's stats popup carries data-based-on-character and data-sheet, like the mob's info popup

[PR #248](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/248)

---

### DEPLOY: app/advised-for-attr · 20261007-211945Z

The HTML now says which character or mob an element shows, the way `data-popup` does for popups (#245): `data-based-on-character="Lv. 21 Thief"` and `data-based-on-mob="Snail"`, with `data-sheet` beside them saying whose sheet it is: `advised` (what the app advises, under "Based on:" and in the Advised popups) or `actual` (the character as played in game, in every Your character popup). The classes inside the "Based on:" section are renamed after it, `.advised-for` to `.based-on-container` and `.advised-for-row`/`-line`/`-value` to `.based-on-label`/`.based-on-line`/`.based-on-value`.

**Score:** 1

#### What makes this deploy extra special

Not visible on screen; only someone reading the HTML sees it.

**Score:** N/A

#### Pull Request

data-based-on-character, data-based-on-mob and data-sheet say in the HTML which character or mob an element shows, on the advised or the actual sheet

[PR #247](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/247)

---

### DEPLOY: app/245-popup-path · 20261007-205252Z

Every popup, and the `.stat-dialog-body` inside it, now carries `data-popup` with the titles of the popups it sits in, outermost first: the mob info opened from Total cost: Equip reads `Total cost: Equip (advised) › Info over Snail`. In the inspector you can see straight away which popup you are pointing at.

**Score:** 2

#### What makes this deploy extra special

Only visible in the HTML; a user of the app sees nothing new.

**Score:** N/A

#### Pull Request

every popup body says which popup it is, and which popup it sits in

[PR #246](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/246)

---

### DEPLOY: app/242-unique-element-hooks · 20261007-204235Z

Buttons and popups that do different things no longer share one bare class, so each can be named and found in the HTML. The Advised and Your character buttons carry `view-advised` and `view-worn`, and every card popup says which card and which view it belongs to (`card-dialog-equip`, `advised-dialog`). The six Total cost buttons, the −/+ steppers, the three character tables and the apply/undo buttons each carry a class naming their function as well. Nothing changes on screen.

**Score:** 2

#### What makes this deploy extra special

Nothing a player sees changes: the classes only make the markup easier to point at.

**Score:** N/A

#### Pull Request

every element names what it is, so two buttons that do different things no longer look identical in the markup

[PR #244](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/244)

---

