# Exibe SHA-1/SHA-256 do certificado debug (Firebase → app Android → impressão digital)
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot

Write-Host ''
Write-Host '=== Finance Tracker — SHA para Firebase ===' -ForegroundColor Cyan
Write-Host 'Projeto: financy-4d5f7 | Pacote: com.financetracker.app'
Write-Host ''
Write-Host 'Cadastre o SHA-1 em:'
Write-Host 'https://console.firebase.google.com/project/financy-4d5f7/settings/general'
Write-Host '  -> Seus apps -> Android (com.financetracker.app) -> Adicionar impressao digital'
Write-Host ''

function Show-KeytoolSha {
  param([string]$Keystore, [string]$Label)
  if (-not (Test-Path $Keystore)) { return $false }
  $keytool = Get-Command keytool -ErrorAction SilentlyContinue
  if (-not $keytool) {
    Write-Host 'keytool nao encontrado. Instale o JDK (Android Studio ja inclui).' -ForegroundColor Yellow
    return $false
  }
  Write-Host "--- $Label ---" -ForegroundColor Gray
  Write-Host "Keystore: $Keystore"
  & keytool -list -v -keystore $Keystore -alias androiddebugkey -storepass android -keypass android 2>&1 |
    ForEach-Object {
      $line = "$_"
      if ($line -match 'SHA1:|SHA256:|Alias name:|Valid from:') { Write-Host $line }
    }
  Write-Host ''
  return $true
}

$debugKs = Join-Path $env:USERPROFILE '.android\debug.keystore'
$shown = Show-KeytoolSha -Keystore $debugKs -Label 'Debug (padrao Android Studio)'

if (-not $shown) {
  Write-Host 'debug.keystore ainda nao existe.' -ForegroundColor Yellow
  Write-Host 'Abra o Android Studio uma vez, crie um emulador ou rode o app — o arquivo sera criado.'
  Write-Host ''
}

$android = Join-Path $root 'android'
$gradlew = Join-Path $android 'gradlew.bat'
if ((Test-Path $gradlew)) {
  Write-Host 'Opcional: relatorio completo do Gradle (signingReport):' -ForegroundColor Gray
  Push-Location $android
  try {
    & $gradlew signingReport 2>&1 | Select-String -Pattern 'Variant: debug|SHA1:|SHA-256:|Config: debug' |
      ForEach-Object { Write-Host $_.Line }
  } catch {
    Write-Host '(Gradle nao rodou — use o SHA1 do keytool acima.)' -ForegroundColor DarkGray
  } finally {
    Pop-Location
  }
}

Write-Host ''
Write-Host 'Proximos passos:' -ForegroundColor Green
Write-Host '  1. Copie o SHA1 e adicione no Firebase (link acima)'
Write-Host '  2. Baixe google-services.json -> android/app/google-services.json'
Write-Host '  3. npm run cap:sync'
Write-Host '  4. Run no Android Studio'
Write-Host ''
