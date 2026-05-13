@echo off
setlocal EnableExtensions
set "REPO=%~dp0.."
for %%I in ("%REPO%") do set "REPO=%%~fI"

cd /d "%REPO%" || exit /b 1

where node >nul 2>&1 || (
  echo [libsystem] need node.js: https://nodejs.org/
  pause
  exit /b 1
)

if exist "%REPO%\backend\venv\Scripts\python.exe" (
  set "PY=%REPO%\backend\venv\Scripts\python.exe"
) else (
  set "PY=python"
  python --version >nul 2>&1 || (
    echo [libsystem] need python ^(or create backend\venv^)
    pause
    exit /b 1
  )
)

if not exist "%REPO%\backend\node_modules\" (
  echo [libsystem] npm install in backend...
  call npm install --prefix "%REPO%\backend"
)
if not exist "%REPO%\frontend\node_modules\" (
  echo [libsystem] npm install in frontend...
  call npm install --prefix "%REPO%\frontend"
)

echo [libsystem] starting api :4000, django :8000, vite :5173 ...

start "libsystem-api-4000" cmd /k "cd /d ""%REPO%\backend"" && npm run dev"
ping -n 3 127.0.0.1 >nul
start "libsystem-django-8000" cmd /k "cd /d ""%REPO%\backend"" && "%PY%" manage.py runserver 8000"
ping -n 3 127.0.0.1 >nul
start "libsystem-vite-5173" cmd /k "cd /d ""%REPO%\frontend"" && npm run dev"
ping -n 5 127.0.0.1 >nul

start "" "http://localhost:5173/"
echo [libsystem] opened browser. three terminals stay open — close them to stop servers.
pause
