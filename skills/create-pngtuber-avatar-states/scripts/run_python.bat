@echo off
setlocal

if "%~1"=="" (
  echo usage: run_python.bat ^<script.py^> [args...]
  exit /b 2
)

where uv >nul 2>nul
if %ERRORLEVEL%==0 (
  if "%UV_CACHE_DIR%"=="" (
    uv --cache-dir "%TEMP%\uv-cache" run python %*
  ) else (
    uv --cache-dir "%UV_CACHE_DIR%" run python %*
  )
  exit /b %ERRORLEVEL%
)

where python3 >nul 2>nul
if %ERRORLEVEL%==0 (
  python3 %*
  exit /b %ERRORLEVEL%
)

where python >nul 2>nul
if %ERRORLEVEL%==0 (
  python %*
  exit /b %ERRORLEVEL%
)

echo error: neither uv nor python was found on PATH
exit /b 127
