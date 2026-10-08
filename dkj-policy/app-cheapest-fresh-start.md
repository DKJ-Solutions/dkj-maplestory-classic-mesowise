## app/cheapest-fresh-start

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

Dave, October 8, 2026 (#263): Cheapest should work out by itself which setup gives the lowest cost, taking only job and
level from the profile. Then, for the Overnemen part: compare the player's setup with Cheapest's, and say "al de
goedkoopste" when the player's level is not dearer than Cheapest. After the reviews: Overnemen takes over only the mob
and the potions, which a player can change freely; skill points, AP and equipment stay, and the list shows their
difference for information only. Then, after seeing a level 19 thief get only a claw and stars: Cheapest starts from the
equipment the player wears (free) and buys only what pays off on top; "Based on:" shows Equip (worn) and New equip (bought).

### CREATE

- [x] `freshStart`: Cheapest's input from job, level, gender, a valid Max HP and the worn equipment with its gear fields (no mob, no potion choice, default stats, skill points from scratch)
- [x] "Based on:" in the Cheapest popup: Equip (what you wear) and New equip (what Cheapest buys)
- [x] The two rows say what they are in visible text (Dave's wording): "3 items (free)" for what you wear (also in Profile) and "1 item (upgrade)" or "Niets te kopen" for what Cheapest buys
- [x] Victor's review of that step: a gear field is only taken over when `parseProfile` accepts it (range and whole number), the item stat bonuses (STR/DEX/INT/LUK extra) are taken over too, and the stale comments say what the code now does
- [x] Rule (Dave, #264): equipment above your level cannot be worn. `dropAboveLevel` gives the stand as the calculation sees it (ATT or DEF off, an empty hand for a weapon); the app uses it for the parse, the armor advice, Auto assign, Total stats and Cheapest, and keeps the stored equipment as it is
- [x] Revised after Dave lost his gear testing level 10: the first version wiped such items from storage; now they stay stored, show grey in the Equip popup as "(vanaf lv N)", leave the "(free)" count, and count again once the level is high enough
- [x] Starter clothes (Dave): an empty top, bottom or shoes slot counts as the starting outfit (male White Undershirt + Blue Jean Shorts, female White Tube Top + Red Miniskirt, Leather Sandals; sources in data/wornItems.ts), free; `wearableSetup` = items above level off, then the starter clothes in, used by the app's calculation, the "(free)" list and Cheapest; unit tests for it
- [x] Also free in an empty slot (Dave): from level 5 the hat of the Lucas's Reply quest (Brown Skullcap 708, one of seven equal level 5 hats; meowdb quest-tracker/1008, read 2026-10-08), and on level 8 and 9 the Fruit Knife (559) for a job that can wear it; from level 10 Cheapest uses the job's own weapon. There is no "Leather Bandana" on MeowDB
- [x] Tests: unit tests for `dropAboveLevel` (armor DEF, empty hand, own item kept, empty level is not level 0); app tests: storage unchanged from level 20 to 10 and back, the item grey with "(vanaf lv N)", the "(free)" count, Back and Auto assign (the old "te weinig AP" message stays covered in autoFillAp.test.ts)
- [x] `cheapestFor`: runs the setup from that start, with the changes (`changesBetween`) and the saving measured against the player's own setup
- [x] "Je setup is al de goedkoopste" when the player's level is not dearer than Cheapest; the Cheapest help text says it builds from job and level alone
- [x] Overnemen writes only mob and potions (Dave's choice after the reviews); its button shows only when those differ, the saving is what the player's own level then costs less, and Ongedaan maken puts them back

### TEST

- [x] Unit tests: the fresh start keeps only job, level, gender and Max HP; the same setup comes out for a filled-in and a clean profile, also one with too many skill points, for all four jobs; the changes are measured against the player's setup
- [x] App tests updated: Cheapest buys its own weapon even when you wear one; after Overnemen your level is not dearer than Cheapest
- [x] Full suite and lint gate green
- [x] Victor's review: fixed the 1st-job skill point below level 10 in the fresh start, Double Stab missing from the change list, a guard so Overnemen never writes a profile the app cannot compute, and the help text; dead code noted on #260
- [x] Marlowe's second read: the framing points (saving and "al de goedkoopste" compare a from-scratch build with owned gear; Overnemen overwrites SP, AP and equipment) are handed to Dave as one decision
- [x] App tests for Overnemen: profile and equipment unchanged, the saving is the player's own difference, undo restores, and "al de goedkoopste" exactly when the player's level is not dearer
- [x] Dave has looked at the preview and said ship it

### DEPLOY: app/cheapest-fresh-start

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
