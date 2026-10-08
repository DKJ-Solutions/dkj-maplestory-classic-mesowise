---
id: 12
group: 04
---

# 04-12 · repo lens

> Repo lens alongside portable domain guide for specialist 04-12 in `dkj-subagents-alpha` plugin.
> The agent definition reads it automatically; only repo-specific matters belong here.

## Specific to this repo

- **No long explanations on screen** (Dave, October 7, 2026). The app is mobile-first, and a paragraph that explains how a
  screen or the calculation works costs a phone user a scroll for every glance. What stays visible is the answer (a number,
  a choice, a status) in at most one short sentence. Every explanation beyond that sits behind the "?" icon (the `Help`
  component in `src/app.tsx`), collapsed by default. This applies to every new or changed screen. Edith flags an open
  explanatory paragraph in her final read as well.
- **Every formula in an explanation is built step by step in boxes** (Dave, October 8, 2026). A calculation behind a "?"
  is never a sum on one line: it is the `MulCalc` component in `src/app.tsx`, one line per number with what it is on the
  left and the operator and number on the right. Each calculation step sits in its own box, a larger box around a smaller
  one, with a box around the whole formula; consecutive × steps each get their own box too. The factors are listed in
  the order the calculation runs, so the step applied last (such as the skill percentage over your base damage) sits at
  the bottom, outside the boxes above it. Below it stands only
  `=` and the result, with no label, because the popup's title already says what it is. A result that was rounded up
  gets one line under the formula saying so. `MulCalc` draws the boxes itself, so a new formula only passes its factors.
