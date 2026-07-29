# Libera el puerto 4000 (backend Connectia) sin levantar nada.
$ErrorActionPreference = 'SilentlyContinue'
$pids = @()
Get-NetTCPConnection -LocalPort 4000 | ForEach-Object { $pids += $_.OwningProcess }
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | ForEach-Object {
  if ($_.CommandLine -match 'connectia[\\/]backend' -or ($_.CommandLine -match 'SUPERVISoRVIRTUAL' -and $_.CommandLine -match 'server\.js')) {
    $pids += $_.ProcessId
  }
}
$pids = $pids | Where-Object { $_ -gt 0 } | Select-Object -Unique
if (-not $pids) {
  Write-Host 'Puerto 4000 ya estaba libre.'
  exit 0
}
foreach ($procId in $pids) {
  Write-Host "Matando PID $procId"
  Stop-Process -Id $procId -Force
}
Start-Sleep -Seconds 1
Write-Host 'Listo. Ahora: cd connectia\backend ; npm run dev'
