# Expo Project Cleaner Script
# Run this from your project root directory

Write-Host "🧹 Starting Expo project cleanup..." -ForegroundColor Green
Write-Host "Current directory: $PWD" -ForegroundColor Cyan

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Make sure you're in the project root directory!" -ForegroundColor Red
    exit 1
}

# Directories and files to clean
$itemsToClean = @(
    "node_modules",
    ".expo", 
    ".metro-cache",
    "android\.gradle",
    "android\app\build",
    "ios\build",
    "ios\Pods",
    "dist",
    "build",
    "*.tgz",
    "*.log",
    "package-lock.json",
    "yarn.lock"
)

$totalSaved = 0

foreach ($item in $itemsToClean) {
    if (Test-Path $item) {
        try {
            # Get size before deletion (for folders)
            if (Test-Path $item -PathType Container) {
                $size = (Get-ChildItem -Path $item -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
                $sizeMB = [math]::Round($size / 1MB, 2)
                $totalSaved += $sizeMB
                Write-Host "🗑️  Removing $item (${sizeMB}MB)..." -ForegroundColor Yellow
            } else {
                Write-Host "🗑️  Removing $item..." -ForegroundColor Yellow
            }
            
            Remove-Item -Path $item -Recurse -Force -ErrorAction Stop
            Write-Host "✅ Removed $item successfully" -ForegroundColor Green
        }
        catch {
            Write-Host "⚠️  Could not remove $item : $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "ℹ️  $item not found (already clean)" -ForegroundColor Gray
    }
}

Write-Host "`n🎉 Cleanup complete!" -ForegroundColor Green
Write-Host "💾 Estimated space saved: ${totalSaved}MB" -ForegroundColor Cyan
Write-Host "`n📋 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Run: npm install" -ForegroundColor White
Write-Host "   2. Run: npx expo install --fix" -ForegroundColor White
Write-Host "   3. Test your app: npm run android (or ios)" -ForegroundColor White

Read-Host "`nPress Enter to close"