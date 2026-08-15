@echo off
rem ============================================================
rem Dabu Xiangqi - one-click desktop build launcher
rem Runs tools\build-desktop.ps1 (build exe + NSIS + portable zip)
rem ============================================================
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\build-desktop.ps1"
set RC=%ERRORLEVEL%
exit /b %RC%
