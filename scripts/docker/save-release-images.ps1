[CmdletBinding()]
param(
  [string]$ImagePrefix = "nebulanv-main",
  [string]$ImageTag = "latest",
  [string]$Output = "deploy/nebula-images.tar"
)

$ErrorActionPreference = "Stop"

if ([System.IO.Path]::IsPathRooted($Output)) {
  $outputPath = $Output
} else {
  $outputPath = Join-Path (Get-Location) $Output
}

$outputDir = Split-Path -Parent $outputPath
if ($outputDir) {
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

$images = @(
  "$ImagePrefix-user-service:$ImageTag",
  "$ImagePrefix-auth-service:$ImageTag",
  "$ImagePrefix-settings-service:$ImageTag",
  "$ImagePrefix-media-service:$ImageTag",
  "$ImagePrefix-taxonomy-service:$ImageTag",
  "$ImagePrefix-product-service:$ImageTag",
  "$ImagePrefix-blog-service:$ImageTag",
  "$ImagePrefix-order-service:$ImageTag",
  "postgres:17",
  "redis:7-alpine",
  "minio/minio:latest",
  "minio/mc:latest"
)

Write-Host "Saving Docker images to $outputPath"
$images | ForEach-Object { Write-Host " - $_" }

docker save -o $outputPath @images
