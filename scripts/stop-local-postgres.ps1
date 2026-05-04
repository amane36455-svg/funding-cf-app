$ErrorActionPreference = "Stop"

$pgBin = "C:\Program Files\PostgreSQL\16\bin"
$localAppData = [Environment]::GetFolderPath("LocalApplicationData")
$dataDir = Join-Path $localAppData "funding-cf-postgres\data"

if (Test-Path $dataDir) {
  & "$pgBin\pg_ctl.exe" -D $dataDir stop
  if ($LASTEXITCODE -ne 0) { throw "pg_ctl stop failed" }
}
