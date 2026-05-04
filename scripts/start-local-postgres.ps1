$ErrorActionPreference = "Stop"

$pgBin = "C:\Program Files\PostgreSQL\16\bin"
$localAppData = [Environment]::GetFolderPath("LocalApplicationData")
$dataDir = Join-Path $localAppData "funding-cf-postgres\data"
$logFile = Join-Path (Get-Location) "postgres.log"
$port = if ($env:LOCAL_POSTGRES_PORT) { $env:LOCAL_POSTGRES_PORT } else { "55432" }

if (!(Test-Path $dataDir)) {
  throw "PostgreSQL data directory is missing. Run scripts/setup-local-postgres.ps1 first."
}

& "$pgBin\pg_ctl.exe" -D $dataDir -o "-p $port" -l $logFile start
if ($LASTEXITCODE -ne 0) { throw "pg_ctl start failed" }

Write-Output "Local PostgreSQL started on port $port."
