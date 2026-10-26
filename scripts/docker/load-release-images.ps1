[CmdletBinding()]
param(
  [Alias("Input")]
  [string]$ArchivePath = "deploy/nebula-images.tar"
)

$ErrorActionPreference = "Stop"

if ([System.IO.Path]::IsPathRooted($ArchivePath)) {
  $inputPath = $ArchivePath
} else {
  $inputPath = Join-Path (Get-Location) $ArchivePath
}

if (-not (Test-Path $inputPath)) {
  throw "Docker image archive not found: $inputPath"
}

Write-Host "Loading Docker images from $inputPath"
docker load -i $inputPath
