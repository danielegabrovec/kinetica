param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$InstallerPath
)

$ErrorActionPreference = 'Stop'
$installer = (Resolve-Path -LiteralPath $InstallerPath).Path
$installerFile = Get-Item -LiteralPath $installer
$expectedVersion = (Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\package.json') -Raw | ConvertFrom-Json).version
if ($installerFile.Length -lt 10MB) {
  throw "Installer incompleto: $installer ($($installerFile.Length) byte)."
}

$installDir = Join-Path ([System.IO.Path]::GetTempPath()) "KineticaInstallerSmoke-$PID-$([guid]::NewGuid().ToString('N'))"
$uninstallKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\0916b0f8-06d4-51ad-9a74-2a2a34f091c5'

function Invoke-QAProcess {
  param(
    [Parameter(Mandatory = $true)] [string]$FilePath,
    [Parameter(Mandatory = $true)] [string[]]$ArgumentList,
    [Parameter(Mandatory = $true)] [string]$Label
  )

  $process = Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -PassThru -WindowStyle Hidden
  if (-not $process.WaitForExit(600000)) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    throw "$Label non terminato entro 10 minuti."
  }
  if ($process.ExitCode -ne 0) {
    throw "$Label terminato con codice $($process.ExitCode)."
  }
}

Invoke-QAProcess -FilePath $installer -ArgumentList @('/S', '/currentuser', "/D=$installDir") -Label 'Installazione QA'

$executable = Join-Path $installDir 'Kinetica.exe'
$uninstaller = Join-Path $installDir 'Uninstall Kinetica.exe'
if (-not (Test-Path -LiteralPath $executable) -or -not (Test-Path -LiteralPath $uninstaller)) {
  throw "Installazione QA incompleta in $installDir."
}

& npm run smoke:installed -- $executable
if ($LASTEXITCODE -ne 0) {
  throw "Smoke test dell'app installata fallito con codice $LASTEXITCODE."
}

$registration = Get-ItemProperty -LiteralPath $uninstallKey -ErrorAction Stop
if ($registration.DisplayVersion -ne $expectedVersion -or $registration.QuietUninstallString -notlike "*$installDir*") {
  throw 'Registrazione di disinstallazione non coerente con il pacchetto collaudato.'
}

Invoke-QAProcess -FilePath $uninstaller -ArgumentList @('/currentuser', '/S') -Label 'Disinstallazione QA'

$deadline = (Get-Date).AddSeconds(60)
while (((Test-Path -LiteralPath $installDir) -or (Test-Path -LiteralPath $uninstallKey)) -and (Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 500
}
if (Test-Path -LiteralPath $installDir) {
  throw "La disinstallazione non ha rimosso $installDir."
}
if (Test-Path -LiteralPath $uninstallKey) {
  throw 'La disinstallazione non ha rimosso la registrazione HKCU.'
}

[pscustomobject]@{
  ok = $true
  installer = $installerFile.Name
  installedVersion = $expectedVersion
  persistedDraft = $true
  uninstallClean = $true
} | ConvertTo-Json -Compress
