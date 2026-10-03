<#
.SYNOPSIS
    De lint-poort van deze repo, in de vorm die open-pr en cut-release verwachten.
.DESCRIPTION
    De gedeelde workflow-scripts uit dkj-policy draaien de lint-poort als een .ps1 via
    Get-LintScript (scripts/repo-config.ps1). Twee delen: elk .ps1-bestand onder scripts/ moet
    parsen en puur ASCII zijn (Windows PowerShell 5.1 leest een script zonder BOM als ANSI), en de
    app moet door zijn eigen linter (`npm run lint`, de typecheck van TypeScript).

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

# De linter van de app. Zonder node_modules eerst `npm ci`, zodat een verse checkout niet faalt.
if (Test-Path (Join-Path $repoRoot 'package.json')) {
    Push-Location $repoRoot
    try {
        if (-not (Test-Path (Join-Path $repoRoot 'node_modules'))) {
            npm ci --no-audit --no-fund | Out-Host
            if ($LASTEXITCODE -ne 0) { $fouten += 'npm ci faalde' }
        }
        npm run --silent lint | Out-Host
        if ($LASTEXITCODE -ne 0) { $fouten += 'npm run lint faalde (zie hierboven)' }
    } finally {
        Pop-Location
    }
}

if ($fouten.Count -gt 0) {
    $fouten | ForEach-Object { Write-Host "lint: $_" -ForegroundColor Red }
    exit 1
}
Write-Host "lint: schoon." -ForegroundColor Green
exit 0
