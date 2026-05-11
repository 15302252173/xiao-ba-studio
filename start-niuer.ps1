$logFile = Join-Path $PSScriptRoot "fei-dev-live.log"
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "cmd.exe"
$psi.Arguments = "/c npm run dev"
$psi.WorkingDirectory = $PSScriptRoot
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $false
$psi.RedirectStandardError = $false
$psi.CreateNoWindow = $true
$psi.EnvironmentVariables["NODE_ENV"] = "development"
$p = [System.Diagnostics.Process]::Start($psi)
Start-Sleep -Seconds 5
Write-Host "Started PID: $($p.Id)"
