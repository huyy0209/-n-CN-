# Tai Node.js 22 ban portable (khong can quyen admin) vao %LOCALAPPDATA%\IS028.
# Duoc goi tu scripts\node22.bat khi may chua co Node 22.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'  # thanh tien trinh lam tai rat cham tren PowerShell 5
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$goc = Join-Path $env:LOCALAPPDATA 'IS028'
New-Item -ItemType Directory -Force -Path $goc | Out-Null

# Lay ban Node 22 moi nhat tu danh sach chinh thuc
$ds = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json' -UseBasicParsing
$ban = ($ds | Where-Object { $_.version -like 'v22.*' } | Select-Object -First 1).version
if (-not $ban) { throw 'Khong tim thay ban Node.js 22 trong danh sach.' }

$ten = "node-$ban-win-x64"
$thuMuc = Join-Path $goc $ten
if (Test-Path (Join-Path $thuMuc 'node.exe')) { Write-Output $thuMuc; exit 0 }

$zip = Join-Path $goc "$ten.zip"
Write-Host "Dang tai $ten (khoang 30 MB)..."
Invoke-WebRequest -Uri "https://nodejs.org/dist/$ban/$ten.zip" -OutFile $zip -UseBasicParsing
Write-Host 'Dang giai nen...'
Expand-Archive -Path $zip -DestinationPath $goc -Force
Remove-Item $zip -Force
Write-Output $thuMuc
