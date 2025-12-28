# Script to copy favicons to web-build after build
# Run this after: npm run build:web

Write-Output "=== Copying favicons to web-build ==="

$faviconSource = "..\favicon"
$webBuildDest = "web-build"

if (Test-Path $faviconSource) {
    Copy-Item -Path "$faviconSource\*" -Destination $webBuildDest -Force
    Write-Output "✅ Favicons copied to web-build"
    
    # Update index.html with favicon links
    $indexHtml = Join-Path $webBuildDest "index.html"
    if (Test-Path $indexHtml) {
        $content = Get-Content $indexHtml -Raw
        
        # Check if favicon links already exist
        if ($content -notmatch 'rel="icon"') {
            # Add favicon links after <title>
            $faviconLinks = '<link rel="icon" type="image/x-icon" href="/favicon.ico"/><link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png"/><link rel="icon" type="image/svg+xml" href="/favicon.svg"/><link rel="apple-touch-icon" href="/apple-touch-icon.png"/><link rel="manifest" href="/site.webmanifest"/>'
            $content = $content -replace '(<title>RoadWeather</title>)', "`$1$faviconLinks"
            Set-Content -Path $indexHtml -Value $content -NoNewline
            Write-Output "✅ Updated index.html with favicon links"
        } else {
            Write-Output "ℹ️ Favicon links already exist in index.html"
        }
    }
} else {
    Write-Output "❌ Favicon folder not found at: $faviconSource"
}

Write-Output "=== Done ==="
