#!/bin/bash
set -e

# 1. Clear any accidentally pushed local caches
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan clear-compiled

# 2. Force clean cache directory to ensure they are re-generated dynamically in /tmp at runtime
rm -rf bootstrap/cache/*.php

# 3. Run the standard frontend build
npm run build
