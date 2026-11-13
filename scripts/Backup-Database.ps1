# Daily MySQL backup for the alumni system.
#
# The DB password is read from appsettings.json (gitignored) at runtime —
# never hardcode secrets in this file. Output goes to <repo>/backups/
# (gitignored): one timestamped .sql per run, pruned after $KeepDays.
#
# Registered as the scheduled task "AlumniSystem-DBBackup" (daily 02:00,
# runs on next wake if the machine was off). Run manually with:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\Backup-Database.ps1
#
# Restore with:
#   "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p myapp_db < backups\myapp_db_YYYYMMDD_HHMMSS.sql
param(
    [int]$KeepDays = 14
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$mysqldump = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe'
$configPath = Join-Path $repoRoot 'MyApp\MyApp.API\appsettings.json'
$backupDir = Join-Path $repoRoot 'backups'

if (-not (Test-Path $mysqldump)) { throw "mysqldump not found: $mysqldump" }
if (-not (Test-Path $configPath)) { throw "Config not found: $configPath" }

# Parse the local connection string — single source of truth for credentials.
$conn = (Get-Content $configPath -Raw | ConvertFrom-Json).ConnectionStrings.DefaultConnection
function Get-ConnValue([string]$name) {
    $m = [regex]::Match($conn, "(?i)(?:^|;)\s*$name\s*=\s*([^;]+)")
    if (-not $m.Success) { throw "Connection string is missing '$name'" }
    return $m.Groups[1].Value.Trim()
}
$db   = Get-ConnValue 'Database'
$user = Get-ConnValue 'User'
$pass = Get-ConnValue 'Password'
$port = Get-ConnValue 'Port'
if (-not $port) { $port = '3306' }

New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$file = Join-Path $backupDir ('myapp_db_{0:yyyyMMdd_HHmmss}.sql' -f (Get-Date))

# Concatenate args instead of interpolating into quotes so special characters
# in the password can't be mangled by PowerShell's parser. --result-file makes
# mysqldump write bytes directly — piping through PowerShell would re-encode
# the dump and could corrupt non-ASCII data.
$passArg = '--password=' + $pass
$resultArg = '--result-file=' + $file
& $mysqldump ('--host=127.0.0.1') ('--port=' + $port) ('--user=' + $user) $passArg `
    --single-transaction --routines --triggers $resultArg $db
if ($LASTEXITCODE -ne 0) { throw "mysqldump failed with exit code $LASTEXITCODE" }

# Prune backups older than $KeepDays.
Get-ChildItem -Path $backupDir -Filter 'myapp_db_*.sql' |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } |
    Remove-Item -Force

$size = [math]::Round((Get-Item $file).Length / 1KB, 1)
Write-Output "Backup OK: $file ($size KB)"
