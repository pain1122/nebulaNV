[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$ImagePrefix = "nebulanv-main",
  [string]$ImageTag = "latest",
  [string]$Output = "deploy/nebula-images.tar"
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

$backendImagesJson = & node (Join-Path $repoRoot "scripts\backend.mjs") images $ImagePrefix $ImageTag
if ($LASTEXITCODE -ne 0) {
  throw "Failed to resolve backend images from the repository inventory."
}
$backendImages = $backendImagesJson | ConvertFrom-Json

$images = @()
$images += $backendImages
$images += @(
  "postgres:17",
  "redis:7-alpine",
  "minio/minio:latest",
  "minio/mc:latest"
)

Write-Host "Saving Docker images to $outputPath"
$images | ForEach-Object { Write-Host " - $_" }

if ($PSCmdlet.ShouldProcess($outputPath, "Save $($images.Count) release images")) {
  docker save -o $outputPath @images
  if ($LASTEXITCODE -ne 0) {
    throw "Docker image archive failed with exit code $LASTEXITCODE."
  }
}
