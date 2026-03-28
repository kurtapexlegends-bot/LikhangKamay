@echo off
setlocal

cd /d "%~dp0"
start "Laravel Server" cmd /k php artisan serve
start "Vite Dev" cmd /k npm run dev
