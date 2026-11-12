@echo off
setlocal
cd /d "%~dp0"

rem Dung cung runtime Node 22 nhu start.bat
set "NODE22_DIR=%TEMP%\node-v22.23.4-win-x64"
if exist "%NODE22_DIR%\node.exe" set "PATH=%NODE22_DIR%;%PATH%"

where npm >nul 2>nul
if errorlevel 1 (
  echo Khong tim thay npm. Hay cai Node.js 22.x.
  pause
  exit /b 1
)
if not exist "server\node_modules\exceljs\package.json" (
  echo Chua cai du thu vien may chu. Hay chay start.bat mot lan truoc.
  pause
  exit /b 1
)

echo CANH BAO: thao tac nay XOA TOAN BO du lieu hien co
echo (tai khoan, bo chi so, ky, bao cao, ket qua) va nap lai du lieu mau.
echo Hay chay stop.bat truoc neu ung dung dang mo.
choice /C CK /N /M "Go C de tiep tuc, K de huy: "
if errorlevel 2 (
  echo Da huy.
  exit /b 0
)

pushd server
call npm run db:reset
set "KQ=%errorlevel%"
popd
if not "%KQ%"=="0" (
  echo Nap lai du lieu that bai. Kiem tra ung dung da dung chua ^(stop.bat^).
  pause
  exit /b 1
)
echo Da nap lai du lieu mau. Chay start.bat de mo ung dung.
pause
exit /b 0
