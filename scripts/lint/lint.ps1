<#
.SYNOPSIS
    De lint-poort van deze repo, in de vorm die open-pr en cut-release verwachten.
.DESCRIPTION
    De gedeelde workflow-scripts uit dkj-policy draaien de lint-poort als een .ps1 via
    Get-LintScript (scripts/repo-config.ps1). Zolang de app-stack nog niet gekozen is, bewaakt deze
    poort wat er nu is: elk .ps1-bestand onder scripts/ moet parsen en puur ASCII zijn (Windows
    PowerShell 5.1 leest een script zonder BOM als ANSI). Komt er een app met een eigen linter, dan
    roept dit script die erbij aan.

    Puur ASCII (repo-conventie voor .ps1).
#>
$ErrorActionPreference = 'Continue'

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$fouten = @()

Get-ChildItem -Path (Join-Path $repoRoot 'scripts') -Filter '*.ps1' -Recurse | ForEach-Object {
    $rel = $_.FullName.Substring($repoRoot.Length + 1)

    $tokens = $null; $parseErrors = $null
    [System.Management.Automation.Language.Parser]::ParseFile($_.FullName, [ref]$tokens, [ref]$parseErrors) | Out-Null
    foreach ($e in $parseErrors) { $fouten += "${rel}:$($e.Extent.StartLineNumber): $($e.Message)" }

    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    for ($i = 0; $i -lt $bytes.Length; $i++) {
        if ($bytes[$i] -gt 127) { $fouten += "${rel}: niet-ASCII byte op offset $i"; break }
    }
}

if ($fouten.Count -gt 0) {
    $fouten | ForEach-Object { Write-Host "lint: $_" -ForegroundColor Red }
    exit 1
}
Write-Host "lint: schoon." -ForegroundColor Green
exit 0
