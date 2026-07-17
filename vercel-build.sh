#!/bin/bash
set -e

# 1. Clear any accidentally pushed local caches
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan clear-compiled

# 2. Pre-compile caches at build-time for maximum production speed
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 3. Run the standard frontend build
npm run build
