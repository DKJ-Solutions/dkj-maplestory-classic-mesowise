<#
.SYNOPSIS
    Start de Vite-devserver van DEZE checkout op de achtergrond en print de link waarop hij echt draait.
.DESCRIPTION
    Elke overdracht van een zichtbaar resultaat eindigt met een actuele localhost-link (Dave, 4 oktober
    2026, issue #74). "Actueel" betekent twee dingen, en daarom is dit een script en geen regel om uit
    het hoofd te typen:

    - de link komt uit Vite's eigen uitvoer, niet uit een aanname. Is poort 5173 bezet (een andere
      checkout, een vergeten server), dan kiest Vite de volgende vrije poort, en een getypte
      localhost:5173 toont dan iets anders dan deze branch;
    - het pad hoort erbij: vite.config.ts zet base op /dkj-maplestory-classic-mesowise/, dus de kale
      localhost:5173/ is niet de app.

    Draait er al een server die dit script uit DEZE map startte en nog antwoordt, dan wordt die
    hergebruikt: Vite laadt wijzigingen zelf opnieuw, dus de link blijft actueel. De status staat in
    node_modules/.cache/mesowise-preview/ (genegeerd door git, per checkout).

    -Lan start met --host, zodat ook de netwerk-link voor een telefoon in hetzelfde netwerk geprint
    wordt (mobile-first: de app wordt eerst op telefoonbreedte beoordeeld). -Stop stopt de server.

    Puur ASCII (repo-conventie voor .ps1).
.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/preview/start-preview.ps1
.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/preview/start-preview.ps1 -Lan
#>
param(
    [switch]$Lan,
    [switch]$Stop,
    [int]$TimeoutSeconds = 60
)
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$stateDir = Join-Path $repoRoot 'node_modules/.cache/mesowise-preview'
$stateFile = Join-Path $stateDir 'server.json'
$logFile = Join-Path $stateDir 'vite.log'
$errFile = Join-Path $stateDir 'vite.err.log'

function Read-State {
    if (-not (Test-Path $stateFile)) { return $null }
    try { return Get-Content $stateFile -Raw | ConvertFrom-Json } catch { return $null }
}

function Test-Answers([string]$url) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
        return ($r.StatusCode -eq 200)
    } catch { return $false }
}

function Stop-Server($state) {
    if ($state -and (Get-Process -Id $state.Pid -ErrorAction SilentlyContinue)) {
        # taskkill /T neemt de node-kindprocessen mee; Stop-Process alleen laat ze soms staan.
        & taskkill.exe /PID $state.Pid /T /F | Out-Null
    }
    if (Test-Path $stateFile) { Remove-Item $stateFile -Force }
}

function Write-Links($state) {
    Write-Host "preview: $($state.Local)" -ForegroundColor Green
    if ($state.Network) { Write-Host "preview (telefoon, zelfde netwerk): $($state.Network)" -ForegroundColor Green }
    Write-Host "         branch $($state.Branch); stoppen: start-preview.ps1 -Stop"
}

$state = Read-State

if ($Stop) {
    Stop-Server $state
    Write-Host 'preview: gestopt.'
    exit 0
}

# Hergebruik alleen wat aantoonbaar van deze checkout is, nog leeft, nog antwoordt en dezelfde -Lan heeft.
if ($state -and $state.Root -eq $repoRoot -and [bool]$state.Lan -eq [bool]$Lan -and
    (Get-Process -Id $state.Pid -ErrorAction SilentlyContinue) -and (Test-Answers $state.Local)) {
    $state.Branch = (git -C $repoRoot rev-parse --abbrev-ref HEAD)
    Write-Links $state
    exit 0
}
Stop-Server $state

if (-not (Test-Path (Join-Path $repoRoot 'node_modules/vite'))) {
    Write-Host 'preview: node_modules ontbreekt -- eerst npm install.' -ForegroundColor Red
    exit 1
}
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null

# NO_COLOR: zonder kleurcodes is de link in Vite's uitvoer met een simpele regex te lezen.
$env:NO_COLOR = '1'
$viteArgs = @('node_modules/vite/bin/vite.js')
if ($Lan) { $viteArgs += '--host' }
$proc = Start-Process -FilePath 'node' -ArgumentList $viteArgs -WorkingDirectory $repoRoot `
    -RedirectStandardOutput $logFile -RedirectStandardError $errFile -WindowStyle Hidden -PassThru

$local = $null; $network = $null
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
while ((Get-Date) -lt $deadline -and -not $proc.HasExited) {
    $log = Get-Content $logFile -Raw -ErrorAction SilentlyContinue
    if ($log -match 'Local:\s+(http://\S+)') {
        $local = $Matches[1]
        if ($Lan -and $log -match 'Network:\s+(http://\S+)') { $network = $Matches[1] }
        if (-not $Lan -or $network) { break }
    }
    Start-Sleep -Milliseconds 300
}

if (-not $local) {
    Write-Host 'preview: Vite gaf binnen de tijd geen link. Uitvoer:' -ForegroundColor Red
    Get-Content $logFile, $errFile -ErrorAction SilentlyContinue | Out-Host
    if (-not $proc.HasExited) { & taskkill.exe /PID $proc.Id /T /F | Out-Null }
    exit 1
}

$state = [pscustomobject]@{
    Pid     = $proc.Id
    Root    = $repoRoot
    Lan     = [bool]$Lan
    Local   = $local
    Network = $network
    Branch  = (git -C $repoRoot rev-parse --abbrev-ref HEAD)
}
$state | ConvertTo-Json | Set-Content -Path $stateFile -Encoding ASCII

if (-not (Test-Answers $local)) {
    Write-Host "preview: $local antwoordt niet met 200." -ForegroundColor Red
    exit 1
}
Write-Links $state
exit 0
