# Changelog

## [Unreleased]

**0 / 5 patch entries** <!-- pending-tally -->

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
