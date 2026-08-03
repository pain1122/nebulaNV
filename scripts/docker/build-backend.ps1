[CmdletBinding()]
param(
  [switch]$Clean,
  [switch]$Pull
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $repoRoot

try {
  docker compose config --quiet
  if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose configuration validation failed."
  }

  $arguments = @(".\scripts\backend.mjs", "build-images")
  if ($Clean) {
    $arguments += "--clean"
  } elseif ($Pull) {
    $arguments += "--pull"
  }

  $mode = if ($Clean) { "clean" } else { "cached" }
  Write-Host "Building backend Bake targets sequentially in $mode mode."
  Write-Host "node $($arguments -join ' ')"

  & node @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Backend image build failed with exit code $LASTEXITCODE."
  }
} finally {
  Pop-Location
}
