@echo off
rem Dua Node.js 22 vao PATH cho start.bat va reset-data.bat (goi bang "call").
rem Thu tu tim: ban portable da tai trong %LOCALAPPDATA%\IS028, ban cu trong %TEMP%,
rem Node cai san tren may; neu khong co Node 22 thi tu tai ban portable.
set "NODE22_OK="

for /d %%D in ("%LOCALAPPDATA%\IS028\node-v22.*-win-x64") do if exist "%%D\node.exe" set "NODE22_DIR=%%D"
if not defined NODE22_DIR for /d %%D in ("%TEMP%\node-v22.*-win-x64") do if exist "%%D\node.exe" set "NODE22_DIR=%%D"
if defined NODE22_DIR set "PATH=%NODE22_DIR%;%PATH%"

call :kiem_tra
if defined NODE22_OK goto :eof

echo May chua co Node.js 22. Dang tu tai ban portable, chi can lam mot lan...
set "NODE22_DIR="
for /f "usebackq delims=" %%P in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0cai-node22.ps1"`) do set "NODE22_DIR=%%P"
if not defined NODE22_DIR goto :loi
if not exist "%NODE22_DIR%\node.exe" goto :loi
set "PATH=%NODE22_DIR%;%PATH%"
call :kiem_tra
if defined NODE22_OK goto :eof

:loi
echo Khong tai duoc Node.js 22. Kiem tra mang Internet roi chay lai,
echo hoac tu cai Node.js 22.x tai https://nodejs.org
goto :eof

:kiem_tra
set "NODE_MAJOR="
for /f "tokens=1 delims=v." %%V in ('node -v 2^>nul') do set "NODE_MAJOR=%%V"
if "%NODE_MAJOR%"=="22" set "NODE22_OK=1"
goto :eof
