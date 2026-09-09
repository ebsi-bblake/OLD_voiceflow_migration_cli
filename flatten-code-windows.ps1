$ErrorActionPreference = 'Stop'

# Creates exactly 30 flattened, path-labelled source files on the Windows Desktop:
# 1 plugin bundle, 1 CLI bundle, and 28 Voiceflow bundles.
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$OutputDir = Join-Path ([Environment]::GetFolderPath('Desktop')) 'voiceflow-code-flattened'
$Separator = "`r`n`r`n════════════════════════════════════════════════════════════════════`r`n`r`n"

if (Test-Path $OutputDir) { Remove-Item $OutputDir -Recurse -Force }
New-Item (Join-Path $OutputDir 'plugin') -ItemType Directory -Force | Out-Null
New-Item (Join-Path $OutputDir 'cli') -ItemType Directory -Force | Out-Null
New-Item (Join-Path $OutputDir 'voiceflow') -ItemType Directory -Force | Out-Null

function Flatten-Files {
  param([string]$OutputPath, [System.IO.FileInfo[]]$Files)
  $parts = foreach ($File in $Files) {
    $relative = [IO.Path]::GetRelativePath($RootDir, $File.FullName)
    "╔════════════════════════════════════════════════════════════════════╗`r`n║ PATH: $relative`r`n╚════════════════════════════════════════════════════════════════════╝`r`n$([IO.File]::ReadAllText($File.FullName))$Separator"
  }
  [IO.File]::WriteAllText($OutputPath, ($parts -join ''))
}

$pluginFiles = @(Get-ChildItem (Join-Path $RootDir 'xyops/plugin') -Filter '*.ts' -File -Recurse | Sort-Object FullName)
$cliFiles = @(Get-ChildItem (Join-Path $RootDir 'xyops/cli') -Filter '*.ts' -File -Recurse | Sort-Object FullName)
$voiceflowFiles = @(Get-ChildItem (Join-Path $RootDir 'xyops/voiceflow') -Filter '*.ts' -File -Recurse | Sort-Object FullName)

Flatten-Files (Join-Path $OutputDir 'plugin/plugin-code.txt') $pluginFiles
Flatten-Files (Join-Path $OutputDir 'cli/cli-code.txt') $cliFiles

for ($index = 0; $index -lt 27; $index++) {
  $bundle = '{0:D2}' -f ($index + 1)
  Flatten-Files (Join-Path $OutputDir "voiceflow/voiceflow-$bundle.txt") @($voiceflowFiles[$index])
}
Flatten-Files (Join-Path $OutputDir 'voiceflow/voiceflow-28-condensed.txt') @($voiceflowFiles[27..($voiceflowFiles.Count - 1)])

$count = @(Get-ChildItem $OutputDir -File -Recurse).Count
if ($count -ne 30) { throw "Expected 30 output files, created $count" }
Write-Output "Created $count flattened files in $OutputDir"
