param(
  [string]$Executable = 'C:\Users\Administrator\AppData\Local\hermes\bin\hermes-acp.exe',
  [string]$WorkingDirectory = (Join-Path (Get-Location) '.paseo-r2-hermes-acp-probe'),
  [int]$TimeoutSeconds = 20
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $WorkingDirectory | Out-Null

$start = [System.Diagnostics.ProcessStartInfo]::new()
$start.FileName = $Executable
$start.WorkingDirectory = $WorkingDirectory
$start.UseShellExecute = $false
$start.CreateNoWindow = $true
$start.RedirectStandardInput = $true
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
$start.Environment['HERMES_ACP_SKIP_CONFIGURED_MCP'] = '1'

$process = [System.Diagnostics.Process]::new()
$process.StartInfo = $start
if (-not $process.Start()) { throw "Unable to start Hermes ACP: $Executable" }

$messages = @(
  @{ jsonrpc = '2.0'; id = 1; method = 'initialize'; params = @{
      protocolVersion = 1
      clientInfo = @{ name = 'magi-r2-transport-probe'; version = '0.1.0' }
      clientCapabilities = @{ fs = @{ readTextFile = $false; writeTextFile = $false }; terminal = $false }
    } },
  @{ jsonrpc = '2.0'; id = 2; method = 'session/new'; params = @{
      cwd = $WorkingDirectory
      mcpServers = @()
    } }
)

foreach ($message in $messages) {
  $body = $message | ConvertTo-Json -Compress -Depth 8
  $process.StandardInput.WriteLine($body)
  $process.StandardInput.Flush()
}

$stdoutTask = $process.StandardOutput.ReadToEndAsync()
$stderrTask = $process.StandardError.ReadToEndAsync()
$finished = $process.WaitForExit($TimeoutSeconds * 1000)
if (-not $finished) {
  $process.Kill($true)
  $process.WaitForExit()
}

$stdout = $stdoutTask.GetAwaiter().GetResult()
$stderr = $stderrTask.GetAwaiter().GetResult()
$result = [ordered]@{
  executable = $Executable
  workingDirectory = $WorkingDirectory
  timeoutSeconds = $TimeoutSeconds
  exited = $finished
  exitCode = if ($finished) { $process.ExitCode } else { $null }
  stdoutLines = @($stdout -split "`r?`n" | Where-Object { $_ -ne '' })
  stderrLines = @($stderr -split "`r?`n" | Where-Object { $_ -ne '' })
}
$result | ConvertTo-Json -Depth 8
