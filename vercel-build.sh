#!/bin/bash

# 1. Prune dev dependencies in the build container so they aren't discovered
composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

# 2. Clear any accidentally pushed local caches
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan clear-compiled

# 3. Force clean cache directory
rm -rf bootstrap/cache/*.php

# 4. Generate clean production-only package and services cache files
php artisan package:discover

# 5. Run the standard frontend build
npm run build
