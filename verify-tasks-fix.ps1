# Verification script for StackDek Tasks fix
Write-Host "🔍 Verifying StackDek Tasks Feature Fix..." -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check migration file
Write-Host "Checking migration file..." -ForegroundColor Yellow
if (Test-Path "migrations\06_add_tasks_table.sql") {
    Write-Host "  ✅ migrations/06_add_tasks_table.sql exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ migrations/06_add_tasks_table.sql NOT FOUND" -ForegroundColor Red
    $allGood = $false
}

# Check new pages
Write-Host "`nChecking new task pages..." -ForegroundColor Yellow
$pages = @(
    "src\pages\TaskList.tsx",
    "src\pages\CreateTask.tsx",
    "src\pages\TaskDetail.tsx"
)

foreach ($page in $pages) {
    if (Test-Path $page) {
        Write-Host "  ✅ $page exists" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $page NOT FOUND" -ForegroundColor Red
        $allGood = $false
    }
}

# Check modified files
Write-Host "`nChecking modified files..." -ForegroundColor Yellow
$modifiedFiles = @(
    "src\App.tsx",
    "src\pages\Home.tsx",
    "src\components\AppLayout.tsx"
)

foreach ($file in $modifiedFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file exists" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file NOT FOUND" -ForegroundColor Red
        $allGood = $false
    }
}

# Check for task routes in App.tsx
Write-Host "`nChecking App.tsx for task routes..." -ForegroundColor Yellow
$appContent = Get-Content "src\App.tsx" -Raw
if ($appContent -match "/tasks" -and $appContent -match "TaskListPage") {
    Write-Host "  ✅ Task routes found in App.tsx" -ForegroundColor Green
} else {
    Write-Host "  ❌ Task routes NOT found in App.tsx" -ForegroundColor Red
    $allGood = $false
}

# Check Home.tsx for task display
Write-Host "`nChecking Home.tsx for task display..." -ForegroundColor Yellow
$homeContent = Get-Content "src\pages\Home.tsx" -Raw
if ($homeContent -match "Recent Tasks" -and $homeContent -match "recentTasks") {
    Write-Host "  ✅ Task display found in Home.tsx" -ForegroundColor Green
} else {
    Write-Host "  ❌ Task display NOT found in Home.tsx" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "✅ ALL FILES IN PLACE!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Run the database migration (see TASKS_FIX_SUMMARY.md)"
    Write-Host "  2. Start the app: npm run dev"
    Write-Host "  3. Test creating a task via BottomMenu"
    Write-Host "  4. Verify task appears on dashboard"
} else {
    Write-Host "❌ SOME FILES ARE MISSING!" -ForegroundColor Red
    Write-Host "Please review the errors above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "For detailed instructions, see: TASKS_FIX_SUMMARY.md" -ForegroundColor Cyan
Write-Host ""
