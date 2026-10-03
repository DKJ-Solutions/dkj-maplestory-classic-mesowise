<#
.SYNOPSIS
    Repo-specific configuration read by the Claude Specialists scripts.
.DESCRIPTION
    Placed by specialists-init. The scripts themselves are repo-agnostic and read this small block of
    repo data from the repo root. Anything below carrying a VUL-IN marker is yours to fill in; a
    section without one is complete as generated.

    No Set-StrictMode here: dot-sourcing would modify calling script's strict mode.
    Pure ASCII (repo convention for .ps1): Windows PowerShell 5.1 reads BOM-less script as ANSI.
#>
# Repo-root-relative path to the file holding the specialist roster, read by check-roster-sync.
# Points at the seam inclusion, because that is where specialists-init puts the roster slot -- change it
# only if you move the roster somewhere else. Required by the contract, so the scaffold defines it rather
# than leaving the session check to report it against a missing function (issue #226).
#
# It used to say 'CLAUDE.md', which is where the roster lived BEFORE the seam existed. The consequence was
# not cosmetic: the check read a file containing only the @-import, found no roster rows, and reported
# every specialist as missing -- naming CLAUDE.md as the place to fix it, while this bootstrap's own
# next-steps block says the roster does NOT go there (inbound #333).
$script:RosterPath = '.claude/specialists/SPECIALISTS.md'

function Get-RosterPath {
    return $script:RosterPath
}

# '<group>-<id>' ids deliberately kept OUT of the roster and lenses. Normally empty: every specialist
# an enabled plugin ships belongs in the roster, and adopting one that arrives with a plugin update is
# the default, not a question. Fill this in only for a deliberate, self-authored exception -- and note
# that without it 'skip this one' is not an implementable outcome at all, which is exactly why the
# contract marks it required.
$script:RosterIgnoredIds = @()

function Get-RosterIgnoredIds {
    return $script:RosterIgnoredIds
}

# --- The workflow plugin's half -------------------------------------------------------------------
# These are read by the branch/release scripts (open-pr, fold-changelog, ship-pr, cut-release). They
# are here because this repo enabled dkj-policy; without that plugin nothing
# reads them. Fill in the VUL-IN values below and remove the VUL-IN markers.

# Derived by specialists-init from git remote (origin) of this repo. Adjust if incorrect.
$script:RepoName = 'DKJ-Solutions/dkj-maplestory-classic-mesowise'

function Get-RepoName {
    return $script:RepoName
}

function Get-RepoBlobUrl {
    return "https://github.com/$($script:RepoName)/blob/main/"
}

# Repo-root-relative path to lint gate executed by open-pr before PR,
# e.g. 'scripts/lint/check-plugin-integrity.ps1' or 'scripts/maintenance/lint-brain.ps1'.
$script:LintScript = 'scripts/lint/lint.ps1'

function Get-LintScript {
    return $script:LintScript
}

# Optional (#177): if this repo has a separate "go live" stage after cutting a release -- e.g. a
# push to a live deploy target -- describe it here so the cut-release skill's Block 2 (the live push
# + moving the '<- LIVE' marker) applies. Left empty: most repos (this workshop, life-hub) cut a
# release without one, so the skill only prints Block 1 (cutting).
$script:LiveStage = ''

function Get-LiveStage {
    return $script:LiveStage
}

# Optional (#101): if this repo's PR template uses different marker text than the workshop's own,
# or a PR should carry a default assignee/milestone, define any of these four functions --
# Get-PrDescriptionPlaceholder, Get-PrApprovalPattern, Get-PrAssignee, Get-PrMilestone -- and
# open-pr.ps1 picks them up automatically. Left undefined here on purpose: open-pr.ps1 falls back
# to its own built-in defaults (this repo's current markers, no assignee/milestone) when any of
# these four are absent, so a fresh consumer needs none of this to get started.

# --- Answered by adopt-workflow-folder.ps1 when it scaffolded dkj-policy/ ---
function Get-ReleaseNoteRoot {
    <#
        Where the hand-written release note is written and read back from.

        Written by adopt-workflow-folder.ps1 rather than left to the shared 'releases/notes' fallback,
        because at the moment that folder was scaffolded this repo defined no answer AND had no note
        of its own at that fallback -- so there was nothing here for this answer to move, and leaving
        it unanswered would have put the notes outside the folder the adoption had just built.

        This is this repo's file now. Edit it freely; nothing overwrites a function already here.
    #>
    'dkj-policy/releases/audience'
}

# --- Adopted from the DKJ-Solutions/dkj-claude-plugins config blueprint ---------------------------------
#
# Each function below is the source's own text, comments included, for a value that states the
# shared way of working rather than a fact about this repo. Edit them freely -- they are this
# repo's files now, and adopt-config never overwrites a function that is already here.

# --- The stub wording new-branch.ps1 writes into an entry file (issue #410) ---------------
#
# The four strings below are the entire visible output of the shared new-branch.ps1: the title
# placeholder, the body heading, the fallback body, and the changelog type an unknown branch prefix
# falls back to. They used to be hardcoded in that script, which is fine for an English repo and wrong
# for any other -- the FILE it writes is repo-owned, so its wording is too.
#
# The concrete case (inbound #410, smartwatchbanden): a Dutch-language repo kept its own copy of
# new-branch.ps1 at the same relative path, purely to change these four strings. Two entry
# points then wrote two formats for the same branch -- the branch flow called the repo copy, the
# new-branch skill called the shared one -- which is exactly the duplication the skill exists to
# prevent. Dropping the copy fixed the duplication and cost them Dutch stubs; these functions give the
# wording back without the copy.
#
# All four are OPTIONAL in the script contract: a consumer that defines none of them gets the values
# below, which are also what the script hardcoded before. Same pattern as Get-ChangelogHeading (#178)
# and Get-LiveStage (#177). Four separate functions rather than one map-returning function, so the
# contract check can name the exact default per knob in its [INFO] line.
#
# TWO OF THEM ARE NOW GATE-ONLY (August 6, 2026). Since the branch/ split, new-branch.ps1 writes
# neither the body heading nor the old to-do placeholder -- branch-cycle.md carries the step list, and
# the entry's placeholder asks what the change DOES. The body heading stays defined here because it is
# still a marker open-pr refuses, so a consumer who translated it keeps a gate that recognises their
# wording rather than only the English one. See $script:EntryScaffoldDefaults in entry-scaffold-lib.ps1.
$script:EntryTitlePlaceholder = 'TODO: title'

function Get-EntryTitlePlaceholder {
    <# Placeholder title for an entry created without an explicit -Title. #>
    return $script:EntryTitlePlaceholder
}

$script:EntryBodyHeading      = '**To do / where I left off:**'
function Get-EntryBodyHeading {
    <# The bold line above the entry body. Must be a single line; it is written verbatim. #>
    return $script:EntryBodyHeading
}

$script:EntryBodyPlaceholder  = 'TODO: what this change does, for whoever reads CHANGELOG.md later.'
function Get-EntryBodyPlaceholder {
    <# Fallback body when no -Intent was given -- a directional prompt, not an empty placeholder. #>
    return $script:EntryBodyPlaceholder
}

$script:EntryFallbackType     = 'Chore'
function Get-EntryFallbackType {
    <# The changelog type an unknown branch prefix falls back to. Must be one of the types this repo's
       own branch table produces, since cut-release groups entries by it. #>
    return $script:EntryFallbackType
}

# --- Which files the mojibake tool examines by default (issue #413) -------------------------------
#
# scripts/maintenance/fix-mojibake.ps1 used to carry this list itself, and the list is workshop-shaped:
# it walks plugins/** for the manuals, agent defs and personas, and releases/** for the archived notes.
# In a consumer neither directory exists, so the tool's own Test-Path filter quietly reduced the set to
# whatever root docs happened to be there -- a gate that examines almost nothing while reporting
# "clean". Which files a repo has is a property of the repo, so the list belongs here.
#
# Takes the repo root as a parameter rather than resolving one of its own: the caller has already done
# that (dual-context, CLAUDE_PROJECT_DIR or the git root), and a second resolution here is a second
# answer to a one-answer question. The Get-ChildItem work sits INSIDE the function on purpose -- this
# file is dot-sourced by every workflow script, and none of the others should pay for a directory walk
# they never use.
#
# OPTIONAL in the contract: a consumer without this function gets the tool's own repo-agnostic
# fallback -- every *.md in the repo root, which covers the changelog, the root docs and the unfolded
# entry files in any repo. That fallback is deliberately broader than what this workshop's list used to
# be, because an entry file is exactly the kind of freshly written, non-ASCII-carrying file the damage
# shows up in first.
function Get-MojibakePaths {
    <# Absolute paths of the files fix-mojibake.ps1 examines when called without -Path. #>
    param([Parameter(Mandatory = $true)][string]$RepoRoot)

    # Every markdown file in the repo root: README.md, CLAUDE.md and the rest of the root docs. It named
    # CHANGELOG.md first until August 27, 2026, when that file moved into contributing-davekjohn/ and so
    # arrives through the recurse below instead.
    $paths = @(Get-ChildItem -LiteralPath $RepoRoot -Filter '*.md' -File |
        Select-Object -ExpandProperty FullName)

    # dkj-policy/ -- the workflow's own root folder, which holds the branch's entry and step list
    # (under branch/, covered by the root glob above until the split moved them on August 6, 2026, and
    # under this folder since August 14, 2026; the folder itself renamed off 'workflow-davekjohn/' on
    # August 26, 2026, #886, and off 'contributing-davekjohn/' on September 5, 2026, #1437). The entry is
    # the single highest-value file in this set: its text is pasted
    # verbatim into CHANGELOG.md and from there into the release notes, so a mis-decode caught anywhere
    # later has already been copied twice.
    # -Recurse covers the folder's other pages -- the release notes under releases/audience/ and, in a
    # consumer, the scaffolded docs. It also covered branch/templates/ until the merged development document
    # retired that directory on August 23, 2026.
    # EVERY NAME IS SCANNED, and the reason is what this check is for: a repo mid-rename has prose in
    # whichever folder it still uses, and a mojibake check that silently skips the folder a consumer
    # actually has is worse than no check -- it reports a clean run over nothing.
    foreach ($workflowFolderName in @('dkj-policy', 'contributing-davekjohn', 'workflow-davekjohn')) {
        $workflowDir = Join-Path $RepoRoot $workflowFolderName
        if (Test-Path -LiteralPath $workflowDir) {
            $paths += @(Get-ChildItem -LiteralPath $workflowDir -Recurse -Filter '*.md' -File |
                Select-Object -ExpandProperty FullName)
        }
    }

    # Every markdown file under plugins/: the manuals, agent defs, personas and skill pages -- all prose,
    # all equally able to carry a mis-decode. It used to name the per-plugin CHANGELOG.md and RELEASE.md
    # first; those were retired on August 8, 2026 and the rest of the set is unchanged.
    #
    # -Filter, NOT -Include, and that is a bug fix rather than a preference. PowerShell SILENTLY IGNORES
    # -Include when the path is given as -LiteralPath, so the previous form --
    # `Get-ChildItem -LiteralPath $pluginRoot -Recurse -File -Include 'CHANGELOG.md','RELEASE.md'` --
    # returned EVERY file under plugins/, .ps1 and .json included, while the comment above it named two
    # file names. Nothing broke, because the extra files were clean and the tool leaves anything that is
    # not mojibake alone; what was wrong is that the code and its own description disagreed, and the
    # description is what the lint gate quotes to the reader as its coverage. Worth keeping now that the
    # two named files are gone: the WIDE set is what this function has actually returned all along.
    $pluginRoot = Join-Path $RepoRoot 'plugins'
    if (Test-Path -LiteralPath $pluginRoot) {
        $paths += @(Get-ChildItem -LiteralPath $pluginRoot -Recurse -File -Filter '*.md' |
            Select-Object -ExpandProperty FullName)
    }

    # THE ARCHIVED RELEASE NOTES, added August 2, 2026 after they turned out to hold the largest single
    # concentration of damage in the repo (474 sequences in 3.1.0.md alone, more than the root
    # changelog). They sit outside the language rule because they are history, but the two questions are
    # not the same: not translating an old note preserves what it said, while leaving mojibake in it
    # preserves a mis-decode nobody wrote.
    #
    # THIS REPO NO LONGER HAS THAT DIRECTORY (August 27, 2026): its notes sit under
    # dkj-policy/releases/ and arrive through the recurse above. The block stays, because the
    # Test-Path is what makes it correct rather than stale -- a repo that still keeps notes at its root
    # gets them scanned, and one that does not pays a single Test-Path. Removing it would narrow a
    # consumer's coverage to buy nothing here.
    $releasesRoot = Join-Path $RepoRoot 'releases'
    if (Test-Path -LiteralPath $releasesRoot) {
        $paths += @(Get-ChildItem -LiteralPath $releasesRoot -Recurse -File -Filter '*.md' |
            Select-Object -ExpandProperty FullName)
    }

    return @($paths | Sort-Object -Unique)
}

# --- Where this repo keeps its release history (Dave, August 4, 2026) -----------------------------
#
# THE MEASUREMENT BEHIND THIS PATH BECOMING LOAD-BEARING. CHANGELOG.md used to carry an accumulating
# release section that had grown to 434 of the file's 1,062 lines -- 41% -- across 72 blocks that each
# said no more than "see the notes". Every one of those 72 versions was ALSO in releases/README.md, with a
# date, a type and a descriptive title: verified in both directions, zero missing either way. So the
# section was not a long list but a poorer copy of a better one, and the changelog's own subject -- what
# changed since the last release -- was sitting under it.
#
# Get-ReleaseHistoryMode retired on August 5, 2026, and this is the other half of that same measurement
# playing out. It chose between 'all' (a block per release) and 'latest' (only the newest, behind a
# pointer); the flat changelog keeps NEITHER, because a cut now empties the document down to its intro.
# There is no mode left to select, and the file below is not "where the pointer points" any more but the
# only list of releases there is.
#
# THE PRECONDITION IS THEREFORE ABSOLUTE RATHER THAN A CAUTION: this file must really list every release,
# because from now on nothing else does. It did before this change too -- that is what made removing the
# blocks safe rather than lossy.
#
# The path answers ONE question and three things read it: the guardrail that checks which major a new row
# would land in, the inserter that writes that row, and new-internal-note.ps1, which repoints that row's
# Version cell at the internal note once the note exists. One edit here moves all three.
#
# IT IS BACK AT THE DEFAULT, releases/README.md, since August 19, 2026 (Dave), and the round trip is the
# instructive part. It moved to the workflow folder on August 14 with the hand-kept release pages, on the
# reasoning that everything the workflow owns gathers in the workflow's own folder. That swept up one
# thing the workflow does NOT own: a repo that has cut releases has a HISTORY, whichever tooling cut it,
# and an index of files living in releases/ had no business sitting in a plugin folder that a teardown
# removes. The audience notes stayed behind deliberately -- those exist only BECAUSE the tier model does,
# so they are the workflow's; the list is not. The list lived in its own HISTORY.md for one day
# (August 4, 2026), on the reasoning that one
# page should describe the process and another the outcome. That reasoning was superseded the same day:
# the pages had since been reorganised portable-half first with everything repo-specific in one named
# slot, and once that split exists, process-versus-outcome stops earning a file boundary -- the outcome
# IS repo-specific content, so it is simply the last section of the slot. Merging them also removed four
# cross-references the two pages needed to introduce each other, and left a consumer with one file to
# mirror instead of two.
# UNDER contributing-davekjohn/ SINCE AUGUST 27, 2026 (Dave), which REVERSES the August 19 answer
# recorded three paragraphs up -- amended rather than silently flipped, so both readings stay legible.
# That answer sent the list back to the repo root on one premise: an index of releases had no business
# sitting in "a plugin folder that a teardown removes". THE PREMISE EXPIRED BEFORE THE ANSWER DID.
# Issue #885 settled that dkj-policy/ is PERMANENT -- no command in this plugin removes it and
# no future teardown may, precisely because it holds a repo's own changelog and release history -- and
# UNINSTALL.md's "what is left behind" list says so to every consumer. Once that is true the durability
# worry is answered a different way, and the folder is the safer home rather than the riskier one. It is
# also the answer the computed default has been giving every CONSUMER since #885; the source was the
# holdout, on a reason that no longer holds.
#
# THE FILENAME CHANGES WITH THE MOVE, and that is not cosmetic: this folder's own 'releases/README.md' is
# its seam-ANSWERS page. The list and the answers are two different documents that shared a filename only
# because they sat at different directory levels. 'history.md' is the name Get-DefaultReleaseHistoryPath
# already computes for a consumer, so the source stops being the one repo that names it differently.
#
# AND UNDER dkj-policy/ SINCE SEPTEMBER 5, 2026 (#1437), when the folder renamed with the plugin it is
# named after. The seam VALUES below carry today's name; every dated sentence around them keeps the name
# it was written with, which is the #952 rule.
$script:ReleaseHistoryPath = 'dkj-policy/releases/history.md'

function Get-ReleaseHistoryPath {
    <# Repo-root-relative path to the file that lists every release this repo has cut. #>
    return $script:ReleaseHistoryPath
}

# Where the generated internal note (tier 1) is written. Stated for one reason: without it
# Get-DefaultReleaseInternalNotesRoot would answer 'releases/internal' here -- the source branch of that
# default -- and recreate a root releases/ directory the August 27, 2026 move above just emptied. The
# other two generated roots (changelog/, github/) need no statement: their defaults stopped branching on
# the source at #914 and already point into this folder.
$script:ReleaseInternalNotesRoot = 'dkj-policy/releases/internal'

function Get-ReleaseInternalNotesRoot {
    <# Repo-root-relative directory the generated internal (tier 1) note is written into. #>
    return $script:ReleaseInternalNotesRoot
}

# --- Where this repo keeps its changelog (Dave, August 27, 2026) -----------------------------------
#
# THE SAME MOVE, ON THE SAME DAY AND FOR THE SAME REASON as the release history above -- read that record
# first. Get-DefaultChangelogPath computes 'CHANGELOG.md' for a repo that publishes plugins, i.e. for the
# workflow's SOURCE, and 'dkj-policy/CHANGELOG.md' for everybody else. This repo is the source
# and now answers the consumer's way, so the seam has to be stated rather than left to the default.
#
# NOT A CHANGE OF MIND ABOUT THE DEFAULT. The default is right about what a repo adopting this workflow
# should get and says nothing about what THIS repo prefers; the seam exists for exactly this, a repo that
# wants to differ from its computed answer. Nothing about a consumer changes here.
#
# WHAT IT COSTS. A relative link inside a changelog entry now resolves from dkj-policy/ rather
# than from the repo root, because that is where the fold pastes it. new-branch composes the branch
# document's guidance from this very seam, so a writer is told the right thing without having to know it,
# and check-plugin-integrity validates each entry's links against the same resolved location.
$script:ChangelogPath = 'dkj-policy/CHANGELOG.md'

function Get-ChangelogPath {
    <# Repo-root-relative path to the changelog the fold writes into and the cut empties. #>
    return $script:ChangelogPath
}

# THE ALWAYS-ON CEILING (issue #2037, Dave September 16, 2026): how many BYTES the always-on document
# path -- CLAUDE.md plus everything it '@'-imports -- may cost, before a single assignment is given.
#
# 100,000 IS DAVE'S OWN FIGURE and it is stated here rather than left to the built-in default, because a
# ceiling a repo has never said out loud is one nobody can argue with. Every measurable repo running
# this workflow was over it the day it was measured, the source repo included and smallest of the four
# at 109,385 B -- which is why the gate is a RATCHET rather than a cliff: over the ceiling it refuses
# growth against a recorded baseline, at or under it it refuses crossing. The mechanism, and why the
# judgement stays out of measure-context-lib, are in scripts/lib/always-on-budget-lib.ps1.
#
# RAISING THIS IS A REAL OPTION AND IT IS MEANT TO BE VISIBLE. A repo whose path is legitimately bigger
# raises the number here, where the raise sits in a tracked file and gets reviewed with the change that
# needed it -- which is the whole difference between this seam and no bound at all. What it must NOT
# become is the way past a red gate: the PATH's own baseline is what moves in that case
# (check-always-on-budget.ps1 -Raise), because that write carries a reason and this one does not.
#
# BYTES, NOT TOKENS, and the unit is not arbitrary. No API prices a document, so a token figure here
# would be a calibrated estimate wearing the trousers of a measurement -- the exact failure
# measure-context-lib.ps1 records as this repo's worst: a chars-per-token factor inherited unexamined
# through three re-measurements, ~19% too generous, every derived figure under-stated while looking
# precise. A byte is checkable with `wc -c`.
$script:AlwaysOnBudget = 100000

function Get-AlwaysOnBudget {
    <# The ceiling in bytes on the always-on document path (CLAUDE.md plus its '@'-import closure).
       Optional in the script contract: a repo that states nothing runs on the built-in 100,000. #>
    return $script:AlwaysOnBudget
}

# --- The triage-priority labels every dkj-policy consumer is invited to share (issue #1895) ---------
#
# THE GAP. `.claude/specialists/lenses/specialist-01-01-lens.md` already prescribes a priority label on
# every issue filed HERE -- 'prio-1' (lowest) through 'prio-4' (highest) -- but until now that scale
# was prose in one family's page and `dkj-policy` itself knew none of it. #1895 (split from #1843)
# asked three questions, and Dave answered all three on September 12, 2026:
#
#   1. Apply or print?  PRINT. adopt-triage-labels.ps1 composes the exact `gh label create` a person
#      would type and stops, on the same reasoning Get-MissingLabelNote already applies to a PR
#      label: creating a label is a GitHub-side write, and a script that quietly created or
#      substituted one would break any repo that later gates on it.
#   2. Is there a shared set at all?  YES, one set -- not a per-consumer table.
#   3. Where is it declared?  HERE, in its own seam -- not in branch-info.ps1 (see AdoptWhy below).
#
# 'copy', NOT 'decide', AND THE REASONING IS Get-ReachLabel's, ONE AXIS OVER (issue #1870), NOT
# Get-BranchInfo's. A 'decide' value states WHAT THE REPO IS -- Get-BranchInfo's three prefixes exist
# because THIS repo lands a release directly on its trunk, and copying that table into a consumer with
# a different policy would impose it on them. 'prio-1' through 'prio-4' assert nothing about the
# adopting repo at all: they are four rungs of urgency, and the rungs mean the same thing in every
# repo that adopts them -- the shared WAY OF WORKING Get-ReachLabel's own AdoptWhy already argues for
# the neighbouring axis. Refusing to share them would leave every dkj-policy consumer to reinvent four
# names and four colours on their own, which is the exact "prose in one family's page" #1895 was filed
# about.
#
# NOT THE SAME QUESTION AS #1686, AND NOT A REVERSAL OF IT. #1686 (closed September 9, 2026) kept this
# repo's `prio-*` rungs and the BWJ tracker's own reach BUCKETS deliberately disjoint, in both
# directions, so a session crossing families gets a refused label rather than one that quietly means
# something else there. This seam does not touch dkj-policy-bwj's buckets or Get-ReachLabel's reach
# axis at all -- it only offers the priority axis to an ORDINARY dkj-policy consumer, one with no BWJ
# board of its own, which is a question #1686 never asked.
#
# THE VALUES ARE THIS REPO'S OWN LIVE LABELS, read back from `gh label list` rather than invented for
# this function -- this repo already runs the convention its own orchestrator prescribes, so its
# answer IS the canonical one instead of a guess at what it should be. adopt-triage-labels.ps1 carries
# the same four values as its own built-in fallback, for a consumer that has not yet adopted this seam
# -- see that script's header for why the two copies must stay byte-identical, the same duality
# Get-EntryFallbackType's 'Chore' already has with entry-scaffold-lib.ps1.
#
# NO SCRIPT IN THIS WORKFLOW READS THIS EITHER, same as the priority axis has never been read by
# anything here (see Get-ReachLabel's own AdoptWhy for why that is not disqualifying): `gh issue
# create` fails outright on a label the repo does not have, so the four records below exist to be
# composed into a paste-ready `gh label create` line by adopt-triage-labels.ps1 rather than typed by
# hand into four separate terminals with four separate chances to mistype a hex colour.
#
# AND A FIFTH ENTRY THAT IS NOT A RUNG: 'awaiting-more-recurrences' (issue #2462, Dave September 24,
# 2026), the label of a RECORD. A record is
# a collecting issue -- every instance of one recurring problem is added to it as a comment until the
# root cause is found, and no single repair closes it (#2454 was the first). It is a KIND of issue, not
# an urgency, so it sits beside the rungs rather than among them: a record carries a prio-* label of
# its own like any other issue. Dave ruled it a shared way of working rather than this repo's own label,
# which is what puts it in this seam -- the same 'copy' reasoning as the rungs, since what a record is
# asserts nothing about the adopting repo. The handling rule lives in CONTRIBUTING-portable.md.
# It was named 'dossier' until issue #2683 (Dave October 1, 2026 -- clearer, and plainer English) and
# 'record' until issue #2723 (Dave October 2, 2026), which made the three purple labels one family of
# issues WAITING on something: 'awaiting-more-info', 'awaiting-first-recurrence' and this one. Both old
# names are still matched by open-pr's gate and the parking defaults, and adopt-triage-labels prints a
# rename rather than a create for a tracker that still carries one.
#
# AND A SIXTH, A PARKING LABEL: 'needs-decision' (issue #2519, Dave September 26, 2026). An issue that
# ends in an open choice for the owner is not work anybody can pick up yet, and the claim and sweep
# routes skip it by default. It is deliberately NOT 'awaiting-more-info' ('needs-info' until #2723): in
# dkj-policy-bwj that label means
# blocked on the SUBMITTER -- it moves the mirrored Asana card to the blocked column and obliges a
# question comment to the person who filed it -- and neither is true of a decision that is the owner's.
# Same 'copy' reasoning: "waiting on the owner" asserts nothing about the adopting repo.
#
# AND A SEVENTH, A SECOND PARKING LABEL: 'awaiting-first-recurrence' (issue #2587, Dave September 28,
# 2026; named 'awaiting-recurrence' until #2723).
# An issue with one unreproduced instance whose only remaining step is its FIRST reproducible occurrence
# was picked up four times in one day (#2572), each pickup finding nothing to build. It is deliberately
# NOT a record: a record collects a problem that demonstrably recurs. (A record is parked TOO since
# September 30, 2026 -- Dave: it waits on its next instance or its root cause, so no sweep can finish
# one -- but it keeps its own label, because it also changes how the issue is closed.) Once a
# recurrence arrives the label comes off and the issue is worked, or becomes a record if it keeps
# recurring. Same 'copy' reasoning: "waiting on evidence" asserts nothing about the adopting repo.
$script:TriageLabels = @(
    [pscustomobject]@{ Name = 'prio-1'; Color = 'FFE033'; Description = 'Priority 1 of 4 (lowest) -- nobody is waiting for it' }
    [pscustomobject]@{ Name = 'prio-2'; Color = 'F9A825'; Description = 'Priority 2 of 4 -- worth doing, no pressure' }
    [pscustomobject]@{ Name = 'prio-3'; Color = 'E0321A'; Description = 'Priority 3 of 4 -- do this before the ordinary backlog' }
    [pscustomobject]@{ Name = 'prio-4'; Color = 'B60205'; Description = 'Priority 4 of 4 (highest) -- takes precedence over other work' }
    [pscustomobject]@{ Name = 'awaiting-more-recurrences'; Color = '5319E7'; Description = 'Collects every instance of one recurring problem until its root cause is fixed' }
    [pscustomobject]@{ Name = 'needs-decision'; Color = 'BFD4F2'; Description = 'Waiting on the owner''s choice -- parks the issue so no session picks it up' }
    [pscustomobject]@{ Name = 'awaiting-first-recurrence'; Color = '5319E7'; Description = 'Waiting on a first reproducible recurrence -- parks the issue so no session picks it up' }
)

function Get-TriageLabels {
    <# The canonical triage labels this workflow's consumers are invited to share -- the four
       priority rungs 'prio-1' (lowest) through 'prio-4' (highest), plus 'awaiting-more-recurrences', the kind label for
       a collecting issue, and the two parking labels 'needs-decision' (an issue awaiting the owner's
       choice) and 'awaiting-first-recurrence' (an issue awaiting its first reproducible recurrence) -- as an array of objects with Name, Color and Description (the exact fields
       a `gh label create` call needs). Read by adopt-triage-labels.ps1, which composes and prints the
       create command for whichever of them this repo's tracker is missing; it never creates a label
       itself. Optional in the script contract -- a consumer that has not answered this seam gets the
       same values from that script's own built-in fallback, so an unanswered repo is already told the
       canonical set rather than a degraded one. #>
    return @($script:TriageLabels)
}

# THE NAME THE CUT ACTUALLY LOOKS FOR FIRST (inbound #605). cut-release.ps1 reads
# Get-ReleaseNoteWording and only falls back to Get-InternalNoteWording above -- so until this existed,
# this repo was being served by the retired name and had no way to notice. Nothing was broken, which is
# precisely why it went two releases undeclared: the fallback works, so no run ever complains.
#
# A SEPARATE MAP RATHER THAN AN ALIAS, because the two documents do not share a key set. This one is the
# ONE hand-written release note (a named section per reader): Title, AudienceLabel, Audience,
# SectionAudience, HintAudience, SectionValue, HintValue, SectionOpen, HintOpen. The four keys above
# that are missing here -- SkeletonNote, SectionChanged, NoEntries, Unknown -- belong to
# new-internal-note.ps1, which is still shipped and which nothing here calls.
#
# SectionAudience/HintAudience WERE SectionConsumers/HintConsumers until inbound #747, and both old names
# are still read -- "recognise both, write one". The rename is not cosmetic: that section now follows
# Get-ReleaseAudienceTier, so in a tier-1 repo it addresses the organisation, and a key whose own name said
# "consumers" would describe the wrong reader. A repo that overrode the old name keeps its heading.
#
# EMPTY HERE, for the same reason as its neighbour: an English repo is already served by the English
# defaults in the script. Merged over them, so overriding one leaves the rest alone.
$script:ReleaseNoteWording = @{}

function Get-ReleaseNoteWording {
    <# Overrides for the release note's headings, audience line and fill-in hints. Empty = English. #>
    return $script:ReleaseNoteWording
}

# WHICH OF THAT NOTE'S THREE SECTIONS THIS REPO'S READERS GET (inbound #2564). The wording map above can
# rename a section but never omit one; this is the seam that omits. Names are the wording keys without
# 'Section': Audience (what changed), Value (what it is worth), Open (what was still open). All three
# here, which is also what an absent function means -- this repo's note is written for two readers.
function Get-ReleaseNoteSections {
    <# The sections the hand-written release note carries, in any order: Audience, Value, Open. #>
    return @('Audience', 'Value', 'Open')
}

# --- The internal tier's own text (the third tier, August 3, 2026) --------------------------------
#
# releases/internal/<X>.x/<X.Y.Z>.md, written by new-internal-note.ps1 for colleagues, employers and
# management -- at EVERY release including a patch, which is exactly what separates it from the consumer
# document: that one is what a CONSUMER notices, this one is what the ORGANISATION gets out of it. A
# release with nothing for a consumer (correctly a patch, so no consumer document) can still be the one
# where a team stopped needing a developer for a routine change.
#
# NO ON/OFF KNOB, deliberately, unlike the consumer tier. That tier is generated BY cut-release, so it
# needs to be told whether to run; this one is a script you invoke when you want a note. The switch is
# running it or not. cut-release only decides whether to PRINT the suggestion, and it does that by
# checking whether the script exists in the repo -- a fact rather than a preference, the same reasoning
# as Get-ReleasePluginTier's computed fallback.
#
# EMPTY HERE, for the third time in this file and for the same reason: an English repo is already served
# by the English defaults in the script. The knob exists for a consumer whose colleagues read another
# language, where an unset heading is the wrong word rather than a missing one -- the #410 class. Keys:
# Title, AudienceLabel, Audience, SkeletonNote, SectionChanged, SectionValue, HintValue, SectionOpen,
# HintOpen, NoEntries, Unknown. Merged over the defaults, so overriding one leaves the rest alone.
$script:InternalNoteWording = @{}

function Get-InternalNoteWording {
    <# Overrides for the internal note's headings, audience line and fill-in hints. Empty = English. #>
    return $script:InternalNoteWording
}

# --- The decide seams, answered by Dave on October 3, 2026 (issue #1) ------------------------------
#
# adopt-config proposes these and never places them, because each states what THIS repo is. Dave
# answered them in one session; the table on issue #1 is the record. Three are left open on purpose
# until the app's stack is chosen: Get-TestCommands, Get-CiTestCheckName and Get-ExpectedRepoSettings.

# Who the releases are for: tier 2, the users -- Dave and his friends use the app.
function Get-ReleaseAudienceTier { return 2 }

# A hand-written release note for every minor and major, so the friends read what is new.
function Get-ReleaseConsumerBumps { return @('minor', 'major') }

# A PR lands as a merge commit, as #4 did.
function Get-PrMergeMethod { return 'merge' }

# No minimum number of minors before a major: a major comes when the developer says so. The bump gate
# refuses only while the minors so far are BELOW this, which 0 never is.
function Get-ReleaseMajorMinMinors { return 0 }

# No Stop hook capping the close-out: 0 is the documented "off".
function Get-CloseOutGateBand { return 0 }

# This repo publishes no plugins; the computed fallback says the same, stated so it is answered.
function Get-ReleasePluginTier { return $false }

# The release page carries the product's name rather than the repository's.
function Get-ReleasePageTitle { return 'MesoWise' }

# Hosted nowhere for now: the app's own hosting is not chosen yet.
function Get-ReleasePageWorkerName { return '' }
function Get-IssueDashboardWorkerName { return '' }

# The fallbacks, answered explicitly: no palette or wordmark of our own, no external task tracker, no
# mirrored tickets, no closing step every branch owes, notes foldered per major (no tree exists yet),
# and the shared list of root docs exempt from the stray-entry check.
function Get-ReleasePageTheme { return @{} }
function Get-ReleasePageMasthead { return @() }
function Get-ReleaseNoteTaskLink { return $null }
function Get-ResolvesExemptMatchers { return @() }
function Get-BranchClosingSteps { return @() }
function Get-ReleaseNotesGrouping { return 'major' }
function Get-ReservedRootMd { return @('CHANGELOG.md', 'CLAUDE.md', 'README.md', 'LICENSE.md', 'CONTRIBUTING.md', 'SECURITY.md') }

# Declined parts of the adoption floor: the statusLine (#2) -- the gates here are short, so a progress
# bar buys little. The CI floor is NOT declined; it waits for the app's CI.
function Get-DeclinedAdoptions { return @('adopt-statusline') }
