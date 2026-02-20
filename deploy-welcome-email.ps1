# StackDek Welcome Email Deployment Script
# Run this script to deploy the welcome email system

Write-Host "🚀 StackDek Welcome Email Deployment" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
Write-Host "1️⃣  Checking Supabase CLI..." -ForegroundColor Yellow
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseInstalled) {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    Write-Host "Install with: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI found" -ForegroundColor Green
Write-Host ""

# Check if logged in to Supabase
Write-Host "2️⃣  Checking Supabase authentication..." -ForegroundColor Yellow
try {
    $loginCheck = supabase projects list 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Not logged in to Supabase!" -ForegroundColor Red
        Write-Host "Login with: supabase login" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✅ Authenticated to Supabase" -ForegroundColor Green
} catch {
    Write-Host "❌ Error checking Supabase login" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Link project (if not already linked)
Write-Host "3️⃣  Linking Supabase project..." -ForegroundColor Yellow
$projectRef = "duhmbhxlmvczrztccmus"

# Check if already linked
if (Test-Path ".\.supabase\config.toml") {
    Write-Host "✅ Project already linked" -ForegroundColor Green
} else {
    Write-Host "Linking project: $projectRef" -ForegroundColor Cyan
    supabase link --project-ref $projectRef
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to link project" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Project linked successfully" -ForegroundColor Green
}
Write-Host ""

# Set Resend API key
Write-Host "4️⃣  Setting Resend API key..." -ForegroundColor Yellow
$resendKey = Read-Host "Enter your Resend API key (starts with re_)"

if ($resendKey -notlike "re_*") {
    Write-Host "⚠️  Warning: API key doesn't start with 're_'" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        Write-Host "❌ Deployment cancelled" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Setting secret..." -ForegroundColor Cyan
supabase secrets set "RESEND_API_KEY=$resendKey"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to set secret" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Resend API key set successfully" -ForegroundColor Green
Write-Host ""

# Deploy Edge Function
Write-Host "5️⃣  Deploying Edge Function..." -ForegroundColor Yellow
Write-Host "Deploying send-welcome-email..." -ForegroundColor Cyan

supabase functions deploy send-welcome-email --no-verify-jwt
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy function" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Edge Function deployed successfully" -ForegroundColor Green
Write-Host ""

# Prompt for database trigger
Write-Host "6️⃣  Database Trigger Setup" -ForegroundColor Yellow
Write-Host "Next step: Run the database trigger migration" -ForegroundColor Cyan
Write-Host ""
Write-Host "Instructions:" -ForegroundColor White
Write-Host "1. Open Supabase Dashboard: https://app.supabase.com/project/$projectRef" -ForegroundColor Gray
Write-Host "2. Go to SQL Editor → New Query" -ForegroundColor Gray
Write-Host "3. Copy and paste: migrations\welcome-email-trigger.sql" -ForegroundColor Gray
Write-Host "4. Click RUN" -ForegroundColor Gray
Write-Host ""

$openDashboard = Read-Host "Open Supabase Dashboard now? (y/n)"
if ($openDashboard -eq "y") {
    Start-Process "https://app.supabase.com/project/$projectRef/sql/new"
}

Write-Host ""
Write-Host "7️⃣  Testing" -ForegroundColor Yellow
Write-Host "After running the trigger migration:" -ForegroundColor Cyan
Write-Host "1. Go to https://app.stackdek.com/signup" -ForegroundColor Gray
Write-Host "2. Create a test account with a real email" -ForegroundColor Gray
Write-Host "3. Check your inbox for the welcome email" -ForegroundColor Gray
Write-Host ""

Write-Host "📧 View Edge Function logs:" -ForegroundColor Cyan
Write-Host "   supabase functions logs send-welcome-email --tail" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "Next: Run the database migration and test!" -ForegroundColor Yellow
Write-Host ""
Write-Host "📄 Full documentation: EMAIL_SETUP_COMPLETE.md" -ForegroundColor Cyan
