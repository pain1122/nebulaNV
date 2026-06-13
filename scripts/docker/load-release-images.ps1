[CmdletBinding()]
param(
  [string]$Input = "deploy/nebula-images.tar"
)

$ErrorActionPreference = "Stop"

if ([System.IO.Path]::IsPathRooted($Input)) {
  $inputPath = $Input
} else {
  $inputPath = Join-Path (Get-Location) $Input
}

if (-not (Test-Path $inputPath)) {
  throw "Docker image archive not found: $inputPath"
}

Write-Host "Loading Docker images from $inputPath"
docker load -i $inputPath
