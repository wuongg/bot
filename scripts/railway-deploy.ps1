# Deploy feedback-bot lên Railway
# Bước 1: npx @railway/cli login
# Bước 2: .\scripts\railway-deploy.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

function Invoke-Railway {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  & npx --yes @railway/cli @Args
  if ($LASTEXITCODE -ne 0) { throw "railway failed: $($Args -join ' ')" }
}

Write-Host "==> Kiểm tra đăng nhập Railway..."
try {
  Invoke-Railway whoami
} catch {
  Write-Host ""
  Write-Host "Chưa đăng nhập. Chạy lệnh sau (mở browser):"
  Write-Host "  npx @railway/cli login"
  Write-Host ""
  exit 1
}

if (-not (Test-Path ".railway")) {
  Write-Host "==> Tạo project Railway..."
  Invoke-Railway init --name feedback-bot
}

Write-Host "==> Set biến môi trường production..."
$overrides = @{
  STORAGE        = "sqlite"
  DATA_DIR       = "/app/data"
  DATABASE_PATH  = "/app/data/bot.db"
  NODE_ENV       = "production"
}

Get-Content .env -ErrorAction Stop | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#")) { return }
  if ($line -notmatch "^([^=]+)=(.*)$") { return }
  $key = $matches[1].Trim()
  $val = $matches[2].Trim()
  if ($overrides.ContainsKey($key)) { $val = $overrides[$key] }
  Write-Host "  $key"
  Invoke-Railway variable set "${key}=${val}" --skip-deploys
}

foreach ($kv in $overrides.GetEnumerator()) {
  if ($kv.Key -notin @("NODE_ENV")) {
    Invoke-Railway variable set "$($kv.Key)=$($kv.Value)" --skip-deploys
  }
}
Invoke-Railway variable set "NODE_ENV=production" --skip-deploys

Write-Host "==> Thêm volume /app/data (bỏ qua nếu đã có)..."
try {
  Invoke-Railway volume add --mount-path /app/data
} catch {
  Write-Host "  (volume có thể đã tồn tại — tiếp tục)"
}

if (Test-Path "data\bot.db") {
  Write-Host "==> Upload data\bot.db lên volume..."
  try {
    Invoke-Railway volume files upload "data\bot.db" "/bot.db"
  } catch {
    Write-Host "  Upload thất bại — có thể deploy xong rồi upload lại:"
    Write-Host "  npx @railway/cli volume files upload data\bot.db /bot.db"
  }
}

Write-Host "==> Deploy (Dockerfile)..."
Invoke-Railway up --detach

Write-Host ""
Write-Host "✅ Xong! Xem logs:"
Write-Host "  npx @railway/cli logs"
Write-Host "  npx @railway/cli open"
Write-Host ""
Write-Host "Lưu ý: Tắt bot local (npm start) để tránh 2 instance cùng TOKEN."
