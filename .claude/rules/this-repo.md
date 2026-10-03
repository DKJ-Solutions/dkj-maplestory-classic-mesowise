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

## Where it stands

Set up on October 3, 2026. **The stack is chosen (Dave, October 3, 2026): Vite + TypeScript + Preact,
hosted on GitHub Pages and deployed by GitHub Actions.** The calculation is a pure TypeScript module with
no UI import, tested with Vitest. `test` is the required pull-request check, and the Pages deploy is a
separate job on `main`. There is no app code yet. Until there is, the lint gate
(`scripts/lint/lint.ps1`) checks only the PowerShell scripts; after that, the app's own linter is called
from there. What the choice still leaves open (the test seams and the CI floor) is in issue #6.

## The game data

**Data goes in selectively, never as a whole table** (Dave, October 3, 2026). MeowDB
([reuse policy](https://meowdb.com/reuse)) allows individual facts with attribution, but republishing a
whole table or data file needs written permission, and none has been asked for. So data goes in per
training spot that is actually used, every row carries its source (page URL and date), and the app
credits "NiaMeowDB (meowdb.com)". Nexon's names, sprites and icons stay out of the repo.
