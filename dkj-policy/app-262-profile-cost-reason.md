## app/262-profile-cost-reason

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

#### #262

Re-measured on the trunk after `app/cheapest-fresh-start` (October 8, 2026), with the issue's level 19 Thief (Nimble Body 15 +
Lucky Seven 17 = 32 of 28 job skill points): Cheapest now has a total (−22.857 meso), but Profile still shows `?` with no
reason near the button, and the only place naming the cause is the `.error` on the skills card. The Level cost texts said
"Je karakter is niet volledig ingevuld." for every missing profile.

#### Visible result

This changes what the home screen shows, so the branch stops for Dave's look before any pull request.

### CREATE

- [x] `ProfileProblem` context: the parse error of the profile (or `notComputedText` for a job the app does not compute),
  provided by `App`. `noCostReason(c, problem)` returns that message for `noProfile`, and keeps "niet volledig ingevuld" only
  as the fallback; its five callers read the context.
- [x] Under the two Level cost buttons, one line per button that shows `?`: "Profile: <reason>" (`.level-cost-reason`,
  with the buttons' side margin).

### TEST

- [x] New test in `app.test.tsx`: the issue's profile shows `?` on Profile, a total on Cheapest, exactly one reason line
  "Profile: Je hebt 32 skillpunten …", and "niet volledig ingevuld" nowhere on the page; the existing top-buttons test now
  also asserts no reason line when both have a total.
- [x] `npm run lint` clean; the full gate runs with `open-pr -GatesOnly` before the branch is parked.

### DEPLOY: app/262-profile-cost-reason

When Profile has no level cost, a line under the Level cost buttons says why, and every Level cost text names the field that
is wrong ("Je hebt 32 skillpunten …") instead of "Je karakter is niet volledig ingevuld." (#262).

**Score:** 2

#### What makes this deploy extra special

A question mark on Profile at the top now comes with the reason right under it, such as too many skill points for your level,
so you no longer have to search the cards for what is wrong.

**Score:** 3

#### Pull Request

Level cost says why Profile shows a question mark

