
# # build-bff.ps1
# # Builds the BLT React PWA and publishes the .NET BFF.
# # Run from solution root: .\build-bff.ps1

# $ErrorActionPreference = "Stop"

# $ScriptDir   = $PSScriptRoot
# $BffDir      = Join-Path $ScriptDir "BugLoggingTool.Bff"
# $FrontEndDir = Join-Path $BffDir "FrontEnd"
# $WwwRoot     = Join-Path $BffDir "wwwroot"
# $PublishDir  = Join-Path $ScriptDir "publish"

# Write-Host ""
# Write-Host "========================================" -ForegroundColor Cyan
# Write-Host "  BLT BFF Build" -ForegroundColor Cyan
# Write-Host "========================================" -ForegroundColor Cyan
# Write-Host ""

# # 1. npm install
# Write-Host "[ 1/4 ] Installing React dependencies..." -ForegroundColor Yellow
# Push-Location $FrontEndDir
# npm install
# Pop-Location
# Write-Host "   OK" -ForegroundColor Green

# # 2. Build React PWA -> wwwroot/
# Write-Host "[ 2/4 ] Building React PWA..." -ForegroundColor Yellow
# Push-Location $FrontEndDir
# $env:VITE_OUT_DIR = $WwwRoot
# node scripts/generate-version.cjs
# npx vite build
# Remove-Item Env:VITE_OUT_DIR -ErrorAction SilentlyContinue
# Pop-Location
# Write-Host "   OK" -ForegroundColor Green

# # 3. Verify
# Write-Host "[ 3/4 ] Verifying build output..." -ForegroundColor Yellow
# foreach ($f in @("index.html", "sw.js", "version.json")) {
#     if (-not (Test-Path (Join-Path $WwwRoot $f))) {
#         Write-Error "Missing: $f in wwwroot"
#         exit 1
#     }
# }
# $swContent = Get-Content (Join-Path $WwwRoot "sw.js") -Raw
# if ($swContent -match "__SW_CACHE_VERSION__") {
#     Write-Error "sw.js still contains placeholder - injection failed"
#     exit 1
# }
# $cacheKeyLine = ($swContent -split [Environment]::NewLine | Where-Object { $_ -match "CACHE_VERSION" } | Select-Object -First 1)
# Write-Host "   Cache key: $($cacheKeyLine.Trim())" -ForegroundColor Gray
# Write-Host "   OK" -ForegroundColor Green

# # 4. Publish .NET BFF
# Write-Host "[ 4/4 ] Publishing .NET BFF..." -ForegroundColor Yellow
# Push-Location $BffDir
# dotnet publish -c Release -o $PublishDir --nologo
# Pop-Location
# Write-Host "   OK" -ForegroundColor Green

# Write-Host ""
# Write-Host "========================================" -ForegroundColor Cyan
# Write-Host "  Build complete!" -ForegroundColor Green
# Write-Host "  Output: $PublishDir" -ForegroundColor White
# Write-Host "  Run:    cd publish" -ForegroundColor White
# Write-Host "          dotnet BugLoggingTool.Bff.dll" -ForegroundColor White
# Write-Host "========================================" -ForegroundColor Cyan
# Write-Host ""

# build-bff.ps1
# Builds the BLT React PWA and publishes the .NET BFF.
# Run from solution root: .\build-bff.ps1

$ErrorActionPreference = "Stop"

$ScriptDir   = $PSScriptRoot
$BffDir      = Join-Path $ScriptDir "BugLoggingTool.Bff"
$FrontEndDir = Join-Path $BffDir "FrontEnd"
$WwwRoot     = Join-Path $BffDir "wwwroot"
$PublishDir  = Join-Path $ScriptDir "publish"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BLT BFF Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. npm install
Write-Host "[ 1/4 ] Installing React dependencies..." -ForegroundColor Yellow
Push-Location $FrontEndDir
npm install
Pop-Location
Write-Host "   OK" -ForegroundColor Green

# 2. Build React PWA -> wwwroot/
Write-Host "[ 2/4 ] Building React PWA..." -ForegroundColor Yellow
Push-Location $FrontEndDir
$env:VITE_OUT_DIR = $WwwRoot
node scripts/generate-version.cjs
npx vite build
Remove-Item Env:VITE_OUT_DIR -ErrorAction SilentlyContinue
Pop-Location
Write-Host "   OK" -ForegroundColor Green

# 3. Verify
Write-Host "[ 3/4 ] Verifying build output..." -ForegroundColor Yellow
foreach ($f in @("index.html", "sw.js", "version.json")) {
    if (-not (Test-Path (Join-Path $WwwRoot $f))) {
        Write-Error "Missing: $f in wwwroot"
        exit 1
    }
}
$swContent = Get-Content (Join-Path $WwwRoot "sw.js") -Raw
if ($swContent -match "__SW_CACHE_VERSION__") {
    Write-Error "sw.js still contains placeholder - injection failed"
    exit 1
}
$cacheKeyLine = ($swContent -split [Environment]::NewLine | Where-Object { $_ -match "CACHE_VERSION" } | Select-Object -First 1)
Write-Host "   Cache key: $($cacheKeyLine.Trim())" -ForegroundColor Gray
Write-Host "   OK" -ForegroundColor Green

# 4. Publish .NET BFF
Write-Host "[ 4/4 ] Publishing .NET BFF..." -ForegroundColor Yellow
Push-Location $BffDir
# Clean stale obj/ compressed asset cache before publish
# (prevents StaticWebAssets errors when Vite regenerates content-hashed filenames)
if (Test-Path "obj") {
    Remove-Item -Recurse -Force "obj" -ErrorAction SilentlyContinue
}
dotnet publish -c Release -o $PublishDir --nologo /p:SelfContained=false
Pop-Location
Write-Host "   OK" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build complete!" -ForegroundColor Green
Write-Host "  Output: $PublishDir" -ForegroundColor White
Write-Host "  Run:    cd publish" -ForegroundColor White
Write-Host "          dotnet BugLoggingTool.Bff.dll" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""