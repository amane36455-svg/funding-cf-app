$ErrorActionPreference = "Stop"

$pgBin = "C:\Program Files\PostgreSQL\16\bin"
$localAppData = [Environment]::GetFolderPath("LocalApplicationData")
$baseDir = Join-Path $localAppData "funding-cf-postgres"
$dataDir = Join-Path $baseDir "data"
$passwordFile = Join-Path (Get-Location) ".pgpass"
$envFile = Join-Path (Get-Location) ".env.local"
$port = if ($env:LOCAL_POSTGRES_PORT) { $env:LOCAL_POSTGRES_PORT } else { "55432" }

if (!(Test-Path "$pgBin\initdb.exe")) {
  throw "PostgreSQL 16 binaries were not found at $pgBin"
}

New-Item -ItemType Directory -Force -Path $baseDir | Out-Null

if (!(Test-Path $passwordFile)) {
  $chars = ([char[]]"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789")
  $password = -join (1..32 | ForEach-Object { $chars | Get-Random })
  Set-Content -LiteralPath $passwordFile -Value $password -Encoding ASCII
} else {
  $password = (Get-Content -LiteralPath $passwordFile -Raw).Trim()
}

if (!(Test-Path $dataDir)) {
  & "$pgBin\initdb.exe" -D $dataDir -U postgres --encoding=UTF8 --locale=C --pwfile=$passwordFile
  if ($LASTEXITCODE -ne 0) { throw "initdb failed" }
}

& "$pgBin\pg_ctl.exe" -D $dataDir -o "-p $port" -l (Join-Path (Get-Location) "postgres.log") start
if ($LASTEXITCODE -ne 0) { throw "pg_ctl start failed" }

$dbCheck = & "$pgBin\psql.exe" -h localhost -p $port -U postgres -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'funding_cf'"
if ($LASTEXITCODE -ne 0) { throw "database existence check failed" }
$dbExists = $dbCheck -match "1"

$escaped = [Uri]::EscapeDataString($password)
$dbUrl = "postgresql://postgres:$escaped@localhost:$port/funding_cf?schema=public"

if (Test-Path $envFile) {
  $content = Get-Content -LiteralPath $envFile -Raw
  $content = $content -replace 'APP_DATABASE_URL=.*', "APP_DATABASE_URL=$dbUrl"
  $content = $content -replace 'APP_DIRECT_URL=.*', "APP_DIRECT_URL=$dbUrl"
  Set-Content -LiteralPath $envFile -Value $content -Encoding UTF8
}

$env:PGPASSWORD = $password
if (!$dbExists) {
  & "$pgBin\createdb.exe" -h localhost -p $port -U postgres funding_cf
  if ($LASTEXITCODE -ne 0) { throw "createdb failed" }
}

Write-Output "Local PostgreSQL is ready on port $port."
