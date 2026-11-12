@echo off
setlocal
cd /d "%~dp0"
set "PROJECT_DIR=%~dp0"

rem Prefer the portable Node 22 runtime used to install better-sqlite3.
set "NODE22_DIR=%TEMP%\node-v22.23.4-win-x64"
if exist "%NODE22_DIR%\node.exe" set "PATH=%NODE22_DIR%;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
  echo Khong tim thay Node.js. Hay cai Node.js 22.x va chay lai file nay.
  pause
  exit /b 1
)

set "NODE_MAJOR="
for /f "tokens=1 delims=v." %%V in ('node -v 2^>nul') do set "NODE_MAJOR=%%V"
if not "%NODE_MAJOR%"=="22" (
  echo Du an can Node.js 22.x de tuong thich voi better-sqlite3.
  echo Hay cai Node.js 22.x hoac khoi phuc runtime tai:
  echo %NODE22_DIR%
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo Khong tim thay npm. Hay cai lai Node.js 22.x.
  pause
  exit /b 1
)

rem exceljs la thu vien them o dot 2: thieu thi cai lai
set "CAN_CAI_SERVER="
if not exist "%PROJECT_DIR%server\node_modules\express\package.json" set "CAN_CAI_SERVER=1"
if not exist "%PROJECT_DIR%server\node_modules\exceljs\package.json" set "CAN_CAI_SERVER=1"
if defined CAN_CAI_SERVER (
  echo Dang cai thu vien may chu...
  pushd "%PROJECT_DIR%server"
  call npm install
  if errorlevel 1 (
    popd
    echo Cai thu vien may chu that bai.
    pause
    exit /b 1
  )
  popd
)

if not exist "%PROJECT_DIR%client\node_modules\vite\package.json" (
  echo Dang cai thu vien giao dien...
  pushd "%PROJECT_DIR%client"
  call npm install
  if errorlevel 1 (
    popd
    echo Cai thu vien giao dien that bai.
    pause
    exit /b 1
  )
  popd
)

if not exist "%PROJECT_DIR%server\.env" (
  >"%PROJECT_DIR%server\.env" (
    echo PORT=4000
    echo JWT_SECRET=doi-chuoi-nay-truoc-khi-dung-that
    echo DB_CLIENT=sqlite
    echo SQLITE_FILE=./is028.sqlite
    echo MAX_FILE_MB=10
  )
)

if not exist "%PROJECT_DIR%server\is028.sqlite" (
  echo Dang tao co so du lieu mau...
  pushd "%PROJECT_DIR%server"
  call npm run db:migrate
  if errorlevel 1 (
    popd
    echo Tao co so du lieu that bai.
    pause
    exit /b 1
  )
  call npm run db:seed
  if errorlevel 1 (
    popd
    echo Nap du lieu mau that bai.
    pause
    exit /b 1
  )
  popd
)

echo Dang khoi dong API va giao dien...
start "IS028 API" /D "%PROJECT_DIR%server" cmd /k "npm start"
start "IS028 Giao dien" /D "%PROJECT_DIR%client" cmd /k "npm run dev -- --host 127.0.0.1"
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:5173/"
echo Ung dung: http://127.0.0.1:5173/
echo API:      http://localhost:4000
echo Dong hai cua so API va Giao dien de dung ung dung.
exit /b 0
