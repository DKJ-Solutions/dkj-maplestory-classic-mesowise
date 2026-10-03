<#
.SYNOPSIS
    Shared branch conventions for workflow scripts (repo-specific prefix table).
.DESCRIPTION
    Placed by specialists-init as a VUL-IN scaffold. Provides Get-BranchTypes, Get-BranchPrefix,
    Get-BranchInfo and Test-BranchName -- every function check-script-contract marks required for this
    lib. Prefix table determines GitHub label for PR and changelog entry type, and is
    DIFFERENT PER REPO -- de tabel hieronder is deze repo's eigen taxonomie.

    No Set-StrictMode here: dot-sourcing would modify calling script's strict mode.
    Pure ASCII (repo convention for .ps1).
#>

# De canonieke branch-typen van deze repo, in de volgorde waarin ze in de release-notes verschijnen.
# Enige bron: elke Type-waarde in de tabel hieronder is lid van deze lijst, en de gedeelde release-lib
# leest hem via Get-BranchTypes. Een type toevoegen? Hier -- en nergens anders.
#
# De taxonomie volgt wat deze repo IS: een mobile-first app die per trainingsplek uitrekent hoeveel EXP
# je per meso krijgt in MapleStory Classic World, plus de speldata waar die berekening op rust.
$script:BranchTypeOrder = @(
    'App', 'Data', 'Tooling', 'Fix', 'Docs', 'Claude'
)

# prefix -> GitHub-label (PR) + branch-type (changelog-entry).
#
#   app      wat de gebruiker ziet en doet: schermen, de EXP-per-meso-berekening, de mobiele UX
#   data     de speldata: monsters, maps, EXP-tabellen, prijzen van potions en ammo
#   tooling  het overige gereedschap: scripts, tests, build, afhankelijkheden, CI
#   fix      een fout in het bovenstaande
#   docs     README en de andere prozalagen van deze repo
#   claude   de Claude-laag zelf: .claude/, de skills, de specialisten-lenzen, de plugin-config
$script:BranchPrefixTable = @{
    app     = @{ Label = 'enhancement';   Type = 'App' }
    data    = @{ Label = 'enhancement';   Type = 'Data' }
    tooling = @{ Label = 'documentation'; Type = 'Tooling' }
    fix     = @{ Label = 'bug';           Type = 'Fix' }
    docs    = @{ Label = 'documentation'; Type = 'Docs' }
    claude  = @{ Label = 'documentation'; Type = 'Claude' }
}

function Get-BranchTypes {
    return $script:BranchTypeOrder
}

function Get-BranchPrefix {
    param([Parameter(Mandatory = $true)][string]$Branch)
    if ($Branch -match '/') { return ($Branch -split '/')[0] }
    return ($Branch -split '-')[0]
}

function Get-BranchInfo {
    param([Parameter(Mandatory = $true)][string]$Branch)
    $prefix = Get-BranchPrefix -Branch $Branch
    $known  = $script:BranchPrefixTable.ContainsKey($prefix)
    [pscustomobject]@{
        Branch   = $Branch
        Prefix   = $prefix
        IsKnown  = $known
        Label    = $(if ($known) { $script:BranchPrefixTable[$prefix].Label } else { $null })
        Type     = $(if ($known) { $script:BranchPrefixTable[$prefix].Type } else { $null })
        SafeName = $Branch -replace '/', '-'
    }
}

# Validates a branch name before it is used (new-branch.ps1), instead of repeating the reject rules
# inline. Required by the contract, so the scaffold defines it rather than leaving the session check to
# report it against a missing function (issue #226). Hard rejects: an empty name, 'main', and any name
# containing 'final' (deliberately broad, so 'finalize' is rejected too). An UNKNOWN PREFIX is not a
# hard reject -- the caller reads IsKnown and decides for itself, consistent with the other shared
# scripts, which fall back on an unknown prefix rather than blocking.
function Test-BranchName {
    param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$Branch)

    if ([string]::IsNullOrWhiteSpace($Branch)) {
        return [pscustomobject]@{ IsValid = $false; Reason = "Branch name must not be empty."; IsKnown = $false }
    }
    if ($Branch -eq 'main') {
        return [pscustomobject]@{ IsValid = $false; Reason = "Branch name must not be 'main'."; IsKnown = $false }
    }
    if ($Branch -match 'final') {
        return [pscustomobject]@{ IsValid = $false; Reason = "Branch name must not contain the token 'final'."; IsKnown = $false }
    }

    $info = Get-BranchInfo -Branch $Branch
    [pscustomobject]@{ IsValid = $true; Reason = $null; IsKnown = $info.IsKnown }
}
