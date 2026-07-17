<#
.SYNOPSIS
    One-command deploy for roadweather.app (build + upload). No FTP client needed.

.DESCRIPTION
    1. Builds the frontend web bundle (npm run build:web).
    2. Uploads frontend/web-build to DreamHost over SFTP, reusing the
       credentials already saved in the FileZilla site "RoadWeatherApp".

    Run from the repo root:  .\deploy.ps1
    Skip the build (upload existing web-build):  .\deploy.ps1 -SkipBuild
#>
param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot

if (-not $SkipBuild) {
    Write-Host "Building frontend..." -ForegroundColor Cyan
    Push-Location (Join-Path $repoRoot "frontend")
    try {
        npm run build:web
        if ($LASTEXITCODE -ne 0) { throw "Build failed (exit $LASTEXITCODE)" }
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Host "Skipping build (uploading existing web-build)..." -ForegroundColor Yellow
}

Write-Host "Uploading to DreamHost (single archive + swap)..." -ForegroundColor Cyan
$env:PYTHONUNBUFFERED = "1"
python (Join-Path $repoRoot "scripts\deploy_upload.py")
if ($LASTEXITCODE -ne 0) { throw "Upload failed (exit $LASTEXITCODE)" }

Write-Host "Done. Live at https://roadweather.app" -ForegroundColor Green
