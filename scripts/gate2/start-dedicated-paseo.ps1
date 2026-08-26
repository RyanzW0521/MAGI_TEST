param(
  [string]$PaseoCmd = "D:\w00896470\00-softwares\05-paseo\resources\bin\paseo.cmd",
  [string]$HomePath = "$PSScriptRoot\..\..\.paseo-gate2-home",
  [string]$WorkspacePath = "$PSScriptRoot\..\..\.paseo-gate2-workspace",
  [int]$Port = 6777
)

$ErrorActionPreference = "Stop"
$resolvedHome = [System.IO.Path]::GetFullPath($HomePath)
$resolvedWorkspace = [System.IO.Path]::GetFullPath($WorkspacePath)

New-Item -ItemType Directory -Force -Path $resolvedHome | Out-Null
New-Item -ItemType Directory -Force -Path $resolvedWorkspace | Out-Null

$arguments = @(
  "daemon", "start",
  "--home", $resolvedHome,
  "--listen", "127.0.0.1:$Port",
  "--no-relay",
  "--no-mcp",
  "--no-inject-mcp",
  "--no-web-ui"
)

$process = Start-Process -FilePath $PaseoCmd -ArgumentList $arguments -WindowStyle Hidden -PassThru
Write-Output "Started dedicated Paseo daemon PID=$($process.Id)"
Write-Output "Home=$resolvedHome"
Write-Output "Workspace=$resolvedWorkspace"
Write-Output "Listen=127.0.0.1:$Port"
Write-Output "Controls=relay:off,mcp:off,mcp-injection:off,web-ui:off"
