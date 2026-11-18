@echo off
setlocal
cd /d "%~dp0"
set "PROJECT_DIR=%~dp0"

rem Dua Node.js 22 vao PATH (tu tai ban portable neu may chua co)
call "%PROJECT_DIR%scripts\node22.bat"
if not defined NODE22_OK (
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
) else (
  rem CSDL da co: nang cap ten bang cu GIAODONVI va THAMDINH neu can, giu nguyen du lieu
  pushd "%PROJECT_DIR%server"
  call npm run db:migrate
  if errorlevel 1 (
    popd
    echo Kiem tra/nang cap co so du lieu that bai.
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
