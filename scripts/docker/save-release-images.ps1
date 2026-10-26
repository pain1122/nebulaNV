[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$ImagePrefix = "nebulanv-main",
  [string]$ImageTag = "latest",
  [string]$Output = "deploy/nebula-images.tar",
  [string]$EnvFile = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

if ([System.IO.Path]::IsPathRooted($Output)) {
  $outputPath = $Output
} else {
  $outputPath = Join-Path (Get-Location) $Output
}

$outputDir = Split-Path -Parent $outputPath
if ($outputDir) {
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

$inventoryArguments = @((Join-Path $repoRoot "scripts\docker\release-image-inventory.mjs"), $ImagePrefix, $ImageTag)
if ($EnvFile) { $inventoryArguments += $EnvFile }
$archiveImagesJson = & node @inventoryArguments
if ($LASTEXITCODE -ne 0) {
  throw "Failed to resolve the complete Compose image inventory."
}
[string[]]$images = $archiveImagesJson | ConvertFrom-Json

Write-Host "Saving Docker images to $outputPath"
$images | ForEach-Object { Write-Host " - $_" }

if ($PSCmdlet.ShouldProcess($outputPath, "Save $($images.Count) release images")) {
  docker save -o $outputPath @images
  if ($LASTEXITCODE -ne 0) {
    throw "Docker image archive failed with exit code $LASTEXITCODE."
  }
}
