@echo off
echo Starting Laravel and Vite...
start "Laravel Server" cmd /k "php artisan serve"
start "Vite Dev" cmd /k "npm run dev"
