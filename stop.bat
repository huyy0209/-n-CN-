@echo off
setlocal
cd /d "%~dp0"

echo Dang dung ung dung IS028...

rem Cong API: doc PORT trong server\.env neu co, mac dinh 4000
set "API_PORT=4000"
if exist "server\.env" (
  for /f "usebackq tokens=1,2 delims==" %%A in ("server\.env") do (
    if /I "%%A"=="PORT" set "API_PORT=%%B"
  )
)

rem 1. Dong hai cua so do start.bat mo, kem cac tien trinh con (npm, node)
taskkill /FI "WINDOWTITLE eq IS028 API*" /T /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq IS028 Giao dien*" /T /F >nul 2>nul

rem 2. Dung tien trinh node con giu cong API va cong giao dien
rem    (5174 de phong Vite tu doi cong khi 5173 ban). Chi dung node.exe, khong dung chuong trinh khac.
for %%P in (%API_PORT% 5173 5174) do call :DungCong %%P

echo Da dung. Du lieu khong bi anh huong; chay start.bat de mo lai.
timeout /t 3 >nul
exit /b 0

:DungCong
for /f "tokens=5" %%I in ('netstat -ano ^| findstr /R /C:":%1 .*LISTENING"') do (
  tasklist /FI "PID eq %%I" /NH 2>nul | find /I "node.exe" >nul
  if not errorlevel 1 (
    taskkill /PID %%I /T /F >nul 2>nul
    echo   Da dung node.exe tren cong %1 ^(PID %%I^)
  )
)
exit /b 0
