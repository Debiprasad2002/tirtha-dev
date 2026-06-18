@echo off
cd /d "%~dp0frontend"
npm.cmd run dev -- --configLoader native --host 127.0.0.1 --port 5173
pause
