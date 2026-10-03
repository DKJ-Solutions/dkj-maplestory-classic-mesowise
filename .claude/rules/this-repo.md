# This repo — dkj-maplestory-classic-mesowise

**The owner is Dave (DaveKJohn); where the constitution says "the owner", it means him here.** The trunk
is `main`. The repo is **`public`**: nothing private (keys, friends' names or accounts) goes in it.

The rules themselves are in the `dkj-policy` constitution that [`CLAUDE.md`](../../CLAUDE.md) imports,
and they are not repeated here. This file carries only facts about this repo, and the limits that
apply only here.

## What this repo is for

A mobile-first app for levelling cheaply in MapleStory Classic World: as much EXP per meso as possible,
for Dave and his friends. It compares training spots on what they yield against what they cost
(potions, ammo, travel).

**The central question is asked at every level-up (Dave, October 3, 2026, issue #24): how do I save the
most mesos in the new level?** The cost of a level is the EXP to the next level divided by the EXP per
meso at the best spot. Every choice is judged by how much it lowers that cost. There are two
sub-questions:

- **Does upgrading my equipment now save more mesos?** (#25) An upgrade pays off when what it saves is
  larger than its price. The saving is counted until your next upgrade, not just for the new level (Dave,
  October 3, 2026).
- **Does raising a skill now save more mesos?** (#26) A skill point costs nothing, so the question is
  which skill lowers the cost the most.

## Where it stands

Set up on October 3, 2026. **The stack is chosen (Dave, October 3, 2026): Vite + TypeScript + Preact,
hosted on GitHub Pages and deployed by GitHub Actions.** The calculation is a pure TypeScript module with
no UI import, tested with Vitest. `test` is the required pull-request check, and the Pages deploy is a
separate job on `main`. The lint gate (`scripts/lint/lint.ps1`) checks the PowerShell scripts and calls
the app's own linter (`npm run lint`, the TypeScript typecheck).

## The game data

**Data goes in selectively, never as a whole table** (Dave, October 3, 2026). MeowDB
([reuse policy](https://meowdb.com/reuse)) allows individual facts with attribution, but republishing a
whole table or data file needs written permission, and none has been asked for. So data goes in per
training spot that is actually used, every row carries its source (page URL and date), and the app
credits "NiaMeowDB (meowdb.com)". Map and monster names may appear as plain text, because a training spot
cannot be recognised without them; Nexon's sprites, icons and brand stay out of the repo (Dave, October 3,
2026, issue #14). The same holds for the EXP table, equipment and skills that the level-up question
needs (#24 to #26): only the levels, items and skills that are actually used, each with its source.
