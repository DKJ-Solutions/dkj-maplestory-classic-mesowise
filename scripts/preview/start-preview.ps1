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

    Draait er al een server die dit script startte, met dezelfde -Lan, en antwoordt hij nog, dan wordt
    die hergebruikt: Vite laadt wijzigingen zelf opnieuw, dus de link blijft actueel. De status staat in
    node_modules/.cache/mesowise-preview/ (genegeerd door git, en daarmee per checkout). Twee runs
    tegelijk starten elk een eigen server; de laatste wint de status, de andere blijft wees.

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
    [int]$TimeoutSeconds = 60,
    # Zonder netwerkadres (offline, alleen VPN) print Vite nooit een Network-regel; zo lang wachten we erop.
    [int]$NetworkGraceSeconds = 5
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

# Het proces uit de status, maar alleen als het nog HETZELFDE proces is: een PID die Windows na het
# einde van de server hergebruikt, heeft een andere starttijd, en die schieten we niet af.
function Get-ServerProcess($state) {
    if (-not $state) { return $null }
    $p = Get-Process -Id $state.Pid -ErrorAction SilentlyContinue
    # StartTime van andermans proces (bv. SYSTEM) gooit "toegang geweigerd": dan is het ook niet de onze.
    try {
        if ($p -and $p.StartTime.ToUniversalTime().Ticks -eq [long]$state.StartTicks) { return $p }
    } catch { }
    return $null
}

# Een eigen HTTP-check zonder proxy: Invoke-WebRequest volgt in PS 5.1 de systeemproxy, ook voor localhost.
function Test-Answers([string]$url) {
    try {
        $req = [System.Net.WebRequest]::Create($url)
        $req.Proxy = $null
        $req.Timeout = 3000
        $resp = $req.GetResponse()
        $ok = ([int]$resp.StatusCode -eq 200)
        $resp.Close()
        return $ok
    } catch { return $false }
}

function Stop-ProcessTree([int]$id) {
    # taskkill /T neemt de node-kindprocessen mee; Stop-Process alleen laat ze soms staan.
    & taskkill.exe /PID $id /T /F | Out-Null
}

# Geeft $true als er niets (meer) draait van wat de status noemt; de status gaat alleen dan weg.
function Stop-Server($state) {
    $p = Get-ServerProcess $state
    if ($p) {
        Stop-ProcessTree $p.Id
        # taskkill keert terug voor Windows het proces echt heeft opgeruimd; wacht daar even op.
        if (-not $p.WaitForExit(5000)) {
            Write-Host "preview: proces $($p.Id) wilde niet stoppen; de status blijft staan." -ForegroundColor Red
            return $false
        }
    }
    if (Test-Path $stateFile) { Remove-Item $stateFile -Force }
    return $true
}

function Write-Links($state) {
    Write-Host "preview: $($state.Local)" -ForegroundColor Green
    if ($state.Network) { Write-Host "preview (telefoon, zelfde netwerk): $($state.Network)" -ForegroundColor Green }
    elseif ($state.Lan) { Write-Host 'preview: geen netwerk-link -- deze machine heeft geen netwerkadres.' -ForegroundColor Yellow }
    Write-Host "         branch $($state.Branch); stoppen: start-preview.ps1 -Stop"
}

function Get-Branch {
    $b = git -C $repoRoot rev-parse --abbrev-ref HEAD 2>$null
    if ($b) { return $b }
    return '(onbekend)'
}

$state = Read-State

if ($Stop) {
    if (-not (Get-ServerProcess $state)) {
        if (Test-Path $stateFile) { Remove-Item $stateFile -Force }
        Write-Host 'preview: er draait niets dat dit script startte.'
        exit 0
    }
    if (-not (Stop-Server $state)) { exit 1 }
    Write-Host 'preview: gestopt.'
    exit 0
}

# Hergebruik alleen wat nog leeft, nog antwoordt en dezelfde -Lan heeft.
if ($state -and [bool]$state.Lan -eq [bool]$Lan -and (Get-ServerProcess $state) -and (Test-Answers $state.Local)) {
    $state.Branch = Get-Branch
    Write-Links $state
    exit 0
}
if (-not (Stop-Server $state)) { exit 1 }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'preview: node staat niet op het PATH -- installeer Node 22 (.nvmrc).' -ForegroundColor Red
    exit 1
}
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

$local = $null; $network = $null; $localSeen = $null
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
while ((Get-Date) -lt $deadline -and -not $proc.HasExited) {
    $log = Get-Content $logFile -Raw -ErrorAction SilentlyContinue
    if ($log -match 'Local:\s+(http://\S+)') {
        $local = $Matches[1]
        if (-not $localSeen) { $localSeen = Get-Date }
        if ($Lan -and $log -match 'Network:\s+(http://\S+)') { $network = $Matches[1] }
        if (-not $Lan -or $network -or ((Get-Date) - $localSeen).TotalSeconds -ge $NetworkGraceSeconds) { break }
    }
    Start-Sleep -Milliseconds 300
}

$failure = $null
if (-not $local) { $failure = 'Vite gaf binnen de tijd geen link.' }
elseif (-not (Test-Answers $local)) { $failure = "$local antwoordt niet met 200." }
if ($failure) {
    Write-Host "preview: $failure Uitvoer:" -ForegroundColor Red
    Get-Content $logFile, $errFile -ErrorAction SilentlyContinue | Out-Host
    if (-not $proc.HasExited) { Stop-ProcessTree $proc.Id }
    exit 1
}

$state = [pscustomobject]@{
    Pid        = $proc.Id
    StartTicks = $proc.StartTime.ToUniversalTime().Ticks
    Lan        = [bool]$Lan
    Local      = $local
    Network    = $network
    Branch     = Get-Branch
}
# UTF8: ConvertTo-Json laat niet-ASCII ongemoeid, en ASCII zou er een ? van maken.
$state | ConvertTo-Json | Set-Content -Path $stateFile -Encoding UTF8
Write-Links $state
exit 0
